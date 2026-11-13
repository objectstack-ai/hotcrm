// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.
//
// One-time position-holder move (#2437): every person who held a HotCRM
// position under its old name holds it under its `crm_` name.
//
//   pnpm exec tsx scripts/migrate-position-holders.ts --url https://<your-org> --email <admin> --password <pw>
//   pnpm exec tsx scripts/migrate-position-holders.ts ... --apply   # without this it only reports
//
// Run it AFTER the HotCRM version that renamed the positions is installed,
// once per organization, signed in as an administrator of that organization:
// the assignments are organization data, and an administrator reads and
// writes only their own organization's.
//
// Why it is needed. HotCRM's twelve positions were renamed to carry the app's
// prefix (`sales_rep` → `crm_sales_rep`, the whole list is
// `CRM_POSITION_FORMER_NAMES` in `src/sales/sharing/positions.ts`), because
// from ObjectStack 18.4.0 a position is one slot per name in the environment
// (ADR-0150 D7). The platform keeps who holds a position in
// `sys_user_position`, by the position's NAME, and does not carry holders
// across a rename. So after the upgrade, every assignment still names the old
// position, which no longer exists: its holder loses the permission sets the
// position grants, the sharing rules aimed at it, the approvals routed to it
// and the queue it feeds, until the assignment names the new position.
//
// What it writes, per assignment: `{ position: <new name> }` and nothing else,
// through the platform's own data door (`PATCH /api/v1/data/sys_user_position/ID`),
// the same write Setup makes when an administrator edits an assignment. The
// user, organization, business unit, validity window, reason and delegation
// columns are untouched. The door accepts the new name only once the upgraded
// HotCRM has registered it, so running this before the upgrade writes nothing:
// each row is refused, and the script says why.
//
// Safe by construction:
//   • report-only unless `--apply` is passed;
//   • it touches only assignments whose position is one of the twelve old names;
//   • an assignment whose holder already holds the new position in the same
//     organization is left alone and listed, so no one ends up holding a
//     position twice; remove the old row in Setup when you have checked it;
//   • rerunnable: a second pass over a converged organization reports zero rows
//     to move.
//
// What it only reports (it never writes them): queue members and sharing rules
// your organization added itself that name an old position. HotCRM's own queues
// and sharing rules were renamed with the positions; one an administrator made
// in Setup still names the old one, and is fixed there by picking the new name.

import { CRM_POSITION_FORMER_NAMES } from '../src/sales/sharing/positions.js';

type Json = Record<string, any>;

const DEFAULT_URL = 'http://localhost:4001';

/** `--flag value` / `--flag=value`, else the env var, else the fallback. */
function arg(name: string, envName: string, fallback: string): string {
  const argv = process.argv.slice(2);
  const eq = argv.find((a) => a.startsWith(`--${name}=`));
  if (eq) return eq.slice(name.length + 3);
  const i = argv.indexOf(`--${name}`);
  if (i !== -1 && argv[i + 1]) return argv[i + 1];
  return process.env[envName]?.trim() || fallback;
}

const APPLY = process.argv.slice(2).includes('--apply');

class Api {
  private cookie = '';
  constructor(private readonly base: URL) {}

  private async call(method: string, path: string, body?: Json): Promise<{ status: number; json: Json }> {
    const res = await fetch(new URL(path, this.base), {
      method,
      headers: {
        'Content-Type': 'application/json',
        Origin: this.base.origin,
        ...(this.cookie ? { Cookie: this.cookie } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const setCookie = res.headers.getSetCookie?.() ?? [];
    if (setCookie.length) this.cookie = setCookie.map((c) => c.split(';')[0]).join('; ');
    const text = await res.text();
    let json: Json = {};
    try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
    return { status: res.status, json };
  }

  static message(json: Json): string {
    return String(json?.error?.message ?? json?.error ?? json?.message ?? JSON.stringify(json));
  }

  async signIn(email: string, password: string): Promise<Json> {
    const { status, json } = await this.call('POST', '/api/v1/auth/sign-in/email', { email, password });
    if (status !== 200 || !json?.user?.id) {
      throw new Error(`sign-in failed for ${email} (${status}: ${json?.message ?? json?.code ?? 'unknown'})`);
    }
    return json.user as Json;
  }

  /**
   * Every row of `object`, paged, in the body shape the query door accepts:
   * `sort` as `[{ field, order }]` and no `filters` key at all (#1999).
   * `test/backfill-query-bodies.test.ts` keeps it there.
   */
  async all(object: string, fields: string[]): Promise<Json[]> {
    const out: Json[] = [];
    for (let skip = 0; ; ) {
      const { status, json } = await this.call('POST', `/api/v1/data/${object}/query`, {
        fields, sort: [{ field: 'id', order: 'asc' }], skip, top: 200,
      });
      if (status < 200 || status >= 300) throw new Error(`query ${object} → ${status}: ${Api.message(json)}`);
      const rows = (json.records ?? []) as Json[];
      out.push(...rows);
      if (rows.length < 200) return out;
      skip += rows.length;
    }
  }

  async patch(object: string, id: string, body: Json): Promise<{ ok: boolean; status: number; message: string }> {
    const { status, json } = await this.call('PATCH', `/api/v1/data/${object}/${id}`, body);
    return { ok: status >= 200 && status < 300, status, message: Api.message(json) };
  }
}

const FORMER = new Map(Object.entries(CRM_POSITION_FORMER_NAMES));
const ASSIGNMENT_FIELDS = ['id', 'user_id', 'position', 'organization_id', 'business_unit_id'];

/** One holder's slot in one organization and business unit: holding a position twice there is a duplicate. */
const slot = (row: Json, position: string): string =>
  JSON.stringify([row.user_id ?? null, position, row.organization_id ?? null, row.business_unit_id ?? null]);

async function main(): Promise<void> {
  const url = arg('url', 'HOTCRM_URL', DEFAULT_URL);
  const email = arg('email', 'HOTCRM_ADMIN_EMAIL', 'admin@objectos.ai');
  const password = arg('password', 'HOTCRM_ADMIN_PASSWORD', 'admin123');

  const api = new Api(new URL(url));
  const me = await api.signIn(email, password);
  console.log(`Signed in as ${me.email ?? me.id} at ${url}`);
  console.log(APPLY ? 'Mode: APPLY (assignments will be written)' : 'Mode: REPORT ONLY (pass --apply to write)');

  const rows = await api.all('sys_user_position', ASSIGNMENT_FIELDS);
  const held = new Set(rows.map((r) => slot(r, String(r.position))));
  const former = rows.filter((r) => FORMER.has(String(r.position)));
  const toMove = former.filter((r) => !held.has(slot(r, FORMER.get(String(r.position))!)));
  const alreadyHeld = former.filter((r) => held.has(slot(r, FORMER.get(String(r.position))!)));

  console.log(`sys_user_position: ${rows.length} assignment(s), ${former.length} under an old position name.`);
  for (const [oldName, newName] of FORMER) {
    const n = toMove.filter((r) => r.position === oldName).length;
    if (n > 0) console.log(`  ${oldName} → ${newName}: ${n} to move`);
  }
  for (const r of alreadyHeld) {
    console.log(`  left alone: assignment ${r.id} (${r.position}); its holder already holds ${FORMER.get(String(r.position))} there`);
  }

  // Report-only: what an administrator added in Setup that still names an old position.
  // A read this account may not make is reported and skipped: these lists only inform.
  const naming = async (object: string, fields: string[]): Promise<Json[]> => {
    try {
      return (await api.all(object, fields))
        .filter((r) => r.recipient_type === 'position' && FORMER.has(String(r.recipient_id)));
    } catch (err) {
      console.log(`  could not read ${object} (${(err as Error).message}); check it in Setup.`);
      return [];
    }
  };
  const members = await naming('sys_queue_member', ['id', 'queue', 'recipient_type', 'recipient_id']);
  const rules = await naming('sys_sharing_rule', ['id', 'name', 'recipient_type', 'recipient_id']);
  for (const r of members) console.log(`  queue member to fix in Setup: queue ${r.queue} names position ${r.recipient_id} (now ${FORMER.get(String(r.recipient_id))})`);
  for (const r of rules) console.log(`  sharing rule to fix in Setup: ${r.name ?? r.id} names position ${r.recipient_id} (now ${FORMER.get(String(r.recipient_id))})`);

  if (!APPLY) {
    console.log('\nReport only. Re-run with --apply to write.');
    return;
  }

  let refused = 0;
  for (const r of toMove) {
    const position = FORMER.get(String(r.position))!;
    const answer = await api.patch('sys_user_position', String(r.id), { position });
    if (answer.ok) continue;
    refused++;
    console.log(`  assignment ${r.id} (${r.position} → ${position}) → ${answer.status}: ${answer.message}`);
    if (answer.status === 400) {
      console.log(`    ${position} is not a position this environment knows yet: install the HotCRM version that renamed the positions first.`);
    }
  }
  // Read back rather than trusting the PATCH answers.
  const left = (await api.all('sys_user_position', ASSIGNMENT_FIELDS))
    .filter((r) => FORMER.has(String(r.position)) && !alreadyHeld.some((a) => a.id === r.id));
  console.log(`  moved ${toMove.length - left.length}/${toMove.length}; ${left.length} still under an old name.`);
  if (left.length > 0 || refused > 0) process.exitCode = 1;
}

/** The run, settled: `test/position-holder-move.test.ts` awaits it instead of polling. */
export const done: Promise<void> = main().catch((err) => {
  console.error(`\nPosition-holder move failed: ${(err as Error).message}`);
  process.exitCode = 1;
});
