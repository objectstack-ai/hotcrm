// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.
//
// One-time ownership backfill (#548) — `owner_id := owner`, where they diverge.
//
//   pnpm backfill:owner --url https://<your-org> --email <admin> --password <pw>
//   pnpm backfill:owner ... --apply        # without this it only reports
//
// ─── RUN THIS BEFORE UPGRADING, NOT AFTER ─────────────────────────────────
//
// HotCRM used to carry TWO ownership columns: an app-authored `owner` lookup
// (the Owner field on forms, the "My …" views, the analytics owner axis) and the
// platform's `owner_id` (what OWD, sharing rules and every access decision
// actually read). Nothing kept them in step, so on any org where somebody
// reassigned Owner the two disagree: the record shows one person and is
// accessible to another.
//
// This release removes `owner` and keeps `owner_id`. That makes the disagreement
// impossible going forward — and it also makes the OLD values unreachable: once
// the upgraded metadata is installed the engine no longer knows the `owner`
// column, so nothing can read the value that needs copying. There is no
// after-the-fact recovery short of a database dump.
//
// So this script talks to the REST API and nothing else — no imports from
// `src/`, no dependency on which version of the metadata is installed — and it
// is meant to be run against the org while it is STILL on the old release.
//
// Safe by construction:
//   • report-only unless `--apply` is passed;
//   • it only ever writes `owner_id`, and only on rows where the two columns
//     disagree AND `owner` names a real user;
//   • it needs an account holding `allowTransfer` (system_admin) — planting a
//     record under another user is a transfer, which is the whole point;
//   • rerunnable: a second pass over a converged org reports zero divergences.
//
// Rows whose `owner` is empty are LEFT ALONE deliberately: `owner_id` is the
// column that was always authoritative, and blanking it would revoke access
// from whoever legitimately holds the record today.

type Json = Record<string, any>;

const DEFAULT_URL = 'http://localhost:4001';

/**
 * Every object that carried the app-authored `owner` lookup, as of the release
 * that removed it. Written out literally rather than derived from `src/`: this
 * script describes the OLD schema, which the tree it lives in no longer has.
 */
const OBJECTS = [
  'crm_lead',
  'crm_account',
  'crm_contact',
  'crm_opportunity',
  'crm_case',
  'crm_task',
  'crm_event',
  'crm_quote',
  'crm_contract',
  'crm_campaign',
  'crm_knowledge_article',
  'crm_forecast',
] as const;

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

  async signIn(email: string, password: string): Promise<Json> {
    const { status, json } = await this.call('POST', '/api/v1/auth/sign-in/email', { email, password });
    if (status !== 200 || !json?.user?.id) {
      throw new Error(`sign-in failed for ${email} (${status}: ${json?.message ?? json?.code ?? 'unknown'})`);
    }
    return json.user as Json;
  }

  /** One page of rows. Returns `null` when the object has no `owner` column. */
  async page(object: string, skip: number, top: number): Promise<Json[] | null> {
    const { status, json } = await this.call('POST', `/api/v1/data/${object}/query`, {
      filters: [],
      fields: ['id', 'owner', 'owner_id'],
      sort: 'id asc',
      skip,
      top,
    });
    if (status < 200 || status >= 300) {
      const msg = json?.error?.message ?? json?.error ?? json?.message ?? JSON.stringify(json);
      // The post-upgrade shape: the column the backfill exists to read is gone.
      if (/owner/i.test(String(msg)) && /unknown|no such|not a field/i.test(String(msg))) return null;
      throw new Error(`query ${object} → ${status}: ${msg}`);
    }
    return (json.records ?? []) as Json[];
  }

  async patch(object: string, id: string, body: Json): Promise<void> {
    const { status, json } = await this.call('PATCH', `/api/v1/data/${object}/${id}`, body);
    if (status < 200 || status >= 300) {
      const msg = json?.error?.message ?? json?.error ?? json?.message ?? JSON.stringify(json);
      throw new Error(`PATCH ${object}/${id} → ${status}: ${msg}`);
    }
  }

  async userIds(): Promise<Set<string>> {
    const { status, json } = await this.call('POST', '/api/v1/data/sys_user/query', {
      filters: [], fields: ['id'], top: 2000,
    });
    if (status < 200 || status >= 300) throw new Error(`cannot read sys_user (${status})`);
    return new Set(((json.records ?? []) as Json[]).map((r) => String(r.id)));
  }
}

interface Divergence { object: string; id: string; from: string | null; to: string }

async function main(): Promise<void> {
  const url = arg('url', 'HOTCRM_URL', DEFAULT_URL);
  const email = arg('email', 'HOTCRM_ADMIN_EMAIL', 'admin@objectos.ai');
  const password = arg('password', 'HOTCRM_ADMIN_PASSWORD', 'admin123');

  const api = new Api(new URL(url));
  const me = await api.signIn(email, password);
  console.log(`Signed in as ${me.email ?? me.id} at ${url}`);
  console.log(APPLY ? 'Mode: APPLY (records will be written)' : 'Mode: REPORT ONLY (pass --apply to write)');

  const users = await api.userIds();
  const diverged: Divergence[] = [];
  const orphaned: Divergence[] = [];
  let scanned = 0;
  let skippedObjects = 0;

  for (const object of OBJECTS) {
    let skip = 0;
    for (;;) {
      const rows = await api.page(object, skip, 200);
      if (rows === null) {
        console.log(`  ${object}: no \`owner\` column — already upgraded, nothing to read`);
        skippedObjects++;
        break;
      }
      if (rows.length === 0) break;
      for (const row of rows) {
        scanned++;
        const owner = row.owner == null || row.owner === '' ? null : String(row.owner);
        const ownerId = row.owner_id == null || row.owner_id === '' ? null : String(row.owner_id);
        // No displayed owner ⇒ nothing to copy. Never blank `owner_id`: it is
        // the column that was always authoritative.
        if (owner === null) continue;
        if (owner === ownerId) continue;
        const hit: Divergence = { object, id: String(row.id), from: ownerId, to: owner };
        // A `owner` that names no real user was never enforceable and must not
        // become an access decision now (the field carried no referential
        // integrity — an arbitrary string could be written into it).
        (users.has(owner) ? diverged : orphaned).push(hit);
      }
      if (rows.length < 200) break;
      skip += rows.length;
    }
  }

  console.log(`\nScanned ${scanned} record(s) across ${OBJECTS.length - skippedObjects} object(s).`);

  if (orphaned.length > 0) {
    console.log(`\n${orphaned.length} record(s) name an Owner that is not a real user — SKIPPED:`);
    for (const d of orphaned.slice(0, 20)) console.log(`  ${d.object}/${d.id}: owner="${d.to}"`);
    if (orphaned.length > 20) console.log(`  … and ${orphaned.length - 20} more`);
    console.log('  Fix these by hand (or clear them) before the upgrade; they have never had');
    console.log('  a meaning at the access layer and copying them would invent one.');
  }

  if (diverged.length === 0) {
    console.log('\nNo divergence to backfill — the displayed Owner already IS the access owner.');
    return;
  }

  console.log(`\n${diverged.length} record(s) where the displayed Owner is NOT the access owner:`);
  for (const d of diverged.slice(0, 40)) {
    console.log(`  ${d.object}/${d.id}: owner_id ${d.from ?? '(none)'} → ${d.to}`);
  }
  if (diverged.length > 40) console.log(`  … and ${diverged.length - 40} more`);

  if (!APPLY) {
    console.log('\nReport only. Re-run with --apply to write these.');
    return;
  }

  let written = 0;
  const failures: string[] = [];
  for (const d of diverged) {
    try {
      await api.patch(d.object, d.id, { owner_id: d.to });
      written++;
    } catch (err) {
      failures.push(`${d.object}/${d.id}: ${(err as Error).message}`);
    }
  }
  console.log(`\nBackfilled ${written}/${diverged.length} record(s).`);
  if (failures.length > 0) {
    console.log(`${failures.length} failed:`);
    for (const f of failures.slice(0, 20)) console.log(`  ${f}`);
    console.log('\nA `transfer grant` refusal here means the signed-in account lacks');
    console.log('`allowTransfer` — reassigning ownership is gated. Use an administrator.');
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(`\nBackfill failed: ${(err as Error).message}`);
  process.exitCode = 1;
});
