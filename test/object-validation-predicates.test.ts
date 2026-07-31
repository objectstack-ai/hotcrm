// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import stack from '../objectstack.config';
import { REPO_ROOT } from './helpers/repo-root';

/**
 * Guards for the CEL predicates inside object `validations[]`.
 *
 * A validation rule is metadata: `os validate` checks that it has a name, a
 * severity and a condition, but never that the condition can actually
 * *evaluate*. Two failure modes have shipped repeatedly because of that, and
 * both are silent — the rule does not error, it simply never fires:
 *
 *   1. **Unguarded comparison.** Strict CEL aborts on `dyn<null> < int`, so
 *      `record.list_price < 0` evaluates to nothing at all whenever the field
 *      is empty. The rule looks enforced and is not. The hazard is written up
 *      at `account.object.ts` and the correct shape is modelled by
 *      `quote_line_item.object.ts` — every operand of a relational comparison
 *      carries its own `!= null` guard in the same expression.
 *
 *   2. **Operator drift between twins.** The same rule copied across objects
 *      picks up a different comparison operator each time, so `end == start`
 *      is rejected on one object and accepted on another — and the message
 *      shown to the user stops matching what the predicate does.
 *
 * Neither is visible in review without reading the CEL character by character,
 * which is exactly why they survived. See #514 (items 3 and 12).
 */

type AnyRec = Record<string, any>;

const objects: AnyRec[] = (stack as any).objects ?? [];

/** `P` compiles to `{ dialect: 'cel', source }`; older rules may be raw strings. */
function celSource(condition: unknown): string {
  if (typeof condition === 'string') return condition;
  if (condition && typeof condition === 'object') {
    return String((condition as AnyRec).source ?? '');
  }
  return '';
}

/** Every `type: 'script'` validation in the stack, flattened with its owner. */
const scriptRules = objects.flatMap((obj) =>
  ((obj.validations ?? []) as AnyRec[])
    .filter((v) => v.type === 'script')
    .map((v) => ({
      object: obj.name as string,
      rule: v.name as string,
      id: `${obj.name}.${v.name}`,
      message: String(v.message ?? ''),
      source: celSource(v.condition),
    })),
);

/**
 * Operands of a relational comparison (`<`, `<=`, `>`, `>=`).
 *
 * `!=` and `==` are deliberately not matched: equality against `null` is the
 * guard itself, and CEL evaluates it fine on an absent field. Only the
 * ordering operators abort.
 */
const OPERAND = String.raw`record\.\w+|previous\.\w+|\w+\([^()]*\)|-?[\d.]+|"[^"]*"`;
const RELATIONAL = new RegExp(
  String.raw`(${OPERAND})\s*(<=|>=|<|>)\s*(${OPERAND})`,
  'g',
);

/** Record fields that the rule compares with an ordering operator. */
function comparedFields(source: string): string[] {
  const fields = new Set<string>();
  for (const [, lhs, , rhs] of source.matchAll(RELATIONAL)) {
    for (const operand of [lhs, rhs]) {
      const field = /^record\.(\w+)$/.exec(operand)?.[1];
      if (field) fields.add(field);
    }
  }
  return [...fields];
}

/** Fields compared but never null-guarded in the same expression. */
function unguardedFields(source: string): string[] {
  return comparedFields(source).filter(
    (field) => !new RegExp(String.raw`record\.${field}\s*!=\s*null`).test(source),
  );
}

/**
 * Rules still shipping an unguarded comparison, with the reason.
 *
 * Empty, and the "no stale entries" test below keeps it that way. It held one
 * entry — `crm_opportunity_line_item.unit_price_positive`, the half of #514
 * item 3 that was carved out of #571 because it touches a different object
 * family. #570 landed that guard in parallel, so the exemption went stale the
 * moment both merged and this file's own staleness check turned main red. That
 * is the mechanism working: an exemption may outlive its fix by exactly one
 * merge, never longer.
 */
const KNOWN_UNGUARDED: Record<string, string> = {};

describe('validation predicates are null-guarded', () => {
  it('finds script validations to check at all', () => {
    // A typo in the flattening above would turn every assertion below into a
    // vacuous pass over an empty list.
    expect(scriptRules.length).toBeGreaterThan(15);
    expect(scriptRules.some((r) => r.object === 'crm_product')).toBe(true);
  });

  it('guards every operand of every ordering comparison', () => {
    const offenders = scriptRules
      .filter((r) => !(r.id in KNOWN_UNGUARDED))
      .map((r) => ({ id: r.id, unguarded: unguardedFields(r.source) }))
      .filter((r) => r.unguarded.length > 0);

    expect(offenders).toEqual([]);
  });

  it('keeps no stale entries in the known-unguarded list', () => {
    const stale = Object.keys(KNOWN_UNGUARDED).filter((id) => {
      const rule = scriptRules.find((r) => r.id === id);
      return !rule || unguardedFields(rule.source).length === 0;
    });

    expect(stale).toEqual([]);
  });

  it('guards both operands of the product cost/price comparison', () => {
    // The regression that motivated the sweep: `cost` is absent on every
    // seeded product, so the warning never fired on any real row.
    const rule = scriptRules.find((r) => r.id === 'crm_product.cost_less_than_price');
    expect(rule).toBeDefined();
    expect(unguardedFields(rule!.source)).toEqual([]);
    expect(comparedFields(rule!.source).sort()).toEqual(['cost', 'list_price']);
  });
});

/**
 * The three date-range twins, unified on one operator.
 *
 * All three assert "end must come strictly after start", so the *violation*
 * predicate — validations fire when the condition is true — is `end <= start`.
 * Campaign used `<`, which accepted a zero-length campaign while its own
 * message promised "must be after"; forecast used `<` with an "on or after"
 * message that its rule name (`period_end_after_start`) contradicted.
 */
const DATE_RANGE_RULES = [
  { id: 'crm_campaign.end_after_start', end: 'end_date', start: 'start_date' },
  { id: 'crm_contract.end_after_start', end: 'end_date', start: 'start_date' },
  { id: 'crm_forecast.period_end_after_start', end: 'period_end', start: 'period_start' },
] as const;

describe('end-after-start rules agree on one operator', () => {
  it.each(DATE_RANGE_RULES)('$id rejects end == start', ({ id, end, start }) => {
    const rule = scriptRules.find((r) => r.id === id);
    expect(rule, `${id} is missing`).toBeDefined();
    expect(rule!.source).toContain(`record.${end} <= record.${start}`);
  });

  it.each(DATE_RANGE_RULES)('$id null-guards both dates', ({ id, end, start }) => {
    const rule = scriptRules.find((r) => r.id === id);
    expect(comparedFields(rule!.source).sort()).toEqual([end, start].sort());
    expect(unguardedFields(rule!.source)).toEqual([]);
  });

  it.each(DATE_RANGE_RULES)('$id says "after", never "on or after"', ({ id }) => {
    const rule = scriptRules.find((r) => r.id === id);
    // The message is the user-visible contract; "on or after" would now be a
    // lie, since the predicate rejects equality.
    expect(rule!.message).toMatch(/must be after/i);
    expect(rule!.message).not.toMatch(/on or after/i);
  });
});

/**
 * `annual_revenue >= 0` is enforced in exactly one place.
 *
 * It used to be enforced twice — an object validation saying "must be
 * positive" and a `beforeInsert`/`beforeUpdate` throw saying "must be greater
 * than or equal to 0" — which disagreed about whether 0 was allowed even
 * though both compared `< 0`. The hook is the surviving enforcement point
 * (`test/hooks-runtime-sales.test.ts` executes it); the duplicate declaration
 * is gone. See #514 item 7.
 */
describe('annual_revenue has a single enforcement point', () => {
  it('declares no revenue validation on crm_account', () => {
    const account = objects.find((o) => o.name === 'crm_account');
    expect(account, 'crm_account is missing').toBeDefined();
    const revenueRules = ((account!.validations ?? []) as AnyRec[]).filter((v) =>
      celSource(v.condition).includes('annual_revenue'),
    );
    expect(revenueRules).toEqual([]);
  });

  it('still enforces it in the account hook', () => {
    const hook = readFileSync(join(REPO_ROOT, 'src/objects/account.hook.ts'), 'utf8');
    expect(hook).toMatch(/input\.annual_revenue\s*<\s*0/);
    expect(hook).toMatch(/greater than or equal to 0/);
  });
});
