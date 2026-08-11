// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ObjectQL, applySystemFields } from '@objectstack/objectql';
import { InMemoryDriver } from '@objectstack/driver-memory';
import { SqliteWasmDriver } from '@objectstack/driver-sqlite-wasm';
import stack from '../objectstack.config';
import { QUOTE_DISCOUNT_CEILING } from '../src/objects/_thresholds';
import { quotes } from '../src/data/revenue.seed';

/**
 * A quote's discount may never exceed the ceiling (#599).
 *
 * ### What this closes
 *
 * The only discount constraint `crm_quote` ever carried was the field's own
 * `max: 100` — the arithmetic domain of a percentage. Approval keys on the
 * OPPORTUNITY's amount, so 90% off a $99K deal sat under the large-deal line
 * and nothing anywhere objected. The maintainer's ruling on #599 scoped this
 * card to the hard ceiling; the discount-triggered approval ROUTING that would
 * give a soft ceiling something to do is deferred, so there is exactly one
 * number here and it blocks.
 *
 * ### Why this file drives a real engine
 *
 * Declaring a rule is not enforcing one — `test/win-loss-capture.test.ts` opens
 * with a table of five metadata surfaces that accept a rule and then do not
 * apply it, and this card found a sixth of its own: a `severity: 'warning'`
 * script validation is ADMITTED with no observable surface at all (measured
 * below). So the refusal is driven through a real ObjectQL on both driver
 * shapes: `InMemoryDriver`, whose stored rows omit unwritten columns, and a
 * real SQLite database, whose rows are column-complete with NULLs.
 *
 * Every refusal is asserted by its SUBSTANCE — the envelope `code`, the
 * per-field `code`, the message, and the fact that the record did not move.
 * `expect(...).toThrow()` on its own would be worthless here: the pre-#599
 * schema ALREADY throws on the inputs that matter most (`max: 100` refuses
 * `discount: 150`), so a throw-only assertion would be green against the very
 * defect this card exists to fix.
 *
 * ### The envelope, measured rather than assumed
 *
 * `@objectstack/objectql`'s `evaluateValidationRules` raises a `ValidationError`
 * carrying `code: 'VALIDATION_FAILED'` and `fields: [{ field, code, message }]`.
 * It carries **no `status`** — the enumerated own-keys are exactly
 * `['code', 'name', 'fields']` — so nothing here asserts one. HTTP status is
 * `@objectstack/runtime`'s business, and #1075 is the open card on this repo
 * having two refusal shapes (a hook's bare `Error` is the other).
 */

type AnyRec = Record<string, any>;

const objects: AnyRec[] = (stack as any).objects ?? [];
const quote = objects.find((o) => o.name === 'crm_quote') as AnyRec;

/** `P` compiles to `{ dialect: 'cel', source }`. */
const celSource = (v: unknown): string =>
  typeof v === 'string' ? v : String((v as AnyRec)?.source ?? '');

const ruleNamed = (name: string): AnyRec | undefined =>
  ((quote.validations ?? []) as AnyRec[]).find((r) => r?.name === name);

const CEILING_RULE = 'discount_within_ceiling';

/** Run `fn`, expect it to be refused, and hand back the error's own shape. */
const refusal = async (fn: () => Promise<unknown>) => {
  let caught: unknown;
  try {
    await fn();
  } catch (err) {
    caught = err;
  }
  expect(caught, 'the write was ADMITTED — no refusal to inspect').toBeDefined();
  const e = caught as AnyRec;
  return {
    name: String(e?.name ?? ''),
    code: e?.code,
    message: String(e?.message ?? ''),
    fields: (Array.isArray(e?.fields) ? e.fields : []) as AnyRec[],
  };
};

/** Every ceiling refusal in this file must be this exact refusal. */
const expectCeilingRefusal = (env: Awaited<ReturnType<typeof refusal>>) => {
  expect(env.name).toBe('ValidationError');
  expect(env.code).toBe('VALIDATION_FAILED');
  expect(env.message).toBe(`Discount cannot exceed ${QUOTE_DISCOUNT_CEILING}%`);
  expect(env.fields.map((f) => f.code)).toContain('rule_violation');
};

const DRAFT = {
  name: 'Ceiling Probe',
  crm_account: 'acc_stub',
  crm_contact: 'con_stub', // #1017's gate: present so this file tests one rule
  status: 'draft',
  quote_date: '2026-01-01',
  expiration_date: '2026-12-31',
};

// ────────────────────────────────── the declared shape of the ceiling rule ──

describe('the ceiling is declared where the platform can act on it', () => {
  it('ships as an error-severity script validation, not a warning', () => {
    const rule = ruleNamed(CEILING_RULE);
    expect(rule, `no validation named ${CEILING_RULE} on crm_quote`).toBeTruthy();
    expect(rule?.type).toBe('script');
    // `severity: 'warning'` is measured inert on this surface — see the
    // "a warning would be a rule that does nothing" suite below. If this ever
    // reads `warning`, the ceiling has silently stopped existing.
    expect(rule?.severity).toBe('error');
  });

  it('cuts at the one constant, in both the predicate and the message', () => {
    const rule = ruleNamed(CEILING_RULE);
    // Both are interpolated from `_thresholds.ts`, so this is the pin that a
    // number typed into the message can never disagree with the number enforced.
    expect(celSource(rule?.condition)).toContain(`record.discount > ${QUOTE_DISCOUNT_CEILING}`);
    expect(rule?.message).toBe(`Discount cannot exceed ${QUOTE_DISCOUNT_CEILING}%`);
  });

  it('guards the discount read with has(...) — the difference between enforced and inert', () => {
    // A predicate that cannot evaluate is SKIPPED, leaving a rule that reads as
    // enforced and enforces nothing. `test/object-validation-predicates.test.ts`
    // sweeps this across the stack; restated here as the specific hazard.
    expect(celSource(ruleNamed(CEILING_RULE)?.condition)).toContain('has(record.discount)');
    expect(celSource(ruleNamed(CEILING_RULE)?.condition)).toContain('record.discount != null');
  });

  it('replaced the unreachable `valid_discount` rule rather than joining it', () => {
    // `valid_discount` cut at `> 100` under the message "Discount cannot exceed
    // 100%", and field bounds are evaluated BEFORE object validations — so
    // `max: 100` refused every input that could have reached it, with its own
    // `max_value` message. Two rules for one bound, one of them dead.
    expect(ruleNamed('valid_discount')).toBeUndefined();
  });

  it('leaves `max: 100` on the field as the arithmetic domain of a percentage', () => {
    // The policy line and the domain of the type are different claims. Lowering
    // `max` to the ceiling would express the policy with the WEAKER instrument
    // (see the legacy-row suite: a field bound does not reach a stored row).
    expect(quote.fields.discount.max).toBe(100);
    expect(quote.fields.discount.min).toBe(0);
    expect(QUOTE_DISCOUNT_CEILING).toBeLessThan(100);
  });
});

// ──────────────────────────────────────── the write is REFUSED (in-memory) ──

describe('the write is REFUSED, not warned about (in-memory driver)', () => {
  let ql: AnyRec;

  beforeAll(async () => {
    ql = (await ObjectQL.create({
      datasources: { default: new InMemoryDriver({ persistence: false }) },
      objects: { crm_quote: quote } as never,
    })) as never;
  });
  afterAll(async () => {
    await ql?.close();
  });

  const api = () => ql.createContext({ isSystem: true });

  it('refuses an INSERT above the ceiling — the seed / import / API path', async () => {
    const env = await refusal(() =>
      api().object('crm_quote').insert({ ...DRAFT, name: 'Born Deep', discount: 90 }),
    );
    expectCeilingRefusal(env);
  });

  it('refuses an UPDATE above the ceiling, and the discount does not move', async () => {
    const row = await api().object('crm_quote').insert({ ...DRAFT, name: 'Deepened', discount: 10 });
    const env = await refusal(() =>
      api().object('crm_quote').update({ discount: 90 }, { where: { id: row.id } }),
    );
    expectCeilingRefusal(env);

    // Enforcement means the write did not land. A rule that complains while the
    // record moves anyway is the flow-condition failure mode (#633).
    const after = await api().object('crm_quote').findOne({ where: { id: row.id } });
    expect(after?.discount).toBe(10);
  });

  it('admits the ceiling itself — the cut is `>`, not `>=`', async () => {
    // The boundary is asserted from both sides so "at the ceiling" can never
    // drift into "one under it" unnoticed.
    const row = await api()
      .object('crm_quote')
      .insert({ ...DRAFT, name: 'At The Line', discount: QUOTE_DISCOUNT_CEILING });
    const stored = await api().object('crm_quote').findOne({ where: { id: row.id } });
    expect(stored?.discount).toBe(QUOTE_DISCOUNT_CEILING);

    const env = await refusal(() =>
      api()
        .object('crm_quote')
        .update({ discount: QUOTE_DISCOUNT_CEILING + 1 }, { where: { id: row.id } }),
    );
    expectCeilingRefusal(env);
  });

  it('leaves a quote with no discount at all alone', async () => {
    // The sparse-row shape: `discount` is absent, not null. Without the
    // `has(...)` guard this is where the predicate aborts and the rule dies.
    const row = await api().object('crm_quote').insert({ ...DRAFT, name: 'No Discount' });
    const stored = await api().object('crm_quote').findOne({ where: { id: row.id } });
    expect('discount' in (stored ?? {})).toBe(false);
    await api().object('crm_quote').update({ internal_notes: 'ok' }, { where: { id: row.id } });
    const after = await api().object('crm_quote').findOne({ where: { id: row.id } });
    expect(after?.internal_notes).toBe('ok');
  });

  it('leaves ordinary discounts alone across the whole lifecycle', async () => {
    // A rule that fires on legitimate work is a rule someone disables.
    const row = await api().object('crm_quote').insert({ ...DRAFT, name: 'Normal', discount: 20 });
    await api().object('crm_quote').update({ status: 'in_review' }, { where: { id: row.id } });
    await api().object('crm_quote').update({ status: 'presented' }, { where: { id: row.id } });
    const after = await api().object('crm_quote').findOne({ where: { id: row.id } });
    expect(after?.status).toBe('presented');
    expect(after?.discount).toBe(20);
  });

  it('still refuses over-ceiling values the field bound would have caught anyway', async () => {
    // `discount: 150` is refused by `max: 100` FIRST, with `code: 'max_value'`.
    // Pinned so the two instruments' division of labour is a measurement rather
    // than an assumption — and so this file cannot be mistaken for evidence
    // that the ceiling rule is what handles out-of-domain input.
    const env = await refusal(() =>
      api().object('crm_quote').insert({ ...DRAFT, name: 'Impossible', discount: 150 }),
    );
    expect(env.code).toBe('VALIDATION_FAILED');
    expect(env.fields.map((f) => f.code)).toContain('max_value');
    expect(env.message).toMatch(/must be ≤ 100/);
  });
});

// ─────────────────────── the same contract on a real SQL database ───────────

describe('the write is REFUSED on a real SQLite database too', () => {
  // A SQL driver hands back a full row with NULLs where the in-memory driver
  // hands back a sparse one. Those are different inputs to the same predicate,
  // and which driver is underneath is not something a marketplace app chooses.
  let ql: AnyRec;

  beforeAll(async () => {
    const driver = new SqliteWasmDriver({ filename: ':memory:' });
    await driver.connect();
    const materialized = applySystemFields(quote as never, { multiTenant: false }) as AnyRec;
    await driver.initObjects([
      {
        name: 'crm_quote',
        fields: materialized.fields as Record<string, unknown>,
        indexes: materialized.indexes,
      } as never,
    ]);
    ql = (await ObjectQL.create({
      datasources: { default: driver },
      objects: { crm_quote: quote } as never,
    })) as never;
  }, 60_000);
  afterAll(async () => {
    await ql?.close();
  });

  it('refuses the deep discount and leaves the row where it was', async () => {
    const api = ql.createContext({ isSystem: true });
    const row = await api.object('crm_quote').insert({ ...DRAFT, name: 'SQL Probe', discount: 5 });

    const stored = await api.object('crm_quote').findOne({ where: { id: row.id } });
    // The opposite precondition to the in-memory suite: the column is present.
    expect('discount' in (stored ?? {})).toBe(true);

    const env = await refusal(() =>
      api.object('crm_quote').update({ discount: 85 }, { where: { id: row.id } }),
    );
    expectCeilingRefusal(env);

    const after = await api.object('crm_quote').findOne({ where: { id: row.id } });
    expect(after?.discount).toBe(5);
  });

  it('admits a quote with a NULL discount — the column-complete shape', async () => {
    const api = ql.createContext({ isSystem: true });
    const row = await api.object('crm_quote').insert({ ...DRAFT, name: 'SQL Null' });
    const stored = await api.object('crm_quote').findOne({ where: { id: row.id } });
    expect(stored?.discount ?? null).toBeNull();
    await api.object('crm_quote').update({ internal_notes: 'fine' }, { where: { id: row.id } });
    const after = await api.object('crm_quote').findOne({ where: { id: row.id } });
    expect(after?.internal_notes).toBe('fine');
  });
});

// ───────────────────────────── invariant, not transition gate (#1069) ───────

describe('the ceiling is an INVARIANT — it reaches a row that was already over it', () => {
  /**
   * The #1069 question, asked of this card's instrument instead of assumed.
   *
   * #1069 measured that `requiredWhen` is a TRANSITION gate: a record already
   * in the required state is never re-validated, so every such rule in this
   * repo has a silent legacy hole. A hard ceiling is not a transition
   * condition — "the discount may never exceed X" is an invariant — so the
   * shape was chosen by measurement rather than by matching the neighbouring
   * rule (#1068 added a `requiredWhen` to this same object).
   *
   * The legacy row is built the way an upgrading deployment gets one: insert
   * through an engine whose schema has no ceiling, then re-open the SAME store
   * with the shipped schema. Verdict, on both instruments:
   *
   *   Field.percent({ max: 60 })      legacy row, unrelated edit → ADMITTED
   *   discount_within_ceiling         legacy row, unrelated edit → REFUSED
   *
   * A field bound validates the value being WRITTEN; a script validation is
   * evaluated against the MERGED record on every write. So `max` carries
   * #1069's hole in a second instrument, and the rule this card ships does not.
   */
  const ungated = () => {
    const clone = JSON.parse(JSON.stringify(quote)) as AnyRec;
    clone.validations = ((clone.validations ?? []) as AnyRec[]).filter(
      (r) => r?.name !== CEILING_RULE,
    );
    return clone;
  };

  /** A store holding one 90%-discount quote, then re-opened with the ceiling. */
  const legacyRow = async (schema: AnyRec = quote) => {
    const driver = new InMemoryDriver({ persistence: false });
    const before: AnyRec = (await ObjectQL.create({
      datasources: { default: driver },
      objects: { crm_quote: ungated() } as never,
    })) as never;
    const row = await before
      .createContext({ isSystem: true })
      .object('crm_quote')
      .insert({ ...DRAFT, name: 'Legacy Deep Discount', discount: 90 });

    const after: AnyRec = (await ObjectQL.create({
      datasources: { default: driver },
      objects: { crm_quote: schema } as never,
    })) as never;
    return { ql: after, api: after.createContext({ isSystem: true }), row };
  };

  it('refuses an UNRELATED edit to a row stored above the ceiling', async () => {
    // This is the case a transition gate cannot see, and the whole reason the
    // instrument is a validation rule.
    const { ql, api, row } = await legacyRow();
    const env = await refusal(() =>
      api.object('crm_quote').update({ internal_notes: 'chased' }, { where: { id: row.id } }),
    );
    expectCeilingRefusal(env);
    await ql.close();
  });

  it('refuses to walk such a row forward through its lifecycle', async () => {
    const { ql, api, row } = await legacyRow();
    const env = await refusal(() =>
      api.object('crm_quote').update({ status: 'in_review' }, { where: { id: row.id } }),
    );
    expectCeilingRefusal(env);
    const after = await api.object('crm_quote').findOne({ where: { id: row.id } });
    expect(after?.status).toBe('draft');
    await ql.close();
  });

  it('admits the REPAIR — bringing the discount under the ceiling is an ordinary edit', async () => {
    // The cost of an invariant is that an offending row is frozen; the cost is
    // acceptable only because the way out is always open. If this ever goes
    // red, the ceiling has become a trap rather than a rule.
    const { ql, api, row } = await legacyRow();
    await api.object('crm_quote').update({ discount: 25 }, { where: { id: row.id } });
    const after = await api.object('crm_quote').findOne({ where: { id: row.id } });
    expect(after?.discount).toBe(25);
    await api.object('crm_quote').update({ internal_notes: 'now editable' }, { where: { id: row.id } });
    await ql.close();
  });

  it('a field-level `max` would NOT have reached that row — the instrument matters', async () => {
    // The measurement behind the design note in `quote.object.ts`, run rather
    // than recalled. `max` is the shape a reader is most likely to reach for,
    // and it silently inherits #1069's hole.
    const viaMax = JSON.parse(JSON.stringify(ungated())) as AnyRec;
    viaMax.fields.discount.max = QUOTE_DISCOUNT_CEILING;

    const { ql, api, row } = await legacyRow(viaMax);
    // Fresh writes ARE refused by the bound — it is not inert, it is narrower.
    const fresh = await refusal(() =>
      api.object('crm_quote').insert({ ...DRAFT, name: 'Fresh Deep', discount: 90 }),
    );
    expect(fresh.fields.map((f) => f.code)).toContain('max_value');

    // …and the stored row sails straight through.
    await api.object('crm_quote').update({ internal_notes: 'admitted' }, { where: { id: row.id } });
    const after = await api.object('crm_quote').findOne({ where: { id: row.id } });
    expect(after?.internal_notes).toBe('admitted');
    expect(after?.discount).toBe(90);
    await ql.close();
  });
});

// ─────────────────────────── why there is no soft ceiling constant ──────────

describe('a `warning` severity would be a rule that does nothing', () => {
  /**
   * #599 as filed proposed a soft ceiling that WARNS. This is the measurement
   * behind not shipping one: on this surface a `severity: 'warning'` script
   * validation admits the write and surfaces nothing — no warning on the
   * returned record, nothing in any envelope, because there is no envelope.
   * A soft constant would therefore be a declared number with no consumer and
   * no observable effect: a sixth entry for the table in
   * `win-loss-capture.test.ts`, not a feature.
   *
   * It is pinned rather than written down so that the day the platform grows a
   * warning channel, this goes red and the soft tier becomes buildable.
   */
  it('is admitted with no observable warning surface', async () => {
    const warned = JSON.parse(JSON.stringify(quote)) as AnyRec;
    warned.validations = ((warned.validations ?? []) as AnyRec[]).map((r) =>
      r?.name === CEILING_RULE ? { ...r, severity: 'warning' } : r,
    );

    const ql: AnyRec = (await ObjectQL.create({
      datasources: { default: new InMemoryDriver({ persistence: false }) },
      objects: { crm_quote: warned } as never,
    })) as never;
    const api = ql.createContext({ isSystem: true });

    const row = await api.object('crm_quote').insert({ ...DRAFT, name: 'Warned', discount: 90 });
    const stored = await api.object('crm_quote').findOne({ where: { id: row.id } });

    expect(stored?.discount).toBe(90); // admitted, and stored as given
    expect((row as AnyRec).warnings ?? null).toBeNull();
    expect((row as AnyRec).__warnings ?? null).toBeNull();
    await ql.close();
  });
});

// ──────────────────────────────────────────── the data already shipped ──────

describe('the stock data clears the new ceiling', () => {
  // The ceiling applies on WRITE, and seeds run in `upsert` mode on every boot
  // — which IS a write. A seeded quote above the ceiling would fail the seed
  // load, i.e. turn a tightened rule into a boot failure. Enumerated, not
  // assumed: the deepest discount anywhere in HotCRM's seeds is 20%.
  it('no seeded quote carries a discount above the ceiling', () => {
    const records = (quotes as AnyRec).records as AnyRec[];
    const offenders = records.filter(
      (r) => typeof r.discount === 'number' && r.discount > QUOTE_DISCOUNT_CEILING,
    );
    expect(offenders.map((r) => `${r.name} @ ${r.discount}%`)).toEqual([]);
  });

  it('seeds a non-zero discount somewhere, so the check above is not vacuous', () => {
    const records = (quotes as AnyRec).records as AnyRec[];
    expect(records.some((r) => typeof r.discount === 'number' && r.discount > 0)).toBe(true);
  });
});
