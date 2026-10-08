// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ObjectKernel } from '@objectstack/core';
import { DefaultDatasourcePlugin, AppPlugin } from '@objectstack/runtime';
import { ObjectQLPlugin } from '@objectstack/objectql';
import { MetadataPlugin } from '@objectstack/metadata';
import { AnalyticsService } from '@objectstack/service-analytics';
import { SEED_WRITE_EXECUTION_CONTEXT } from '@objectstack/spec/kernel';
import { SysUser, SysMember, SysOrganization } from '@objectstack/platform-objects/identity';
import stack from '../objectstack.config';
import { CaseDataset } from '../src/service/datasets/case.dataset';
import { CasesOpenedByDayPriorityReport } from '../src/service/reports/case.report';
import { ServiceDashboard } from '../src/service/dashboards/service.dashboard';
import { identityObjects } from './helpers/identity-objects';

/**
 * `crm_case` has one creation stamp, and the platform owns it (#1992).
 *
 * The object declared a `readonly` `created_date` beside the `created_at` the
 * platform injects and stamps on every insert. Only the seed data wrote it, so
 * a case created through the UI or REST stored null — and "Cases Opened by
 * Priority × Day" filtered `created_date $ne null` while the service
 * dashboard's range keyed on it: managers saw the 38 seeded cases and never a
 * real one. The field is retired the way #575 B2 retired the same duplicate on
 * `crm_opportunity` (`test/opportunity-creation-date.test.ts`), and every
 * reader moved to `created_at`.
 *
 * The retirement waited on the platform (AGENTS.md §2): until
 * @objectstack/objectql 17.7.0 the seed loader overwrote an authored
 * `created_at` with the boot instant on first insert (objectstack#21646), so
 * moving the seeds onto it would have collapsed the demo history onto one day.
 * The second half of the executed check below pins that the history survives.
 */

type AnyRec = Record<string, any>;

// The object registry announces every registered object on stdout at `info`.
process.env.OS_REGISTRY_LOG ??= 'silent';

const objects: AnyRec[] = (stack as any).objects ?? [];
const views: AnyRec[] = (stack as any).views ?? [];
const reports: AnyRec[] = (stack as any).reports ?? [];
const kase = objects.find((o) => o.name === 'crm_case') as AnyRec | undefined;
const caseViews = views.find((v) => (v.list?.data?.object ?? v.object) === 'crm_case') as AnyRec | undefined;

/** Every locale pack the stack ships, as `[locale, pack]` (see opportunity-creation-date.test.ts). */
const localePacks: [string, AnyRec][] = ((stack as any).translations ?? []).flatMap(
  (bundle: AnyRec) => Object.entries(bundle) as [string, AnyRec][],
);

/** The object field a `case_metrics` dimension reads. */
const fieldOf = (dimension: string): string | undefined =>
  (CaseDataset.dimensions as AnyRec[]).find((d) => d.name === dimension)?.field;

describe('crm_case has no duplicate creation field', () => {
  it('found the case object, its views and the locale packs', () => {
    expect(kase, 'crm_case not registered').toBeTruthy();
    expect(caseViews?.listViews, 'no crm_case listViews found').toBeTruthy();
    expect(
      localePacks.filter(([, pack]) => pack?.objects?.crm_case?.fields).length,
      'no locale pack labels crm_case fields — the staleness check below would pass vacuously',
    ).toBeGreaterThan(0);
  });

  it('crm_case declares no created_date', () => {
    expect(Object.keys(kase?.fields ?? {})).not.toContain('created_date');
  });

  it('no locale pack still labels it', () => {
    const stale = localePacks
      .filter(([, pack]) => pack?.objects?.crm_case?.fields?.created_date)
      .map(([locale]) => locale);
    expect(stale, `locales still labelling crm_case.created_date: ${stale.join(', ')}`).toEqual([]);
  });

  it('every surface that reads the creation instant reads created_at', () => {
    const reportColumns = (CasesOpenedByDayPriorityReport.columns ?? []) as string[];
    expect(reportColumns.map(fieldOf), 'the daily-inflow report buckets on another field').toEqual(['created_at']);
    expect(ServiceDashboard.dateRange?.field, 'the service dashboard range').toBe('created_at');
    expect(caseViews?.listViews?.case_timeline?.timeline?.startDateField, 'case_timeline start').toBe('created_at');
  });

  it('nothing over crm_case still names created_date', () => {
    // The generalisation: a predicate, bucket or range on a field the object
    // does not have raises nothing anywhere — the rows simply drop out.
    const surfaces: [string, unknown][] = [
      ['case_metrics', CaseDataset],
      ...reports.filter((r) => r.dataset === 'case_metrics').map((r) => [`report ${r.name}`, r] as [string, unknown]),
      ['service_dashboard', ServiceDashboard],
      ['crm_case views', caseViews],
    ];
    const stale = surfaces.filter(([, s]) => JSON.stringify(s).includes('created_date')).map(([name]) => name);
    expect(stale, `crm_case surfaces still naming created_date: ${stale.join(', ')}`).toEqual([]);
  });
});

/**
 * The property the card is about, EXECUTED rather than read: a case written
 * with no date at all — the shape a UI or REST create has — is counted by
 * "Cases Opened by Priority × Day" and inside the service dashboard's range,
 * and a seeded case keeps the creation day it was authored with.
 *
 * The shipped stack runs on a real kernel so the platform's own
 * `sys_stamp_audit_insert` hook (registered by `ObjectQLPlugin`) does the
 * stamping — the fixture never writes `created_at` for the user-created case,
 * which is the whole point. SQLite (through `driver-sql`'s knex path) because
 * that is where the report's day bucket is lowered in production.
 */
describe('a case created without any date is counted', () => {
  const DAY = 86_400_000;
  const SEEDED_AGE_DAYS = 5;
  const utcDay = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

  let kernel: AnyRec;
  let ql: AnyRec;
  let analytics: AnalyticsService;
  let stored: Record<'user' | 'seed', AnyRec>;
  let authoredSeedInstant: string;

  beforeAll(async () => {
    kernel = new ObjectKernel({ logger: { level: 'silent' } } as never);
    await kernel.use(new DefaultDatasourcePlugin({ driver: 'sqlite-wasm', config: { filename: ':memory:' } } as never));
    await kernel.use(new MetadataPlugin({ watch: false, artifactWatch: false, environmentId: 'proj_test' } as never));
    await kernel.use(new ObjectQLPlugin({ environmentId: 'proj_test' } as never));
    // 17.7.0 refuses an object name the registry does not hold (objectstack#21545).
    await kernel.use(identityObjects(SysUser, SysMember, SysOrganization) as never);
    await kernel.use(new AppPlugin(stack as never, undefined as never, { skipSeedData: true } as never));
    await kernel.bootstrap();
    ql = kernel.getService('objectql');

    const read = async (id: string): Promise<AnyRec> =>
      ((await ql.findOne('crm_case', { where: { id } }, { context: { isSystem: true } })) ?? {}) as AnyRec;

    // A user's create: no date of any kind in the payload.
    const userRow = await ql.insert(
      'crm_case',
      {
        subject: 'case-creation-date: user-created',
        description: 'Raised by a user, carrying no date of any kind.',
        status: 'new',
        priority: 'high',
        origin: 'web',
      },
      { context: { userId: 'usr_case_creation_date' } },
    );
    // A seed row, written in the seed loader's own execution context, carrying
    // an authored creation instant the way `service.seed.ts` authors one.
    authoredSeedInstant = new Date(Date.now() - SEEDED_AGE_DAYS * DAY).toISOString();
    const seedRow = await ql.insert(
      'crm_case',
      {
        subject: 'case-creation-date: seeded',
        description: 'Written in the seed loader context with an authored creation instant.',
        status: 'new',
        priority: 'low',
        origin: 'email',
        created_at: authoredSeedInstant,
      },
      { context: { ...SEED_WRITE_EXECUTION_CONTEXT } },
    );
    stored = {
      user: await read(String(userRow?.id ?? userRow?.record?.id)),
      seed: await read(String(seedRow?.id ?? seedRow?.record?.id)),
    };

    analytics = new AnalyticsService({
      // The bridge `AnalyticsServicePlugin` auto-wires at boot.
      executeAggregate: async (objectName: string, opts: AnyRec) =>
        ql.aggregate(objectName, {
          where: opts.filter,
          groupBy: opts.groupBy,
          aggregations: opts.aggregations?.map((a: AnyRec) => ({ function: a.method, field: a.field, alias: a.alias })),
          timezone: opts.timezone,
          context: opts.context,
        }),
      queryCapabilities: () => ({ nativeSql: false, objectqlAggregate: true, inMemory: false }),
      logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} } as never,
    });
  }, 120_000);

  afterAll(async () => {
    await kernel?.shutdown?.();
  });

  /** Run the shipped report exactly as declared: its rows × columns, its values, its own runtimeFilter. */
  const runReport = async (): Promise<AnyRec[]> => {
    const report = CasesOpenedByDayPriorityReport as AnyRec;
    const result = await analytics.queryDataset(
      CaseDataset as never,
      {
        dimensions: [...(report.rows ?? []), ...(report.columns ?? [])],
        measures: report.values,
        ...(report.runtimeFilter ? { runtimeFilter: report.runtimeFilter } : {}),
      },
      { isSystem: true } as never,
    );
    return result.rows as AnyRec[];
  };

  it('the platform stamped the user-created case and kept the seeded instant', () => {
    // Positive controls for everything below: without them a report that
    // counted nothing and a stamp that wrote nothing would read the same.
    expect(stored.user.created_at, 'the platform did not stamp created_at on a plain create').toBeTruthy();
    expect(Math.abs(Date.parse(String(stored.user.created_at)) - Date.now())).toBeLessThan(10 * 60_000);
    expect(
      new Date(String(stored.seed.created_at)).toISOString(),
      'a seed row lost its authored created_at on insert — objectstack#21646 regressed, and the demo history collapses onto the boot day',
    ).toBe(authoredSeedInstant);
  });

  it('counts both cases in "Cases Opened by Priority × Day", each on its own day', async () => {
    const rows = await runReport();
    const column = String((CasesOpenedByDayPriorityReport.columns ?? [])[0]);
    const cell = (priority: string): AnyRec[] => rows.filter((r) => r.priority === priority);

    const total = rows.reduce((sum, r) => sum + (Number(r.case_count) || 0), 0);
    expect(total, `the report dropped a case: ${JSON.stringify(rows)}`).toBe(2);

    const user = cell('high');
    expect(user.map((r) => Number(r.case_count)), JSON.stringify(rows)).toEqual([1]);
    expect(String(user[0][column]).slice(0, 10), 'the user-created case is not on today').toBe(utcDay(Date.parse(String(stored.user.created_at))));

    const seed = cell('low');
    expect(seed.map((r) => Number(r.case_count)), JSON.stringify(rows)).toEqual([1]);
    expect(String(seed[0][column]).slice(0, 10), 'the seeded case is not on its authored day').toBe(utcDay(Date.parse(authoredSeedInstant)));
  });

  it('counts the user-created case inside the service dashboard range', async () => {
    // The console lowers a preset to `{ $gte: '{N_days_ago}', $lte: '{today}' }`
    // (see test/dashboard-date-range-window.test.ts) and ANDs it into every
    // bound widget on `dateRange.field`.
    const result = await analytics.queryDataset(
      CaseDataset as never,
      {
        measures: ['case_count'],
        runtimeFilter: { [String(ServiceDashboard.dateRange?.field)]: { $gte: '{7_days_ago}', $lte: '{today}' } } as never,
      },
      { isSystem: true } as never,
    );
    const total = (result.rows as AnyRec[]).reduce((sum, r) => sum + (Number(r.case_count) || 0), 0);
    expect(total, 'the last-7-days range left a case out').toBe(2);
  });
});
