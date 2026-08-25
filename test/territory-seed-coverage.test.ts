// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { compileCelToFilter } from '@objectstack/formula';
import stack from '../objectstack.config';
import accountHook from '../src/objects/account.hook';
import { TERRITORY_OPTIONS, territoryFor } from '../src/objects/_territory';
import { CrmSeedData } from '../src/data/index';
import * as sharedSeed from '../src/data/_shared';
import * as catalogSeed from '../src/data/catalog.seed';
import * as salesSeed from '../src/data/sales.seed';
import * as serviceSeed from '../src/data/service.seed';
import * as marketingSeed from '../src/data/marketing.seed';
import * as revenueSeed from '../src/data/revenue.seed';
import { makeCtx } from './helpers/hook-harness';

/**
 * The territory rules must match REAL seeded accounts (#638).
 *
 * ### The defect this file exists to catch
 *
 * #621 fixed the installation half: both territory rules now compile and seed
 * (`test/sharing-seeding.test.ts` pins that). The data half was still empty —
 * not one seeded account carried a `billing_address`, so both rules evaluated
 * correctly against nine rows and matched **zero**. Nothing failed: Setup
 * listed two territories, two positions, and nothing behind them.
 *
 * A "declared rule is seeded" assertion cannot see that, and neither can a
 * "seed has an address" assertion on its own — the two only mean something
 * joined. So this file walks the entire chain the demo depends on, using the
 * platform's own pieces at every step rather than a re-implementation:
 *
 *   seed record  →  `account_protection` (the real hook body)
 *                →  `billing_country` + `territory`
 *                →  `compileCelToFilter(rule.condition)` (the seeder's own
 *                   compiler, the same call `plugin-sharing` makes)
 *                →  which accounts each territory actually covers.
 *
 * #639 replaced the last link's INPUT — the rules now compare the derived
 * `territory` select rather than the free-text country — and the chain is
 * otherwise unchanged, which is the point: the same walk still measures it.
 *
 * ### Hooks DO run over seed writes — measured, not assumed
 *
 * The chain above is only valid because lifecycle hooks fire on seed inserts,
 * which is what makes `billing_country` exist at all on a seeded row (the seeds
 * deliberately do not author it — it is `readonly` and hook-owned). #617
 * doubted this; measured on 17.0.0-rc.1 against a fresh install, all nine
 * seeded accounts come out of `pnpm dev` carrying the projection:
 *
 *     sqlite> SELECT name, billing_country FROM crm_account;
 *     Acme Corporation|US     Stark Medical|CA      Northwind Energy|DE
 *     Apex Logistics|SG       Lattice Education|UK  …
 *
 * `SeedLoaderService.SEED_OPTIONS` says the same thing in words: its
 * `skipTriggers` suppresses record-change AUTOMATION (autolaunched flows) for
 * seed writes, while "Lifecycle HOOKS (derived/default fields, validation)
 * still run". `src/data/_shared.ts` now states the corrected premise.
 *
 * ### What is NOT covered here
 *
 * A matching account still materialises no `sys_record_share` row, because on a
 * fresh install `sys_user_position` is empty — nobody holds `na_sales_team` or
 * `eu_sales_team` (measured: 0 rows, 0 shares). That is a separate gap, filed
 * separately; it is not something the seed data can fix, since a seed cannot
 * name a user (see the note at the foot of `src/data/index.ts`).
 */

type AnyRec = Record<string, any>;
type Dataset = { object: string; records: AnyRec[] };

const datasets = CrmSeedData as unknown as Dataset[];
const accountRecords = datasets.filter((d) => d.object === 'crm_account').flatMap((d) => d.records);

const sharingRules: AnyRec[] = (stack as any).sharingRules ?? [];
const ruleByName = (name: string) => sharingRules.find((r) => r.name === name);
const TERRITORY_RULES = ['north_america_territory', 'europe_territory'] as const;

/**
 * The projection exactly as a seed insert produces it: the REAL
 * `account_protection` body, invoked with the event the seed loader raises.
 * Re-implementing `country → billing_country` here would let the two drift and
 * still pass, which is the failure mode this whole file is about.
 */
async function project(record: AnyRec): Promise<AnyRec> {
  const input: AnyRec = { ...record };
  await (accountHook as AnyRec).handler(makeCtx({ event: 'beforeInsert', input }));
  return input;
}

const projectedAccounts = await Promise.all(accountRecords.map(project));
const nameOf = (r: AnyRec) => String(r.name);

/**
 * Evaluate a compiled `FilterCondition` against one projected record.
 *
 * Deliberately narrow: it understands only the shapes these rules compile to
 * today (`{field: {$in: [...]}}` and `{field: value}`) and THROWS on anything
 * else. Returning `false` for an unrecognised shape would report "the
 * territories are empty" — indistinguishable from the bug — the next time the
 * compiler's output changes.
 */
function matches(filter: unknown, row: AnyRec): boolean {
  if (!filter || typeof filter !== 'object' || Array.isArray(filter)) {
    throw new Error(`unsupported compiled filter: ${JSON.stringify(filter)}`);
  }
  const entries = Object.entries(filter as AnyRec);
  if (entries.length !== 1) {
    throw new Error(`expected a single-field filter, got ${JSON.stringify(filter)}`);
  }
  const [field, condition] = entries[0];
  if (field.startsWith('$')) {
    throw new Error(`expected a field-keyed filter, got operator "${field}"`);
  }
  if (condition && typeof condition === 'object' && !Array.isArray(condition)) {
    const ops = Object.entries(condition as AnyRec);
    if (ops.length === 1 && ops[0][0] === '$in' && Array.isArray(ops[0][1])) {
      return (ops[0][1] as unknown[]).includes(row[field]);
    }
    throw new Error(`unsupported compiled operator: ${JSON.stringify(condition)}`);
  }
  return row[field] === condition;
}

/** The accounts one declared rule covers, via the seeder's own compiler. */
function covered(ruleName: string): string[] {
  const rule = ruleByName(ruleName);
  if (!rule) throw new Error(`no sharing rule named ${ruleName}`);
  const compiled = compileCelToFilter(rule.condition ?? '', { variables: {} });
  if (!compiled.ok) {
    throw new Error(`${ruleName}: condition does not compile (${compiled.reason}: ${compiled.detail})`);
  }
  return projectedAccounts.filter((row) => matches(compiled.filter, row)).map(nameOf);
}

describe('the demo dataset can actually exercise the territory rules (#638)', () => {
  it('finds the accounts and both rules at all', () => {
    // Guard the guard: a seed or config refactor that stopped exposing either
    // side would make every assertion below vacuously true.
    expect(accountRecords.length, 'no crm_account seed records').toBeGreaterThanOrEqual(9);
    for (const name of TERRITORY_RULES) {
      expect(ruleByName(name), `sharing rule ${name} is not declared`).toBeTruthy();
    }
  });

  it('gives every seeded account a billing address with a 2-letter country code', () => {
    const bad = accountRecords
      .filter((r) => {
        const country = (r.billing_address as AnyRec | undefined)?.country;
        return typeof country !== 'string' || !/^[A-Z]{2}$/.test(country);
      })
      .map((r) => `${nameOf(r)}: ${JSON.stringify((r.billing_address as AnyRec | undefined)?.country)}`);
    expect(
      bad,
      'Seed addresses keep to ISO 3166-1 alpha-2 codes. Since #639 this is a DATA-QUALITY ' +
        'convention rather than a matching requirement — the spelling table in ' +
        'src/objects/_territory.ts is there for what users type, and a name like "Germany" now ' +
        'classifies correctly — but a seed is authored, not typed, so it states the canonical ' +
        'code:\n  ' +
        bad.join('\n  '),
    ).toEqual([]);
  });

  it.each(['billing_country', 'territory'])(
    'never authors %s in a seed — the hook owns that column',
    (column) => {
      // Both are `readonly` and derived. A hand-copied value would be a second
      // source of truth for something `account_protection` recomputes on every
      // write that carries the address, i.e. drift with a delayed fuse — and for
      // `territory` it would additionally hide a broken derivation behind a
      // correct-looking seed.
      const authored = accountRecords.filter((r) => column in r).map(nameOf);
      expect(authored, `seed records authoring the derived ${column}: ${authored.join(', ')}`).toEqual([]);
    },
  );

  it('projects a country onto every seeded account when the hook runs', async () => {
    const missing = projectedAccounts.filter((r) => typeof r.billing_country !== 'string' || !r.billing_country);
    expect(missing.map(nameOf), 'account_protection produced no billing_country for these seeds').toEqual([]);
  });

  it('states a declared territory on every seeded account', () => {
    // #639: the classification is never blank, and never a value the picklist
    // does not offer. A seeded row landing outside the declared domain would
    // render as a raw string on the account form and match no rule.
    const declared = TERRITORY_OPTIONS.map((o) => String(o.value));
    const bad = projectedAccounts
      .filter((r) => !declared.includes(String(r.territory)))
      .map((r) => `${nameOf(r)}: ${JSON.stringify(r.territory)}`);
    expect(bad, `seeded accounts outside the declared territory domain:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('classifies each seeded account the way the mapping module does', () => {
    // The hook body carries its own inline copy of the mapping (a sandboxed
    // body has no module scope — see test/territory-single-source.test.ts).
    // This is that pin applied to REAL seed rows rather than to the table.
    const divergent = projectedAccounts
      .filter((r) => r.territory !== territoryFor((r.billing_address as AnyRec | undefined)?.country))
      .map((r) => `${nameOf(r)}: hook says ${r.territory}`);
    expect(divergent, `the hook and src/objects/_territory.ts disagree:\n  ${divergent.join('\n  ')}`).toEqual([]);
  });

  it('partitions the seeded accounts across NA, EU and neither', () => {
    const na = covered('north_america_territory');
    const eu = covered('europe_territory');
    const outside = projectedAccounts
      .map(nameOf)
      .filter((name) => !na.includes(name) && !eu.includes(name));

    const summary = `NA=${na.length} [${na.join(', ')}] · EU=${eu.length} [${eu.join(', ')}] · ` +
      `neither=${outside.length} [${outside.join(', ')}]`;

    // Since #639 "neither" is a STATED value rather than the absence of one, so
    // it can be asserted directly instead of only by subtraction.
    const stated = projectedAccounts.filter((r) => r.territory === 'other').map(nameOf);
    expect(stated.sort(), `the accounts in no territory must say so: ${summary}`).toEqual(outside.sort());

    // Each bucket non-empty is the actual deliverable of #638: a rule with no
    // matching record is indistinguishable from a rule that was never seeded,
    // and a set with nothing OUTSIDE the territories cannot tell a working
    // filter apart from a match-all one.
    expect(na.length, `north_america_territory covers no seeded account — ${summary}`).toBeGreaterThan(0);
    expect(eu.length, `europe_territory covers no seeded account — ${summary}`).toBeGreaterThan(0);
    expect(
      outside.length,
      `every seeded account falls in a territory, so a match-all regression would look ` +
        `identical to a working rule — ${summary}`,
    ).toBeGreaterThan(0);

    // The two territories are disjoint: an account in both would mean the
    // country lists overlap, and `edit` granted twice hides which rule did it.
    const both = na.filter((name) => eu.includes(name));
    expect(both, `accounts covered by BOTH territories: ${both.join(', ')}`).toEqual([]);
  });

  it('covers more than one country per territory where the mapping claims several', () => {
    // A territory reachable from only ONE country in practice would still pass
    // every assertion above while leaving most of the mapping untested.
    const countries = new Set(
      projectedAccounts
        .filter((r) => covered('north_america_territory').includes(nameOf(r)))
        .map((r) => String(r.billing_country)),
    );
    expect(
      [...countries].sort(),
      'north_america_territory is exercised by a single country — the rest of its $in list is unproven',
    ).not.toEqual(['US']);
  });
});

/**
 * The #635 split has one structural failure mode: a family module gains a
 * dataset and nobody adds it to `CrmSeedData`, so it silently never seeds.
 * Nothing else would notice — the module compiles, the records exist in source.
 */
describe('every family module dataset is wired into CrmSeedData (#635 split)', () => {
  const FAMILIES: Record<string, AnyRec> = {
    '_shared': sharedSeed,
    'catalog.seed': catalogSeed,
    'sales.seed': salesSeed,
    'service.seed': serviceSeed,
    'marketing.seed': marketingSeed,
    'revenue.seed': revenueSeed,
  };

  const isDataset = (value: unknown): value is Dataset =>
    !!value &&
    typeof value === 'object' &&
    typeof (value as AnyRec).object === 'string' &&
    Array.isArray((value as AnyRec).records);

  const declared = Object.entries(FAMILIES).flatMap(([module, exports]) =>
    Object.entries(exports)
      .filter(([, value]) => isDataset(value))
      .map(([name, value]) => ({ id: `${module}.${name}`, value })),
  );

  it('exports datasets from the family modules at all', () => {
    expect(declared.length, 'no seed datasets found in src/data/*.seed.ts').toBeGreaterThanOrEqual(16);
  });

  it('aggregates all of them, and nothing else', () => {
    const aggregated = CrmSeedData as unknown[];
    const missing = declared.filter((d) => !aggregated.includes(d.value)).map((d) => d.id);
    expect(
      missing,
      `these datasets are authored but never seeded — add them to src/data/index.ts:\n  ${missing.join('\n  ')}`,
    ).toEqual([]);
    expect(aggregated.length, 'CrmSeedData holds an entry no family module exports').toBe(declared.length);
  });
});
