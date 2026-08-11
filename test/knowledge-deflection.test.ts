// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ObjectQL, applySystemFields } from '@objectstack/objectql';
import { InMemoryDriver } from '@objectstack/driver-memory';
import { SqliteWasmDriver } from '@objectstack/driver-sqlite-wasm';
import { AnalyticsService } from '@objectstack/service-analytics';
import stack from '../objectstack.config';
import caseHooks from '../src/objects/case.hook';
import { CaseDataset } from '../src/datasets/case.dataset';
import { CloseCaseFlow } from '../src/flows/case-actions.flow';
import { makeFlowHarness } from './helpers/flow-harness';
import { makeCtx, hookNamed, type Rec } from './helpers/hook-harness';

/**
 * Case → article resolution link, and the deflection metric it feeds (#601).
 *
 * `crm_knowledge_article.related_to_case` has always pointed the WRONG WAY for
 * this question — it records the case an article was written FROM. Nothing
 * could record "this article resolved this case", so deflection was
 * unmeasurable. `crm_case.resolved_by_article` is that missing direction, and
 * both links stay: provenance and deflection are different questions.
 *
 * A deflection RATE is the dangerous part. #614 shipped a dashboard that
 * printed a 1,500,000 quota as 7,940,000 because a filter was missing one of
 * its halves — a wrong denominator raises no error, it returns a plausible
 * number. So this file does not check that the widgets exist. It runs the
 * SHIPPED dataset measures through the REAL analytics executor over controlled
 * data, on BOTH drivers this app runs on, and then perturbs one case at a time:
 * attach an article and the rate must rise, detach one and it must fall, add an
 * OPEN case and it must not move.
 *
 * It also pins the trap that makes this metric fragile in a way reading the
 * metadata cannot show — see the empty-string block at the bottom.
 */

type AnyRec = Record<string, any>;

const objects: AnyRec[] = (stack as any).objects ?? [];
const dashboards: AnyRec[] = (stack as any).dashboards ?? [];
const kase = objects.find((o) => o.name === 'crm_case') as AnyRec;
const article = objects.find((o) => o.name === 'crm_knowledge_article') as AnyRec;
const serviceDashboard = dashboards.find((d) => d.name === 'service_dashboard') as AnyRec;
const widget = (id: string): AnyRec =>
  (serviceDashboard?.widgets ?? []).find((w: AnyRec) => w.id === id);

// ──────────────────────────────────────────── 1. both directions, both kept ──

describe('the case↔knowledge link now answers both questions (#601)', () => {
  it('records which article RESOLVED the case', () => {
    const field = (kase.fields as AnyRec).resolved_by_article;
    expect(field, 'crm_case.resolved_by_article is missing').toBeTruthy();
    expect(field.reference ?? field.referenceTo).toBe('crm_knowledge_article');
    expect(field.group).toBe('resolution');
  });

  /**
   * The card is explicit that the pre-existing provenance link stays. They are
   * not two spellings of one relationship: an article written from case A can
   * go on to resolve cases B, C and D, and collapsing them would make both
   * facts unrecoverable.
   */
  it('keeps the article→case provenance link beside it', () => {
    const field = (article.fields as AnyRec).related_to_case;
    expect(field, 'crm_knowledge_article.related_to_case was removed').toBeTruthy();
    expect(field.reference ?? field.referenceTo).toBe('crm_case');
  });
});

// ─────────────────────────── 2. the close-case flow captures it, executed ──

describe('the close-case flow attaches the resolving article', () => {
  const seed = (): Rec[] => ([{
    id: 'c1', case_number: 'CASE-1', status: 'new', priority: 'medium',
    is_escalated: false, is_closed: false, owner_id: 'agent1',
  }]);

  const close = async (screen: Rec) => {
    const h = makeFlowHarness({ close_case: CloseCaseFlow as never }, { crm_case: seed() });
    const runId = await h.run('close_case', { recordId: 'c1' });
    expect(runId, 'close_case did not start').toBeTruthy();
    await h.resume(runId!, screen);
    return h;
  };

  it('writes the article the agent chose, alongside the resolution', async () => {
    const h = await close({ resolution: 'Pointed them at KA-0007.', resolved_by_article: 'ka7' });
    expect(h.store.crm_case[0]).toMatchObject({
      is_closed: true, status: 'closed', resolved_by_article: 'ka7',
    });
  });

  /**
   * The screen field is OPTIONAL — most cases are not resolved out of the KB,
   * and a required field would be answered with junk. Closing without one must
   * still close the case.
   */
  it('still closes a case that no article resolved', async () => {
    const h = await close({ resolution: 'Refunded the customer.' });
    expect(h.store.crm_case[0]).toMatchObject({ is_closed: true, status: 'closed' });
  });

  /**
   * ⚠️ THE TRAP, measured on the real automation engine and pinned here.
   *
   * A screen field the agent leaves EMPTY does not arrive as absent — the
   * resume carries `''`, and `update_record` writes that empty string into the
   * lookup column. SQL `count(column)` counts every non-NULL value and `''` is
   * not NULL, so without normalisation every case closed WITHOUT an article
   * would land in the deflection numerator and the rate would read 100% — with
   * no error anywhere, which is exactly the #614 failure mode.
   *
   * `case_resolution_article_normalize` is what stops it, so this asserts the
   * flow's output AFTER that hook rather than trusting either alone.
   */
  it('normalises a blank article choice to null, not to an empty string', async () => {
    const h = await close({ resolution: 'Refunded.', resolved_by_article: '' });
    const stored = h.store.crm_case[0].resolved_by_article;

    // The flow itself writes '' — that is the platform behaviour being guarded.
    // Whatever the flow wrote, the hook is what the column must end up matching.
    const hook = hookNamed(caseHooks, 'case_resolution_article_normalize');
    const ctx = makeCtx({ event: 'beforeUpdate', input: { resolved_by_article: stored } });
    await hook.handler(ctx);
    expect(ctx.input.resolved_by_article).toBeNull();
  });
});

describe('case_resolution_article_normalize, on its own', () => {
  const hook = hookNamed(caseHooks, 'case_resolution_article_normalize');
  const run = async (input: Rec) => {
    const ctx = makeCtx({ event: 'beforeUpdate', input });
    await hook.handler(ctx);
    return ctx.input as Rec;
  };

  it('nulls an empty string', async () => {
    expect((await run({ resolved_by_article: '' })).resolved_by_article).toBeNull();
  });

  it('nulls a whitespace-only value', async () => {
    expect((await run({ resolved_by_article: '   ' })).resolved_by_article).toBeNull();
  });

  it('leaves a real article id alone', async () => {
    expect((await run({ resolved_by_article: 'ka7' })).resolved_by_article).toBe('ka7');
  });

  /**
   * An update that never mentions the column must not clear a link somebody
   * else set. This is the difference between normalising a write and
   * vandalising a record on every unrelated edit.
   */
  it('does not touch a write that never carries the key', async () => {
    const out = await run({ status: 'closed' });
    expect('resolved_by_article' in out).toBe(false);
  });
});

// ─────────────────────────────── 3. the metric, through the real executor ──

/**
 * The columns the dataset reads, plus the ones `crm_case` REQUIRES. The real
 * app object is used here rather than a hand-rolled stand-in — a measure is
 * only worth pinning against the schema it will actually run on — so the
 * required set (`subject` / `description` / `status` / `priority`) has to be
 * satisfied on every insert.
 */
const CASE_COLUMNS = [
  'subject', 'description', 'status', 'priority', 'resolution',
  'is_closed', 'resolved_by_article', 'is_sla_violated',
];

/** A case that satisfies the object's required fields, plus the overrides. */
const caseRow = (over: AnyRec): AnyRec => ({
  description: 'Seeded by knowledge-deflection.test.ts',
  status: 'new',
  priority: 'medium',
  // `resolution_required_for_closed` is the app's own rule and it fires on
  // these inserts — a welcome sign that the REAL object is under test, and the
  // reason every closed row below carries a resolution.
  ...(over.is_closed ? { resolution: 'Resolved.' } : {}),
  ...over,
});

const makeAnalytics = (ql: AnyRec) =>
  new AnalyticsService({
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

/**
 * The same suite, run twice: once on `InMemoryDriver` (whose stored rows OMIT
 * unwritten columns) and once on real SQLite (column-complete rows, NULL where
 * the app wrote nothing). Those two shapes disagree about what "absent" means,
 * which is precisely the axis a non-NULL-counting measure gets wrong — so a
 * single-driver green would not be evidence.
 */
for (const driverName of ['memory', 'sqlite'] as const) {
  describe(`the deflection measures over ${driverName}`, () => {
    let ql: AnyRec;
    let analytics: AnalyticsService;

    beforeAll(async () => {
      if (driverName === 'sqlite') {
        const driver = new SqliteWasmDriver({ filename: ':memory:' });
        await driver.connect();
        // `ObjectQL.create` wires the datasource but emits no DDL — the exact
        // call the runtime makes at boot.
        for (const obj of [kase, article]) {
          const materialized = applySystemFields(obj as never, { multiTenant: false }) as AnyRec;
          await driver.initObjects([{
            name: obj.name,
            fields: materialized.fields as Record<string, unknown>,
            indexes: materialized.indexes,
          } as never]);
        }
        ql = (await ObjectQL.create({
          datasources: { default: driver },
          objects: { crm_case: kase, crm_knowledge_article: article } as never,
        })) as never;
      } else {
        ql = (await ObjectQL.create({
          datasources: { default: new InMemoryDriver({ persistence: false }) },
          objects: { crm_case: kase, crm_knowledge_article: article } as never,
        })) as never;
      }
      analytics = makeAnalytics(ql);
    }, 60_000);

    afterAll(async () => {
      await ql?.close();
    });

    const api = () => ql.createContext({ isSystem: true });

    const addCase = async (rec: AnyRec) => {
      const row: AnyRec = {};
      for (const c of CASE_COLUMNS) if (rec[c] !== undefined) row[c] = rec[c];
      return api().object('crm_case').insert(row);
    };

    /** Run a SHIPPED widget binding through the real dataset executor. */
    const run = async (w: AnyRec) => {
      const res = await analytics.queryDataset(
        CaseDataset as never,
        {
          ...(w.dimensions ? { dimensions: w.dimensions } : {}),
          measures: w.values,
          ...(w.filter ? { runtimeFilter: w.filter as never } : {}),
        } as never,
        { isSystem: true } as never,
      );
      return (res.rows ?? []) as AnyRec[];
    };

    const rate = async (): Promise<AnyRec> => (await run(
      { values: ['closed_count', 'kb_resolved_count', 'kb_deflection_rate'] },
    ))[0] ?? {};

    it('measures the rate the dashboard shows, and its two halves', async () => {
      // 2 of 4 closed cases resolved by an article; one OPEN case that also
      // names one, to prove `is_closed` really scopes both halves.
      await addCase(caseRow({ subject: 'c1', is_closed: true, status: 'closed', resolved_by_article: 'ka1' }));
      await addCase(caseRow({ subject: 'c2', is_closed: true, status: 'closed', resolved_by_article: 'ka1' }));
      await addCase(caseRow({ subject: 'c3', is_closed: true, status: 'closed' }));
      await addCase(caseRow({ subject: 'c4', is_closed: true, status: 'closed' }));
      await addCase(caseRow({ subject: 'c5', is_closed: false, resolved_by_article: 'ka2' }));

      const row = await rate();
      expect(row.closed_count).toBe(4);
      expect(row.kb_resolved_count).toBe(2);
      expect(row.kb_deflection_rate).toBeCloseTo(0.5, 5);
    });

    it('rises when another closed case names an article', async () => {
      const before = (await rate()).kb_deflection_rate as number;
      await addCase(caseRow({ subject: 'c6', is_closed: true, status: 'closed', resolved_by_article: 'ka1' }));
      const after = await rate();
      expect(after.kb_resolved_count).toBe(3);
      expect(after.closed_count).toBe(5);
      expect(after.kb_deflection_rate as number).toBeGreaterThan(before);
      expect(after.kb_deflection_rate as number).toBeCloseTo(0.6, 5);
    });

    it('falls when a closed case resolves without one', async () => {
      const before = (await rate()).kb_deflection_rate as number;
      await addCase(caseRow({ subject: 'c7', is_closed: true, status: 'closed' }));
      const after = await rate();
      expect(after.kb_deflection_rate as number).toBeLessThan(before);
    });

    /**
     * An OPEN case moves neither half. If it moved either, `is_closed` is not
     * scoping the measure it is declared on — the missing-half shape of #614.
     */
    it('does not move for an open case, whatever it names', async () => {
      const before = await rate();
      await addCase(caseRow({ subject: 'c8', is_closed: false, resolved_by_article: 'ka1' }));
      const after = await rate();
      expect(after.closed_count).toBe(before.closed_count);
      expect(after.kb_resolved_count).toBe(before.kb_resolved_count);
    });

    /**
     * The empty string, at the layer that actually counts it. Everything above
     * would still pass with the normalisation hook deleted — this is the case
     * that would not.
     */
    it('counts an EMPTY-STRING link, which is why the hook nulls it', async () => {
      const before = await rate();
      await addCase(caseRow({ subject: 'c9', is_closed: true, status: 'closed', resolved_by_article: '' }));
      const after = await rate();

      expect(after.closed_count).toBe((before.closed_count as number) + 1);
      // The numerator moving here is the DEFECT being demonstrated, not the
      // behaviour being asked for — `case_resolution_article_normalize` is what
      // guarantees such a row is never written in the first place.
      expect(after.kb_resolved_count).toBe((before.kb_resolved_count as number) + 1);
    });

    it('ranks articles by the closed cases they resolved', async () => {
      const rows = await run({
        dimensions: ['resolved_article'],
        values: ['kb_resolved_count'],
        filter: { is_closed: true },
      });
      const ka1 = rows.find((r) => r.resolved_article === 'ka1');
      expect(ka1, `no ka1 bucket in ${JSON.stringify(rows)}`).toBeTruthy();
      expect(ka1!.kb_resolved_count).toBe(3);
    });
  });
}

// ───────────────────────────────────── 4. the dashboard actually shows it ──

describe('the service dashboard reads the deflection metric', () => {
  it('ships a rate widget bound to the shipped measure', () => {
    const w = widget('kb_deflection_rate');
    expect(w, 'service_dashboard has no kb_deflection_rate widget').toBeTruthy();
    expect(w.dataset).toBe('case_metrics');
    expect(w.values).toEqual(['kb_deflection_rate']);
  });

  /**
   * A percentage on its own is unreadable: 100% could be "40 of 40" or "1 of
   * 1", and a blank rate could mean no closed cases OR no KB resolutions (a
   * filtered measure contributes no row for a group it selects nothing in). So
   * the numerator and denominator ship beside it — the rule the sales
   * dashboard's win rate adopted after #614.
   */
  it('shows the numerator and the denominator beside the rate', () => {
    expect(widget('kb_resolved_cases')?.values).toEqual(['kb_resolved_count']);
    expect(widget('closed_cases_total')?.values).toEqual(['closed_count']);
  });

  it('ranks the articles that resolve the most cases', () => {
    const w = widget('top_resolving_articles');
    expect(w, 'service_dashboard has no top_resolving_articles widget').toBeTruthy();
    expect(w.dimensions).toEqual(['resolved_article']);
    expect(w.filter).toMatchObject({ is_closed: true });
  });

  /**
   * Every measure a widget names must exist on the dataset. `case_metrics` is
   * the only dataset over `crm_case`, so a typo here renders an empty tile
   * rather than failing.
   */
  it('binds only to measures the dataset declares', () => {
    const declared = new Set((CaseDataset.measures as AnyRec[]).map((m) => m.name));
    const used = ['kb_deflection_rate', 'kb_resolved_cases', 'closed_cases_total', 'top_resolving_articles']
      .flatMap((id) => (widget(id)?.values ?? []) as string[]);
    const missing = used.filter((m) => !declared.has(m));
    expect(missing, `widgets name measures case_metrics does not declare: ${missing.join(', ')}`).toEqual([]);
  });
});
