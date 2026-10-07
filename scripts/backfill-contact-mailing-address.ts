// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.
//
// One-time mailing-address conversion (#1836) — compose `crm_contact.mailing_address`
// from the five flat columns it replaced.
//
//   pnpm exec tsx scripts/backfill-contact-mailing-address.ts --url https://<your-org> --email <admin> --password <pw>
//   pnpm exec tsx scripts/backfill-contact-mailing-address.ts ... --apply   # without this it only reports
//
// On @objectstack 17.7.0 and later, read the old columns with the platform's
// own command first, from the project root, and hand its output to this script:
//
//   pnpm exec objectstack migrate unmapped-columns --object crm_contact --json > contact-unmapped.json
//   pnpm exec tsx scripts/backfill-contact-mailing-address.ts ... --unmapped contact-unmapped.json [--apply]
//
// ─── RUN THIS AFTER UPGRADING, AND BEFORE `os migrate apply --allow-destructive` ───
//
// HotCRM used to store a contact's address as five text fields —
// `mailing_street`, `mailing_city`, `mailing_state`, `mailing_postal_code`,
// `mailing_country`. This release replaces them with ONE structured
// `mailing_address` (`Field.address()`), the shape `crm_account.billing_address`
// and `crm_lead.address` already use.
//
// Upgrading does not move the old values, and it does not delete them either:
// the five columns stay in the database as ORPHANED columns (`os migrate plan`
// lists them as `unmapped_column`). `os migrate apply --allow-destructive` drops
// orphaned columns, and with them the only copy of the old addresses, so run
// this first. Where the old values are read from depends on the runtime:
//   • @objectstack 17.7.0 and later serve declared fields only, so no REST read
//     returns an orphaned column (measured: the unprojected read of a contact
//     whose `mailing_street` column held a value carried no `mailing_*` key).
//     The operator-only `os migrate unmapped-columns` reads them straight from
//     the database instead; pass its JSON with `--unmapped FILE`.
//   • Without `--unmapped`, the script reads the unprojected REST rows, which
//     still carried the orphaned columns on 17.6.0 (measured with SQLite).
//
// It writes through the REST API and nothing else — no imports from `src/`, no
// raw SQL — so the old column names are written out literally below.
//
// What it writes, per contact:
//   • the non-blank old columns become the matching parts of `mailing_address`
//     (street, city, state, postalCode, country) — the same rule the import
//     uses for the five template columns: a blank column is no part, and a
//     contact with all five blank is left empty;
//   • it writes ONLY `mailing_address`, and only where it is empty today.
//
// Safe by construction:
//   • report-only unless `--apply` is passed;
//   • it never overwrites a `mailing_address` that already holds a value — a
//     contact somebody edited after the upgrade keeps that edit, and is listed;
//   • it never writes or deletes the old columns (it cannot: they are no longer
//     fields), so a value it cannot map stays where it is, and is listed;
//   • rerunnable: a second pass over a converted org reports zero rows to write.

import { readFileSync } from 'node:fs';

type Json = Record<string, any>;

const DEFAULT_URL = 'http://localhost:4001';
const OBJECT = 'crm_contact';
const TARGET = 'mailing_address';

/** The five retired columns and the `address` part each one becomes. Literal: they exist in no metadata any more. */
const LEGACY_TO_PART = [
  ['mailing_street', 'street'],
  ['mailing_city', 'city'],
  ['mailing_state', 'state'],
  ['mailing_postal_code', 'postalCode'],
  ['mailing_country', 'country'],
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

/**
 * The old values, keyed by contact id, from the JSON `os migrate
 * unmapped-columns --object crm_contact --json` prints — `{ object, records:
 * [{ id, values: { <column>: <value> } }] }`. Read from the file, never guessed.
 */
function readUnmapped(file: string): Map<string, Json> {
  const doc = JSON.parse(readFileSync(file, 'utf8')) as Json;
  if (doc?.object !== OBJECT || !Array.isArray(doc?.records)) {
    throw new Error(`${file} is not \`os migrate unmapped-columns --object ${OBJECT} --json\` output`);
  }
  return new Map((doc.records as Json[]).map((r) => [String(r.id), (r.values ?? {}) as Json]));
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

  /**
   * Every contact, paged, WITHOUT a `fields` projection: naming a retired
   * column in `fields` is refused (`INVALID_FIELD`), while the unprojected row
   * still carries the orphaned columns. Two spellings the older backfill
   * scripts use are refused by 17.6.0's query schema, so neither is used here:
   * an empty `filters: []` (`min_items`) and a string `sort: 'id asc'`.
   */
  async allContacts(): Promise<Json[]> {
    const out: Json[] = [];
    for (let skip = 0; ; ) {
      const { status, json } = await this.call('POST', `/api/v1/data/${OBJECT}/query`, {
        sort: [{ field: 'id', order: 'asc' }], skip, top: 200,
      });
      if (status < 200 || status >= 300) throw new Error(`query ${OBJECT} → ${status}: ${Api.message(json)}`);
      const rows = (json.records ?? []) as Json[];
      out.push(...rows);
      if (rows.length < 200) return out;
      skip += rows.length;
    }
  }

  async patch(id: string, body: Json): Promise<void> {
    const { status, json } = await this.call('PATCH', `/api/v1/data/${OBJECT}/${id}`, body);
    if (status < 200 || status >= 300) throw new Error(`PATCH ${OBJECT}/${id} → ${status}: ${Api.message(json)}`);
  }
}

type Parts = Partial<Record<(typeof LEGACY_TO_PART)[number][1], string>>;

/** A cell that holds nothing: absent, null, or only whitespace. */
const blank = (v: unknown): boolean => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

/**
 * The address the five old columns spell, or why it cannot be composed. A
 * number is stringified (a postal code a driver handed back numerically); any
 * other non-text value is not guessed at.
 */
function compose(row: Json): { parts: Parts } | { unmappable: string } {
  const parts: Parts = {};
  for (const [column, part] of LEGACY_TO_PART) {
    const v = row[column];
    if (blank(v)) continue;
    if (typeof v === 'string') parts[part] = v;
    else if (typeof v === 'number') parts[part] = String(v);
    else return { unmappable: `${column} holds a ${typeof v}, not text` };
  }
  return { parts };
}

const isEmptyAddress = (v: unknown): boolean =>
  blank(v) || (typeof v === 'object' && v !== null && Object.values(v).every(blank));

/** Same parts, same text — key order and absent-versus-blank parts do not matter. */
function sameAddress(current: unknown, parts: Parts): boolean {
  if (typeof current !== 'object' || current === null) return false;
  const cur = current as Json;
  return LEGACY_TO_PART.every(([, part]) => (blank(cur[part]) ? undefined : String(cur[part])) === parts[part]);
}

interface Todo { id: string; parts: Parts }

async function main(): Promise<void> {
  const url = arg('url', 'HOTCRM_URL', DEFAULT_URL);
  const email = arg('email', 'HOTCRM_ADMIN_EMAIL', 'admin@objectos.ai');
  const password = arg('password', 'HOTCRM_ADMIN_PASSWORD', 'admin123');

  const api = new Api(new URL(url));
  const me = await api.signIn(email, password);
  console.log(`Signed in as ${me.email ?? me.id} at ${url}`);
  console.log(APPLY ? 'Mode: APPLY (records will be written)' : 'Mode: REPORT ONLY (pass --apply to write)');

  const unmappedFile = arg('unmapped', 'HOTCRM_UNMAPPED_FILE', '');
  const legacy = unmappedFile ? readUnmapped(unmappedFile) : undefined;
  if (unmappedFile) console.log(`Old columns: ${legacy!.size} row(s) from ${unmappedFile}`);

  // With `--unmapped`, the old columns come from the file and everything else
  // (the current `mailing_address`) from the REST row; a file row whose contact
  // the API does not return is listed, never written.
  const rest = await api.allContacts();
  const rows = legacy ? rest.map((r) => ({ ...r, ...(legacy.get(String(r.id)) ?? {}) })) : rest;
  if (legacy) {
    const seen = new Set(rest.map((r) => String(r.id)));
    const missing = [...legacy.keys()].filter((id) => !seen.has(id));
    if (missing.length) console.log(`  ${missing.length} id(s) in the file that the API does not return (skipped): ${missing.slice(0, 20).join(', ')}`);
  }
  const legacyVisible = rows.some((r) => LEGACY_TO_PART.some(([column]) => column in r));

  const todo: Todo[] = [];
  const converged: string[] = [];
  const kept: Array<{ id: string; current: unknown; old: Parts }> = [];
  const unmappable: Array<{ id: string; why: string }> = [];
  let noAddress = 0;

  for (const row of rows) {
    const id = String(row.id);
    const composed = compose(row);
    if ('unmappable' in composed) { unmappable.push({ id, why: composed.unmappable }); continue; }
    const { parts } = composed;
    if (Object.keys(parts).length === 0) { noAddress++; continue; }
    const current = row[TARGET];
    if (sameAddress(current, parts)) { converged.push(id); continue; }
    // Somebody wrote an address after the upgrade (a form edit, an import):
    // theirs is the newer fact. Never overwrite it.
    if (!isEmptyAddress(current)) { kept.push({ id, current, old: parts }); continue; }
    todo.push({ id, parts });
  }

  console.log(`\n${OBJECT}: ${rows.length} contact(s).`);
  if (!legacyVisible) {
    console.log('\nNo contact carries any of the five old mailing_* columns, so there is nothing to');
    console.log('read here. Either this org never had them (installed on this release or later), or');
    console.log('they are gone — dropped by `os migrate apply --allow-destructive`, or not returned by');
    console.log('this runtime. In the last two cases the old addresses cannot be recovered from the API.');
    if (!legacy) {
      console.log('On @objectstack 17.7.0 or later no REST read returns an orphaned column: read them with');
      console.log(`\`objectstack migrate unmapped-columns --object ${OBJECT} --json > FILE\` and pass --unmapped FILE.`);
    }
    return;
  }
  console.log(`  ${noAddress} with no old address (left empty)`);
  console.log(`  ${converged.length} already converted`);
  console.log(`  ${kept.length} whose mailing_address already holds a different value (kept, not overwritten)`);
  console.log(`  ${unmappable.length} with an old value that cannot be mapped (left where it is)`);
  console.log(`  ${todo.length} to convert`);
  for (const k of kept.slice(0, 20)) {
    console.log(`    kept ${k.id}: has ${JSON.stringify(k.current)}; old columns spell ${JSON.stringify(k.old)}`);
  }
  for (const u of unmappable.slice(0, 20)) console.log(`    unmappable ${u.id}: ${u.why}`);
  for (const t of todo.slice(0, 20)) console.log(`    convert ${t.id}: ${JSON.stringify(t.parts)}`);
  if (todo.length > 20) console.log(`    … and ${todo.length - 20} more`);

  if (todo.length === 0) {
    console.log('\nNothing to convert.');
    return;
  }
  if (!APPLY) {
    console.log('\nReport only. Re-run with --apply to write.');
    return;
  }

  const failures: string[] = [];
  for (const t of todo) {
    try {
      await api.patch(t.id, { [TARGET]: t.parts });
    } catch (err) {
      failures.push((err as Error).message);
    }
  }
  // Read back rather than trusting the PATCH answers: the question is whether
  // each contact now carries the address its old columns spelled.
  const after = new Map((await api.allContacts()).map((r) => [String(r.id), r]));
  const left = todo.filter((t) => !sameAddress(after.get(t.id)?.[TARGET], t.parts));
  console.log(`\nConverted ${todo.length - left.length}/${todo.length}; ${left.length} still without their address.`);
  for (const f of failures.slice(0, 20)) console.log(`  ${f}`);
  if (left.length > 0 || failures.length > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(`\nBackfill failed: ${(err as Error).message}`);
  process.exitCode = 1;
});

// A module, not a global script: `backfill-owner-id.ts` declares the same names.
export {};
