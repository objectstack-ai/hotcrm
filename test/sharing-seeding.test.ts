// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { compileCelToFilter } from '@objectstack/formula';
import { ObjectQL } from '@objectstack/objectql';
import { InMemoryDriver } from '@objectstack/driver-memory';
import stack from '../objectstack.config';
import { COUNTRY_TERRITORY, TERRITORY_OPTIONS, territoryFor } from '../src/objects/_territory';

/**
 * Every declared sharing rule must actually be SEEDED (#621).
 *
 * ### The defect this file exists to catch
 *
 * `test/sharing-coverage.test.ts` asserts the *declared shape* of the rules —
 * their labels, objects, access levels and recipients — and every one of those
 * assertions was green while two of the nine rules did nothing at all:
 *
 *     WARN [sharing-rule] skipped (missing or untranslatable CEL condition
 *       — never seeded as match-all) [experimental]
 *       {"rule":"north_america_territory", …}
 *     INFO [sharing-rule] declared rules seeded into sys_sharing_rule
 *       {"seeded":7,"skipped":2,"total":9}
 *
 * A declared rule is not an enforced rule. `plugin-sharing`'s
 * `bootstrapDeclaredSharingRules` compiles each rule's CEL condition into a
 * pushdown-able `FilterCondition` and — correctly — refuses to seed a rule it
 * cannot compile, rather than degrading it to match-all. The app-side result is
 * silent: a WARN in the boot stream, and two positions whose members see
 * nothing while the metadata and the admin docs say they see a territory.
 *
 * So this file asserts the *seeded outcome*, using the platform's own
 * compiler — `compileCelToFilter`, the exact function the seeder calls — rather
 * than a regex over the CEL source or a re-implementation of it. A platform
 * upgrade that narrows what compiles fails here, at PR time, instead of in a
 * log nobody reads.
 *
 * ### Compiling is not executing (#695)
 *
 * Everything above stops at the compiler. A condition that compiles can still
 * be a filter the *configured driver* refuses to run, and the failure looks
 * identical from the boot log: `plugin-sharing`'s rule evaluator catches the
 * driver error, warns, and carries on, so the backfill still reports
 * `reconciled: 9` while the rule grants nothing. Two rules shipped that way.
 *
 * `every seeded rule EXECUTES on the configured driver` below closes that gap
 * by running each rule's compiled filter through a real ObjectQL engine on the
 * real driver and asserting on **grants materialised** — the records the rule
 * reaches — rather than on an error the evaluator swallows anyway.
 *
 * ### The measured operator matrix (17.0.0-rc.1)
 *
 * The issue guessed the blocker was the `in [...]` membership operator. It is
 * not — measured, `in [...]` compiles fine. The blocker is the NESTED PATH into
 * an `address`-typed field, which is stored as one composite column:
 *
 *   | predicate (against `crm_account`)                          | compiles |
 *   | ---------------------------------------------------------- | -------- |
 *   | `record.type == "customer" && record.is_active == true`     | yes      |
 *   | `record.territory == "na"`                                    | yes      |
 *   | `record.billing_country in ["US","CA","MX"]`                 | yes      |
 *   | `record.type != "customer"`                                  | yes      |
 *   | `record.annual_revenue > 1000` / `>=`                        | yes      |
 *   | `a == x \|\| b == y` (disjunction)                           | yes      |
 *   | `!(record.type == "customer")`                               | yes      |
 *   | `record.type == null`                                        | yes      |
 *   | `record.name.startsWith("A")`                                | yes      |
 *   | `record.billing_address.country == "US"`                     | **no**   |
 *   | `record.billing_address.country in ["US","CA","MX"]`         | **no**   |
 *   | `has(record.type) && record.type == "customer"`               | **no**   |
 *
 * Two consequences worth carrying forward:
 *
 *  1. Issue #621's option A ("rewrite `in [...]` as a disjunction of `==`")
 *     could never have worked — the disjunction fails on the same nested path.
 *     Only a flat column does, which is why `crm_account.billing_country` now
 *     exists and `account.hook.ts` maintains it.
 *  2. `has(...)` does NOT compile in a sharing condition. Adding `has()` guards
 *     to these rules — proposed for the flow/validation predicates in #630 and
 *     for sharing rules in #633 — would make every guarded rule untranslatable
 *     and therefore silently unseeded, i.e. it would reintroduce exactly this
 *     bug across all nine rules. `sharing conditions cannot use has()` below
 *     pins that finding so #633 cannot land the guard without seeing it.
 */

type AnyRec = Record<string, any>;

const sharingRules: AnyRec[] = (stack as any).sharingRules ?? [];
const objects: AnyRec[] = (stack as any).objects ?? [];
const positions: AnyRec[] = (stack as any).positions ?? [];

const objectByName = new Map(objects.map((o) => [o.name as string, o]));

/**
 * Recipient kinds `plugin-sharing`'s `mapRecipientType` maps to a real
 * `sys_sharing_rule` recipient. Anything else is skipped with an "unmappable
 * recipient" warning — the seeder's other silent drop.
 */
const MAPPABLE_RECIPIENTS = new Set([
  'user',
  'team',
  'position',
  'business_unit',
  'unit_and_subordinates',
]);

/** `P` compiles to `{ dialect: 'cel', source }`. */
function celSource(condition: unknown): string {
  if (typeof condition === 'string') return condition;
  if (condition && typeof condition === 'object') return String((condition as AnyRec).source ?? '');
  return '';
}

/**
 * Field names a compiled `FilterCondition` narrows on.
 *
 * Used as a strictly STRONGER stand-in for the seeder's `isMatchAllCriteria`
 * check (which is internal to `plugin-sharing` and not exported): a filter that
 * matches every record narrows on no field at all, so an empty result here
 * implies match-all. Being stricter than the platform is safe — it can only
 * ever fail a rule the platform would also have dropped, never pass one it
 * would have kept. It additionally catches a rule filtering on a field that
 * does not exist, which is the root cause class #621 belongs to.
 */
function narrowedFields(filter: unknown): string[] {
  if (filter === null || typeof filter !== 'object') return [];
  if (Array.isArray(filter)) return filter.flatMap(narrowedFields);
  const out: string[] = [];
  for (const [key, value] of Object.entries(filter as AnyRec)) {
    if (key === '$and' || key === '$or' || key === '$nor') out.push(...narrowedFields(value));
    else if (key === '$not') out.push(...narrowedFields(value));
    else if (!key.startsWith('$')) out.push(key);
  }
  return [...new Set(out)];
}

/** What the seeder would do with one declared rule. */
function seedOutcome(rule: AnyRec): { seeded: true; fields: string[] } | { seeded: false; why: string } {
  if (!rule?.name || !rule?.object) return { seeded: false, why: 'missing name or object' };
  if (!MAPPABLE_RECIPIENTS.has(rule.sharedWith?.type) || !rule.sharedWith?.value) {
    return { seeded: false, why: `unmappable recipient "${rule.sharedWith?.type}"` };
  }
  if (rule.type === 'owner') return { seeded: false, why: 'owner-based rule (retired shape)' };
  const result = compileCelToFilter(rule.condition ?? '', { variables: {} });
  if (!result.ok) {
    return { seeded: false, why: `untranslatable condition (${result.reason}: ${result.detail})` };
  }
  const fields = narrowedFields(result.filter);
  if (fields.length === 0) {
    return { seeded: false, why: 'condition narrows on no field — would share every record' };
  }
  return { seeded: true, fields };
}

describe('every declared sharing rule is actually seeded', () => {
  it('finds rules to check at all', () => {
    // Guard the guard: a config refactor that stopped exposing `sharingRules`
    // would turn every assertion below into a vacuous pass.
    expect(sharingRules.length).toBeGreaterThanOrEqual(9);
    expect(sharingRules.some((r) => r.name === 'north_america_territory')).toBe(true);
    expect(sharingRules.some((r) => r.name === 'europe_territory')).toBe(true);
  });

  it('every field a rule filters on is a real, flat column of its object', () => {
    // The #621 root cause stated positively: a sharing condition may only name
    // fields that exist as columns. A nested path into a composite value
    // (`address`, `location`) is not one, and neither is a typo.
    const bad: string[] = [];
    for (const rule of sharingRules) {
      const object = objectByName.get(rule.object as string);
      if (!object) {
        bad.push(`${rule.name}: targets unknown object "${rule.object}"`);
        continue;
      }
      const outcome = seedOutcome(rule);
      if (!outcome.seeded) continue; // reported by the test above
      for (const field of outcome.fields) {
        if (!(field in (object.fields ?? {}))) {
          bad.push(`${rule.name}: filters on "${field}", which ${rule.object} does not declare`);
        }
      }
    }
    expect(bad, `sharing rules filtering on fields that do not exist:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('every rule hands its records to a position the app actually ships', () => {
    // A rule granted to a position nobody declares is inert in a second,
    // quieter way — it seeds fine and expands to an empty recipient set.
    const declared = new Set(positions.map((p) => p.name as string));
    const bad = sharingRules
      .filter((r) => r.sharedWith?.type === 'position' && !declared.has(r.sharedWith?.value))
      .map((r) => `${r.name}: grants to undeclared position "${r.sharedWith?.value}"`);
    expect(bad, `rules granting to positions that do not exist:\n  ${bad.join('\n  ')}`).toEqual([]);
  });
});

describe('the territory rules match a declared value, not a country string', () => {
  /**
   * Two defects, one describe block, because the second was only reachable
   * once the first was fixed.
   *
   * #621: the condition reached into the `address` composite
   * (`record.billing_address.country`), so it did not compile and the rule was
   * never seeded. The fix was a FLAT column.
   *
   * #639: the flat column was FREE TEXT, so the rules still compared a typed
   * string — `United States` matched neither territory, silently. The fix is to
   * compare `record.territory`, a declared select. Both halves are pinned here:
   * the condition must still compile to a single flat field (or #621 returns),
   * and that field must be `territory` carrying a declared value (or #639 does).
   */
  const territoryRules = sharingRules.filter((r) =>
    ['north_america_territory', 'europe_territory'].includes(r.name as string),
  );

  it('both territory rules exist', () => {
    expect(territoryRules).toHaveLength(2);
  });

  it.each(territoryRules.map((r) => [r.name as string, r] as const))(
    '%s filters on territory',
    (_name, rule) => {
      const outcome = seedOutcome(rule);
      expect(outcome.seeded, `not seeded: ${JSON.stringify(outcome)}`).toBe(true);
      expect((outcome as { fields: string[] }).fields).toEqual(['territory']);
    },
  );

  it.each(territoryRules.map((r) => [r.name as string, r] as const))(
    '%s reaches into no composite value',
    (_name, rule) => {
      // `record.billing_address.country` is the exact shape that shipped inert.
      expect(celSource(rule.condition)).not.toMatch(/record\.\w+\.\w+/);
    },
  );

  it.each(territoryRules.map((r) => [r.name as string, r] as const))(
    '%s compares no country string at all',
    (_name, rule) => {
      // The #639 assertion proper. A rule naming a country — in ANY spelling
      // the mapping accepts, or the column the countries used to live in — has
      // gone back to matching free text, whatever else it also does.
      const source = celSource(rule.condition);
      expect(source, 'the rule reads the free-text country column again').not.toContain('billing_country');
      const named = Object.keys(COUNTRY_TERRITORY).filter((country) =>
        new RegExp(`"${country}"`, 'i').test(source),
      );
      expect(
        named,
        `${_name} names ${named.join(', ')} — territory membership is decided in ` +
          `src/objects/_territory.ts, not in a CEL string`,
      ).toEqual([]);
    },
  );

  it('keeps the territories it always covered', () => {
    // #639 changed WHAT the rules match, and must not quietly change WHICH
    // accounts each team gets. The two conditions are asserted verbatim: they
    // are interpolated from `TERRITORY`, so this is also the pin that a
    // territory value renamed in the picklist reaches the rules (`P` quotes an
    // interpolated string, hence the double quotes below).
    const na = territoryRules.find((r) => r.name === 'north_america_territory');
    const eu = territoryRules.find((r) => r.name === 'europe_territory');
    expect(celSource(na!.condition)).toBe('record.territory == "na"');
    expect(celSource(eu!.condition)).toBe('record.territory == "emea"');
    // And the countries those two values cover are still the pre-#639 set,
    // with `UK` kept as a spelling of the (now canonical) `GB` so no stock
    // account was evicted by the rename.
    expect(new Set(Object.keys(COUNTRY_TERRITORY).filter((c) => COUNTRY_TERRITORY[c] === 'na'))).toContain('US');
    for (const country of ['US', 'CA', 'MX']) expect(territoryFor(country)).toBe('na');
    for (const country of ['UK', 'GB', 'DE', 'FR', 'IT', 'ES']) expect(territoryFor(country)).toBe('emea');
  });

  it('crm_account carries territory as a readonly select over the declared domain', () => {
    const account = objectByName.get('crm_account');
    const field = (account?.fields ?? {}).territory;
    expect(field, 'crm_account.territory is gone — the territory rules now filter on nothing').toBeDefined();
    expect(field.type).toBe('select');
    // A select is what makes the domain knowable — the whole point of #639.
    // Free text has no enumerable set, which is why `United States` could land
    // an account in no territory with nothing to check it against.
    expect((field.options ?? []).map((o: AnyRec) => o.value)).toEqual(
      TERRITORY_OPTIONS.map((o) => o.value),
    );
    // Readonly is what makes it derived rather than a second place to state a
    // territory: `account.hook.ts` is the only writer.
    expect(field.readonly).toBe(true);
  });

  it('crm_account still carries billing_country as a readonly, derived column', () => {
    // It is no longer matched against, but it is still the INPUT the territory
    // was classified from and the only place the typed spelling survives — the
    // one thing that can explain an account sitting in `other`.
    const account = objectByName.get('crm_account');
    const field = (account?.fields ?? {}).billing_country;
    expect(field, 'crm_account.billing_country is gone — nothing shows what the territory was derived from').toBeDefined();
    expect(field.type).toBe('text');
    expect(field.readonly).toBe(true);
  });
});

/**
 * The operator matrix, measured rather than remembered.
 *
 * These are not assertions about HotCRM metadata — they pin what the PLATFORM's
 * sharing-rule compiler accepts, so the reasoning recorded at the top of this
 * file stays checkable. If a platform upgrade widens support for nested paths,
 * `nested paths into a composite value do not compile` fails and
 * `billing_country` can be reconsidered; if it narrows, the rules break here
 * rather than in a boot log.
 */
describe('what a sharing condition may contain (platform compiler, measured)', () => {
  const compiles = (source: string) => compileCelToFilter(source, { variables: {} }).ok;

  it.each([
    ['equality + conjunction', 'record.type == "customer" && record.is_active == true'],
    ['membership on a flat field', 'record.billing_country in ["US", "CA", "MX"]'],
    ['inequality', 'record.type != "customer"'],
    ['ordering', 'record.annual_revenue >= 1000'],
    ['disjunction', 'record.billing_country == "US" || record.billing_country == "CA"'],
    ['negation', '!(record.type == "customer")'],
    ['null comparison', 'record.type == null'],
    ['string predicate', 'record.name.startsWith("A")'],
  ])('compiles: %s', (_label, source) => {
    expect(compiles(source)).toBe(true);
  });

  it('nested paths into a composite value do not compile', () => {
    // The #621 blocker, isolated: same operator, flat field vs nested path.
    expect(compiles('record.billing_country in ["US", "CA", "MX"]')).toBe(true);
    expect(compiles('record.billing_address.country in ["US", "CA", "MX"]')).toBe(false);
    // …and it is the PATH, not the operator: `==` fails on it too, which is
    // why issue #621's option A (a disjunction of `==`) was never viable.
    expect(compiles('record.billing_address.country == "US"')).toBe(false);
    expect(
      compiles(
        'record.billing_address.country == "US" || record.billing_address.country == "CA"',
      ),
    ).toBe(false);
  });

  it('sharing conditions cannot use has()', () => {
    // Load-bearing for #633: a `has()` guard added to any of these rules would
    // make it untranslatable, and plugin-sharing would silently stop seeding
    // it — the #621 failure, reintroduced across every guarded rule. The
    // fail-open/fail-closed question #633 asks therefore cannot be answered
    // with the same `has()` shape that #630 used for validation predicates.
    expect(compiles('record.type == "customer"')).toBe(true);
    expect(compiles('has(record.type) && record.type == "customer"')).toBe(false);
  });
});

/**
 * From "compiles" to "the configured driver returns rows for it" (#695).
 *
 * ### The defect this block exists to catch
 *
 * `opportunity_sales_sharing` and `opportunity_executive_sharing` are authored
 * as `!(record.stage in [...]) && record.amount >= …`. That compiled cleanly —
 * every assertion above was green — and then the driver refused the filter it
 * compiled to:
 *
 *     ERROR Find operation failed {"object":"crm_opportunity",
 *       "error":{"message":"unknown top level operator: $not"}}
 *     WARN  [sharing-rule] criteria query failed {"rule":"opportunity_executive_sharing", …}
 *     WARN  [sharing-rule] criteria query failed {"rule":"opportunity_sales_sharing", …}
 *     INFO  SharingServicePlugin: boot rule backfill done {"rules":9,"reconciled":9,"ms":8}
 *
 * `reconciled: 9` — success, reported over two rules that granted nothing to
 * anybody. The evaluator catches the driver error and moves on, which is why
 * **the assertion here is on grants materialised, not on a thrown error**: an
 * error is exactly the thing production swallows, so a test that waits for one
 * is testing the harness rather than the app.
 *
 * ### What each rule gets
 *
 * A hand-authored witness: one record the rule MUST reach, and records it must
 * NOT. Those are deliberate statements of intent — "a large open deal is what
 * leadership is supposed to see" — not derived from the filter, because
 * deriving them from the filter would re-implement the matcher and could only
 * ever agree with itself. The rule's compiled filter is then run against a real
 * ObjectQL engine on the real driver, and must return **exactly** the witness.
 *
 * That catches both halves of the failure at PR time: a filter the driver
 * cannot execute (it throws, so no rows come back) and a filter it executes
 * into nothing (the silent half — it returns zero rows and the old boot log
 * would still have said `reconciled`).
 *
 * ### Measured on `@objectstack/driver-memory` 17.1.0 — the card's half is dead
 *
 * `$not` no longer reaches mingo: the driver declares `$and`/`$or`/`$not` and
 * refuses anything else with a coded `INVALID_FILTER` instead of passing it
 * through. Measured directly, both the authored form and the portable
 * `!=`-chain compile AND execute, and both return the same single row — so the
 * `unknown top level operator: $not` failure does not reproduce on 17.1.0 and
 * the rules' authoring is left exactly as it is. This block is what makes that
 * a measurement someone can re-run rather than a claim, and what makes the
 * *next* such regression fail here instead of in a boot log.
 */

/** Field types come from the app's own metadata; validation baggage does not. */
function columnsFor(rule: AnyRec, names: string[]): AnyRec {
  const declared = objectByName.get(rule.object as string)?.fields ?? {};
  const shape: AnyRec = { id: { type: 'text' } };
  for (const name of names) shape[name] = { type: declared[name]?.type ?? 'text' };
  return shape;
}

/**
 * One record each rule must reach, and records it must not.
 *
 * Persistence is off: the memory driver otherwise writes
 * `.objectstack/data/memory-driver.json` and would carry rows between runs.
 */
const RULE_WITNESSES: Record<string, { reaches: AnyRec; misses: AnyRec[] }> = {
  account_team_sharing: {
    reaches: { type: 'customer', is_active: true },
    misses: [{ type: 'prospect', is_active: true }, { type: 'customer', is_active: false }],
  },
  north_america_territory: {
    reaches: { territory: 'na' },
    misses: [{ territory: 'emea' }, { territory: 'other' }],
  },
  europe_territory: {
    reaches: { territory: 'emea' },
    misses: [{ territory: 'na' }, { territory: 'other' }],
  },
  campaign_leadership_manager: {
    reaches: { status: 'planning', is_active: true },
    misses: [{ status: 'completed', is_active: true }, { status: 'planning', is_active: false }],
  },
  campaign_leadership_director: {
    reaches: { status: 'in_progress', is_active: true },
    misses: [{ status: 'completed', is_active: true }, { status: 'in_progress', is_active: false }],
  },
  case_escalation_sharing: {
    reaches: { priority: 'critical', is_closed: false },
    misses: [{ priority: 'low', is_closed: false }, { priority: 'critical', is_closed: true }],
  },
  case_director_sharing: {
    reaches: { priority: 'critical', is_closed: false },
    misses: [{ priority: 'high', is_closed: false }, { priority: 'critical', is_closed: true }],
  },
  case_unassigned_triage_sharing: {
    // `owner_id == null` is the one rule whose witness turns on a null, and
    // null semantics are exactly where drivers have been measured to disagree
    // (objectstack#11065). The assertion is on the ROW that comes back, never
    // on a null value — an unowned open case is reachable, an owned one is not.
    // The second clause is `status`, not `is_closed` (#1145) — the derived flag
    // never flips on `resolved`, so it could not express "no longer live work".
    reaches: { owner_id: null, status: 'new' },
    misses: [
      { owner_id: 'usr_1', status: 'new' },
      { owner_id: null, status: 'resolved' },
      { owner_id: null, status: 'closed' },
    ],
  },
  opportunity_sales_sharing: {
    reaches: { stage: 'proposal', amount: 250000 },
    misses: [
      { stage: 'closed_won', amount: 250000 },
      { stage: 'closed_lost', amount: 250000 },
      { stage: 'proposal', amount: 500 },
    ],
  },
  opportunity_executive_sharing: {
    reaches: { stage: 'negotiation', amount: 500000 },
    misses: [{ stage: 'closed_won', amount: 500000 }, { stage: 'proposal', amount: 100 }],
  },
};

describe('every seeded rule EXECUTES on the configured driver, not merely compiles', () => {
  it('every seeded rule has a witness, and no witness is stale', () => {
    // Guard the guard, both directions. Without the first, a rule added without
    // a witness is silently unchecked — which is the shape of this very bug.
    // Without the second, a renamed or retired rule leaves a witness that
    // asserts nothing while still reading like coverage.
    const seeded = sharingRules.filter((rule) => seedOutcome(rule).seeded).map((r) => r.name as string);
    const missing = seeded.filter((name) => !(name in RULE_WITNESSES));
    expect(
      missing,
      'These rules seed but nothing proves the driver can execute them. Add a witness ' +
        '— the record the rule is supposed to reach — to RULE_WITNESSES:\n  ' + missing.join('\n  '),
    ).toEqual([]);

    const stale = Object.keys(RULE_WITNESSES).filter((name) => !seeded.includes(name));
    expect(stale, `witnesses for rules that no longer seed:\n  ${stale.join('\n  ')}`).toEqual([]);
  });

  it.each(Object.keys(RULE_WITNESSES).map((name) => [name] as const))(
    '%s materialises exactly the records it declares',
    async (name) => {
      const rule = sharingRules.find((r) => r.name === name);
      expect(rule, `rule "${name}" is gone from the stack`).toBeDefined();

      const compiled = compileCelToFilter(rule!.condition ?? '', { variables: {} });
      expect(compiled.ok, `"${name}" no longer compiles`).toBe(true);

      const witness = RULE_WITNESSES[name];
      const columns = Object.keys(Object.assign({}, witness.reaches, ...witness.misses));
      const ql = await ObjectQL.create({
        datasources: { default: new InMemoryDriver({ persistence: false }) },
        objects: {
          [rule!.object as string]: { name: rule!.object, fields: columnsFor(rule!, columns) },
        } as never,
      });

      try {
        const api = ql.createContext({ isSystem: true });
        const repo = () => api.object(rule!.object as string);
        const reached = (await repo().insert(witness.reaches as never)) as AnyRec;
        for (const miss of witness.misses) await repo().insert(miss as never);

        // No try/catch: a driver that cannot execute this filter throws, and
        // that throw IS the failure — the boot path swallows it, this does not.
        const rows = (await repo().find({
          where: (compiled as unknown as { filter: unknown }).filter,
        })) as AnyRec[];

        expect(
          rows.map((r) => r.id),
          `"${name}" is seeded and compiles, but on this driver it grants ${rows.length} ` +
            `record(s) instead of the one it declares. A rule that matches nothing still ` +
            `reports "reconciled" at boot — the positions it names simply see nothing.`,
        ).toEqual([reached.id]);
      } finally {
        await ql.close();
      }
    },
  );
});

/**
 * The operator matrix, extended from "compiles" to "the driver runs it" (#695).
 *
 * The block above pins what the platform's *compiler* accepts. This one pins
 * what the *driver* does with the result, on the same predicates, against a
 * fixed three-row fixture — so the two halves of "a sharing rule works" are
 * measured separately and a platform upgrade that breaks either one names
 * which.
 *
 * The expected row sets are MEASURED against `driver-memory` 17.1.0, not
 * reasoned about — including the two null-sensitive rows, which is the family
 * objectstack#11065 records drivers disagreeing on (`avg` over a boolean
 * answers `null` on memory and a number on sqlite). Note what was measured
 * here: `Cyan` has a null `type`, and both `!= "customer"` and
 * `!(… == "customer")` DO return it. That is this driver's answer, written
 * down; if another driver answers differently, that difference belongs in a
 * card, not in a `??` in this file.
 */
describe('what the configured driver does with a compiled condition (measured)', () => {
  const FIXTURE = [
    { name: 'Acme', type: 'customer', is_active: true, billing_country: 'US', annual_revenue: 5000, territory: 'na' },
    { name: 'Beta', type: 'prospect', is_active: false, billing_country: 'DE', annual_revenue: 500, territory: 'emea' },
    { name: 'Cyan', type: null, is_active: true, billing_country: 'JP', annual_revenue: 1000, territory: 'other' },
  ];

  const makeAccounts = () =>
    ObjectQL.create({
      datasources: { default: new InMemoryDriver({ persistence: false }) },
      objects: {
        crm_account: {
          name: 'crm_account',
          fields: {
            id: { type: 'text' }, name: { type: 'text' }, type: { type: 'select' },
            is_active: { type: 'boolean' }, billing_country: { type: 'text' },
            annual_revenue: { type: 'number' }, territory: { type: 'select' },
          },
        },
      } as never,
    });

  it.each([
    ['equality + conjunction', 'record.type == "customer" && record.is_active == true', ['Acme']],
    ['membership on a flat field', 'record.billing_country in ["US", "CA", "MX"]', ['Acme']],
    ['inequality', 'record.type != "customer"', ['Beta', 'Cyan']],
    ['ordering', 'record.annual_revenue >= 1000', ['Acme', 'Cyan']],
    ['disjunction', 'record.billing_country == "US" || record.billing_country == "CA"', ['Acme']],
    ['negation', '!(record.type == "customer")', ['Beta', 'Cyan']],
    ['null comparison', 'record.type == null', ['Cyan']],
    ['string predicate', 'record.name.startsWith("A")', ['Acme']],
    // The shape this card was filed about: a negated membership test. It is
    // what both opportunity leadership rules compile to, and on 17.1.0 the
    // driver executes it — `$not` is a declared combinator now, not a
    // passthrough to mingo.
    ['negated membership (the #695 shape)', '!(record.territory in ["emea", "other"])', ['Acme']],
  ])('executes: %s', async (_label, source, expected) => {
    const compiled = compileCelToFilter(source, { variables: {} });
    expect(compiled.ok, `${_label} no longer compiles`).toBe(true);

    const ql = await makeAccounts();
    try {
      const api = ql.createContext({ isSystem: true });
      for (const row of FIXTURE) await api.object('crm_account').insert(row as never);
      const rows = (await api.object('crm_account').find({
        where: (compiled as unknown as { filter: unknown }).filter,
      })) as AnyRec[];
      expect(rows.map((r) => r.name as string).sort()).toEqual([...expected].sort());
    } finally {
      await ql.close();
    }
  });

  it('a filter the driver cannot execute is refused loudly, not answered wrongly', async () => {
    // The property the whole block leans on: when this driver cannot run a
    // filter it THROWS a coded error rather than dropping the branch and
    // widening the result set. That is what makes "the rows came back" a
    // trustworthy signal above — and it is the platform behaviour that
    // replaced the mingo passthrough this card was filed against.
    const ql = await makeAccounts();
    try {
      const api = ql.createContext({ isSystem: true });
      for (const row of FIXTURE) await api.object('crm_account').insert(row as never);
      await expect(
        api.object('crm_account').find({ where: { $nor: [{ type: 'customer' }] } as never }),
      ).rejects.toThrow(/\$nor/);
    } finally {
      await ql.close();
    }
  });
});
