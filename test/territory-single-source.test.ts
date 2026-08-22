// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import stack from '../objectstack.config';
import { REPO_ROOT } from './helpers/repo-root';
import { allHooks } from '../src/hooks';
import { hookNamed } from './helpers/hook-harness';
import { extractSandboxBody, runHookBody } from './helpers/action-sandbox';
import {
  COUNTRY_ALIASES,
  COUNTRY_TERRITORY,
  TERRITORY,
  TERRITORY_COUNTRIES,
  TERRITORY_FALLBACK,
  TERRITORY_OPTIONS,
  normalizeCountry,
  territoryFor,
  type Territory,
} from '../src/objects/_territory';

/**
 * Territory is authored ONCE (#639).
 *
 * ### The defect this file exists to catch
 *
 * Before #639 the country-to-territory mapping existed in four independent
 * copies: two CEL condition strings in `src/sharing/account.sharing.ts` and the
 * localised tables in six documentation files. Nothing joined them, so adding a
 * country meant editing four things and nothing failed if you edited three.
 * They had already drifted in the way that matters — the rules matched `UK`
 * while every other statement of intent said ISO codes.
 *
 * The mapping now lives in `src/objects/_territory.ts` and everything else is
 * derived from it. That is a claim about the repo, not about a function, and it
 * is exactly the kind of claim that decays quietly: each consumer keeps working
 * when it falls out of step, it just stops being the same mapping. So each
 * derivation is pinned here, at its own seam:
 *
 *   `_territory.ts`  →  the hook's INLINE table  (parsed out of the lowered body)
 *                    →  the account picklist     (option values)
 *                    →  the sharing rules        (the values they name)
 *                    →  six documentation tables (three languages, two pages)
 *
 * ### Why the hook is allowed to carry a copy at all
 *
 * It is the one derivation that cannot be a reference. A hook handler is
 * lowered to a metadata-only `body.source` and evaluated inside QuickJS with no
 * module scope, so an import is a `ReferenceError` at runtime rather than a
 * closure — `extractHookBody` rejects such a handler outright and
 * `test/action-sandbox.test.ts` runs that lowering pass over every registered
 * hook. The table therefore has to be inline in the handler. What this file
 * removes is the TRUST: the copy is read back out of the lowered body and
 * compared with the module, so the two cannot diverge silently even though the
 * value is stored twice.
 */

type AnyRec = Record<string, any>;

const accountHook = hookNamed(
  allHooks.find((h) => h.name === 'account_protection'),
  'account_protection',
);

/** The body the RUNTIME evaluates — not the closure, and not the source file. */
const loweredBody = extractSandboxBody(accountHook.handler, "hook 'account_protection'").source;

const DOC = (relative: string) => readFileSync(join(REPO_ROOT, relative), 'utf8');

/** The account-facing docs that carry the country table, one per language. */
const COUNTRY_TABLE_DOCS = [
  'content/docs/sales/accounts.mdx',
  'content/docs/sales/accounts.zh-Hans.mdx',
  'content/docs/sales/accounts.zh-Hant.mdx',
];

/** The admin-facing docs that carry the sharing-rule table, one per language. */
const RULE_TABLE_DOCS = [
  'content/docs/administration/sharing-and-security.mdx',
  'content/docs/administration/sharing-and-security.zh-Hans.mdx',
  'content/docs/administration/sharing-and-security.zh-Hant.mdx',
];

/** `` `A`, `B`, `C` `` — how both doc tables render a list of country strings. */
const renderCountries = (countries: readonly string[]) =>
  countries.map((c) => `\`${c}\``).join(', ');

/**
 * The accepted spellings of one territory's countries, in authored order and in
 * AUTHORED form — `COUNTRY_ALIASES` is written the way a person types a country
 * (`United States`), which is what the docs render, while `COUNTRY_TERRITORY`
 * is keyed by the normalised form the lookup uses.
 */
const aliasesOf = (territory: Territory) =>
  Object.keys(COUNTRY_ALIASES).filter(
    (alias) => COUNTRY_TERRITORY[normalizeCountry(alias)] === territory,
  );

// ───────────────────────────────────────── the module is internally coherent ──

describe('the authored tables produce a usable domain', () => {
  it('sees a non-trivial mapping at all', () => {
    // Guard the guard: an empty map would make most assertions below vacuous.
    expect(Object.keys(COUNTRY_TERRITORY).length).toBeGreaterThanOrEqual(20);
    expect(TERRITORY_OPTIONS.length).toBeGreaterThanOrEqual(3);
  });

  it('every declared territory value is reachable from at least one country', () => {
    // #639 acceptance criterion 3, first half. A declared value nothing can
    // produce is a picklist entry that never appears on a record — which is
    // indistinguishable, from Setup, from a territory whose accounts are all
    // elsewhere. The probe set is every accepted spelling plus one country the
    // mapping deliberately does not cover, which is what makes the FALLBACK
    // reachable rather than merely declared.
    const probes = [...Object.keys(COUNTRY_TERRITORY), 'SG'];
    const produced = new Set(probes.map((country) => territoryFor(country)));
    const declared = TERRITORY_OPTIONS.map((o) => String(o.value));
    const unreachable = declared.filter((value) => !produced.has(value as Territory));
    expect(
      unreachable,
      `declared territory values no country produces: ${unreachable.join(', ')}`,
    ).toEqual([]);
    // And nothing is produced that was never declared — the other direction,
    // which is what a `select` exists to make impossible.
    const undeclared = [...produced].filter((value) => !declared.includes(value));
    expect(undeclared, `territories produced but not declared: ${undeclared.join(', ')}`).toEqual([]);
  });

  it('every alias resolves to a country a territory actually covers', () => {
    const covered = new Set(Object.values(TERRITORY_COUNTRIES).flat());
    const dangling = Object.entries(COUNTRY_ALIASES).filter(([, code]) => !covered.has(code));
    expect(
      dangling.map(([alias, code]) => `${alias} → ${code}`),
      'a spelling pointing at an uncovered country would resolve to `other` and read as deliberate',
    ).toEqual([]);
  });

  it('every authored spelling resolves, in the form it was authored in', () => {
    // `COUNTRY_ALIASES` is the table the docs render, so it is written the way a
    // person types. If normalisation ever stopped covering the gap between that
    // form and the lookup key, the docs would be advertising spellings that do
    // not work.
    for (const [alias, code] of Object.entries(COUNTRY_ALIASES)) {
      expect(territoryFor(alias), `${alias} does not resolve`).toBe(territoryFor(code));
    }
  });

  it('every lookup key is already in normalised form, so the lookup needs no fallbacks', () => {
    // The map is read by a plain property access in the hook body. A key
    // carrying stray case or spacing would simply never match — silently, which
    // is the failure class this whole issue is about.
    const unnormalised = Object.keys(COUNTRY_TERRITORY).filter((k) => normalizeCountry(k) !== k);
    expect(unnormalised, `keys that can never be matched: ${unnormalised.join(', ')}`).toEqual([]);
  });

  it('normalises case, surrounding space and repeated inner space', () => {
    // #639 acceptance criterion 1, at the module. `de ` is named in the issue.
    expect(territoryFor('Germany')).toBe('emea');
    expect(territoryFor('DE')).toBe('emea');
    expect(territoryFor('de ')).toBe('emea');
    expect(territoryFor(' de')).toBe('emea');
    expect(territoryFor('United  States')).toBe('na');
    expect(territoryFor('united states of america')).toBe('na');
  });

  it('keeps every stock UK spelling in EMEA — nothing was evicted by the GB rename', () => {
    // The question #639 said was unfixable in isolation. `GB` is now the
    // canonical code AND `UK` still lands in `emea`, which is what let the
    // rename happen with no data migration at all.
    expect(TERRITORY_COUNTRIES.emea).toContain('GB');
    for (const spelling of ['UK', 'uk', 'GB', 'United Kingdom', 'Great Britain']) {
      expect(territoryFor(spelling), `${spelling} is no longer EMEA`).toBe('emea');
    }
  });

  it('answers `other` — never blank — for a country outside the territories', () => {
    for (const value of ['SG', 'JP', 'Atlantis', '', '   ', null, undefined, 42]) {
      expect(territoryFor(value)).toBe(TERRITORY_FALLBACK);
    }
    expect(TERRITORY_FALLBACK).toBe(TERRITORY.OTHER);
  });
});

// ─────────────────────────────────────── derivation 1: the inline hook table ──

describe('the hook body carries the module mapping and no other', () => {
  /**
   * Read back out of the LOWERED body, which is what the runtime evaluates —
   * not the handler closure, and not the source file. A copy that is correct in
   * the file but does not survive lowering is not the mapping that ships.
   */
  const inlineTable = (): Record<string, string> => {
    const match = loweredBody.match(/TERRITORY_BY_COUNTRY[^=]*=\s*(\{[^}]*\})/);
    if (!match) {
      throw new Error(
        'no TERRITORY_BY_COUNTRY object literal in the lowered body of account_protection. ' +
          'Either the derivation moved, or it stopped being a flat JSON-shaped literal — this ' +
          'guard reads it back verbatim, so it has to stay one. The mapping is authored in ' +
          'src/objects/_territory.ts; the hook carries an inline copy only because a sandboxed ' +
          'body has no module scope.',
      );
    }
    return JSON.parse(match[1]);
  };

  it('finds the inline table in the body the runtime will evaluate', () => {
    expect(Object.keys(inlineTable()).length).toBeGreaterThanOrEqual(20);
  });

  it('is exactly the module mapping — no country on one side only', () => {
    // The single-source assertion proper, in both directions at once. A country
    // added to `_territory.ts` and not to the hook derives nothing; one added
    // to the hook and not to `_territory.ts` is invisible to the docs, the
    // picklist and every other reader.
    expect(inlineTable()).toEqual(COUNTRY_TERRITORY);
  });

  it('references nothing from module scope, which is why the copy has to exist', () => {
    // The constraint that justifies the duplication, asserted rather than
    // asserted-in-a-comment: if this ever stops throwing for an imported
    // mapping, the copy should be deleted and the import used instead.
    expect(() => extractSandboxBody(accountHook.handler, 'hook')).not.toThrow();
    expect(loweredBody).not.toMatch(/\bterritoryFor\b|\bCOUNTRY_TERRITORY\b/);
  });

  it.each(Object.keys(COUNTRY_TERRITORY))(
    'derives %s the same way in the real sandbox as the module does',
    async (country) => {
      // Behavioural, through QuickJS — the structural comparison above proves
      // the TABLE matches; this proves the body actually reads it, and reads it
      // with the same normalisation.
      const { input } = await runHookBody(accountHook, {
        event: 'beforeInsert',
        input: { name: 'Acme', billing_address: { country } },
      });
      expect(input.territory).toBe(COUNTRY_TERRITORY[country]);
    },
  );

  it('states `other` in the sandbox for an unmapped country and for no address', async () => {
    const unmapped = await runHookBody(accountHook, {
      event: 'beforeInsert',
      input: { name: 'Apex', billing_address: { country: 'SG' } },
    });
    expect(unmapped.input.territory).toBe('other');

    // An insert carrying no address at all still states the classification —
    // #639 chose an explicit `other` over a blank precisely so "no territory"
    // and "nobody filled it in" cannot look alike.
    const noAddress = await runHookBody(accountHook, {
      event: 'beforeInsert',
      input: { name: 'Acme' },
    });
    expect(noAddress.input.territory).toBe('other');
  });

  it('leaves territory alone on an update that does not carry the address', async () => {
    // The mirror of the `billing_country` rule: an unrelated edit must not
    // re-derive it, or a partial update would silently reclassify the account.
    const { input } = await runHookBody(accountHook, {
      event: 'beforeUpdate',
      input: { phone: '+1-512-555-0100' },
      previous: { billing_country: 'US', territory: 'na' },
    });
    expect('territory' in input).toBe(false);
  });

  it('reclassifies when the address country changes, and on an address clear', async () => {
    const moved = await runHookBody(accountHook, {
      event: 'beforeUpdate',
      input: { billing_address: { country: 'Germany' } },
      previous: { billing_country: 'US', territory: 'na' },
    });
    expect(moved.input.billing_country).toBe('GERMANY');
    expect(moved.input.territory).toBe('emea');

    const cleared = await runHookBody(accountHook, {
      event: 'beforeUpdate',
      input: { billing_address: null },
      previous: { billing_country: 'US', territory: 'na' },
    });
    expect(cleared.input.billing_country).toBeNull();
    expect(cleared.input.territory).toBe('other');
  });
});

// ─────────────────────────── derivation 2: the picklist and the sharing rules ──

describe('the metadata surfaces name declared territory values', () => {
  const objects: AnyRec[] = (stack as AnyRec).objects ?? [];
  const account = objects.find((o) => o.name === 'crm_account');
  const sharingRules: AnyRec[] = (stack as AnyRec).sharingRules ?? [];
  const declared = TERRITORY_OPTIONS.map((o) => String(o.value));

  it('the account picklist is the declared domain, in the declared order', () => {
    const options = (account?.fields?.territory?.options ?? []) as AnyRec[];
    expect(options.map((o) => String(o.value))).toEqual(declared);
  });

  it.each(['north_america_territory', 'europe_territory'])(
    '%s names a declared, reachable territory value',
    (name) => {
      const rule = sharingRules.find((r) => r.name === name);
      expect(rule, `sharing rule ${name} is not declared`).toBeTruthy();
      const source = String(rule!.condition?.source ?? rule!.condition);
      const named = declared.filter((value) => source.includes(`"${value}"`));
      expect(named, `${name} names no declared territory value: ${source}`).toHaveLength(1);
      // Reachable, not merely declared: a rule pinned to a value no country
      // produces is a rule that grants nothing, which is what #621 was.
      const reachable = Object.values(COUNTRY_TERRITORY).includes(named[0] as Territory);
      expect(reachable, `${name} matches "${named[0]}", which no country maps to`).toBe(true);
    },
  );

  it('no rule anywhere in the stack matches the free-text country column', () => {
    // Deliberately the WHOLE rule set, not just the two territory rules: the
    // defect #639 fixed is that country strings are matchable at all, and a
    // third consumer would reintroduce it somewhere nobody is looking.
    const offenders = sharingRules
      .filter((r) => String(r.condition?.source ?? r.condition).includes('billing_country'))
      .map((r) => String(r.name));
    expect(
      offenders,
      `these rules filter on the free-text country again: ${offenders.join(', ')}`,
    ).toEqual([]);
  });
});

// ──────────────────────────────────── derivation 3: the documentation tables ──

describe('the documentation tables are rendered from the mapping', () => {
  /**
   * The three localised country tables cannot be GENERATED — they are prose
   * with a table in the middle, in three languages, and generating them would
   * mean owning the surrounding sentences too. So they are pinned instead:
   * the country cells are language-neutral (codes and English names in
   * backticks), rendered here from the module and asserted to appear verbatim.
   * A country added to `_territory.ts` and not to a translation is red, by
   * name, at PR time — which is the guarantee the hand-kept tables never had.
   */
  it.each(COUNTRY_TABLE_DOCS)('%s lists each territory’s countries verbatim', (relative) => {
    const doc = DOC(relative);
    for (const [territory, countries] of Object.entries(TERRITORY_COUNTRIES)) {
      const rendered = renderCountries(countries);
      expect(
        doc.includes(rendered),
        `${relative} does not render ${territory} as "${rendered}" — the table has drifted ` +
          'from src/objects/_territory.ts',
      ).toBe(true);
    }
  });

  it.each(COUNTRY_TABLE_DOCS)('%s lists each territory’s accepted spellings verbatim', (relative) => {
    const doc = DOC(relative);
    for (const territory of ['na', 'emea'] as const) {
      const rendered = renderCountries(aliasesOf(territory));
      expect(rendered.length, `no aliases authored for ${territory}`).toBeGreaterThan(0);
      expect(
        doc.includes(rendered),
        `${relative} does not render the ${territory} spellings as "${rendered}"`,
      ).toBe(true);
    }
  });

  it.each(COUNTRY_TABLE_DOCS)('%s no longer teaches that the rules match a country', (relative) => {
    // The prose half of the drift. Every one of these files told the reader to
    // type a 2-letter code BECAUSE that is what the rules compared against —
    // advice that is now wrong in a way that produces no error, only a user who
    // does not understand why their account is in `other`.
    expect(DOC(relative)).not.toMatch(/billing_country/i);
  });

  it.each(RULE_TABLE_DOCS)('%s describes both territory rules by territory value', (relative) => {
    const doc = DOC(relative);
    for (const value of ['`na`', '`emea`']) {
      expect(doc.includes(value), `${relative} does not name ${value}`).toBe(true);
    }
    // The old rows named the countries; the mapping is documented once, on the
    // accounts page, and referenced here.
    expect(doc).not.toMatch(/US\/CA\/MX|UK\/DE\/FR\/IT\/ES/);
  });
});
