// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.
//
// One-time intake-queue backfill (#2395): put every open case and lead that
// nobody owns into the queue its object now routes to.
//
//   pnpm exec tsx scripts/backfill-intake-queue.ts --url https://<your-org> --email <admin> --password <pw>
//   pnpm exec tsx scripts/backfill-intake-queue.ts ... --apply   # without this it only reports
//
// Since ObjectStack 18.3.0 (ADR-0142) a record nobody owns "sits in" a queue
// when its platform `queue` column names one, and only then: the queue's
// members read it, the console offers them Claim (认领) on it, and the
// Unassigned — triage list shows it. HotCRM declares two queues, `case_intake`
// (members: service_agent) and `lead_intake` (members: sales_rep), and the
// assignment rules fill `queue` on every new ownerless record.
//
// Rows written BEFORE the upgrade carry no queue. On HotCRM those are the
// cases and leads that came in while nobody held the position, and that the
// deleted round-robin hooks left ownerless. Agents used to reach those cases
// through the deleted `case_unassigned_triage_sharing` rule; after the upgrade
// nobody but an admin can see them until they sit in a queue. This script is
// that one move.
//
// What it writes, per row: `{ queue: <the object's intake queue> }` and nothing
// else, on rows that have no owner, no queue, and are still live work (a case
// not Resolved or Closed, a lead not converted). It never writes an owner, and
// a row someone owns, or that already names a queue, is left alone.
//
// Safe by construction:
//   • report-only unless `--apply` is passed;
//   • it touches only ownerless, queue-less, live rows;
//   • rerunnable: a second pass over a converged org reports zero rows.
//
// Side effect worth knowing: the write is an ordinary update, so the
// `record-after-update` automation bound to these objects runs, as a person's
// edit would. The one that can act on it is `case_escalation`: an open
// Critical case that was never escalated is escalated, and the escalation
// hand-off gives it to a service manager when one is staffed. Its
// `record-after-create` twin escalated every Critical case when it was
// created, so a case it acts on here is one that was bypassed at creation.

type Json = Record<string, any>;

const DEFAULT_URL = 'http://localhost:4001';

/** Each object: its intake queue, and the fields that say whether a row is still live work. */
const INTAKE: ReadonlyArray<{ object: string; queue: string; fields: string[]; live: (row: Json) => boolean }> = [
  {
    object: 'crm_case',
    queue: 'case_intake',
    fields: ['status'],
    // The one "no longer live work" set (`CLOSED_CASE_STATUSES`, #1145).
    live: (row) => row.status !== 'resolved' && row.status !== 'closed',
  },
  {
    object: 'crm_lead',
    queue: 'lead_intake',
    fields: ['is_converted'],
    live: (row) => row.is_converted !== true,
  },
];

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

  private static message(json: Json): string {
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

  async patch(object: string, id: string, body: Json): Promise<void> {
    const { status, json } = await this.call('PATCH', `/api/v1/data/${object}/${id}`, body);
    if (status < 200 || status >= 300) throw new Error(`PATCH ${object}/${id} → ${status}: ${Api.message(json)}`);
  }
}

const empty = (value: unknown): boolean => value === null || value === undefined || value === '';
const waiting = (row: Json, live: (row: Json) => boolean): boolean => empty(row.owner_id) && empty(row.queue) && live(row);

async function main(): Promise<void> {
  const url = arg('url', 'HOTCRM_URL', DEFAULT_URL);
  const email = arg('email', 'HOTCRM_ADMIN_EMAIL', 'admin@objectos.ai');
  const password = arg('password', 'HOTCRM_ADMIN_PASSWORD', 'admin123');

  const api = new Api(new URL(url));
  const me = await api.signIn(email, password);
  console.log(`Signed in as ${me.email ?? me.id} at ${url}`);
  console.log(APPLY ? 'Mode: APPLY (records will be written)' : 'Mode: REPORT ONLY (pass --apply to write)');

  let failed = 0;
  let left = 0;
  for (const { object, queue, fields, live } of INTAKE) {
    const rows = await api.all(object, ['id', 'owner_id', 'queue', ...fields]);
    const stale = rows.filter((r) => waiting(r, live));
    console.log(`${object}: ${rows.length} row(s), ${stale.length} open and ownerless with no queue.`);
    if (!APPLY || stale.length === 0) continue;

    for (const r of stale) {
      try {
        await api.patch(object, String(r.id), { queue });
      } catch (err) {
        failed++;
        console.log(`  ${(err as Error).message}`);
      }
    }
    // Read back rather than trusting the PATCH answers.
    const after = (await api.all(object, ['id', 'owner_id', 'queue', ...fields])).filter((r) => waiting(r, live));
    left += after.length;
    console.log(`  queued ${stale.length - after.length}/${stale.length} in ${queue}; ${after.length} still without a queue.`);
  }
  if (!APPLY) {
    console.log('\nReport only. Re-run with --apply to write.');
    return;
  }
  if (left > 0 || failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(`\nBackfill failed: ${(err as Error).message}`);
  process.exitCode = 1;
});

// A module, not a global script: the sibling back-fills declare the same names.
export {};
