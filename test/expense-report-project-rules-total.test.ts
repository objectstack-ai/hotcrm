// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, expect, it } from 'vitest';
import { evaluateValidationRules } from '@objectstack/objectql';
import { ExpenseProjectExtensions } from '../src/psa/extensions/expense-project.extension';

/**
 * The three refusals Project Delivery contributes to `crm_expense_report`
 * (hotcrm#2764) read the project one hop through `record.crm_project`. AGENTS.md
 * "Validation predicates must be TOTAL (#630)": every read carries `has()`, so a
 * related row that comes back without `status` or `time_entry_locked` leaves the
 * rule answerable, and admits the write, instead of making it unevaluable, which
 * refuses it. `test/object-validation-predicates.test.ts` reads only an
 * object's own top-level `script` rules, so it does not see these: this suite
 * runs them through the engine's own evaluator.
 */

type Rec = Record<string, unknown>;

const extension = ExpenseProjectExtensions.find((e) => e.extend === 'crm_expense_report') as {
  fields: Rec;
  validations: Rec[];
};

const obj = {
  name: 'crm_expense_report',
  fields: {
    ...JSON.parse(JSON.stringify(extension.fields)),
    status: { type: 'select', options: [{ value: 'draft' }, { value: 'submitted' }] },
  },
  validations: JSON.parse(JSON.stringify(extension.validations)),
};

/**
 * Submit a draft report on project `p1`, whose row the engine read as `row`;
 * with `insert`, create the report directly as Submitted instead.
 */
const verdict = (row: Rec, op: 'update' | 'insert' = 'update') => {
  const warns: string[] = [];
  const logger = { warn: (...a: unknown[]) => void warns.push(a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' ')) };
  let caught: Rec | undefined;
  try {
    evaluateValidationRules(obj as never, { id: 'r1', status: 'submitted', crm_project: 'p1' }, op, {
      ...(op === 'update' ? { previous: { id: 'r1', status: 'draft', crm_project: 'p1' } } : {}),
      logger,
      related: { crm_project: { object: 'crm_project', row: { id: 'p1', ...row } } },
    } as never);
  } catch (err) {
    caught = err as Rec;
  }
  return { caught, unevaluable: warns.filter((w) => /failed to evaluate/i.test(w)) };
};

const refusedBy = (caught: Rec | undefined) => JSON.stringify(caught ?? '');

describe('the report-on-a-project refusals are total (#630)', () => {
  it('ships the three rules', () => {
    expect(extension.validations.map((r) => r.name)).toEqual([
      'expense_report_project_closed',
      'expense_report_project_cancelled',
      'expense_report_project_locked',
    ]);
  });

  it.each([
    ['neither key', {}],
    ['no status', { time_entry_locked: false }],
    ['no time_entry_locked', { status: 'active' }],
  ])('admits a submission whose project row has %s', (_label, row) => {
    const { caught, unevaluable } = verdict(row);
    expect(unevaluable).toEqual([]);
    expect(caught).toBeUndefined();
  });

  it('still refuses on a locked project whose row has no status', () => {
    const { caught, unevaluable } = verdict({ time_entry_locked: true });
    expect(unevaluable).toEqual([]);
    expect(refusedBy(caught)).toMatch(/locked for time and expenses/);
  });

  it.each([
    ['closed', /is Closed/],
    ['cancelled', /is Cancelled/],
  ])('still refuses on a %s project whose row has no time_entry_locked', (status, reason) => {
    const { caught, unevaluable } = verdict({ status });
    expect(unevaluable).toEqual([]);
    expect(refusedBy(caught)).toMatch(reason);
  });

  it('gives one reason at a time on a locked and closed project', () => {
    const { caught } = verdict({ status: 'closed', time_entry_locked: true });
    const text = refusedBy(caught);
    expect(text).toMatch(/is Closed/);
    expect(text).not.toMatch(/locked for time and expenses/);
  });

  it('admits an open, unlocked project', () => {
    const { caught, unevaluable } = verdict({ status: 'active', time_entry_locked: false });
    expect(unevaluable).toEqual([]);
    expect(caught).toBeUndefined();
  });

  // `previous == null` in the `when`: a report created or imported directly as
  // Submitted is judged too, where the update-only turn-back flow never saw it.
  it('refuses a report created directly as Submitted on a locked project', () => {
    const { caught, unevaluable } = verdict({ status: 'active', time_entry_locked: true }, 'insert');
    expect(unevaluable).toEqual([]);
    expect(refusedBy(caught)).toMatch(/locked for time and expenses/);
  });

  it('admits a report created directly as Submitted on an open project', () => {
    const { caught, unevaluable } = verdict({ status: 'active', time_entry_locked: false }, 'insert');
    expect(unevaluable).toEqual([]);
    expect(caught).toBeUndefined();
  });
});
