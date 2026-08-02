// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ObjectQL, applySystemFields } from '@objectstack/objectql';
import { InMemoryDriver } from '@objectstack/driver-memory';
import { SqliteWasmDriver } from '@objectstack/driver-sqlite-wasm';
import { AnalyticsService } from '@objectstack/service-analytics';
import stack from '../objectstack.config';
import { OpportunityDataset } from '../src/datasets/opportunity.dataset';

/**
 * Win/loss reasons are CAPTURED, and win rate is MEASURED (#593).
 *
 * Two halves, and neither is provable by reading metadata:
 *
 * ═══ 1. "declared" is not "enforced" ═══════════════════════════════════════
 *
 * `crm_opportunity.loss_reason` carried the comment *"required when stage
 * moves to closed_*"* for its whole life while nothing required anything. This
 * repo has now measured FIVE separate metadata surfaces that accept a rule and
 * then do not apply it, each failing differently:
 *
 *   | surface                            | what actually happens                |
 *   | ---------------------------------- | ------------------------------------ |
 *   | object script validation           | unevaluable predicate → SKIPPED, WARN |
 *   | sharing rule condition             | never interpreted — compiled to SQL  |
 *   | flow record-change condition       | run marked failed, THE WRITE LANDS   |
 *   | `decision` node `config.condition` | key never read — inert metadata      |
 *   | `flow.variables` declarations      | declaring binds nothing at runtime   |
 *
 * So the bar for this issue was never "the rule is declared". It is: drive a
 * REAL write through a REAL driver and watch it be REJECTED. That is what the
 * first two describe-blocks below do — on `InMemoryDriver` (whose stored rows
 * omit unwritten columns, the shape that makes a non-total predicate abort)
 * and again on a real SQLite database (column-complete rows, the shape a
 * deployed install has). A rejection is asserted together with "and the record
 * did not move", because a rule that reports a problem while the write lands
 * anyway is the flow-condition failure mode above, not enforcement.
 *
 * `crm_case.resolution_required_for_closed` — the pattern the issue points at
 * — was re-measured the same way rather than assumed, and it does block today;
 * it is pinned below so that if it ever stops, this file says so instead of
 * `crm_opportunity` quietly inheriting a broken idiom.
 *
 * ═══ 2. a ratio is the most dangerous kind of widget ═══════════════════════
 *
 * `#614` shipped a dashboard that printed a 1,500,000 quarterly quota as
 * 7,940,000; the root cause was a filter missing one of its two halves. It
 * raised no error — a wrong denominator never does, it just returns a
 * plausible number. A win rate, `won / (won + lost)`, fails identically.
 *
 * The last two describe-blocks therefore do not check that the widget exists.
 * They run the SHIPPED widget bindings through the real dataset compiler and
 * the real executor — once over a controlled fixture and once over the REAL
 * seeded opportunities — and then PERTURB ONE DEAL AT A TIME: flip a won deal
 * to lost, and the rate must fall; flip a lost deal to won, and it must rise;
 * add an OPEN deal, and it must not move at all. A number that survives all
 * three is a number whose numerator and denominator are both wired to
 * something real.
 */

type AnyRec = Record<string, any>;

const objects: AnyRec[] = (stack as any).objects ?? [];
const dashboards: AnyRec[] = (stack as any).dashboards ?? [];
const datasets: AnyRec[] = (stack as any).datasets ?? [];

const opportunity = objects.find((o) => o.name === 'crm_opportunity') as AnyRec;
const kase = objects.find((o) => o.name === 'crm_case') as AnyRec;
const salesDashboard = dashboards.find((d) => d.name === 'sales_dashboard') as AnyRec;
const widget = (id: string): AnyRec =>
  (salesDashboard?.widgets ?? []).find((w: AnyRec) => w.id === id);

/** `P` compiles to `{ dialect: 'cel', source }`. */
const celSource = (v: unknown): string =>
  typeof v === 'string' ? v : String((v as AnyRec)?.source ?? '');

// ─────────────────────────────────── the shape the contract is declared in ──

describe('the reason fields declare a conditional write contract', () => {
  it('requires loss_reason exactly on closed_lost and win_reason on closed_won', () => {
    expect(celSource(opportunity.fields.loss_reason.requiredWhen)).toBe(
      'has(record.stage) && record.stage == "closed_lost"',
    );
    expect(celSource(opportunity.fields.win_reason.requiredWhen)).toBe(
      'has(record.stage) && record.stage == "closed_won"',
    );
  });

  it('guards the stage read with has(...) — the difference between enforced and inert', () => {
    // Without `has()`, strict CEL aborts on any merged record that omits the
    // column and the engine SKIPS the predicate ("requiredWhen for
    // 'loss_reason' failed to evaluate — skipped"), leaving a rule that reads
    // as enforced and requires nothing. `test/object-validation-predicates.ts`
    // sweeps this property across the whole stack; it is restated here because
    // it is the specific hazard #593 had to clear.
    for (const field of ['win_reason', 'loss_reason']) {
      expect(celSource(opportunity.fields[field].requiredWhen)).toContain('has(record.stage)');
    }
  });

  it('states the requirement in the field description a rep actually reads', () => {
    expect(opportunity.fields.win_reason.description).toMatch(/required/i);
    expect(opportunity.fields.loss_reason.description).toMatch(/required/i);
  });

  it('names the automated close path in the win_reason picklist', () => {
    // `quote_on_accepted` wins the deal with no human in the write, so it has
    // no rep answer to record. It writes `quote_accepted` rather than a
    // fabricated "Better Product" — see the note on the field.
    const values = (opportunity.fields.win_reason.options as AnyRec[]).map((o) => o.value);
    expect(values).toContain('quote_accepted');
  });
});

// ─────────────────────────── enforcement, on a driver with SPARSE records ──

const OPEN_DEAL = {
  name: 'Enforcement Probe',
  crm_account: 'acc_stub',
  amount: 120000,
  stage: 'negotiation',
  close_date: '2099-01-01',
};

describe('the write is REJECTED, not warned about (in-memory driver)', () => {
  let ql: AnyRec;

  beforeAll(async () => {
    ql = (await ObjectQL.create({
      datasources: { default: new InMemoryDriver({ persistence: false }) },
      objects: { crm_opportunity: opportunity } as never,
    })) as never;
  });
  afterAll(async () => {
    await ql?.close();
  });

  const newDeal = async () => {
    const api = ql.createContext({ isSystem: true });
    const row = await api.object('crm_opportunity').insert({ ...OPEN_DEAL });
    return { api, row };
  };

  it('stores no key for a column it was never given — the precondition', async () => {
    const { api, row } = await newDeal();
    const stored = await api.object('crm_opportunity').findOne({ where: { id: row.id } });
    // Not `toBeNull()`: the key is ABSENT. That is the record shape that makes
    // an unguarded predicate abort, and the reason this driver is the one the
    // enforcement tests run on. If a platform upgrade makes it
    // column-complete, this fails — which is the intended signal, because the
    // tests below would stop proving the hard case.
    expect('loss_reason' in (stored ?? {})).toBe(false);
  });

  it('refuses to close a deal as LOST with no loss_reason', async () => {
    const { api, row } = await newDeal();
    await expect(
      api.object('crm_opportunity').update({ stage: 'closed_lost' }, { where: { id: row.id } }),
    ).rejects.toThrow(/Loss Reason is required/i);

    // The other half of the assertion, and the one that separates enforcement
    // from the flow-condition failure mode (#633), where the rule complains
    // and the triggering write lands anyway.
    const after = await api.object('crm_opportunity').findOne({ where: { id: row.id } });
    expect(after?.stage).toBe('negotiation');
  });

  it('refuses to close a deal as WON with no win_reason', async () => {
    const { api, row } = await newDeal();
    await expect(
      api.object('crm_opportunity').update({ stage: 'closed_won' }, { where: { id: row.id } }),
    ).rejects.toThrow(/Win Reason is required/i);
    const after = await api.object('crm_opportunity').findOne({ where: { id: row.id } });
    expect(after?.stage).toBe('negotiation');
  });

  it('refuses an INSERT that lands directly in a closed stage', async () => {
    // The path a data import, a seed file or an AI-authored write takes. On
    // insert the engine fills absent fields with null rather than leaving them
    // out, so this exercises a different branch of the same rule.
    const api = ql.createContext({ isSystem: true });
    await expect(
      api.object('crm_opportunity').insert({ ...OPEN_DEAL, name: 'Born Lost', stage: 'closed_lost' }),
    ).rejects.toThrow(/Loss Reason is required/i);
    await expect(
      api.object('crm_opportunity').insert({ ...OPEN_DEAL, name: 'Born Won', stage: 'closed_won' }),
    ).rejects.toThrow(/Win Reason is required/i);
  });

  it('accepts the close when the reason comes with it', async () => {
    const { api, row } = await newDeal();
    await api
      .object('crm_opportunity')
      .update({ stage: 'closed_lost', loss_reason: 'price' }, { where: { id: row.id } });
    const after = await api.object('crm_opportunity').findOne({ where: { id: row.id } });
    expect(after?.stage).toBe('closed_lost');
    expect(after?.loss_reason).toBe('price');
  });

  it('refuses to blank the reason out of a deal that is already closed', async () => {
    // Otherwise the contract would hold for exactly one write: close with a
    // reason, then clear it.
    const api = ql.createContext({ isSystem: true });
    const row = await api
      .object('crm_opportunity')
      .insert({ ...OPEN_DEAL, name: 'Reason Eraser', stage: 'closed_won', win_reason: 'best_fit' });
    await expect(
      api.object('crm_opportunity').update({ win_reason: null }, { where: { id: row.id } }),
    ).rejects.toThrow(/Win Reason is required/i);
  });

  it('leaves writes that do not close anything alone', async () => {
    // A rule that fires on unrelated edits is a rule someone disables.
    const { api, row } = await newDeal();
    await api.object('crm_opportunity').update({ amount: 130000 }, { where: { id: row.id } });
    const after = await api.object('crm_opportunity').findOne({ where: { id: row.id } });
    expect(after?.amount).toBe(130000);
  });

  it('lets the OPPOSITE reason stay empty — the rule is per outcome', async () => {
    const { api, row } = await newDeal();
    await api
      .object('crm_opportunity')
      .update({ stage: 'closed_won', win_reason: 'better_price' }, { where: { id: row.id } });
    const after = await api.object('crm_opportunity').findOne({ where: { id: row.id } });
    expect(after?.stage).toBe('closed_won');
    expect(after?.loss_reason ?? null).toBeNull();
  });
});

// ────────────────────── the same contract on a real SQL database ──────────

describe('the write is REJECTED on a real SQLite database too', () => {
  // The in-memory driver hands back sparse records; a SQL driver hands back a
  // full row with NULLs. Those are different inputs to the same predicate, and
  // "which driver is underneath" is not something a marketplace app chooses —
  // so the contract is measured on both rather than generalised from one.
  let ql: AnyRec;

  beforeAll(async () => {
    const driver = new SqliteWasmDriver({ filename: ':memory:' });
    await driver.connect();
    // The exact call the runtime makes at boot — `ObjectQL.create` wires the
    // datasource but does not emit DDL, so without this the table does not
    // exist and every write fails for the wrong reason.
    const materialized = applySystemFields(opportunity as never, { multiTenant: false }) as AnyRec;
    await driver.initObjects([
      {
        name: 'crm_opportunity',
        fields: materialized.fields as Record<string, unknown>,
        indexes: materialized.indexes,
      } as never,
    ]);
    ql = (await ObjectQL.create({
      datasources: { default: driver },
      objects: { crm_opportunity: opportunity } as never,
    })) as never;
  }, 60_000);
  afterAll(async () => {
    await ql?.close();
  });

  it('rejects the close and leaves the row where it was', async () => {
    const api = ql.createContext({ isSystem: true });
    const row = await api.object('crm_opportunity').insert({ ...OPEN_DEAL, name: 'SQL Probe' });

    const stored = await api.object('crm_opportunity').findOne({ where: { id: row.id } });
    // The opposite precondition to the in-memory suite: here the key IS
    // present and null. Both shapes must reach the same verdict.
    expect('loss_reason' in (stored ?? {})).toBe(true);
    expect(stored?.loss_reason ?? null).toBeNull();

    await expect(
      api.object('crm_opportunity').update({ stage: 'closed_lost' }, { where: { id: row.id } }),
    ).rejects.toThrow(/Loss Reason is required/i);

    const after = await api.object('crm_opportunity').findOne({ where: { id: row.id } });
    expect(after?.stage).toBe('negotiation');
  });

  it('accepts the close with a reason', async () => {
    const api = ql.createContext({ isSystem: true });
    const row = await api.object('crm_opportunity').insert({ ...OPEN_DEAL, name: 'SQL Probe 2' });
    await api
      .object('crm_opportunity')
      .update({ stage: 'closed_won', win_reason: 'relationship' }, { where: { id: row.id } });
    const after = await api.object('crm_opportunity').findOne({ where: { id: row.id } });
    expect(after?.stage).toBe('closed_won');
    expect(after?.win_reason).toBe('relationship');
  });
});

// ───────────────────────── the pattern the issue told us to copy, re-measured ──

describe('crm_case.resolution_required_for_closed is still live', () => {
  // The issue named this as "exactly the pattern needed". It could have been
  // one of the inert cases, so it was measured before being trusted. If this
  // ever goes green-but-silent, the failure is here and not hidden inside
  // crm_opportunity's copy of the idea.
  let ql: AnyRec;

  beforeAll(async () => {
    ql = (await ObjectQL.create({
      datasources: { default: new InMemoryDriver({ persistence: false }) },
      objects: { crm_case: kase } as never,
    })) as never;
  });
  afterAll(async () => {
    await ql?.close();
  });

  it('rejects closing a case with no resolution', async () => {
    const api = ql.createContext({ isSystem: true });
    const row = await api.object('crm_case').insert({
      subject: 'Reference probe',
      description: 'Measuring whether the named pattern still blocks writes.',
      status: 'new',
      priority: 'medium',
      crm_account: 'acc_stub',
    });
    await expect(
      api.object('crm_case').update({ status: 'closed' }, { where: { id: row.id } }),
    ).rejects.toThrow(/Resolution is required/i);
    const after = await api.object('crm_case').findOne({ where: { id: row.id } });
    expect(after?.status).toBe('new');
  });
});

// ─────────────────────────────────── the seeds cannot regress the contract ──

/** `objectstack.config` registers seed buckets under `data`. */
const seedRecords: AnyRec[] = (((stack as any).data ?? []) as AnyRec[]).find(
  (s) => s.object === 'crm_opportunity',
)?.records ?? [];

describe('every settled seed carries its reason', () => {
  it('finds the opportunity seed at all', () => {
    expect(seedRecords.length, 'no crm_opportunity seed records found').toBeGreaterThan(10);
  });

  it('gives every closed_won a win_reason and every closed_lost a loss_reason', () => {
    // These rows go through the same `evaluateValidationRules` as a user write,
    // so a missing reason does not degrade the demo — it stops the seed. The
    // assertion exists so the failure names the record instead of surfacing as
    // a boot-time ValidationError.
    const bad = seedRecords
      .filter((r) => r.stage === 'closed_won' || r.stage === 'closed_lost')
      .filter((r) => (r.stage === 'closed_won' ? !r.win_reason : !r.loss_reason))
      .map((r) => `${r.name} (${r.stage})`);
    expect(bad, `settled seeds with no reason:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('seeds enough distinct loss reasons for the breakdown to be a breakdown', () => {
    const reasons = new Set(
      seedRecords.filter((r) => r.stage === 'closed_lost').map((r) => r.loss_reason),
    );
    expect(reasons.size).toBeGreaterThanOrEqual(4);
  });

  it('seeds at least one lead source that both wins and loses', () => {
    // Otherwise `win_rate_by_lead_source` is a column of 100%s and blanks, and
    // the denominator could be wrong without anybody noticing.
    const won = new Set(
      seedRecords.filter((r) => r.stage === 'closed_won').map((r) => r.lead_source),
    );
    const mixed = seedRecords
      .filter((r) => r.stage === 'closed_lost' && won.has(r.lead_source))
      .map((r) => r.lead_source);
    expect([...new Set(mixed)].length).toBeGreaterThanOrEqual(2);
  });

  it('every seeded opportunity survives the engine that now enforces the rule', async () => {
    // The rule applies to seed writes too — they go through the same
    // `evaluateValidationRules` as a rep's form. So the cost of enforcing it is
    // that a settled seed with no reason no longer degrades the demo, it stops
    // the boot. This replays the real records through the REAL crm_opportunity
    // metadata and asserts every one lands, which is the check that would have
    // caught a missed row before `pnpm demo:reset` did.
    //
    // Only the CEL-valued columns are substituted: `close_date: cel`daysAgo(15)``
    // is an expression the seeder resolves at write time, and this assertion is
    // about the validation verdict, not about date arithmetic.
    const ql = (await ObjectQL.create({
      datasources: { default: new InMemoryDriver({ persistence: false }) },
      objects: { crm_opportunity: opportunity } as never,
    })) as AnyRec;
    try {
      const api = ql.createContext({ isSystem: true });
      const isCel = (v: unknown) => !!v && typeof v === 'object' && 'source' in (v as AnyRec);
      for (const rec of seedRecords) {
        const row: AnyRec = {};
        for (const [k, v] of Object.entries(rec)) row[k] = isCel(v) ? '2026-05-01' : v;
        await api.object('crm_opportunity').insert(row);
      }
      expect(await api.object('crm_opportunity').count({})).toBe(seedRecords.length);
    } finally {
      await ql?.close();
    }
  });

  it('uses only reason values the picklists declare', () => {
    const allowed = (field: string) =>
      new Set((opportunity.fields[field].options as AnyRec[]).map((o) => String(o.value)));
    const winValues = allowed('win_reason');
    const lossValues = allowed('loss_reason');
    const bad = seedRecords
      .filter((r) => r.win_reason || r.loss_reason)
      .filter(
        (r) =>
          (r.win_reason && !winValues.has(String(r.win_reason)))
          || (r.loss_reason && !lossValues.has(String(r.loss_reason))),
      )
      .map((r) => `${r.name}: ${r.win_reason ?? r.loss_reason}`);
    expect(bad, `seeded reason values off the picklist:\n  ${bad.join('\n  ')}`).toEqual([]);
  });
});

// ───────────────────────────────── the ratio, and both of its halves ──

/**
 * The three win/loss deals used by the runtime block, replayed per rep so the
 * `by owner` grouping has something to group. Reasons are supplied because the
 * engine under test is the same one that enforces them — which is itself a
 * proof that the two halves of this issue agree with each other.
 */
const REPS = ['rep_alice', 'rep_bob'] as const;

describe('win rate is measured, and both halves are load-bearing', () => {
  let ql: AnyRec;
  let analytics: AnalyticsService;

  const OPP_COLUMNS = ['name', 'stage', 'amount', 'owner', 'lead_source', 'win_reason', 'loss_reason', 'close_date'];

  beforeAll(async () => {
    ql = (await ObjectQL.create({
      datasources: { default: new InMemoryDriver({ persistence: false }) },
      objects: {
        // A shape-only stand-in: this block tests which rows the measures
        // select and what they divide, not the object's own rules (those are
        // measured above, against the real metadata).
        crm_opportunity: {
          name: 'crm_opportunity',
          fields: {
            id: { type: 'text' },
            name: { type: 'text' },
            stage: { type: 'text' },
            amount: { type: 'number' },
            owner: { type: 'text' },
            lead_source: { type: 'text' },
            win_reason: { type: 'text' },
            loss_reason: { type: 'text' },
            close_date: { type: 'date' },
          },
        },
      } as never,
    })) as never;

    analytics = new AnalyticsService({
      // The same bridge `AnalyticsServicePlugin` wires at boot.
      executeAggregate: async (objectName: string, opts: AnyRec) =>
        (ql as AnyRec).aggregate(objectName, {
          where: opts.filter,
          groupBy: opts.groupBy,
          aggregations: opts.aggregations?.map((a: AnyRec) => ({
            function: a.method, field: a.field, alias: a.alias,
          })),
          timezone: opts.timezone,
          context: opts.context,
        }),
      queryCapabilities: () => ({ nativeSql: false, objectqlAggregate: true, inMemory: false }),
    });
  });

  afterAll(async () => {
    await ql?.close();
  });

  const api = () => ql.createContext({ isSystem: true });

  /** Insert one deal; only the analytics columns are carried. */
  const add = async (rec: AnyRec) => {
    const row: AnyRec = {};
    for (const c of OPP_COLUMNS) if (rec[c] !== undefined) row[c] = rec[c];
    return api().object('crm_opportunity').insert(row);
  };

  /** Run a SHIPPED widget binding through the real dataset executor. */
  const run = async (w: AnyRec, overrideFilter?: AnyRec) => {
    const res = await analytics.queryDataset(
      OpportunityDataset as never,
      {
        ...(w.dimensions ? { dimensions: w.dimensions } : {}),
        measures: w.values,
        ...(overrideFilter ?? w.filter ? { runtimeFilter: (overrideFilter ?? w.filter) as never } : {}),
      } as never,
      { isSystem: true } as never,
    );
    return (res.rows ?? []) as AnyRec[];
  };

  /** The overall win rate the KPI tile shows, with its date window dropped. */
  const overallWinRate = async () => {
    const rows = await run(widget('win_rate_12m'), {});
    return rows[0]?.win_rate ?? null;
  };

  beforeAll(async () => {
    // 4 won / 2 lost per rep → 8 won, 4 lost overall, win rate 2/3.
    for (const rep of REPS) {
      for (const [i, src] of ['web', 'web', 'referral', 'content'].entries()) {
        await add({
          name: `${rep} win ${i}`, stage: 'closed_won', amount: 10000 * (i + 1),
          owner: rep, lead_source: src, win_reason: 'best_fit', close_date: '2026-05-01',
        });
      }
      for (const [i, src] of ['web', 'cold_call'].entries()) {
        await add({
          name: `${rep} loss ${i}`, stage: 'closed_lost', amount: 5000,
          owner: rep, lead_source: src, loss_reason: i === 0 ? 'price' : 'no_budget',
          close_date: '2026-05-01',
        });
      }
      // Open pipeline: must not touch either half of the ratio.
      await add({
        name: `${rep} open`, stage: 'negotiation', amount: 999999,
        owner: rep, lead_source: 'web', close_date: '2026-12-01',
      });
    }
  });

  it('the shipped widgets exist and bind to the win/loss measures', () => {
    // Guards the guard: every assertion below reads its query out of metadata,
    // so a renamed widget would make them pass over nothing.
    expect(widget('win_rate_12m')?.values).toEqual(['win_rate']);
    expect(widget('win_rate_by_owner')?.dimensions).toEqual(['owner']);
    expect(widget('win_rate_by_owner')?.values).toContain('won_count');
    expect(widget('win_rate_by_owner')?.values).toContain('lost_count');
    expect(widget('win_rate_by_lead_source')?.dimensions).toEqual(['lead_source']);
    expect(widget('loss_reason_breakdown')?.dimensions).toEqual(['loss_reason']);
  });

  it('the win-rate widget carries NO stage filter of its own', () => {
    // The #614 shape. A widget-level `stage` filter narrows numerator and
    // denominator together, which turns the ratio into 1 (or into a division
    // by itself) without any error. Both halves must come from the measures.
    const f = JSON.stringify(widget('win_rate_12m')?.filter ?? {});
    expect(f).not.toContain('stage');
    const dataset = datasets.find((d) => d.name === 'opportunity_metrics') as AnyRec;
    const measure = (n: string) => (dataset.measures as AnyRec[]).find((m) => m.name === n);
    expect(measure('won_count')?.filter).toEqual({ stage: 'closed_won' });
    expect(measure('decided_count')?.filter).toEqual({
      stage: { $in: ['closed_won', 'closed_lost'] },
    });
    expect(measure('win_rate')?.derived).toEqual({
      op: 'ratio',
      of: ['won_count', 'decided_count'],
    });
  });

  it('computes the overall win rate from the settled deals only', async () => {
    // 8 won, 4 lost, 2 open. If the open deals leaked into the denominator the
    // answer would be 8/14; if the numerator lost its filter it would be 1.
    expect(await overallWinRate()).toBeCloseTo(8 / 12, 10);
  });

  it('the by-owner TABLE shows both halves next to the ratio', async () => {
    const rows = await run(widget('win_rate_by_owner'), {});
    expect(rows).toHaveLength(REPS.length);
    for (const rep of REPS) {
      const row = rows.find((r) => r.owner === rep)!;
      expect(row.won_count, `${rep} won`).toBe(4);
      expect(row.lost_count, `${rep} lost`).toBe(2);
      expect(row.decided_count, `${rep} settled`).toBe(6);
      expect(row.win_rate, `${rep} rate`).toBeCloseTo(4 / 6, 10);
      // The ratio is the two columns beside it, not an independent number.
      expect(row.win_rate).toBeCloseTo(row.won_count / row.decided_count, 10);
      // Revenue is won-only: 10k+20k+30k+40k.
      expect(row.won_amount, `${rep} won revenue`).toBe(100000);
    }
  });

  it('the by-lead-source table splits the same deals a different way', async () => {
    const rows = await run(widget('win_rate_by_lead_source'), {});
    const bySource = new Map(rows.map((r) => [r.lead_source, r]));
    // web: 2 wins + 1 loss per rep → 4 won, 2 lost.
    expect(bySource.get('web')!.won_count).toBe(4);
    expect(bySource.get('web')!.lost_count).toBe(2);
    expect(bySource.get('web')!.win_rate).toBeCloseTo(4 / 6, 10);
    // referral / content: wins only → 100%, NOT a blank.
    expect(bySource.get('referral')!.win_rate).toBe(1);
    expect(bySource.get('content')!.win_rate).toBe(1);
  });

  it('a source that only ever lost reports no wins — a measured platform gap', async () => {
    // 17.0.0-rc.1: a filtered measure contributes no row for a group its
    // filter selects nothing in, so `won_count` is ABSENT (not 0) for
    // `cold_call`, and a derived ratio over an absent input is null. The rate
    // reads blank where 0% would be right.
    //
    // Pinned rather than papered over (#656): a consumer-side `?? 0` would be
    // exactly the lenient-consumer habit this repo keeps paying for, and the
    // fix belongs in the executor's merge step, which is the only place that
    // knows a `count` over no rows is 0 while an `avg` over no rows is not.
    // The shipped table puts `lost_count` beside `win_rate` so the blank reads
    // as "0 of 2", not as "no data".
    //
    // This assertion is deliberately written to FAIL when the platform fixes
    // it — that is the notification, not a regression.
    const rows = await run(widget('win_rate_by_lead_source'), {});
    const coldCall = rows.find((r) => r.lead_source === 'cold_call')!;
    expect(coldCall.lost_count).toBe(2);
    expect(coldCall.decided_count).toBe(2);
    expect(coldCall.won_count ?? null).toBeNull();
    expect(coldCall.win_rate ?? null).toBeNull();
  });

  it('the loss-reason breakdown counts only lost deals, grouped by reason', async () => {
    const rows = await run(widget('loss_reason_breakdown'), { stage: 'closed_lost' });
    const byReason = new Map(rows.map((r) => [r.loss_reason, r.opp_count]));
    expect(byReason.get('price')).toBe(2);
    expect(byReason.get('no_budget')).toBe(2);
    // Won deals carry a win_reason and no loss_reason; none of them may appear.
    expect(rows.every((r) => r.loss_reason != null)).toBe(true);
    expect(rows.reduce((s, r) => s + Number(r.opp_count ?? 0), 0)).toBe(4);
  });

  // ─── the perturbation table: change one half, the number must move ───
  //
  // | perturbation                    | won | settled | win rate |
  // | ------------------------------- | --- | ------- | -------- |
  // | (baseline)                      |  8  |   12    |  0.667   |
  // | one WON deal flipped to lost    |  7  |   12    |  0.583   |
  // | one LOST deal flipped to won    |  9  |   12    |  0.750   |
  // | one OPEN deal added             |  8  |   12    |  0.667   |
  //
  // Rows 2 and 3 are what make the numerator and the denominator load-bearing:
  // row 2 moves the numerator only, row 3 moves it the other way, and row 4
  // proves the denominator is NOT "every opportunity". #614's quota table
  // would have failed row 4's equivalent.

  it('falls when a won deal becomes a loss (numerator loses one)', async () => {
    const baseline = await overallWinRate();
    expect(baseline).toBeCloseTo(8 / 12, 10);

    const target = await api()
      .object('crm_opportunity')
      .findOne({ where: { name: 'rep_alice win 0' } });
    await api().object('crm_opportunity').update(
      { stage: 'closed_lost', win_reason: null, loss_reason: 'competitor' },
      { where: { id: target.id } },
    );
    expect(await overallWinRate()).toBeCloseTo(7 / 12, 10);

    // Restore, and confirm the restore is itself observable.
    await api().object('crm_opportunity').update(
      { stage: 'closed_won', loss_reason: null, win_reason: 'best_fit' },
      { where: { id: target.id } },
    );
    expect(await overallWinRate()).toBeCloseTo(8 / 12, 10);
  });

  it('rises when a lost deal becomes a win (numerator gains one)', async () => {
    const target = await api()
      .object('crm_opportunity')
      .findOne({ where: { name: 'rep_bob loss 0' } });
    await api().object('crm_opportunity').update(
      { stage: 'closed_won', loss_reason: null, win_reason: 'better_price' },
      { where: { id: target.id } },
    );
    expect(await overallWinRate()).toBeCloseTo(9 / 12, 10);

    await api().object('crm_opportunity').update(
      { stage: 'closed_lost', win_reason: null, loss_reason: 'price' },
      { where: { id: target.id } },
    );
    expect(await overallWinRate()).toBeCloseTo(8 / 12, 10);
  });

  it('does NOT move when open pipeline is added — the denominator is settled deals', async () => {
    const before = await overallWinRate();
    for (let i = 0; i < 5; i++) {
      await add({
        name: `noise ${i}`, stage: 'proposal', amount: 500000,
        owner: 'rep_alice', lead_source: 'web', close_date: '2026-11-01',
      });
    }
    expect(await overallWinRate()).toBeCloseTo(before as number, 10);
  });

  it('does not divide by zero when nothing has settled', async () => {
    const rows = await run(widget('win_rate_12m'), { lead_source: 'webinar' });
    // No settled webinar deal exists: the honest answer is "no rate", not 0
    // and not a thrown error.
    expect(rows[0]?.win_rate ?? null).toBeNull();
  });
});

// ───────────────────── the acceptance criterion, over the shipped seeds ──

/**
 * "Sales dashboard shows win rate and a loss-reason breakdown with seeded
 * data" — executed rather than eyeballed.
 *
 * The seed rows are replayed into a real engine and the SHIPPED widget
 * bindings are run against them, so the numbers below are the numbers the
 * dashboard prints on a freshly reset demo database. Only the columns the
 * dataset reads are carried: `close_date` is a CEL expression in the seed
 * (`daysAgo(15)`) that the seeder resolves at write time, and this block is
 * about which rows the measures select, not about date arithmetic — the
 * 12-month window is therefore applied as a fixed date here, and the widgets'
 * own `{12_months_ago}` macro is covered by `analytics-integrity.test.ts`.
 */
describe('the shipped seeds produce a real win rate and a real loss breakdown', () => {
  let ql: AnyRec;
  let analytics: AnalyticsService;

  const settled = seedRecords.filter(
    (r) => r.stage === 'closed_won' || r.stage === 'closed_lost',
  );
  const wonSeeds = settled.filter((r) => r.stage === 'closed_won');
  const lostSeeds = settled.filter((r) => r.stage === 'closed_lost');

  beforeAll(async () => {
    ql = (await ObjectQL.create({
      datasources: { default: new InMemoryDriver({ persistence: false }) },
      objects: {
        crm_opportunity: {
          name: 'crm_opportunity',
          fields: {
            id: { type: 'text' },
            name: { type: 'text' },
            stage: { type: 'text' },
            amount: { type: 'number' },
            owner: { type: 'text' },
            lead_source: { type: 'text' },
            win_reason: { type: 'text' },
            loss_reason: { type: 'text' },
            close_date: { type: 'date' },
          },
        },
      } as never,
    })) as never;

    const api = ql.createContext({ isSystem: true });
    for (const rec of seedRecords) {
      await api.object('crm_opportunity').insert({
        name: rec.name,
        stage: rec.stage,
        amount: Number(rec.amount ?? 0),
        lead_source: rec.lead_source ?? null,
        win_reason: rec.win_reason ?? null,
        loss_reason: rec.loss_reason ?? null,
        close_date: '2026-05-01',
      });
    }

    analytics = new AnalyticsService({
      executeAggregate: async (objectName: string, opts: AnyRec) =>
        (ql as AnyRec).aggregate(objectName, {
          where: opts.filter,
          groupBy: opts.groupBy,
          aggregations: opts.aggregations?.map((a: AnyRec) => ({
            function: a.method, field: a.field, alias: a.alias,
          })),
          timezone: opts.timezone,
          context: opts.context,
        }),
      queryCapabilities: () => ({ nativeSql: false, objectqlAggregate: true, inMemory: false }),
    });
  });

  afterAll(async () => {
    await ql?.close();
  });

  const run = async (w: AnyRec, runtimeFilter?: AnyRec) =>
    ((await analytics.queryDataset(
      OpportunityDataset as never,
      {
        ...(w.dimensions ? { dimensions: w.dimensions } : {}),
        measures: w.values,
        ...(runtimeFilter ? { runtimeFilter: runtimeFilter as never } : {}),
      } as never,
      { isSystem: true } as never,
    )).rows ?? []) as AnyRec[];

  it('ships both outcomes — the premise of a win RATE', () => {
    // A seed set that is all wins makes every assertion below pass at 100%
    // without measuring anything.
    expect(wonSeeds.length).toBeGreaterThan(0);
    expect(lostSeeds.length).toBeGreaterThan(0);
    expect(seedRecords.length).toBeGreaterThan(settled.length); // open deals exist too
  });

  it('the KPI tile shows won / (won + lost) over the seeded deals', async () => {
    const rows = await run(widget('win_rate_12m'));
    const expected = wonSeeds.length / settled.length;
    expect(rows[0]?.won_count).toBe(wonSeeds.length);
    expect(rows[0]?.decided_count).toBe(settled.length);
    expect(rows[0]?.win_rate).toBeCloseTo(expected, 10);
    // And it is NOT "won over every opportunity" — the number the denominator
    // would produce if the measure filter went missing.
    expect(rows[0]?.win_rate).not.toBeCloseTo(wonSeeds.length / seedRecords.length, 6);
  });

  it('the loss-reason breakdown covers every seeded loss, one slice per reason', async () => {
    const rows = await run(widget('loss_reason_breakdown'), { stage: 'closed_lost' });
    const total = rows.reduce((s, r) => s + Number(r.opp_count ?? 0), 0);
    expect(total).toBe(lostSeeds.length);
    expect(rows.length).toBe(new Set(lostSeeds.map((r) => r.loss_reason)).size);
    expect(rows.every((r) => r.loss_reason != null)).toBe(true);
  });

  it('the by-source table has rows where BOTH halves are non-zero', async () => {
    // The seeded lead sources are chosen so this holds (see sales.seed.ts). A
    // table where every row is "n won, 0 lost" cannot detect a broken
    // denominator, which is precisely how #614 shipped.
    const rows = await run(widget('win_rate_by_lead_source'));
    const mixed = rows.filter((r) => Number(r.won_count ?? 0) > 0 && Number(r.lost_count ?? 0) > 0);
    expect(mixed.length).toBeGreaterThanOrEqual(2);
    for (const row of mixed) {
      expect(row.decided_count).toBe(Number(row.won_count) + Number(row.lost_count));
      expect(row.win_rate).toBeCloseTo(Number(row.won_count) / Number(row.decided_count), 10);
      expect(row.win_rate).toBeGreaterThan(0);
      expect(row.win_rate).toBeLessThan(1);
    }
  });

  it('losing one seeded win moves the rate, and only by one deal', async () => {
    const before = (await run(widget('win_rate_12m')))[0];
    const api = ql.createContext({ isSystem: true });
    const target = await api
      .object('crm_opportunity')
      .findOne({ where: { name: wonSeeds[0].name } });

    await api.object('crm_opportunity').update(
      { stage: 'closed_lost', win_reason: null, loss_reason: 'competitor' },
      { where: { id: target.id } },
    );
    const after = (await run(widget('win_rate_12m')))[0];

    expect(after.won_count).toBe(Number(before.won_count) - 1);
    expect(after.decided_count).toBe(before.decided_count); // denominator holds
    expect(after.win_rate).toBeLessThan(Number(before.win_rate));

    await api.object('crm_opportunity').update(
      { stage: 'closed_won', loss_reason: null, win_reason: wonSeeds[0].win_reason },
      { where: { id: target.id } },
    );
    expect((await run(widget('win_rate_12m')))[0].win_rate).toBeCloseTo(
      Number(before.win_rate),
      10,
    );
  });
});
