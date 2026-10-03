// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.
//
// One-time line-number backfill (#1828) — give every line item created before
// the assigner hook its ordinal.
//
//   pnpm exec tsx scripts/backfill-line-number.ts --url https://<your-org> --email <admin> --password <pw>
//   pnpm exec tsx scripts/backfill-line-number.ts ... --apply   # without this it only reports
//
// `line_number` on `crm_opportunity_line_item` and `crm_quote_line_item` is
// `readonly`: platform-assigned. Until #1828 nothing assigned it, and since
// @objectstack/objectql 17.4.0 a readonly column is stripped from every
// non-system caller's INSERT, so each line a rep created stored a null ordinal —
// which the billing hand-off payload then shipped (`LINE_ITEM_FIELDS`).
//
// The writer is the `*_line_item_line_number` hook
// (`src/revenue/objects/_line-item-price-fill.ts`). It stamps an ordinal on
// insert, and ALSO on an update of a row that still has none — that second
// trigger is what this script pulls. It never writes a number itself (it could
// not: this is a REST caller, and the engine strips a readonly key it
// supplies); it sends `{ line_number: null }` to each null row, one PATCH per
// row, and the hook — whose written keys the engine keeps — stamps
// `(highest ordinal under the parent) + 1`.
//
// Order is the point of running it here rather than waiting for the next edit
// to heal each row: rows are touched parent by parent, oldest first
// (`created_at`, then `id`), so within a parent the ordinals follow creation
// order, after any ordinal the parent already carries.
//
// Safe by construction:
//   • report-only unless `--apply` is passed;
//   • it only touches rows whose `line_number` is empty; the hook never
//     renumbers a row that has one;
//   • rerunnable: a second pass over a converged org reports zero rows.
//
// Side effect worth knowing: a line-item write re-runs the parent rollups
// (`opportunity_amount_rollup`, `quote_total_rollup`), exactly as a rep's edit
// would — an open deal's amount / a draft quote's totals are recomputed from
// their lines. Closed deals and accepted / expired quotes are skipped by those
// hooks, as always.

type Json = Record<string, any>;

const DEFAULT_URL = 'http://localhost:4001';

/** The two line-item objects and the master-detail field that is each one's parent. */
const OBJECTS = [
  ['crm_opportunity_line_item', 'crm_opportunity'],
  ['crm_quote_line_item', 'crm_quote'],
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

  /** Every row of `object`, paged. */
  async all(object: string, fields: string[]): Promise<Json[]> {
    const out: Json[] = [];
    for (let skip = 0; ; ) {
      const { status, json } = await this.call('POST', `/api/v1/data/${object}/query`, {
        filters: [], fields, sort: 'id asc', skip, top: 200,
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

const unnumbered = (r: Json) => typeof r.line_number !== 'number';

/** Parent by parent, oldest first — the order the ordinals should read in. */
function touchOrder(rows: Json[], parentKey: string): Json[] {
  const key = (r: Json) => [String(r[parentKey] ?? ''), String(r.created_at ?? ''), String(r.id)];
  return [...rows].sort((a, b) => {
    const [ka, kb] = [key(a), key(b)];
    for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return ka[i] < kb[i] ? -1 : 1;
    return 0;
  });
}

async function main(): Promise<void> {
  const url = arg('url', 'HOTCRM_URL', DEFAULT_URL);
  const email = arg('email', 'HOTCRM_ADMIN_EMAIL', 'admin@objectos.ai');
  const password = arg('password', 'HOTCRM_ADMIN_PASSWORD', 'admin123');

  const api = new Api(new URL(url));
  const me = await api.signIn(email, password);
  console.log(`Signed in as ${me.email ?? me.id} at ${url}`);
  console.log(APPLY ? 'Mode: APPLY (records will be written)' : 'Mode: REPORT ONLY (pass --apply to write)');

  let failed = 0;
  for (const [object, parentKey] of OBJECTS) {
    const fields = ['id', parentKey, 'line_number', 'created_at'];
    const rows = await api.all(object, fields);
    const todo = touchOrder(rows.filter(unnumbered), parentKey);
    const parents = new Set(todo.map((r) => r[parentKey]));
    console.log(`\n${object}: ${rows.length} row(s), ${todo.length} without a line number, under ${parents.size} parent(s).`);
    if (todo.length === 0 || !APPLY) continue;

    for (const r of todo) {
      try {
        await api.patch(object, String(r.id), { line_number: null });
      } catch (err) {
        failed++;
        console.log(`  ${(err as Error).message}`);
      }
    }
    // Read back rather than trusting the PATCH answers: the question is whether
    // the rows now carry an ordinal, and only a re-read can say so.
    const left = (await api.all(object, fields)).filter(unnumbered);
    console.log(`  Backfilled ${todo.length - left.length}/${todo.length}; ${left.length} still without a line number.`);
    if (left.length > 0) failed++;
  }

  if (!APPLY) console.log('\nReport only. Re-run with --apply to write.');
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(`\nBackfill failed: ${(err as Error).message}`);
  process.exitCode = 1;
});

// A module, not a global script: `backfill-owner-id.ts` declares the same names.
export {};
