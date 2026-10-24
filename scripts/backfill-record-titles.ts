// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.
//
// One-time record-title backfill (#2230): give every row written before its
// object's title was stored the title that names it.
//
//   pnpm exec tsx scripts/backfill-record-titles.ts --url https://<your-org> --email <admin> --password <pw>
//   pnpm exec tsx scripts/backfill-record-titles.ts ... --apply   # without this it only reports
//
// Nine objects title their records with a field the engine computes from the
// row's own columns: `display_title` (`full_name` on a contact). Until #2230
// those were `formula` fields, computed on read and stored nowhere. They are
// now stored `text` fields carrying the same `expression`, which the engine
// computes and stores on every insert and every update by id
// (objectstack#24981 ruling A: an import matches a lookup cell against a
// STORED title only, and sort and search read stored columns). On a database
// upgraded to this version every existing row of the nine holds no title yet,
// so its record header, its lookup chip and its search hit fall back to the
// record id, and an exported lookup column does not import back. A row
// created or edited after the upgrade is titled by that write. Rows nobody
// edits are this script's.
//
// It writes no title itself. A REST caller could not: the field is `readonly`,
// and the engine overwrites a value a client sends with the computed one. For
// each row with no title it re-sends one of the row's own fields, unchanged
// (`{ name: <unchanged> }`, and the per-object field in `TITLES` below). That
// write is an update by id, so the engine computes the title from the stored
// row and stores it. Nothing else about the row changes.
//
// Rows that are otherwise frozen are included: an accepted or expired quote, a
// closed case, a converted lead. Their freezes refuse a change to a business
// field, and re-sending a value unchanged is not a change.
//
// Safe by construction:
//   • report-only unless `--apply` is passed;
//   • it touches only rows whose title is missing;
//   • rerunnable: a second pass over a converged org reports zero rows.
//
// Side effect worth knowing: the write is an ordinary update, so the
// `record-after-update` automation bound to these objects runs, exactly as a
// person's edit would. The one that can act on a re-save is `case_escalation`
// (`src/service/flows/case-escalation.flow.ts`): an open Critical case that was
// never escalated is escalated and reassigned. Its `record-after-create` twin
// already escalated every Critical case when it was created, so a case it
// would act on here is one that was bypassed at creation.

type Json = Record<string, any>;

const DEFAULT_URL = 'http://localhost:4001';

/** Each object: the title field, and the field the backfill re-sends. */
const TITLES: ReadonlyArray<{ object: string; title: string; resend: string }> = [
  { object: 'crm_account', title: 'display_title', resend: 'name' },
  { object: 'crm_contact', title: 'full_name', resend: 'last_name' },
  { object: 'crm_lead', title: 'display_title', resend: 'company' },
  { object: 'crm_forecast', title: 'display_title', resend: 'period_label' },
  { object: 'crm_product', title: 'display_title', resend: 'name' },
  { object: 'crm_quote', title: 'display_title', resend: 'name' },
  { object: 'crm_campaign', title: 'display_title', resend: 'name' },
  { object: 'crm_case', title: 'display_title', resend: 'subject' },
  { object: 'crm_knowledge_article', title: 'display_title', resend: 'title' },
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

const untitled = (row: Json, title: string): boolean => typeof row[title] !== 'string' || row[title] === '';

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
  for (const { object, title, resend } of TITLES) {
    const rows = await api.all(object, ['id', title, resend]);
    const stale = rows.filter((r) => untitled(r, title));
    console.log(`${object}: ${rows.length} row(s), ${stale.length} without a stored ${title}.`);
    if (!APPLY || stale.length === 0) continue;

    for (const r of stale) {
      try {
        await api.patch(object, String(r.id), { [resend]: r[resend] ?? null });
      } catch (err) {
        failed++;
        console.log(`  ${(err as Error).message}`);
      }
    }
    // Read back rather than trusting the PATCH answers: only a re-read says
    // whether the row now stores its title.
    const after = (await api.all(object, ['id', title])).filter((r) => untitled(r, title));
    left += after.length;
    console.log(`  backfilled ${stale.length - after.length}/${stale.length}; ${after.length} still without a ${title}.`);
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
