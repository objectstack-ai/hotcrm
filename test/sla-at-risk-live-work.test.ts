// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ObjectQL, applySystemFields } from '@objectstack/objectql';
import { InMemoryDriver } from '@objectstack/driver-memory';
import { SqliteWasmDriver } from '@objectstack/driver-sqlite-wasm';
import { parseFilterAST } from '@objectstack/spec/data';
import stack from '../objectstack.config';
import caseHooks from '../src/objects/case.hook';
import { CLOSED_CASE_STATUSES } from '../src/objects/_case-assignment';
import { makeCtx } from './helpers/hook-harness';

/**
 * A RESOLVED case is not at risk — the ⏰ SLA at Risk tab and the SLA sweep
 * answer one question one way (#1325).
 *
 * ### The disagreement this file pins shut
 *
 * `sla_at_risk` (`src/views/case.view.ts`) selected on `is_closed == false`.
 * `case_sla_defaults` derives that flag as `effStatus === 'closed'`, so it
 * NEVER flips on `resolved` — while `case_sla_monitor`, the flow that owns SLA
 * breach detection, filters `status: { $nin: ['resolved', 'closed'] }`.
 *
 * The two surfaces therefore disagreed about the same case: the sweep would not
 * flag a resolved case as breached, and the tab still listed it for an agent to
 * pick up. A human reading the tab was handed work the automation had already
 * decided was finished. That is not untidiness — it is the surface a human
 * reads contradicting the surface that acts.
 *
 * ### Why this file exists beside the metadata guard
 *
 * `test/live-work-predicate-parity.test.ts` is the METADATA half: it pins, by
 * name, that every consumer of "no longer live work" excludes exactly
 * `CLOSED_CASE_STATUSES`. It compares lowered filters — it never asks a driver
 * for rows. This file is the BEHAVIOURAL half: it runs the SHIPPED view filter
 * through a real engine over a resolved case that satisfies every other clause
 * of that filter, and asserts the row does not come back. Neither replaces the
 * other: the metadata guard would stay green if the platform's lowering of
 * `not_in` ever stopped excluding, and this file would stay green if a sixth
 * spelling grew somewhere the view does not reach.
 *
 * ### Both drivers, and the fixture is derived rather than declared
 *
 * `driver-memory` stores only the columns a row was written with; the SQL
 * driver materialises every declared column. `is_closed` is exactly the kind of
 * boolean an absent-vs-NULL difference gets wrong, so the matrix runs twice.
 *
 * ⚠️ The fixture does not ASSERT `is_closed: false` on the resolved case — it
 * runs the shipped `case_sla_defaults` handler and stores what the app itself
 * derives. A hand-written flag would make the "would otherwise qualify" claim
 * a fiction of this test; derived, it is a measurement of the product. The
 * `otherwise qualifies` block below then proves the claim rather than asserting
 * it, by running the OLD spelling over the same rows and showing the resolved
 * case coming back.
 */

type AnyRec = Record<string, any>;

const objects: AnyRec[] = ((stack as AnyRec).objects ?? []) as AnyRec[];
const views: AnyRec[] = ((stack as AnyRec).views ?? []) as AnyRec[];
const kase = objects.find((o) => o.name === 'crm_case') as AnyRec;
const caseViews = views.find((v) => v.list?.data?.object === 'crm_case') as AnyRec;
const slaAtRisk = caseViews?.listViews?.sla_at_risk as AnyRec;

/** The columns these fixtures write, plus the ones `crm_case` REQUIRES. */
const CASE_COLUMNS = ['subject', 'description', 'status', 'priority', 'resolution', 'is_closed'];

/** The shipped derivation hook, reached by NAME off the registered set. */
const slaDefaults = (caseHooks as AnyRec[]).find((h) => h.name === 'case_sla_defaults') as AnyRec;

/**
 * One fixture row, with `is_closed` DERIVED by the shipped hook.
 *
 * `ctx.api` is deliberately absent: the handler's only read
 * (`crm_account` tier lookup) is guarded by `&& api`, and none of these rows
 * carries an account, so the derivation runs exactly as it does in production.
 *
 * ⚠️ `session: { isSystem: true }` is load-bearing, and it mirrors the context
 * these rows are actually inserted through. The hook's guest-sanitisation
 * branch is `!ctx.previous && !ctx.user?.id && !ctx.session?.isSystem` (#1133),
 * so a synthetic ctx that omits the session is read as an anonymous
 * web-to-case submitter — which nulls `resolution` and makes the closed
 * fixture fail the app's own `resolution_required_for_closed` rule. Measured,
 * not guessed: that is what this file did on its first run.
 *
 * ⚠️ The ctx comes from `makeCtx` (#1298), so `ctx.input` is the engine's
 * flat-input Proxy rather than a plain object. A hand-built ctx would be the
 * shape production never uses, and `test/hook-input-shape.test.ts` is the pin
 * that says so — it caught this file on its first full run.
 */
const derivedRow = async (over: AnyRec): Promise<AnyRec> => {
  const ctx = makeCtx({
    event: 'beforeInsert',
    input: {
      description: 'Seeded by sla-at-risk-live-work.test.ts',
      status: 'new',
      priority: 'low',
      ...(over.status === 'closed' ? { resolution: 'Resolved and closed.' } : {}),
      ...over,
    },
    session: { isSystem: true },
  });
  await slaDefaults.handler(ctx as never);
  const row: AnyRec = {};
  for (const c of CASE_COLUMNS) if (ctx.input[c] !== undefined) row[c] = ctx.input[c];
  return row;
};

/** The SHIPPED view filter, lowered by the platform's own `parseFilterAST`. */
const loweredViewWhere = (rules: AnyRec[]): AnyRec => ({
  $and: (rules ?? []).map((r) => parseFilterAST([r.field, r.operator, r.value])),
});

/** The spelling the view carried BEFORE #1325 — the defect, kept runnable. */
const IS_CLOSED_SPELLING: AnyRec[] = [
  { field: 'is_closed', operator: 'equals', value: false },
  { field: 'priority', operator: 'in', value: ['high', 'critical'] },
];

describe('the ⏰ SLA at Risk view still selects on the live-work predicate', () => {
  it('is the shipped view, and it narrows on status rather than on the flag', () => {
    expect(slaAtRisk, 'sla_at_risk is gone — every runtime block below checks nothing').toBeDefined();
    const fields = (slaAtRisk.filter ?? []).map((r: AnyRec) => r.field);
    expect(fields, 'sla_at_risk stopped narrowing on status — #1325 has regrown').toContain('status');
    expect(
      fields,
      '`is_closed` never flips on `resolved`, so it cannot express "no longer live work"',
    ).not.toContain('is_closed');
    // `$nin` is the LOWERED form; a view `filter[]` authors `not_in`.
    const rule = (slaAtRisk.filter ?? []).find((r: AnyRec) => r.field === 'status') as AnyRec;
    expect(rule.operator).toBe('not_in');
    expect([...rule.value].sort()).toEqual([...CLOSED_CASE_STATUSES].map(String).sort());
  });
});

/**
 * Both row shapes. `memory` is the sparse one (`driver-mongodb` produces it
 * too); `sqlite-wasm` lowers the filter to real SQL over materialised columns.
 */
for (const driverName of ['memory', 'sqlite'] as const) {
  describe(`a resolved case is not at risk — over ${driverName}`, () => {
    let ql: AnyRec;

    beforeAll(async () => {
      if (driverName === 'sqlite') {
        const driver = new SqliteWasmDriver({ filename: ':memory:' });
        await driver.connect();
        const materialized = applySystemFields(kase as never, { multiTenant: false }) as AnyRec;
        await driver.initObjects([{
          name: kase.name,
          fields: materialized.fields as Record<string, unknown>,
          indexes: materialized.indexes,
        } as never]);
        ql = (await ObjectQL.create({
          datasources: { default: driver },
          objects: { crm_case: kase } as never,
        })) as never;
      } else {
        ql = (await ObjectQL.create({
          datasources: { default: new InMemoryDriver({ persistence: false }) },
          objects: { crm_case: kase } as never,
        })) as never;
      }

      const api = ql.createContext({ isSystem: true });
      for (const over of [
        // The row the tab exists for.
        { subject: 'live-critical', status: 'in_progress', priority: 'critical' },
        // The row #1325 is about: resolved, and high priority, so it satisfies
        // every OTHER clause of the view's filter.
        { subject: 'resolved-high', status: 'resolved', priority: 'high' },
        // Closed was already excluded by the flag — it must stay excluded.
        { subject: 'closed-high', status: 'closed', priority: 'high' },
        // The priority half of the filter must survive the change untouched.
        { subject: 'live-low', status: 'new', priority: 'low' },
      ]) {
        await api.object('crm_case').insert(await derivedRow(over));
      }
    }, 60_000);

    afterAll(async () => {
      await ql?.close();
    });

    const subjectsFor = async (rules: AnyRec[]): Promise<string[]> => {
      const api = ql.createContext({ isSystem: true });
      const rows: AnyRec[] = await api.object('crm_case').find({ where: loweredViewWhere(rules) });
      return rows.map((r) => String(r.subject)).sort();
    };

    it('the app itself stores is_closed:false on a resolved case — the root cause', async () => {
      const api = ql.createContext({ isSystem: true });
      const rows: AnyRec[] = await api.object('crm_case').find({ where: { subject: 'resolved-high' } });
      expect(rows, 'the resolved fixture never landed').toHaveLength(1);
      expect(
        rows[0].is_closed,
        'the derivation changed: `is_closed` now flips on `resolved` too. If that is ' +
          'deliberate, this whole file and the #1145 predicate need rereading — the flag ' +
          'and the status set would no longer disagree.',
      ).toBeFalsy();
      expect(rows[0].status).toBe('resolved');
    });

    it('the resolved case would OTHERWISE qualify — the old spelling still returns it', async () => {
      // Anti-vacuity, and the measurement the card was filed on. If this ever
      // stops returning `resolved-high`, the fixture has stopped reproducing
      // the defect and the assertion below is green for the wrong reason.
      expect(
        await subjectsFor(IS_CLOSED_SPELLING),
        'the `is_closed == false` spelling no longer lists the resolved case, so this ' +
          'fixture no longer reproduces #1325 and the pin below proves nothing',
      ).toEqual(['live-critical', 'resolved-high']);
    });

    it('the SHIPPED filter hands back the live case and NOT the resolved one', async () => {
      const subjects = await subjectsFor(slaAtRisk.filter);
      expect(
        subjects,
        'a resolved case is on the ⏰ SLA at Risk tab. `case_sla_monitor` will not flag it ' +
          'as breached, so an agent is being handed work the automation that owns SLA has ' +
          'already decided is finished (#1325).',
      ).not.toContain('resolved-high');
      expect(subjects, 'a closed case is on the SLA at Risk tab').not.toContain('closed-high');
      expect(subjects, 'the view stopped returning live at-risk work at all').toContain('live-critical');
      // Stated exactly, so a filter that widened to everything also fails.
      expect(subjects).toEqual(['live-critical']);
    });
  });
}
