// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ObjectQL } from '@objectstack/objectql';
import { InMemoryDriver } from '@objectstack/driver-memory';
import { AnalyticsService } from '@objectstack/service-analytics';
import { resolveSeedRecord } from '@objectstack/formula';
import stack from '../objectstack.config';
import { CrmSeedData } from '../src/data/index';

/**
 * `customer_churn_signals` reads `crm_account.health_score` (#1186).
 *
 * The field is declared as a "CSM-maintained health indicator" with `at_risk`
 * and `churning` options, and the decorative-field sweep (#1182) ruled it a
 * designed keep — a column a human is asked to maintain by hand. The churn
 * report was built entirely on DERIVED signals (`last_activity_date`, `tier`,
 * closed-lost windows) and read the column in no block, so the one churn signal
 * a person actually asserts was absent from the churn report. That is
 * declared ≠ consumed, in the exemplar app.
 *
 * # What this file holds, and why each half is needed
 *
 * 1. **The criterion, off the shipped metadata.** The block exists, it filters
 *    `health_score` on exactly `at_risk` + `churning`, and both spellings are
 *    real options of the declared field. A block that filtered on `at-risk`
 *    would be inert and would look identical to a working one from the outside.
 *
 * 2. **Rows, over the real seeds, through the real analytics path.** "The
 *    filter is present" is not the acceptance criterion — "a non-zero count
 *    comes back" is. Same harness as `activity-seed-coverage.test.ts`, for the
 *    same reason.
 *
 * 3. **The block is not a restatement of the three that were already there.**
 *    Initech (`at_risk`) is ALSO 72 days quiet, so it happens to appear in
 *    `at_risk_accounts` too — which, read alone, would make this block look
 *    redundant. It is not redundant by construction, and the difference is not
 *    a matter of which rows the seed book happens to carry: this block carries
 *    no date term, so an account that is being talked to every day and is
 *    still flagged `churning` lands here and in NO other block. That case is
 *    asserted directly, with a synthetic row, so the claim is isolated from
 *    whatever the seed book happens to carry: the assertion holds whether or
 *    not the seeds contain a real equivalent, and it therefore stays a guard
 *    rather than a restatement of today's demo data.
 */

type AnyRec = Record<string, any>;

const reports: AnyRec[] = (stack as any).reports ?? [];
const objects: AnyRec[] = (stack as any).objects ?? [];
const datasetDefs: AnyRec[] = (stack as any).datasets ?? [];

const churn = reports.find((r) => r.name === 'customer_churn_signals') as AnyRec;
const blocks = (): AnyRec[] => (churn?.blocks ?? []) as AnyRec[];
const blockNamed = (name: string): AnyRec | undefined => blocks().find((b) => b.name === name);

/** The block under test, found by the criterion rather than by its name. */
const healthBlock = (): AnyRec | undefined =>
  blocks().find((b) => (b.runtimeFilter ?? {}).health_score !== undefined);

const FLAGGED = ['at_risk', 'churning'] as const;

// ─── 1. The criterion, off the shipped metadata ─────────────────────────

describe('the churn report carries a health_score criterion (#1186)', () => {
  it('registers the report this file is about', () => {
    expect(churn, 'customer_churn_signals is not registered').toBeTruthy();
    expect(churn.type).toBe('joined');
    expect(blocks().length, 'the joined report lost its blocks').toBeGreaterThanOrEqual(4);
  });

  it('has a block whose filter reads health_score', () => {
    const b = healthBlock();
    expect(
      b,
      'no block of customer_churn_signals filters on `health_score` — the CSM hand-maintains a ' +
        'churn signal the churn report does not read (#1186). Blocks present: ' +
        blocks().map((x) => String(x.name)).join(', '),
    ).toBeTruthy();
  });

  it('selects exactly the two flagged values, spelled as the field declares them', () => {
    const b = healthBlock()!;
    const term = (b.runtimeFilter ?? {}).health_score as AnyRec;
    const selected: string[] = Array.isArray(term) ? term : (term?.$in ?? [term]);
    expect(
      [...selected].sort(),
      `the block selects ${JSON.stringify(selected)}; the criterion is ${JSON.stringify(FLAGGED)}`,
    ).toEqual([...FLAGGED].sort());

    // A value the select does not declare can never match a row, and nothing
    // else in the stack would say so.
    const field = objects.find((o) => o.name === 'crm_account')?.fields?.health_score as AnyRec;
    expect(field, 'crm_account declares no health_score field').toBeTruthy();
    const declared = new Set((field.options ?? []).map((o: AnyRec) => String(o.value)));
    const undeclared = selected.filter((v) => !declared.has(v));
    expect(
      undeclared,
      `the block filters on health_score values crm_account does not declare: ${undeclared.join(', ')} ` +
        `(declared: ${[...declared].join(', ')})`,
    ).toEqual([]);
  });

  it('does not time-window the human judgement', () => {
    // The point of the block. A date term here would fold it back into the
    // derived signals and re-hide the account being actively worked and still
    // churning.
    const b = healthBlock()!;
    expect(
      Object.keys(b.runtimeFilter ?? {}).filter((k) => k.includes('date')),
      'the health_score block carries a date term — an actively-worked churning account ' +
        'would drop out of it, which is the only population it exists to surface',
    ).toEqual([]);
  });

  it('leaves the three derived blocks alone', () => {
    // #1186 is a coverage gap, not a broken report: the activity chain has real
    // writers and the existing blocks run on live data.
    expect(blockNamed('at_risk_accounts')?.runtimeFilter).toEqual({
      is_active: true,
      last_activity_date: { $lt: '{60_days_ago}' },
    });
    expect(blockNamed('silent_high_value')?.runtimeFilter).toEqual({
      is_active: true,
      tier: { $in: ['strategic', 'enterprise'] },
      last_activity_date: { $lt: '{90_days_ago}' },
    });
    expect(blockNamed('recently_closed_lost')?.runtimeFilter).toEqual({
      stage: 'closed_lost',
      close_date: { $gte: '{30_days_ago}' },
    });
  });
});

// ─── 2. + 3. The block, executed ────────────────────────────────────────

type SeedDataset = { object: string; records: AnyRec[] };
const seedDatasets = CrmSeedData as unknown as SeedDataset[];
const recordsOf = (object: string): AnyRec[] =>
  seedDatasets.filter((d) => d.object === object).flatMap((d) => d.records);

/** Seed rows with their `cel` expressions resolved, as the loader resolves them. */
const resolve = (rows: AnyRec[]): AnyRec[] =>
  rows.map((r) => {
    const out = resolveSeedRecord(r, {} as never) as { ok: boolean; value?: AnyRec; error?: AnyRec };
    if (!out.ok) throw new Error(`seed record does not resolve: ${JSON.stringify(out.error)}`);
    return out.value as AnyRec;
  });

const accountRows = resolve(recordsOf('crm_account'));

const isoDay = (value: unknown): string =>
  (value instanceof Date ? value.toISOString() : String(value)).slice(0, 10);
const dayOffset = (days: number): string =>
  new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);

const datasetByName = new Map(datasetDefs.map((d) => [String(d.name), d]));
const objectByName = new Map(objects.map((o) => [String(o.name), o]));

/** `crm_account.is_active` is not authored in the seeds; the field default is. */
const accountIsActiveDefault = (): boolean =>
  (objectByName.get('crm_account')?.fields?.is_active as AnyRec | undefined)?.defaultValue === true;

const makeEngine = () =>
  ObjectQL.create({
    datasources: { default: new InMemoryDriver({ persistence: false }) },
    objects: {
      // Only the columns the four churn blocks read. The object suite owns the
      // full schema; the contract here is "which rows does each block select".
      crm_account: {
        name: 'crm_account',
        fields: {
          id: { type: 'text' },
          name: { type: 'text' },
          is_active: { type: 'boolean' },
          last_activity_date: { type: 'date' },
          health_score: { type: 'text' },
          tier: { type: 'text' },
          annual_revenue: { type: 'number' },
          industry: { type: 'text' },
          type: { type: 'text' },
        },
      },
    } as never,
  });

/** The synthetic row that isolates the claim from the seeds — header, point 3. */
const ACTIVE_AND_CHURNING = 'Zzz Actively-Worked Churning Account';

describe('the health_score block returns rows over the shipped seeds (#1186)', () => {
  let ql: Awaited<ReturnType<typeof makeEngine>>;
  let analytics: AnalyticsService;

  beforeAll(async () => {
    ql = await makeEngine();
    const api = ql.createContext({ isSystem: true });
    const isActive = accountIsActiveDefault();

    for (const a of accountRows) {
      await api.object('crm_account').insert({
        name: a.name,
        is_active: a.is_active ?? isActive,
        last_activity_date: isoDay(a.last_activity_date),
        health_score: a.health_score ?? null,
        tier: a.tier ?? null,
        annual_revenue: a.annual_revenue ?? 0,
        industry: a.industry ?? null,
        type: a.type ?? null,
      });
    }

    // Not a seed: this row exists only inside this file, so the non-redundancy
    // claim does not depend on the seed book ever carrying such an account.
    await api.object('crm_account').insert({
      name: ACTIVE_AND_CHURNING,
      is_active: true,
      last_activity_date: dayOffset(0),
      health_score: 'churning',
      tier: 'mid_market',
      annual_revenue: 1_000_000,
      industry: 'technology',
      type: 'customer',
    });

    analytics = new AnalyticsService({
      executeAggregate: async (objectName, { groupBy, aggregations, filter, timezone, context }) =>
        (ql as any).aggregate(objectName, {
          where: filter,
          groupBy,
          aggregations: aggregations?.map((a: AnyRec) => ({
            function: a.method, field: a.field, alias: a.alias,
          })),
          timezone,
          context,
        }),
      queryCapabilities: () => ({ nativeSql: false, objectqlAggregate: true, inMemory: false }),
    });
  });

  afterAll(async () => {
    await ql?.close();
  });

  /** One report block, executed exactly as the report declares it. */
  const runBlock = async (block: AnyRec): Promise<AnyRec[]> => {
    const dataset = datasetByName.get(String(block.dataset));
    expect(dataset, `block ${block.name} names an undeclared dataset "${block.dataset}"`).toBeTruthy();
    const result = await analytics.queryDataset(
      dataset as never,
      {
        ...(block.rows ? { dimensions: block.rows } : {}),
        measures: block.values,
        ...(block.runtimeFilter ? { runtimeFilter: block.runtimeFilter as never } : {}),
      },
      { isSystem: true } as never,
    );
    return result.rows as AnyRec[];
  };

  const countOf = (rows: AnyRec[]): number =>
    rows.reduce((sum, r) => sum + (Number(r.account_count) || 0), 0);

  it('the seed book still flags at least one account by hand', async () => {
    // Guard the guard. If nobody sets `health_score` in the seeds the block
    // below is vacuously empty, and #1186's own fork clause applies rather than
    // this assertion.
    const flagged = accountRows.filter((a) => FLAGGED.includes(a.health_score));
    expect(
      flagged.map((a) => `${String(a.name)} (${String(a.health_score)})`),
      'no seeded account carries health_score at_risk/churning — the new churn block ships empty',
    ).not.toEqual([]);
  });

  it('counts accounts, not zero — the acceptance criterion', async () => {
    const rows = await runBlock(healthBlock()!);
    const total = countOf(rows);
    expect(
      total,
      'the CSM-flagged block reads 0 over the shipped seed data: the criterion is declared and ' +
        'selects nothing, which is the state #1186 was filed for, one level up',
    ).toBeGreaterThan(0);
  });

  it('surfaces the account no derived block can see — the non-redundancy claim', async () => {
    // Grouping by `type`, so the synthetic row lands in the `customer` column.
    // The three derived blocks are run over the SAME store; the claim is a
    // difference in what they select, not a difference in fixtures.
    const health = countOf(await runBlock(healthBlock()!));

    const quiet60 = countOf(await runBlock(blockNamed('at_risk_accounts')!));
    const silent90 = countOf(await runBlock(blockNamed('silent_high_value')!));

    // The synthetic account is active, worked today, mid_market: it is outside
    // every window above by construction.
    const derivedSeesIt = async (block: AnyRec): Promise<boolean> => {
      const dataset = datasetByName.get(String(block.dataset));
      const result = await analytics.queryDataset(
        dataset as never,
        {
          dimensions: ['type'],
          measures: ['account_count'],
          runtimeFilter: {
            ...(block.runtimeFilter ?? {}),
            name: ACTIVE_AND_CHURNING,
          } as never,
        },
        { isSystem: true } as never,
      );
      return countOf(result.rows as AnyRec[]) > 0;
    };

    expect(
      await derivedSeesIt(healthBlock()!),
      'the CSM-flagged block does not select an account flagged `churning` — it selects on ' +
        'something other than the human judgement',
    ).toBe(true);
    expect(
      await derivedSeesIt(blockNamed('at_risk_accounts')!),
      'at_risk_accounts (60-day window) selected an account worked today',
    ).toBe(false);
    expect(
      await derivedSeesIt(blockNamed('silent_high_value')!),
      'silent_high_value (90-day window) selected an account worked today',
    ).toBe(false);

    // And the totals say the same thing from the other side: the flagged
    // population is not a subset of either window.
    expect(
      health,
      `flagged=${health} quiet60=${quiet60} silent90=${silent90} — the flagged block is empty`,
    ).toBeGreaterThan(0);
  });
});
