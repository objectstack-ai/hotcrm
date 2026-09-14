// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { SelectOption } from '@objectstack/spec/data';

/**
 * Territory — the ONE place the country-to-territory mapping is authored.
 *
 * ⛔ Territory is a declared `select` on `crm_account`, derived from the billing
 * country by `account_protection`, and the sharing rules compare
 * `record.territory` against a declared value. A country string is never
 * compared again. Matching free text inside a CEL condition fails four ways,
 * all of them silent: an account whose country reads `United States` rather
 * than `US` lands in NO territory with nothing errored; adding a country means
 * editing a CEL string AND three localised tables with nothing to fail if you
 * edit fewer than all four; a wrong code (`UK` for `GB`) cannot be corrected
 * without evicting every account already typed that way; and free text has no
 * enumerable DOMAIN, so no authoring surface, import mapping or generated seed
 * can be checked against it.
 *
 * ### The three authored tables, and everything derived from them
 *
 * {@link TERRITORY_OPTIONS} (the picklist), {@link TERRITORY_COUNTRIES} (which
 * countries a territory covers) and {@link COUNTRY_ALIASES} (how else a country
 * may be spelled) are AUTHORED. {@link COUNTRY_TERRITORY} and
 * {@link territoryFor} are DERIVED from them, and so are the sharing rule
 * conditions, the account form's picklist and the documentation tables — see
 * `test/territory-single-source.test.ts`, which pins every derivation.
 *
 * ### ⚠️ Why `account.hook.ts` still carries a copy of this map
 *
 * It has to. A hook handler is lowered to a metadata-only `body.source` and
 * evaluated inside QuickJS with NO module scope: a reference to anything
 * exported here is not a closure at runtime, it is a `ReferenceError`.
 * `extractHookBody` rejects such a handler outright
 * (`detectFreeIdentifiers`), and `test/action-sandbox.test.ts` fails the
 * build's own lowering pass for every registered hook. So the derivation cannot
 * import this module — the table has to be inline in the handler.
 *
 * `test/territory-single-source.test.ts` closes that gap from both directions:
 * it parses the inline table out of the LOWERED body source and asserts deep
 * equality with {@link COUNTRY_TERRITORY} (so a country added to either side
 * alone is red), and it runs the real body in the real sandbox over every
 * declared spelling and asserts the territory it produces. The map is therefore
 * authored once even though it is stored twice.
 *
 * ### Scope of the country list
 *
 * This is a SPELLING table for the countries the two staffed territories cover,
 * not a world country list. The value domain is `na` / `emea` / `other`;
 * everything else — `SG`, `JP`, an empty address — is `other`, explicitly.
 */

/** The declared territory domain. `other` is a stated fact, never a blank. */
export type Territory = 'na' | 'emea' | 'other';

/**
 * The stored values, named. Every other declaration in the repo that needs one
 * spells it through here — including the sharing rule conditions, where `P`
 * quotes the interpolated value (`record.territory == "na"`), so a rename of a
 * territory value cannot be applied to the picklist and missed in the rules.
 */
export const TERRITORY: Record<'NA' | 'EMEA' | 'OTHER', Territory> = {
  NA: 'na',
  EMEA: 'emea',
  OTHER: 'other',
};

/**
 * The account picklist. `other` is deliberately a VALUE and not an empty
 * string: "this account belongs to no territory" and "nobody filled this in"
 * are different facts, and free text could not tell them apart (#639).
 */
export const TERRITORY_OPTIONS: SelectOption[] = [
  { label: 'North America', value: TERRITORY.NA, color: '#0070D2' },
  { label: 'EMEA', value: TERRITORY.EMEA, color: '#7C3AED' },
  { label: 'Other', value: TERRITORY.OTHER, color: '#999999' },
];

/** The territory every unmapped country falls into. */
export const TERRITORY_FALLBACK: Territory = TERRITORY.OTHER;

/**
 * Which countries each staffed territory covers, by ISO 3166-1 alpha-2 code.
 *
 * `other` is absent on purpose — it is the FALLBACK, reached by every country
 * not named here, so listing countries under it would be a second way to say
 * the same thing. The documentation tables render this record plus one row
 * stating the fallback.
 */
export const TERRITORY_COUNTRIES: Record<Exclude<Territory, 'other'>, readonly string[]> = {
  na: ['US', 'CA', 'MX'],
  emea: ['GB', 'DE', 'FR', 'IT', 'ES'],
};

/**
 * Accepted alternative spellings, mapped to the canonical code.
 *
 * Authored in DISPLAY form (`United States`, not `UNITED STATES`) because this
 * is what the documentation tables render — {@link COUNTRY_TERRITORY} applies
 * {@link normalizeCountry} when it flattens them, so the lookup is
 * case-insensitive without the authored table having to be shouted.
 *
 * `UK -> GB` is deliberate: `UK` is not the ISO 3166-1 alpha-2 code for the
 * United Kingdom, but the stock London account and every customer record typed
 * the same way must keep landing in `emea`. Because the rules no longer compare
 * a country at all, `GB` can be canonical AND `UK` can keep working.
 *
 * English names are here because they are what a CSV import, a generated seed
 * or a person typing into the address form actually produces. Native-language
 * spellings are NOT: they are unbounded, and the failure they would prevent is
 * now visible (`other`) rather than silent.
 */
export const COUNTRY_ALIASES: Record<string, string> = {
  'United States': 'US',
  'United States of America': 'US',
  USA: 'US',
  Canada: 'CA',
  Mexico: 'MX',
  UK: 'GB',
  'United Kingdom': 'GB',
  'Great Britain': 'GB',
  Germany: 'DE',
  France: 'FR',
  Italy: 'IT',
  Spain: 'ES',
};

/**
 * Every accepted spelling to its territory — the flattened form the hook body
 * carries inline and `test/territory-single-source.test.ts` pins it against.
 *
 * Derived, never authored: add a country to {@link TERRITORY_COUNTRIES} or a
 * spelling to {@link COUNTRY_ALIASES} and it appears here, in the docs tables
 * and (once the hook's inline copy is updated, which the pin test forces) in
 * the derivation.
 */
export const COUNTRY_TERRITORY: Record<string, Territory> = (() => {
  const map: Record<string, Territory> = {};
  for (const [territory, countries] of Object.entries(TERRITORY_COUNTRIES)) {
    for (const code of countries) map[code] = territory as Territory;
  }
  for (const [alias, code] of Object.entries(COUNTRY_ALIASES)) {
    const territory = map[code];
    if (!territory) {
      // A spelling pointing at a country no territory covers would resolve to
      // `other` and read as deliberate. Failing at module load makes it a
      // build-time error instead of a wrong answer at runtime.
      throw new Error(`COUNTRY_ALIASES: "${alias}" points at "${code}", which no territory covers`);
    }
    const key = normalizeCountry(alias);
    if (map[key] && map[key] !== territory) {
      // Two spellings that normalise to the same key and disagree: last write
      // would win, silently, and the loser's territory would just be wrong.
      throw new Error(`COUNTRY_ALIASES: "${alias}" collides with an entry mapped to "${map[key]}"`);
    }
    map[key] = territory;
  }
  return map;
})();

/**
 * The one normalisation rule: trim, collapse internal whitespace, upper-case.
 *
 * `crm_account.billing_country` stores exactly this form, and every key above
 * is written in it, so the lookup is a plain property read. `de `, ` DE` and
 * `United  States` are all handled here rather than by a tolerant lookup —
 * one rule, applied once, instead of a set of fallbacks at each reader.
 */
export function normalizeCountry(value: unknown): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').toUpperCase() : '';
}

/**
 * The territory a country string belongs to. Total: every input has an answer,
 * and an unrecognised one is `other` rather than blank.
 */
export function territoryFor(value: unknown): Territory {
  return COUNTRY_TERRITORY[normalizeCountry(value)] ?? TERRITORY_FALLBACK;
}
