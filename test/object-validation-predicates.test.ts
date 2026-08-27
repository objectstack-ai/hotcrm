// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ObjectQL, evaluateValidationRules } from '@objectstack/objectql';
import { InMemoryDriver } from '@objectstack/driver-memory';
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
 *   3. **Non-total predicate.** A field reference with no `has(...)` guard
 *      aborts the whole predicate on a record whose merged shape has no such
 *      key. Through 17.0.0-rc.1 the engine's answer to a predicate that cannot
 *      answer was to SKIP the rule; from 17.0.0-rc.2 it REJECTS the write. See
 *      the house rule below — this is #630.
 *
 *   4. **Unguarded stdlib call argument.** `daysBetween(null, ...)` reaches
 *      `BigInt(NaN)` and THROWS *inside the function*, so a key that is present
 *      and null clears `has()` and detonates anyway. Same engine outcome as (3)
 *      — a rejected ordinary save — reached by a route neither (1) nor (3)
 *      inspects, because the null-sensitive site is a function ARGUMENT and the
 *      predicate need not contain a comparison operator at all. This is #1115;
 *      the sweep for it is `every stdlib call argument is null-guarded`.
 *
 * None is visible in review without reading the CEL character by character,
 * which is exactly why they survived. See #514 (items 3 and 12) and #630.
 */

/**
 * ═══ HOUSE RULE: validation predicates must be TOTAL ═══════════════════════
 *
 * **Every `record.x` read in an authored predicate carries a `has(record.x)`
 * guard.** A predicate must return a verdict for every record shape it can be
 * handed — never abort. This file enforces it; you do not have to remember it.
 *
 * ### Why the rule exists (all figures measured on 17.0.0-rc.1 unless noted)
 *
 * `evaluateValidationRules` evaluates a rule against `{...previous, ...data}`
 * and fills absent fields with `null` **only on insert**. On update, `previous`
 * is whatever the driver returned, and strict CEL aborts with `No such key`
 * the moment a predicate reads a key that is not there. Through 17.0.0-rc.1 the
 * engine's response to an unevaluable predicate was to skip the rule:
 *
 *     WARN Validation rule 'x' predicate failed to evaluate (…) — skipped
 *
 * A rule that reads as enforced then required nothing at all — silently. It is
 * the same "declared ≠ enforced" failure this repo keeps deleting rules over
 * (`cannot_edit_converted` #575 B1, `revenue_positive` #571).
 *
 * **17.0.0-rc.2 makes it fail CLOSED (#4649)** — the upstream question this
 * file filed, answered. The same abort now rejects the write, naming the rule
 * and the read that could not be evaluated (measured on 17.0.0-rc.2):
 *
 *     WARN  Validation rule 'x' predicate failed to evaluate (…) — write rejected (#4649)
 *     THROW ValidationError: Validation rule 'x' could not be evaluated
 *           (runtime: no such overload: dyn<null> < int) — write rejected. …
 *
 * That does not relax the house rule, it raises the stakes: what used to be a
 * rule that quietly enforced nothing is now a rule that blocks an ordinary save
 * on a record shape the author never considered. The guards below are what keep
 * both outcomes off the table, and the sweeps still detect a non-total
 * predicate through the same `failed to evaluate` warning.
 *
 * `!= null` does **not** substitute for `has(...)`: measured on an absent key,
 * `record.f != null` aborts exactly like `record.f != "v"` does. Only `has()`
 * is total, and `coalesce(record.f, "")` aborts too — its argument is
 * evaluated before the call.
 *
 *   | predicate                             | key absent | key null | key set |
 *   | ------------------------------------- | ---------- | -------- | ------- |
 *   | `isBlank(record.f)`                   | **abort**  | true     | false   |
 *   | `record.f != null`                    | **abort**  | false    | true    |
 *   | `coalesce(record.f, "")`              | **abort**  | ""       | "v"     |
 *   | `has(record.f)`                       | false      | true     | true    |
 *   | `!has(record.f) \|\| isBlank(record.f)` | true      | true     | false   |
 *   | `has(record.f) && !isBlank(record.f)` | false      | false    | true    |
 *
 * So the two authoring shapes are:
 *
 *   - "f holds no value"  → `(!has(record.f) || isBlank(record.f))`
 *   - "f holds a value"   → `has(record.f) && record.f <op> …`
 *
 * ### Which driver hands back an incomplete record — measured, not assumed
 *
 *   | driver                          | absent column comes back as | rule on update |
 *   | ------------------------------- | --------------------------- | -------------- |
 *   | `@objectstack/driver-sql`       | key present, `null`         | ENFORCED       |
 *   | `@objectstack/driver-sqlite-wasm` | key present, `null`       | ENFORCED       |
 *   | `@objectstack/driver-memory`    | **key absent**              | **ABORTS**     |
 *   | `@objectstack/driver-mongodb`   | **key absent** (see below)  | **ABORTS**     |
 *
 * "ABORTS" was a silent skip through 17.0.0-rc.1 and is a rejected write from
 * 17.0.0-rc.2 — the same non-total predicate, two different ways of not being
 * the rule the author wrote.
 *
 * The SQL family is column-complete because `SELECT *` returns a NULL for every
 * unset column, and the engine reads `previous` with no field projection
 * (`{ object, where: { id }, limit: 1 }`), so it is a full row. The Mongo
 * driver returns the stored document minus `_id` and fills nothing in — a
 * document written without a field comes back without that key. HotCRM is a
 * marketplace app; it does not choose the datasource its host runs on.
 *
 * ### The decision, and what the rejected option would have cost (#630)
 *
 * Two routes were on the table. **Chosen: make the predicates total.**
 *
 * The rejected route was "make the in-memory test driver column-complete, so
 * the test double behaves like the production driver". It is the more appealing
 * one on its face — the bug does exist because a test double disagreed with
 * production — and it was rejected for three measured reasons:
 *
 *   1. **It cannot be done at the source.** `@objectstack/driver-memory` is a
 *      published platform package; this repo does not modify platform code. All
 *      HotCRM could build is a test-side wrapper, which only helps tests that
 *      remember to use it. That is the same "every author must remember"
 *      objection raised against this route — except its forgetting mode is
 *      worse: a test that news up `InMemoryDriver` directly silently reverts to
 *      the trap, and nothing checks for it.
 *   2. **It would have hidden this class of bug rather than fixed it.** The
 *      in-memory driver's sparse rows are the only place in the stack that
 *      exercises the "merged record lacks the key" shape. Making the double
 *      agree with SQL would make the suite green while every Mongo-backed
 *      install stayed silently unprotected. The sparse double is an asset —
 *      do not "fix" it.
 *   3. **It leaves the predicate depending on an environmental property.** A
 *      rule whose correctness rests on "the storage layer happens to return
 *      NULLs" is a rule one datasource swap away from being inert. Totality is
 *      a property of the rule itself, which is where a contract belongs.
 *
 * The cost of the chosen route — "a rule every future author must remember, and
 * forgetting it is silent" — is paid off by the two tests below: the structural
 * one greps for the guard, and `predicates are TOTAL on the real engine` runs
 * every predicate through `evaluateValidationRules` against a record with no
 * keys at all and fails on any `failed to evaluate` warning. Forgetting the
 * guard is now loud, at PR time, which is the only way a house rule survives.
 *
 * Filed upstream as objectstack-ai/objectstack#4649 — whether the engine should
 * treat an unevaluable predicate as a failure rather than a skip — and **landed
 * in 17.0.0-rc.2**: a rule that cannot answer is not a rule that passed, so the
 * write is rejected. See the fail-closed note above; the guards here are what
 * keeps that door shut for HotCRM's own rules.
 *
 * ### The same rule on the other two CEL surfaces (#633)
 *
 * The house rule above governs object `validations[]` and field predicates.
 * The repo has two more CEL surfaces, and they were MEASURED separately rather
 * than assumed to behave alike — do not carry a conclusion across:
 *
 *   - **Record-change flow conditions** — same strict-CEL abort, but the
 *     engine records the run as FAILED and logs at ERROR instead of skipping
 *     quietly. Guards required; enforced by
 *     `test/flow-condition-totality.test.ts`, which also carries the measured
 *     record shape and evaluation mechanism.
 *   - **Sharing rule conditions** — NOT interpreted at all. They are compiled
 *     to a pushdown filter by `compileCelToFilter`, which rejects the whole
 *     function-call class, so a `has()` guard makes the rule untranslatable
 *     and `plugin-sharing` silently stops seeding it. Guards are actively
 *     harmful there; `test/sharing-seeding.test.ts` pins that.
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
 * `!=` and `==` are deliberately not matched: comparison against `null` is the
 * guard this section is about, and only the ordering operators abort on it.
 *
 * That guard covers the `dyn<null> < int` hazard and nothing else. It does NOT
 * make the predicate total — measured on an absent key, `record.f != null`
 * aborts exactly like `record.f < 0` does. Absent-key totality is a separate
 * property, enforced by the `has(...)` tests further down (#630).
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

// ───────────────────────────────────────── totality (#630) ──
//
// See the HOUSE RULE block at the top of this file for why these two tests
// exist and what the rejected alternative would have cost.

/** Authored CEL predicates that hang off a field, not off `validations[]`. */
const FIELD_PREDICATE_KEYS = ['requiredWhen', 'readonlyWhen', 'visibleWhen'] as const;

/** Every authored predicate in the stack: rules, field predicates, option visibility. */
const allPredicates: { id: string; source: string }[] = [
  ...objects.flatMap((obj) =>
    ((obj.validations ?? []) as AnyRec[])
      .filter((v) => v.type === 'script' || v.type === 'cross_field')
      .map((v) => ({ id: `${obj.name}.${v.name}`, source: celSource(v.condition) })),
  ),
  ...objects.flatMap((obj) =>
    Object.entries((obj.fields ?? {}) as Record<string, AnyRec>).flatMap(([field, def]) =>
      FIELD_PREDICATE_KEYS.filter((k) => def?.[k]).map((k) => ({
        id: `${obj.name}.${field}.${k}`,
        source: celSource(def[k]),
      })),
    ),
  ),
  ...objects.flatMap((obj) =>
    Object.entries((obj.fields ?? {}) as Record<string, AnyRec>).flatMap(([field, def]) =>
      ((def?.options ?? []) as AnyRec[])
        .filter((o) => o?.visibleWhen)
        .map((o) => ({
          id: `${obj.name}.${field}.options[${o.value}].visibleWhen`,
          source: celSource(o.visibleWhen),
        })),
    ),
  ),
];

/** Fields the predicate reads without a `has(...)` guard in the same expression. */
function unhas(source: string): string[] {
  const referenced = [...new Set([...source.matchAll(/record\.(\w+)/g)].map((m) => m[1]))];
  return referenced.filter(
    (field) => !new RegExp(String.raw`has\(record\.${field}\)`).test(source),
  );
}

describe('every authored predicate guards every field it reads', () => {
  it('finds predicates to check at all', () => {
    // Guard the guard: a typo in the flattening above would make the sweep
    // below pass over an empty list.
    expect(allPredicates.length).toBeGreaterThan(20);
    expect(allPredicates.some((p) => p.id === 'crm_task.completed_date_required')).toBe(true);
    expect(allPredicates.some((p) => p.id.endsWith('.requiredWhen'))).toBe(true);
  });

  it('reads no record field without has(...)', () => {
    const offenders = allPredicates
      .map((p) => ({ id: p.id, unguarded: unhas(p.source) }))
      .filter((p) => p.unguarded.length > 0);

    expect(
      offenders,
      'These predicates read a field with no has(…) guard. On a record whose merged ' +
        'shape omits the key — every update on a driver that stores only written ' +
        'columns — strict CEL aborts: the engine skipped the rule entirely through ' +
        '17.0.0-rc.1 and rejects the write from 17.0.0-rc.2 (#4649). ' +
        'Use `(!has(record.f) || isBlank(record.f))` for "f is empty" and ' +
        '`has(record.f) && record.f <op> …` for "f holds a value".',
    ).toEqual([]);
  });
});

/**
 * ═══ The same guard, on the ARGUMENTS OF STDLIB CALLS (#1115) ══════════════
 *
 * `unguardedFields` at the top of this file walks the operands of ORDERING
 * comparisons, because `dyn<null> < int` is the abort AGENTS.md names. A
 * predicate whose only null-sensitive site is a **function argument** has no
 * ordering operator at all, so that sweep passed it *vacuously* — green,
 * having checked nothing. `crm_forecast.period_end_matches_calendar_period` is
 * exactly that shape, and until this sweep landed the only thing standing under
 * it was a pin in its own card's test file: the sweep protected the one
 * predicate that happened to have a test, not the class.
 *
 * The third abort, measured in PR #1110:
 *
 *     daysBetween(null, …) → BigInt(NaN) → THROWS inside the stdlib function
 *                          → engine reports `predicate failed to evaluate`
 *                          → an ordinary save is REJECTED (17.0.0-rc.2, #4649)
 *
 * `has()` does not cover it. A key that is **present and null** passes
 * `has(record.f)` and still detonates the call — which is why this is the
 * `!= null` family of guard, not the `has()` family, and why it is checked
 * here rather than folded into `unhas` above.
 *
 * ### Why the engine-driven sweep below does not catch this — measured
 *
 * With the `!= null` guards stripped from that predicate, `answers when every
 * field is present but null` stays **GREEN**. With every field null,
 * `record.period == "month"` is false and `record.period == "quarter"` is
 * false, so `&&` short-circuits and the `daysBetween(…)` call is never
 * reached. Only the MIXED shape — `period` and `period_start` set, `period_end`
 * null — reaches it, and no sweep in this file constructs that shape. Extending
 * the engine half to mixed shapes is strictly stronger and strictly more
 * expensive (one run per field per object); it is deliberately NOT done here.
 *
 * ### Deny by default
 *
 * Every field handed to a function must carry `record.f != null` **unless the
 * function is on the tolerant list below**. That direction is the whole point:
 * the next stdlib function someone reaches for is guarded *before* anyone
 * measures whether it aborts on null. The list is the exception and it costs a
 * measurement; silence is guarded.
 */

/**
 * Functions measured NOT to abort on a null argument — the table in the HOUSE
 * RULE block at the top of this file is the measurement:
 *
 *   - `has(record.f)`         — the totality accessor itself; total by definition.
 *   - `isBlank(record.f)`     — key null → `true`. The house rule's own "f holds
 *                               no value" shape, `(!has(record.f) ||
 *                               isBlank(record.f))`, is 13 predicates wide and
 *                               CANNOT carry a `!= null` guard — the empty case
 *                               is its entire subject.
 *   - `coalesce(record.f, …)` — key null → the fallback.
 *
 * ⚠️ Do not add a name here to turn a red sweep green. Each entry costs a
 * measurement across `{key absent, key null, key set}`, and an UNMEASURED
 * function belongs on the guarded side — that is what makes this list safe to
 * be short.
 */
const NULL_TOLERANT_FUNCTIONS = new Set(['has', 'isBlank', 'coalesce']);

/**
 * String-literal contents blanked to spaces, offsets preserved.
 *
 * `matches(string(record.period_start), "^[0-9]{4}-(01|04|07|10)-01")` carries
 * parens inside a regex literal, and a `record.` spelled inside a literal would
 * be a phantom field read. Blanking the contents rather than deleting them
 * keeps every index below aligned with the original source.
 */
function blankStringLiterals(source: string): string {
  return source.replace(
    /"[^"]*"|'[^']*'/g,
    (lit) => lit[0] + ' '.repeat(Math.max(lit.length - 2, 0)) + lit[0],
  );
}

/**
 * Every function call in a predicate, with its full paren-BALANCED argument
 * text and the record fields read anywhere inside it.
 *
 * Balanced, not `[^()]*`: the hazard nests. In
 * `daysBetween(record.period_end, addDays(addMonths(record.period_start, 1), -1))`
 * an innermost-only match sees `addMonths(…)` and `today()` and never sees
 * `record.period_end` at all — the argument that actually detonates.
 *
 * A field inside a *tolerant* call nested within a hostile one still counts:
 * this sweep does not model which inner function neutralises which outer
 * hazard, and the conservative reading is deliberate.
 */
function stdlibCalls(source: string): { fn: string; args: string; fields: string[] }[] {
  const scan = blankStringLiterals(source);
  const calls: { fn: string; args: string; fields: string[] }[] = [];

  for (const match of scan.matchAll(/\b([A-Za-z_]\w*)\s*\(/g)) {
    if (match.index === undefined) continue;
    const open = match.index + match[0].length - 1;

    let depth = 0;
    let close = -1;
    for (let i = open; i < scan.length; i++) {
      if (scan[i] === '(') depth += 1;
      else if (scan[i] === ')') {
        depth -= 1;
        if (depth === 0) {
          close = i;
          break;
        }
      }
    }
    // Unbalanced: not a call this sweep can reason about, and the CEL compiler
    // refuses it long before here.
    if (close === -1) continue;

    const args = scan.slice(open + 1, close);
    calls.push({
      fn: match[1],
      args,
      fields: [...new Set([...args.matchAll(/record\.(\w+)/g)].map((f) => f[1]))],
    });
  }

  return calls;
}

/** Fields handed to a null-hostile function with no `record.f != null` in the same expression. */
function unguardedCallArguments(source: string): string[] {
  const risky = new Set<string>();
  for (const call of stdlibCalls(source)) {
    if (NULL_TOLERANT_FUNCTIONS.has(call.fn)) continue;
    for (const field of call.fields) risky.add(field);
  }
  return [...risky].filter(
    (field) => !new RegExp(String.raw`record\.${field}\s*!=\s*null`).test(source),
  );
}

describe('every stdlib call argument is null-guarded', () => {
  it('locates the stdlib call sites it is meant to police', () => {
    // ⚠️ THE VACUITY GUARD, and the reason it is the FIRST test here. A matcher
    // that finds zero call sites is green forever and worthless — and from the
    // outside it is indistinguishable from a clean tree. That is precisely the
    // failure #1115 records about the sweep above, so this one asserts its own
    // reach before asserting anything about the tree.
    const policed = allPredicates.flatMap((p) =>
      stdlibCalls(p.source)
        .filter((c) => !NULL_TOLERANT_FUNCTIONS.has(c.fn) && c.fields.length > 0)
        .map((c) => `${p.id}::${c.fn}`),
    );
    expect(policed.length, 'the matcher found no stdlib call to police').toBeGreaterThan(0);

    // The predicate this card was filed about, by name and by function.
    const anchor = allPredicates.find(
      (p) => p.id === 'crm_forecast.period_end_matches_calendar_period',
    );
    expect(anchor, 'the anchor predicate is gone — re-point this sweep').toBeDefined();

    const fns = stdlibCalls(anchor!.source).map((c) => c.fn);
    expect(fns).toContain('daysBetween');
    expect(fns).toContain('addDays');
    expect(fns).toContain('addMonths');

    // …and the balanced scan really does reach through the nesting to both
    // reads, including the one an innermost-only matcher would miss.
    const reached = [
      ...new Set(
        stdlibCalls(anchor!.source)
          .filter((c) => !NULL_TOLERANT_FUNCTIONS.has(c.fn))
          .flatMap((c) => c.fields),
      ),
    ];
    expect(reached.sort()).toEqual(['period_end', 'period_start']);
  });

  it('fires on an unguarded argument and stays quiet on a guarded one', () => {
    // The matcher proved against fixtures, so its ability to go RED does not
    // depend on the tree ever being wrong. Both strings are the shipped
    // predicate's shape — one without the guards, one with them.
    const call = 'daysBetween(record.period_end, addMonths(record.period_start, 1)) != 0';

    expect(unguardedCallArguments(`has(record.period_end) && ${call}`).sort()).toEqual([
      'period_end',
      'period_start',
    ]);
    expect(
      unguardedCallArguments(
        'has(record.period_end) && record.period_end != null && ' +
          'has(record.period_start) && record.period_start != null && ' +
          call,
      ),
    ).toEqual([]);

    // Tolerant functions are exempt, or the house rule's own "f holds no value"
    // shape would be an offender in 13 shipped predicates.
    expect(unguardedCallArguments('(!has(record.x) || isBlank(record.x))')).toEqual([]);

    // A `record.` spelled inside a string literal is not a field read: without
    // the blanking pass this returns ['f', 'g'].
    expect(unguardedCallArguments('matches(string(record.f), "record.g (x|y)")')).toEqual(['f']);
  });

  it('hands no field to a stdlib call without a != null guard', () => {
    const offenders = allPredicates
      .map((p) => ({ id: p.id, unguarded: unguardedCallArguments(p.source) }))
      .filter((p) => p.unguarded.length > 0);

    expect(
      offenders,
      'These predicates pass a record field to a function with no ' +
        '`record.f != null` guard in the same expression. `daysBetween(null, …)` ' +
        'reaches BigInt(NaN) and THROWS inside the function; the engine reports ' +
        '`predicate failed to evaluate` and REJECTS an ordinary save (17.0.0-rc.2, ' +
        '#4649) — on records the rule was never meant to touch. `has()` alone does ' +
        'NOT cover this: a key that is present and null passes has() and still ' +
        'aborts the call. Write `has(record.f) && record.f != null && fn(record.f, …)`. ' +
        'If the function is genuinely null-tolerant, measure it and add it to ' +
        'NULL_TOLERANT_FUNCTIONS with the measurement.',
    ).toEqual([]);
  });
});

/**
 * The same property, measured instead of grepped.
 *
 * The test above is a regex over source text and can be satisfied by a guard
 * that sits in the wrong place. This one hands each object's real predicates to
 * the engine's own `evaluateValidationRules` with `mode: 'update'` and a
 * `previous` that has no keys at all — the exact shape the in-memory and Mongo
 * drivers produce — and fails on any `failed to evaluate` warning, which is how
 * the engine reports a predicate it could not evaluate (skipped through
 * 17.0.0-rc.1, write rejected from 17.0.0-rc.2 — same warning either way, which
 * is why this sweep still reads it).
 *
 * A `ValidationError` here is a PASS: a rule that fires returned a verdict. Only
 * the abort is the defect, whichever way the engine of the day resolves it.
 */
describe('predicates are TOTAL on the real engine', () => {
  /** Run one object's rules and return the engine's "I could not evaluate" warnings. */
  function skippedWarnings(obj: AnyRec, data: AnyRec, previous: AnyRec | null): string[] {
    const warns: string[] = [];
    const logger = { warn: (...a: unknown[]) => void warns.push(a.map(String).join(' ')) };
    try {
      evaluateValidationRules(obj as never, data, 'update', { previous, logger } as never);
    } catch {
      // ValidationError — a rule reached a verdict, which is the good outcome.
    }
    return warns.filter((w) => /failed to evaluate/.test(w));
  }

  /** Every field any of this object's predicates reads. */
  function referencedFields(obj: AnyRec): string[] {
    const sources = allPredicates
      .filter((p) => p.id.startsWith(`${obj.name}.`))
      .map((p) => p.source)
      .join(' ');
    return [...new Set([...sources.matchAll(/record\.(\w+)/g)].map((m) => m[1]))];
  }

  it.each(objects.map((o) => [o.name as string, o] as const))(
    '%s answers on a record with no keys at all',
    (_name, obj) => {
      expect(skippedWarnings(obj, {}, {})).toEqual([]);
    },
  );

  it.each(objects.map((o) => [o.name as string, o] as const))(
    '%s answers when every field is present but null',
    (_name, obj) => {
      const allNull = Object.fromEntries(Object.keys(obj.fields ?? {}).map((f) => [f, null]));
      expect(skippedWarnings(obj, {}, allNull)).toEqual([]);
    },
  );

  it.each(objects.map((o) => [o.name as string, o] as const))(
    '%s answers when any single referenced field is the one that is missing',
    (_name, obj) => {
      // The shape a partial update actually produces: most columns came back,
      // one did not. Sweeping one field at a time catches a guard that only
      // works because a neighbouring clause short-circuits first.
      const bad: string[] = [];
      for (const field of referencedFields(obj)) {
        const previous = Object.fromEntries(
          Object.keys(obj.fields ?? {})
            .filter((f) => f !== field)
            .map((f) => [f, null]),
        );
        const warns = skippedWarnings(obj, {}, previous);
        if (warns.length > 0) bad.push(`${field}: ${warns.join(' | ')}`);
      }
      expect(bad, `predicates aborted when a single key was absent:\n  ${bad.join('\n  ')}`).toEqual(
        [],
      );
    },
  );
});

/**
 * End-to-end, on the driver that actually produces the sparse record.
 *
 * Everything above tests the predicate in isolation. This drives a real
 * ObjectQL over `InMemoryDriver` — which stores only the columns a row was
 * written with — and performs the exact operation from #630: insert a task
 * without `completed_date`, then update its status to `completed`. Before the
 * guards landed, the merged record had no `completed_date` key, CEL aborted,
 * the engine logged `predicate failed to evaluate … — skipped`, and the save
 * SUCCEEDED with the rule silently doing nothing. (On 17.0.0-rc.2 the same
 * unguarded predicate would block that save instead — a different wrong answer
 * from the same missing guard.)
 */
describe('the rule fires on a driver whose stored record omits the key', () => {
  const task = objects.find((o) => o.name === 'crm_task') as AnyRec;
  let ql: AnyRec;

  beforeAll(async () => {
    ql = (await ObjectQL.create({
      datasources: { default: new InMemoryDriver({ persistence: false }) },
      objects: { crm_task: task } as never,
    })) as never;
  });
  afterAll(async () => {
    await ql?.close();
  });

  const newTask = async () => {
    const api = ql.createContext({ isSystem: true });
    const row = await api
      .object('crm_task')
      .insert({ subject: 'Call back', status: 'not_started', priority: 'normal' });
    return { api, row };
  };

  it('stores no key for a column it was never given — the precondition', async () => {
    const { api, row } = await newTask();
    const stored = await api.object('crm_task').findOne({ where: { id: row.id } });
    // Not `toBeNull()`: the key is ABSENT, which is the whole point. If a
    // platform upgrade makes this driver column-complete, this assertion fails
    // and the tests below stop proving anything — that is the intended signal.
    expect('completed_date' in (stored ?? {})).toBe(false);
  });

  it('rejects status=completed with no completed_date', async () => {
    const { api, row } = await newTask();
    await expect(
      api.object('crm_task').update({ status: 'completed' }, { where: { id: row.id } }),
    ).rejects.toThrow(/Completed date is required/i);
  });

  it('accepts status=completed when the date comes with it', async () => {
    const { api, row } = await newTask();
    await api
      .object('crm_task')
      .update(
        { status: 'completed', completed_date: new Date().toISOString() },
        { where: { id: row.id } },
      );
    const stored = await api.object('crm_task').findOne({ where: { id: row.id } });
    expect(stored?.status).toBe('completed');
  });

  it('leaves an unrelated update alone', async () => {
    // The rule must not fire just because the update did not mention status.
    const { api, row } = await newTask();
    await api.object('crm_task').update({ priority: 'high' }, { where: { id: row.id } });
    const stored = await api.object('crm_task').findOne({ where: { id: row.id } });
    expect(stored?.priority).toBe('high');
  });
});
