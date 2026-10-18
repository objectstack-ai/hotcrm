// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.
//
// One-time product-title backfill (#2086): give every line item created before
// `product_title` existed the title that names it.
//
//   pnpm exec tsx scripts/backfill-line-product-title.ts --url https://<your-org> --email <admin> --password <pw>
//   pnpm exec tsx scripts/backfill-line-product-title.ts ... --apply   # without this it only reports
//
// `product_title` is the `nameField` of `crm_opportunity_line_item` and
// `crm_quote_line_item`: a stored copy of the product's `display_title`. On a
// database upgraded to this version, every existing line holds no copy yet.
// Its record header and its entry in an opportunity's rail would fall back to
// the record id. On a dev database the seed replay re-writes the seeded lines
// at boot, through the line-side hook. A line a person created has no such
// path, and this script is its writer.
//
// It writes no title itself. A REST caller could not: the field is `readonly`,
// and the engine drops a value a user supplies. For each product that has a
// line with a missing or stale copy, it re-sends the product's own name,
// `{ name: <unchanged> }`. That triggers `product_title_mirror`
// (`src/revenue/objects/product.hook.ts`), the hook that follows a rename. It
// runs elevated, so it reaches every line of that product on both objects.
// Lines of closed deals and of accepted or expired quotes are included,
// because both line freezes list `product_title` as a key that is not a
// change. The name does not change, so nothing else about the product does.
//
// Safe by construction:
//   • report-only unless `--apply` is passed;
//   • it touches only products that have a line whose copy is missing or
//     differs from the product's title;
//   • rerunnable: a second pass over a converged org reports zero lines.
//
// The re-stamp is `async`, so the PATCH answers before the lines are written.
// The script re-reads until no line is left stale, or until `--wait` seconds
// (default 60) have passed.
//
// Side effect worth knowing: a line-item write re-runs the parent rollups
// (`opportunity_amount_rollup`, `quote_total_rollup`), exactly as a rep's edit
// would. The title is not a factor, so an open deal's amount and a draft
// quote's totals come out the same. Closed deals and accepted / expired
// quotes are skipped by those hooks, as always.

type Json = Record<string, any>;

const DEFAULT_URL = 'http://localhost:4001';

const LINE_OBJECTS = ['crm_opportunity_line_item', 'crm_quote_line_item'] as const;

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

interface Stale {
  object: string;
  id: string;
  product: string;
}

/** Every line whose copy is missing or differs from its product's title, and the products' titles. */
async function staleLines(api: Api): Promise<{ stale: Stale[]; total: Record<string, number>; products: Map<string, Json> }> {
  // `display_title` is a formula; the engine computes it on read, so this is
  // the title every product surface shows.
  const products = new Map((await api.all('crm_product', ['id', 'name', 'display_title'])).map((p) => [String(p.id), p]));
  const stale: Stale[] = [];
  const total: Record<string, number> = {};
  for (const object of LINE_OBJECTS) {
    const rows = await api.all(object, ['id', 'crm_product', 'product_title']);
    total[object] = rows.length;
    for (const r of rows) {
      const title = products.get(String(r.crm_product))?.display_title;
      if (typeof title === 'string' && title !== '' && r.product_title !== title) {
        stale.push({ object, id: String(r.id), product: String(r.crm_product) });
      }
    }
  }
  return { stale, total, products };
}

const count = (stale: Stale[], object: string) => stale.filter((s) => s.object === object).length;

async function main(): Promise<void> {
  const url = arg('url', 'HOTCRM_URL', DEFAULT_URL);
  const email = arg('email', 'HOTCRM_ADMIN_EMAIL', 'admin@objectos.ai');
  const password = arg('password', 'HOTCRM_ADMIN_PASSWORD', 'admin123');
  const waitSeconds = Number(arg('wait', 'HOTCRM_BACKFILL_WAIT', '60')) || 60;

  const api = new Api(new URL(url));
  const me = await api.signIn(email, password);
  console.log(`Signed in as ${me.email ?? me.id} at ${url}`);
  console.log(APPLY ? 'Mode: APPLY (records will be written)' : 'Mode: REPORT ONLY (pass --apply to write)');

  const before = await staleLines(api);
  const touch = [...new Set(before.stale.map((s) => s.product))];
  for (const object of LINE_OBJECTS) {
    console.log(`${object}: ${before.total[object]} row(s), ${count(before.stale, object)} without the product's title.`);
  }
  console.log(`${touch.length} product(s) to re-send.`);
  if (!APPLY) {
    console.log('\nReport only. Re-run with --apply to write.');
    return;
  }
  if (touch.length === 0) return;

  let failed = 0;
  for (const id of touch) {
    const name = before.products.get(id)?.name;
    try {
      await api.patch('crm_product', id, { name });
    } catch (err) {
      failed++;
      console.log(`  ${(err as Error).message}`);
    }
  }

  // Read back rather than trusting the PATCH answers: the re-stamp is async,
  // and only a re-read can say whether the lines now carry their title.
  const deadline = Date.now() + waitSeconds * 1000;
  let left = (await staleLines(api)).stale;
  while (left.length > 0 && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    left = (await staleLines(api)).stale;
  }
  for (const object of LINE_OBJECTS) {
    const was = count(before.stale, object);
    console.log(`  ${object}: backfilled ${was - count(left, object)}/${was}; ${count(left, object)} still without the product's title.`);
  }
  if (left.length > 0 || failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(`\nBackfill failed: ${(err as Error).message}`);
  process.exitCode = 1;
});

// A module, not a global script: the sibling back-fills declare the same names.
export {};
