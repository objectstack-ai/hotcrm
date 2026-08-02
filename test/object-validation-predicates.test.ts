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
 *      key, and the engine's answer to a predicate that cannot answer is to
 *      SKIP the rule. See the house rule below — this is #630.
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
 * ### Why the rule exists (all figures measured on 17.0.0-rc.1)
 *
 * `evaluateValidationRules` evaluates a rule against `{...previous, ...data}`
 * and fills absent fields with `null` **only on insert**. On update, `previous`
 * is whatever the driver returned, and strict CEL aborts with `No such key`
 * the moment a predicate reads a key that is not there. The engine's response
 * to an unevaluable predicate is to skip the rule:
 *
 *     WARN Validation rule 'x' predicate failed to evaluate (…) — skipped
 *
 * A rule that reads as enforced then requires nothing at all — silently. It is
 * the same "declared ≠ enforced" failure this repo keeps deleting rules over
 * (`cannot_edit_converted` #575 B1, `revenue_positive` #571).
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
 *   | `@objectstack/driver-memory`    | **key absent**              | **SKIPPED**    |
 *   | `@objectstack/driver-mongodb`   | **key absent** (see below)  | **SKIPPED**    |
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
 * Out of scope here, filed upstream as objectstack-ai/objectstack#4649: whether
 * the engine should treat an unevaluable predicate on an `error`-severity rule
 * as a failure rather than a skip. A rule that cannot answer is not a rule that
 * passed — but that is a platform decision, not a HotCRM one.
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
        'columns — strict CEL aborts and the engine SKIPS the rule entirely. ' +
        'Use `(!has(record.f) || isBlank(record.f))` for "f is empty" and ' +
        '`has(record.f) && record.f <op> …` for "f holds a value".',
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
 * the engine reports that it skipped a rule.
 *
 * A `ValidationError` here is a PASS: a rule that fires returned a verdict.
 * Only silence-by-abort is the defect.
 */
describe('predicates are TOTAL on the real engine', () => {
  /** Run one object's rules and return the engine's "I skipped it" warnings. */
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
 * SUCCEEDED with the rule silently doing nothing.
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
