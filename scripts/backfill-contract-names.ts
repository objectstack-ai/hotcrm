// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.
//
// One-time contract naming (#2746): give every contract saved before contracts
// had a name one, so its title is never empty.
//
//   pnpm exec tsx scripts/backfill-contract-names.ts --url https://<your-org> --email <admin> --password <pw>
//   pnpm exec tsx scripts/backfill-contract-names.ts ... --apply   # without this it only reports
//
// From #2746 a contract's title is its Contract Name (`crm_contract.name`,
// required), no longer its number. A contract saved before then has no name:
// its record header, lookup chips, approvals and notices fall back to the
// record id until it is named. This names each one, in this order:
//
//   1. its source quote's name — the quote of an order that names the
//      contract, else the one accepted quote of the contract's opportunity
//      (an opportunity with several accepted quotes names none of them);
//   2. otherwise the account's name and the contract's start date,
//      `Acme Corporation 2026-11-24`.
//
// The name is written as the administrator signed in, one PATCH per contract
// carrying only `name`; the contract's other fields, its status included, are
// left as they are. An administrator can rename any contract afterwards.
//
// Safe by construction:
//   • report-only unless `--apply` is passed;
//   • rerunnable: a contract that has a name is never touched, so a second
//     pass over a converged org reports zero contracts.
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

  /** As `all`, but an object or field this org does not serve (the module is disabled) reads as no rows. */
  async allIfServed(object: string, fields: string[]): Promise<Json[]> {
    try {
      return await this.all(object, fields);
    } catch (err) {
      console.log(`  (${object} not read: ${(err as Error).message})`);
      return [];
    }
  }

  async patch(object: string, id: string, body: Json): Promise<void> {
    const { status, json } = await this.call('PATCH', `/api/v1/data/${object}/${id}`, body);
    if (status < 200 || status >= 300) throw new Error(`PATCH ${object}/${id} → ${status}: ${Api.message(json)}`);
  }
}

/** A lookup value as the query door returns it: the id, or an expanded row. */
const idOf = (v: unknown): string => String(typeof v === 'object' && v !== null ? (v as Json).id : v ?? '');
const text = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
const blank = (v: unknown): boolean => text(v) === '';

async function main(): Promise<void> {
  const url = arg('url', 'HOTCRM_URL', DEFAULT_URL);
  const email = arg('email', 'HOTCRM_ADMIN_EMAIL', 'admin@objectos.ai');
  const password = arg('password', 'HOTCRM_ADMIN_PASSWORD', 'admin123');

  const api = new Api(new URL(url));
  const me = await api.signIn(email, password);
  console.log(`Signed in as ${me.email ?? me.id} at ${url}`);
  console.log(APPLY ? 'Mode: APPLY (records will be written)' : 'Mode: REPORT ONLY (pass --apply to write)');

  const contracts = await api.all('crm_contract', ['id', 'contract_number', 'name', 'crm_account', 'crm_opportunity', 'start_date']);
  const unnamed = contracts.filter((c) => blank(c.name));
  console.log(`\ncrm_contract: ${contracts.length} row(s), ${unnamed.length} without a name.`);
  if (unnamed.length === 0) return;

  const accounts = new Map((await api.all('crm_account', ['id', 'name'])).map((a) => [String(a.id), text(a.name)]));
  // The quote module may be disabled: no quotes, and orders without a quote.
  const quotes = await api.allIfServed('crm_quote', ['id', 'name', 'status', 'crm_opportunity']);
  const orders = await api.allIfServed('crm_sales_order', ['id', 'crm_contract', 'crm_quote']);
  const quoteName = new Map(quotes.map((q) => [String(q.id), text(q.name)]));
  const quoteOfContract = new Map<string, string>();
  for (const o of orders) {
    const q = quoteName.get(idOf(o.crm_quote));
    if (!blank(o.crm_contract) && q) quoteOfContract.set(idOf(o.crm_contract), q);
  }
  const acceptedByOpportunity = new Map<string, string[]>();
  for (const q of quotes) {
    if (q.status !== 'accepted' || blank(q.crm_opportunity) || blank(q.name)) continue;
    const key = idOf(q.crm_opportunity);
    acceptedByOpportunity.set(key, [...(acceptedByOpportunity.get(key) ?? []), text(q.name)]);
  }

  const plan = unnamed.map((c) => {
    const accepted = acceptedByOpportunity.get(idOf(c.crm_opportunity)) ?? [];
    const fromQuote = quoteOfContract.get(String(c.id)) ?? (accepted.length === 1 ? accepted[0] : undefined);
    const fallback = [accounts.get(idOf(c.crm_account)) ?? '', text(c.start_date).slice(0, 10)].filter((s) => s !== '').join(' ');
    const name = (fromQuote ?? fallback).slice(0, 255);
    return { c, name, from: fromQuote ? 'source quote' : 'account + start date' };
  });
  for (const { c, name, from } of plan) {
    console.log(`  ${c.contract_number ?? c.id}: → "${name}" (${from})`);
  }
  const nameless = plan.filter((p) => p.name === '');
  for (const { c } of nameless) console.log(`  ${c.contract_number ?? c.id}: no account name and no start date — name it by hand.`);
  if (!APPLY) {
    console.log('\nReport only. Re-run with --apply to write.');
    return;
  }

  let failed = 0;
  for (const { c, name } of plan.filter((p) => p.name !== '')) {
    try {
      await api.patch('crm_contract', String(c.id), { name });
    } catch (err) {
      failed++;
      console.log(`  ${c.contract_number ?? c.id}: ${(err as Error).message}`);
    }
  }
  // Read back rather than trusting the PATCH answers.
  const left = (await api.all('crm_contract', ['id', 'name'])).filter((c) => blank(c.name));
  console.log(`  Named ${unnamed.length - left.length}/${unnamed.length}; ${left.length} still without a name.`);
  if (failed > 0 || left.length > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(`\nBackfill failed: ${(err as Error).message}`);
  process.exitCode = 1;
});

// A module, not a global script: the other backfills declare the same names.
export {};
