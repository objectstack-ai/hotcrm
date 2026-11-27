// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.
//
// Old-vs-new account figures for the 2026-11-26 ruling (hotcrm#2806): what
// each account read as its Receivable Balance, beside what it reads as Unpaid
// and Uninvoiced now. Read-only: it writes nothing.
//
//   pnpm exec tsx scripts/compare-unpaid-receivable.ts --url https://<your-org> --email <admin> --password <pw>
//
// Run it after the upgrade (so the new fields exist) and after
//
//   os migrate stored-expressions --object crm_sales_order --object crm_contract --object crm_billing_milestone --object crm_account --apply
//
// which fills Unpaid, Uninvoiced and the plan step's Open on the rows stored
// before the upgrade: they hold nothing until each row is next written.
//
// "Old" is the Receivable Balance exactly as it was defined (the 2026-11-15
// ruling B): the stored Open amount of the account's issued invoices, summed.
// The invoices keep that column (hidden, not deleted), and `invoice_figures`
// still keeps it in step with the payments that name an invoice, so the old
// figure is recomputed from the rows, not remembered. Each account that reads
// a non-zero figure on either side is listed; the totals close the table.

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

  /** Every row of `object`, paged (the query body `scripts/backfill-invoice-overpaid.ts` uses). */
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
}

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v ?? 0) || 0);
const money = (v: number): string => v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const refId = (v: unknown): string => (typeof v === 'string' ? v : v && typeof v === 'object' ? String((v as Json).id ?? '') : '');

async function main(): Promise<void> {
  const url = arg('url', 'HOTCRM_URL', DEFAULT_URL);
  const email = arg('email', 'HOTCRM_ADMIN_EMAIL', 'admin@objectos.ai');
  const password = arg('password', 'HOTCRM_ADMIN_PASSWORD', 'admin123');

  const api = new Api(new URL(url));
  const me = await api.signIn(email, password);
  console.log(`Signed in as ${me.email ?? me.id} at ${url}`);

  const invoices = await api.all('crm_invoice', ['id', 'crm_account', 'status', 'open_amount']);
  const oldBalance = new Map<string, number>();
  for (const i of invoices) {
    if (i.status !== 'issued') continue;
    const id = refId(i.crm_account);
    oldBalance.set(id, (oldBalance.get(id) ?? 0) + num(i.open_amount));
  }
  const accounts = await api.all('crm_account', ['id', 'name', 'invoiced_amount', 'received_amount', 'unpaid_amount', 'uninvoiced_amount']);
  const unfilled = accounts.filter((a) => a.unpaid_amount == null || a.uninvoiced_amount == null).length;

  const rows = accounts
    .map((a) => ({
      name: String(a.name ?? a.id),
      old: Math.round((oldBalance.get(String(a.id)) ?? 0) * 100) / 100,
      unpaid: num(a.unpaid_amount),
      uninvoiced: num(a.uninvoiced_amount),
      invoiced: num(a.invoiced_amount),
      received: num(a.received_amount),
    }))
    .filter((r) => r.old !== 0 || r.unpaid !== 0 || r.uninvoiced !== 0)
    .sort((a, b) => a.name.localeCompare(b.name));

  const header = ['Account', 'Receivable Balance (old)', 'Unpaid (new)', 'Change', 'Uninvoiced (new)', 'Invoiced', 'Received'];
  const line = (cells: string[]) => `| ${cells.join(' | ')} |`;
  console.log('');
  console.log(line(header));
  console.log(line(header.map((_, i) => (i === 0 ? '---' : '---:'))));
  const total = { old: 0, unpaid: 0, uninvoiced: 0, invoiced: 0, received: 0 };
  for (const r of rows) {
    console.log(line([r.name, money(r.old), money(r.unpaid), money(r.unpaid - r.old), money(r.uninvoiced), money(r.invoiced), money(r.received)]));
    for (const k of Object.keys(total) as Array<keyof typeof total>) total[k] += r[k];
  }
  console.log(line(['**Total**', money(total.old), money(total.unpaid), money(total.unpaid - total.old), money(total.uninvoiced), money(total.invoiced), money(total.received)]));
  console.log(`\n${accounts.length} account(s) read, ${rows.length} with a figure on either side.`);
  if (unfilled > 0) {
    console.log(`${unfilled} account(s) hold no Unpaid or Uninvoiced yet: run \`os migrate stored-expressions\` (above) first.`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(`\nComparison failed: ${(err as Error).message}`);
  process.exitCode = 1;
});

// A module, not a global script: the other scripts declare the same names.
export {};
