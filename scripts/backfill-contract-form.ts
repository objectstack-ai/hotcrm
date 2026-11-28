// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.
//
// One-time contract forms (#2804): give every contract saved before contracts
// had a form one, and list the order contracts whose value differs from their
// order, for the business to check.
//
//   pnpm exec tsx scripts/backfill-contract-form.ts --url https://<your-org> --email <admin> --password <pw>
//   pnpm exec tsx scripts/backfill-contract-form.ts ... --apply   # without this it only reports
//
// From #2804 every contract has a Contract Form (`crm_contract.contract_form`):
// Order Contract, Framework Contract or Other. The rule that gives an older
// contract its form is the maintainer's (ruling 2026-11-26, item 7) and lives
// in ONE place, the contract hook (`contract_form_and_change`,
// `src/sales/objects/contract.hook.ts`), which applies it to a contract with
// no form on that contract's next write:
//
//   1. drafted by Draft Contract (it carries the drafted mark) and named by
//      an order ⇒ Order Contract, that order its Source Order;
//   2. no amount ⇒ Other;
//   3. every other contract ⇒ Framework Contract.
//
// Run the platform's own step first, `pnpm exec objectstack migrate
// summary-nulls --apply --yes`, which computes the order roll-ups (the
// linked order amount this script compares, hotcrm#2806) on the contracts
// that predate it; without it the order contracts cannot be compared, and the
// script says so and exits non-zero. The order of the two does not matter
// for the values: neither corrects one.
//
// So this script decides nothing itself. It writes each contract with no form
// once, as the administrator signed in, one PATCH carrying `contract_form:
// null` (no choice: the hook applies the rule and writes the form), and reads
// the forms back. The contract's other fields, its value and status included,
// are left as they are: an order contract whose value already differs from
// its order is NOT corrected (item 7). Those are listed at the end, from the
// stored Contract Value and linked order amount; the app shows each of them
// "Differs from the Order Amount" too.
//
// Safe by construction:
//   • report-only unless `--apply` is passed: it then lists the contracts
//     without a form, and the difference list as it stands;
//   • rerunnable: a contract that has a form is never written, so a second
//     pass over a converged org writes nothing.
//
// ⛔ Run against your own org only. The HotCRM maintainers never run it
// against a hosted org: the hosted tenants' owner decides when and whether
// it runs there.

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
   * Every row of `object`, paged. The body is the shape the installed query
   * schema accepts: `sort` as `[{ field, order }]` and no `filters` key at all
   * (#1999). `test/backfill-query-bodies.test.ts` keeps it there.
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

/** A lookup value as the query door returns it: the id, or an expanded row. */
const text = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
const blank = (v: unknown): boolean => text(v) === '';
const money = (v: unknown): number => (v === null || v === undefined || v === '' ? 0 : Number(v));

async function main(): Promise<void> {
  const url = arg('url', 'HOTCRM_URL', DEFAULT_URL);
  const email = arg('email', 'HOTCRM_ADMIN_EMAIL', 'admin@objectos.ai');
  const password = arg('password', 'HOTCRM_ADMIN_PASSWORD', 'admin123');

  const api = new Api(new URL(url));
  const me = await api.signIn(email, password);
  console.log(`Signed in as ${me.email ?? me.id} at ${url}`);
  console.log(APPLY ? 'Mode: APPLY (records will be written)' : 'Mode: REPORT ONLY (pass --apply to write)');

  const FIELDS = ['id', 'contract_number', 'name', 'contract_form', 'contract_value', 'linked_order_amount'];
  const contracts = await api.all('crm_contract', FIELDS);
  const formless = contracts.filter((c) => blank(c.contract_form));
  console.log(`\ncrm_contract: ${contracts.length} row(s), ${formless.length} without a form.`);
  for (const c of formless) console.log(`  ${c.contract_number ?? c.id} "${text(c.name)}"`);

  let failed = 0;
  let after = contracts;
  if (APPLY && formless.length > 0) {
    for (const c of formless) {
      try {
        await api.patch('crm_contract', String(c.id), { contract_form: null });
      } catch (err) {
        failed++;
        console.log(`  ${c.contract_number ?? c.id}: ${(err as Error).message}`);
      }
    }
    // Read back rather than trusting the PATCH answers.
    after = await api.all('crm_contract', FIELDS);
    const left = after.filter((c) => blank(c.contract_form));
    const byForm = new Map<string, number>();
    for (const c of after) {
      if (formless.some((f) => f.id === c.id) && !blank(c.contract_form)) {
        byForm.set(text(c.contract_form), (byForm.get(text(c.contract_form)) ?? 0) + 1);
      }
    }
    console.log(`  Formed ${formless.length - left.length}/${formless.length}: ${[...byForm].map(([f, n]) => `${f} ${n}`).join(', ') || 'none'}; ${left.length} still without a form.`);
    if (left.length > 0) failed++;
  } else if (!APPLY && formless.length > 0) {
    console.log('\nReport only. Re-run with --apply to write.');
  }

  // The difference list (item 7): order contracts whose value is not their
  // order's amount, for the business to check. Nothing here corrects them.
  // An Order Amount still NULL has not been computed for a contract that
  // predates the field: the platform's own step fills it, and until then the
  // contract cannot be compared.
  const orders = after.filter((c) => c.contract_form === 'order');
  const uncounted = orders.filter((c) => c.linked_order_amount === null || c.linked_order_amount === undefined);
  const differing = orders.filter((c) => !uncounted.includes(c) && money(c.contract_value) !== money(c.linked_order_amount));
  if (uncounted.length > 0) {
    console.log(`\n${uncounted.length} order contract(s) have no Order Amount yet: run \`pnpm exec objectstack migrate summary-nulls --apply --yes\`, then this script again, to compare them.`);
    failed++;
  }
  console.log(`\nOrder contracts whose value differs from the order amount: ${differing.length}.`);
  for (const c of differing) {
    console.log(`  ${c.contract_number ?? c.id} "${text(c.name)}": contract ${money(c.contract_value)}, order ${money(c.linked_order_amount)}`);
  }
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(`\nBackfill failed: ${(err as Error).message}`);
  process.exitCode = 1;
});

// A module, not a global script: the other backfills declare the same names.
export {};
