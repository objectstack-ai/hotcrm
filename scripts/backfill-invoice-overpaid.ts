// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.
//
// One-time invoice-figures backfill (#2513): give every invoice stored before
// the overpayment rule its floored Open and its Overpaid amount.
//
//   pnpm exec tsx scripts/backfill-invoice-overpaid.ts --url https://<your-org> --email <admin> --password <pw>
//   pnpm exec tsx scripts/backfill-invoice-overpaid.ts ... --apply   # without this it only reports
//
// From #2513 an invoice paid more than its amount reads Open 0 and shows the
// excess in Overpaid, and the contract's and the account's Receivable Balance,
// which sum Open over the issued invoices, never go negative. The writer is
// `invoice_figures` (`src/o2c/objects/invoice.hook.ts`), and it runs when an
// invoice's amount, paid amount or status is written. An invoice stored before
// the rule keeps what it had until then: an overpaid one still reads a
// negative Open (and pulls both balances down by the excess), and every one
// reads an empty Overpaid.
//
// It writes no figure itself. A REST caller could not: both are `readonly`,
// and the engine drops a value a user supplies. For each invoice to heal it
// re-sends the invoice's own status, `{ status: <unchanged> }`, which runs
// `invoice_figures`; the balances follow the stored Open as for any invoice
// write. Nothing else about the invoice changes.
//
// Which invoices: every one whose Open is negative or whose Overpaid is empty.
// An empty Overpaid on a fully or partly unpaid invoice reads the same as 0, so
// those rows are listed but only the negative ones change a figure anyone sees.
//
// Safe by construction:
//   • report-only unless `--apply` is passed;
//   • rerunnable: a second pass over a converged org reports zero invoices.
//
// A row is also healed by its next payment, amount change or status change, so
// an org that never recorded an overpayment loses nothing by not running this.

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
   * (an empty `filters: []` and a string `sort: 'id asc'` are both refused by
   * the 17.6.0 query door, #1999). `test/backfill-query-bodies.test.ts` keeps it there.
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

const needsFigures = (r: Json) => Number(r.open_amount ?? 0) < 0 || r.overpaid_amount == null;

async function main(): Promise<void> {
  const url = arg('url', 'HOTCRM_URL', DEFAULT_URL);
  const email = arg('email', 'HOTCRM_ADMIN_EMAIL', 'admin@objectos.ai');
  const password = arg('password', 'HOTCRM_ADMIN_PASSWORD', 'admin123');

  const api = new Api(new URL(url));
  const me = await api.signIn(email, password);
  console.log(`Signed in as ${me.email ?? me.id} at ${url}`);
  console.log(APPLY ? 'Mode: APPLY (records will be written)' : 'Mode: REPORT ONLY (pass --apply to write)');

  const fields = ['id', 'invoice_number', 'status', 'amount', 'paid_amount', 'open_amount', 'overpaid_amount'];
  const rows = await api.all('crm_invoice', fields);
  const todo = rows.filter(needsFigures);
  const negative = todo.filter((r) => Number(r.open_amount ?? 0) < 0);
  console.log(`\ncrm_invoice: ${rows.length} row(s), ${todo.length} without the #2513 figures, ${negative.length} of them with a negative Open.`);
  for (const r of negative) {
    console.log(`  ${r.invoice_number}: amount ${r.amount}, paid ${r.paid_amount}, open ${r.open_amount}`);
  }
  if (todo.length === 0 || !APPLY) {
    if (!APPLY) console.log('\nReport only. Re-run with --apply to write.');
    return;
  }

  let failed = 0;
  for (const r of todo) {
    try {
      await api.patch('crm_invoice', String(r.id), { status: r.status });
    } catch (err) {
      failed++;
      console.log(`  ${(err as Error).message}`);
    }
  }
  // Read back rather than trusting the PATCH answers.
  const left = (await api.all('crm_invoice', fields)).filter(needsFigures);
  console.log(`  Backfilled ${todo.length - left.length}/${todo.length}; ${left.length} still without the figures.`);
  if (failed > 0 || left.length > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(`\nBackfill failed: ${(err as Error).message}`);
  process.exitCode = 1;
});

// A module, not a global script: the other backfills declare the same names.
export {};
