// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { compileCelToFilter } from '@objectstack/formula';
import stack from '../objectstack.config';

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
 * ### The measured operator matrix (17.0.0-rc.1)
 *
 * The issue guessed the blocker was the `in [...]` membership operator. It is
 * not — measured, `in [...]` compiles fine. The blocker is the NESTED PATH into
 * an `address`-typed field, which is stored as one composite column:
 *
 *   | predicate (against `crm_account`)                          | compiles |
 *   | ---------------------------------------------------------- | -------- |
 *   | `record.type == "customer" && record.is_active == true`     | yes      |
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

  it('seeds all of them — seeded + 0 skipped', () => {
    const skipped = sharingRules
      .map((rule) => ({ name: rule.name as string, outcome: seedOutcome(rule) }))
      .filter((r) => !r.outcome.seeded)
      .map((r) => `${r.name}: ${(r.outcome as { why: string }).why}`);

    expect(
      skipped,
      'These rules are DECLARED but would be dropped at boot, so the positions they name ' +
        'receive nothing while the metadata and the admin docs say they do. plugin-sharing ' +
        'refuses to seed a rule it cannot compile rather than degrade it to match-all — the ' +
        'fix belongs in the rule (or in the object it filters on), never in the platform:\n  ' +
        skipped.join('\n  '),
    ).toEqual([]);

    // The counts the boot log prints, asserted directly.
    const seeded = sharingRules.filter((rule) => seedOutcome(rule).seeded).length;
    expect(seeded).toBe(sharingRules.length);
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

describe('the territory rules read the flat projection, not the address blob', () => {
  const territoryRules = sharingRules.filter((r) =>
    ['north_america_territory', 'europe_territory'].includes(r.name as string),
  );

  it('both territory rules exist', () => {
    expect(territoryRules).toHaveLength(2);
  });

  it.each(territoryRules.map((r) => [r.name as string, r] as const))(
    '%s filters on billing_country',
    (_name, rule) => {
      const outcome = seedOutcome(rule);
      expect(outcome.seeded, `not seeded: ${JSON.stringify(outcome)}`).toBe(true);
      expect((outcome as { fields: string[] }).fields).toEqual(['billing_country']);
    },
  );

  it.each(territoryRules.map((r) => [r.name as string, r] as const))(
    '%s reaches into no composite value',
    (_name, rule) => {
      // `record.billing_address.country` is the exact shape that shipped inert.
      expect(celSource(rule.condition)).not.toMatch(/record\.\w+\.\w+/);
    },
  );

  it('keeps the territories it always covered', () => {
    // The fix moved WHERE the country is read from; it must not quietly move
    // WHICH accounts each team gets. `UK` (not the ISO `GB`) is carried over
    // deliberately — see the note in src/sharing/account.sharing.ts.
    const na = territoryRules.find((r) => r.name === 'north_america_territory');
    const eu = territoryRules.find((r) => r.name === 'europe_territory');
    expect(celSource(na!.condition)).toBe('record.billing_country in ["US", "CA", "MX"]');
    expect(celSource(eu!.condition)).toBe('record.billing_country in ["UK", "DE", "FR", "IT", "ES"]');
  });

  it('crm_account carries billing_country as a readonly, derived column', () => {
    const account = objectByName.get('crm_account');
    const field = (account?.fields ?? {}).billing_country;
    expect(field, 'crm_account.billing_country is gone — the territory rules now filter on nothing').toBeDefined();
    expect(field.type).toBe('text');
    // Readonly is what makes it a projection rather than a second place to
    // type a country: `account.hook.ts` is the only writer.
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
