// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { VerifyStack } from '@objectstack/verify';
import artifact from '../objectstack.config';
import { allFlows, packageStacks } from '../objectstack.composition';
import { EXPENSE_FINANCE_REVIEW_AMOUNT } from '../src/sales/objects/_thresholds';
import { packFor, servedApp } from './helpers/composed-stack';
import { REPO_ROOT } from './helpers/repo-root';
import { conditionHolds, flowRuns, hotcrmStack, signUpPerson, systemUpdate, type Person } from './helpers/verify-stack';

type Rec = Record<string, any>;

/**
 * ═══ Expenses are their own module; Project Delivery adds the project (hotcrm#2556) ═══
 * ═══ Expenses are sent, approved and paid back on a report (hotcrm#2559) ═══
 *
 * `app.objectstack.hotcrm.expense` (`src/expense/index.ts`, REQ-0011,
 * `docs/architecture/expense-module-plan.md`) owns `crm_expense`, which moved
 * out of Project Delivery under the same name, and `crm_expense_report`.
 * Project Delivery depends on it and contributes the Project field on both.
 * Submit for Reimbursement puts the selected expenses on a report (one per
 * project) and submits it; each expense follows its report. Two approvals,
 * never both, on the report:
 *
 * - no project: the submitter's manager (`sys_user.manager_id`), the Finance
 *   Controllers when there is none, then finance from the threshold on the
 *   report's total;
 * - a project: its Project Manager, then finance from the threshold (pinned,
 *   with the project cost, the grouping by project and the over or locked
 *   turn-back, in `test/psa-approvals.test.ts`).
 *
 * Finance marks an approved report paid; it records only.
 *
 * Disabling either module leaves the other usable; both directions are
 * driven here on the shipped app booted by `@objectstack/verify`.
 */

const EXPENSE_ID = 'app.objectstack.hotcrm.expense';
const PSA_ID = 'app.objectstack.hotcrm.psa';
const APP_ID = 'app.objectstack.hotcrm';

const bodies: Rec[] = (((artifact as Rec).packages ?? []) as Rec[]).map((entry) => (entry?.manifest ?? {}) as Rec);
const stackOf = (id: string): Rec => (packageStacks as Rec[]).find((s) => s.manifest?.id === id)!;
const flowNamed = (name: string): Rec => (allFlows as Rec[]).find((f) => f.name === name)!;
const startCondition = (name: string): unknown => (flowNamed(name).nodes as Rec[]).find((n) => n.type === 'start')!.config.condition;
const walk = (nodes: Rec[]): Rec[] => nodes.flatMap((n) => (n.type === 'group' ? walk((n.children ?? []) as Rec[]) : [n]));

describe('the expense module ships inside the HotCRM artifact (hotcrm#2556, hotcrm#2559)', () => {
  const expense = bodies.find((b) => b.id === EXPENSE_ID);
  const psa = bodies.find((b) => b.id === PSA_ID);

  it('is a module of the crm namespace, registered before Project Delivery, which depends on it', () => {
    expect(expense, `packages[] carries no ${EXPENSE_ID}`).toBeDefined();
    expect(expense!.type).toBe('module');
    expect(expense!.namespace).toBe('crm');
    const ids = bodies.map((b) => b.id);
    expect(ids.indexOf(EXPENSE_ID)).toBeLessThan(ids.indexOf(PSA_ID));
    expect(Object.keys(expense!.dependencies ?? {}), 'the app package, and nothing else').toEqual([APP_ID]);
    expect(Object.keys(psa!.dependencies ?? {}).sort()).toEqual([APP_ID, EXPENSE_ID].sort());
  });

  it('owns the expense and the expense report, their rules, approvals, actions, sharing, app and manual; no project field of its own', () => {
    const stack = stackOf(EXPENSE_ID);
    // The travel request (hotcrm#2578) is pinned in `test/expense-request.test.ts`.
    expect(((stack.objects ?? []) as Rec[]).map((o) => o.name)).toEqual(['crm_expense', 'crm_expense_report', 'crm_expense_request', 'crm_expense_request_line', 'crm_expense_standard']);
    expect(((stack.hooks ?? []) as Rec[]).map((h) => h.name)).toEqual([
      'expense_line_lock', 'expense_report_rules', 'expense_report_lines_follow', 'expense_report_request_totals',
      'expense_request_decision_guard', 'expense_request_delete_guard', 'expense_request_line_lock', 'expense_request_line_number',
    ]);
    expect(((stack.sharingRules ?? []) as Rec[]).map((r) => r.name)).toEqual([
      'expense_approver_edit', 'expense_report_approver_edit', 'expense_request_approver_edit',
    ]);
    expect(((stack.apps ?? []) as Rec[]).map((a) => a.name)).toEqual(['crm_expenses']);
    expect(((stack.books ?? []) as Rec[]).map((b) => b.name)).toEqual(['crm_expense_manual']);
    // The project paths are Project Delivery's (hotcrm#2575), pinned in `test/psa-module-package.test.ts`.
    expect(((stack.flows ?? []) as Rec[]).map((f) => f.name).sort(), 'per-expense approval retired').toEqual([
      'expense_report_approval',
      'expense_request_approval', 'expense_request_approval_on_create',
    ]);
    expect(((stack.actions ?? []) as Rec[]).map((a) => a.name)).toEqual([
      'submit_for_reimbursement', 'submit_trip_for_reimbursement', 'submit_expense_report', 'reopen_expense_report', 'mark_expense_report_paid',
      'submit_expense_request', 'cancel_expense_request', 'close_expense_request',
    ]);
    expect(stack.data ?? [], 'an expense, a report and a request name a person, so the module seeds none').toEqual([]);
    for (const object of stack.objects as Rec[]) {
      expect((object.fields as Rec).crm_project, `${object.name}: the project field is Project Delivery's contribution`).toBeUndefined();
    }
  });

  it('adds who paid, the merchant, the receipt number and where the entry came from, none of them required', () => {
    const fields = stackOf(EXPENSE_ID).objects[0].fields as Rec;
    const values = (name: string): string[] => (fields[name].options as Rec[]).map((o) => o.value);
    const byDefault = (name: string): string[] => (fields[name].options as Rec[]).filter((o) => o.default).map((o) => o.value);
    expect(fields.paid_by.type).toBe('select');
    expect(values('paid_by')).toEqual(['employee', 'company']);
    expect(byDefault('paid_by')).toEqual(['employee']);
    expect(fields.source.type).toBe('select');
    expect(values('source')).toEqual(['manual', 'agent', 'import']);
    expect(byDefault('source')).toEqual(['manual']);
    expect(fields.merchant).toMatchObject({ type: 'text' });
    expect(fields.receipt_number).toMatchObject({ type: 'text' });
    for (const name of ['paid_by', 'source', 'merchant', 'receipt_number']) expect(fields[name].required, name).toBeFalsy();
    for (const name of ['currency', 'currency_code']) expect(fields[name], 'no currency field (REQ-0012)').toBeUndefined();
  });

  it('an expense names its report, which only Submit for Reimbursement writes, and its status follows the report', () => {
    const fields = stackOf(EXPENSE_ID).objects[0].fields as Rec;
    expect(fields.crm_expense_report).toMatchObject({ type: 'lookup', reference: 'crm_expense_report', readonly: true });
    expect(fields.status.readonly, 'set by the report, never by hand').toBe(true);
  });

  it('a report carries the totals, the lifecycle, the approver, the dates, the review notes and the payment', () => {
    const fields = stackOf(EXPENSE_ID).objects[1].fields as Rec;
    expect(fields.report_number).toMatchObject({ type: 'autonumber' });
    expect(fields.crm_account).toMatchObject({ type: 'lookup', reference: 'crm_account' });
    expect(fields.crm_account.required).toBeFalsy();
    expect(fields.total_amount.summaryOperations).toMatchObject({ object: 'crm_expense', field: 'amount', function: 'sum', relationshipField: 'crm_expense_report' });
    expect(fields.total_amount.summaryOperations.filter).toBeUndefined();
    expect(fields.reimbursable_amount.summaryOperations, 'what the employee paid, not the company').toMatchObject({ filter: { paid_by: 'employee' } });
    expect((fields.status.options as Rec[]).map((o) => o.value)).toEqual(['draft', 'submitted', 'approved', 'paid', 'rejected']);
    for (const name of ['approver', 'submitted_date', 'approved_date']) expect(fields[name].readonly, name).toBe(true);
    for (const name of ['review_notes', 'payment_date', 'payment_reference', 'description']) expect(fields[name], name).toBeDefined();
  });

  it('Project Delivery contributes the Project field on both; the expense picker offers no Closed or Cancelled project', () => {
    const extensions = (stackOf(PSA_ID).objectExtensions ?? []) as Rec[];
    // The travel request's project (hotcrm#2581) is pinned in `test/expense-request.test.ts`.
    expect(extensions.map((e) => e.extend)).toEqual(['crm_expense', 'crm_expense_report', 'crm_expense_request']);
    const field = extensions[0].fields.crm_project as Rec;
    expect(field).toMatchObject({ type: 'lookup', reference: 'crm_project' });
    expect(field.required).toBeFalsy();
    expect(field.lookupFilters).toEqual([{ field: 'status', operator: 'notIn', value: ['closed', 'cancelled'] }]);
    expect(extensions[1].fields.crm_project, 'the report\'s project is the one its expenses were grouped by').toMatchObject({ type: 'lookup', reference: 'crm_project', readonly: true });
  });

  it('project staff keep My Expenses and Reports to Approve in the Project Delivery app, by contribution', () => {
    const items = walk(servedApp('crm_psa').navigation as Rec[]);
    expect(items.find((i) => i.id === 'nav_my_expenses')).toMatchObject({ type: 'object', objectName: 'crm_expense' });
    expect(items.find((i) => i.id === 'nav_expense_reports_to_approve')).toMatchObject({ type: 'object', objectName: 'crm_expense_report' });
    expect(items.find((i) => i.id === 'nav_expenses_to_approve'), 'per-expense approval retired').toBeUndefined();
    const own = walk(stackOf(PSA_ID).apps[0].navigation as Rec[]).map((i) => i.objectName);
    expect(own, 'the app\'s own navigation names neither (R3)').not.toContain('crm_expense');
    expect(own).not.toContain('crm_expense_report');
  });
});

/**
 * The expense module knows nothing of projects (hotcrm#2575). Its project path,
 * the approval of a report or a travel request on a project and the report's two
 * turn-back notices, is Project Delivery's (`src/psa/flows/`,
 * `src/psa/email-templates/`). It sat here from hotcrm#2556 until 18.6.0 linted
 * a flow's trigger object against the package's dependencies (objectstack#34616).
 *
 * One spelling of `crm_project` stays in this package's flows, by design: the
 * no-project half of each manager path's entry condition, which reads the key
 * Project Delivery contributes and holds while it is absent. That guard is what
 * keeps the two paths exclusive (pinned below and in `test/expense-request.test.ts`).
 * The grouping by project inside Submit for Reimbursement is the action's, not a
 * flow's, and stays as well (`src/expense/actions/expense.actions.ts`).
 */
describe('the expense module names no project in its flows, conditions, notices or manual (hotcrm#2575)', () => {
  /** The no-project entry guard, the one `crm_project` spelling a manager path keeps. */
  const NO_PROJECT_GUARD = '(!has(record.crm_project) || record.crm_project == null || record.crm_project == "")';

  it('no flow of the module reads, routes on or triggers on a project', () => {
    const flows = (stackOf(EXPENSE_ID).flows ?? []) as Rec[];
    expect(flows.length, 'anti-phantom: the module registers flows').toBeGreaterThan(0);
    for (const flow of flows) {
      const nodes = walk((flow.nodes ?? []) as Rec[]);
      expect(nodes.filter((n) => n.config?.objectName === 'crm_project').map((n) => n.id), `${flow.name}: reads no project record`).toEqual([]);
      const start = nodes.find((n) => n.type === 'start')!;
      expect(String(start.config.condition?.source ?? start.config.condition), `${flow.name}: starts only on a record with no project`).toContain(NO_PROJECT_GUARD);
      // The guard as `JSON.stringify(flow)` spells it: the same encoder, its quotes stripped.
      const rest = JSON.stringify(flow).split(JSON.stringify(NO_PROJECT_GUARD).slice(1, -1)).join('');
      expect(rest.includes('crm_project'), `${flow.name}: crm_project outside the no-project guard`).toBe(false);
    }
  });

  it('it sends no notice: the turn-back templates are Project Delivery\'s', () => {
    expect(stackOf(EXPENSE_ID).emailTemplates ?? []).toEqual([]);
    const psaTemplates = ((stackOf(PSA_ID).emailTemplates ?? []) as Rec[]).map((t) => t.name);
    expect(psaTemplates).toEqual(expect.arrayContaining(['crm.expense_report_project_over', 'crm.expense_report_project_locked']));
  });

  it('its translations and manual name no project object or project flow', () => {
    const packs = ((stackOf(EXPENSE_ID).translations ?? []) as Rec[]).flatMap((bundle) => Object.entries(bundle));
    expect(packs.length, 'anti-phantom: four locale packs').toBe(4);
    for (const [locale, pack] of packs) {
      const flowKeys = Object.keys((pack as Rec).flows ?? {});
      expect(flowKeys.filter((k) => k.includes('project')), `${locale}: no project flow's labels`).toEqual([]);
      expect(JSON.stringify(pack).includes('crm_project'), `${locale}: no crm_project key`).toBe(false);
    }
    const docsDir = join(REPO_ROOT, 'src/expense/docs');
    const pages = readdirSync(docsDir).filter((f) => f.endsWith('.md'));
    expect(pages.length, 'anti-phantom: the manual has pages').toBeGreaterThan(0);
    for (const page of pages) {
      expect(readFileSync(join(docsDir, page), 'utf8').includes('crm_project'), page).toBe(false);
    }
  });
});

describe('two approvals on the report, never both (hotcrm#2559)', () => {
  let verify: VerifyStack;
  beforeAll(async () => {
    verify = await hotcrmStack();
  }, 120_000);

  const shapes: [string, Rec][] = [
    ['a project', { crm_project: 'prj_1' }],
    ['a null project', { crm_project: null }],
    ['an empty project', { crm_project: '' }],
    ['no project key (the field absent, Project Delivery disabled)', {}],
  ];

  it.each(shapes)('a report submitted with %s starts exactly one of them', (_label, shape) => {
    const vars = { record: { status: 'submitted', ...shape }, previous: { status: 'draft', ...shape } };
    const manager = conditionHolds(verify, startCondition('expense_report_approval'), vars);
    const project = conditionHolds(verify, startCondition('expense_report_project_approval'), vars);
    expect(manager !== project, `manager path ${manager}, project path ${project}`).toBe(true);
    expect(project).toBe(shape.crm_project === 'prj_1');
  });

  it('neither starts while the report stays a draft', () => {
    for (const [, shape] of shapes) {
      const vars = { record: { status: 'draft', ...shape }, previous: { status: 'draft', ...shape } };
      expect(conditionHolds(verify, startCondition('expense_report_approval'), vars)).toBe(false);
      expect(conditionHolds(verify, startCondition('expense_report_project_approval'), vars)).toBe(false);
    }
  });

  it('both trigger on the report, never on the expense', () => {
    for (const name of ['expense_report_approval', 'expense_report_project_approval']) {
      const start = (flowNamed(name).nodes as Rec[]).find((n) => n.type === 'start')!;
      expect(start.config.objectName, name).toBe('crm_expense_report');
    }
    const onExpense = (allFlows as Rec[]).filter((f) => ((f.nodes ?? []) as Rec[]).some((n) => n.type === 'start' && n.config?.objectName === 'crm_expense'));
    expect(onExpense.map((f) => f.name), 'no flow approves a single expense any more').toEqual([]);
  });
});

describe('a report with no project goes to the submitter\'s manager (expense_report_approval)', () => {
  let verify: VerifyStack;
  let spender: Person;
  let loner: Person;
  let manager: Person;
  let finance: Person;
  let k = 0;

  const insert = (doc: Rec, as: string): Promise<Rec> => verify.hooks.run('crm_expense', 'insert', doc, { as });
  const update = (doc: Rec, as: string): Promise<Rec> => verify.hooks.run('crm_expense', 'update', doc, { as });
  const row = async (id: string): Promise<Rec> => (await verify.rows('crm_expense', { id }))[0]!;
  const report = async (id: string): Promise<Rec> => (await verify.rows('crm_expense_report', { id }))[0]!;
  const openRequests = (id: string): Promise<Rec[]> => verify.rows('sys_approval_request', { record_id: id, status: 'pending' });
  const act = async (recordId: string, token: string, action: 'approve' | 'reject' | 'recall'): Promise<number> => {
    const [request] = await openRequests(recordId);
    expect(request, `no open approval request on ${recordId}`).toBeTruthy();
    return (await verify.apiAs(token, 'POST', `/approvals/requests/${request!.id}/${action}`, { comment: `${action} in test.` })).status;
  };
  const taxi = (amount = 40, extra: Rec = {}): Rec => ({ name: `Taxi ${++k}`, expense_date: '2026-11-02', category: 'travel', amount, ...extra });
  /** Submit for Reimbursement on these expenses, as `as`; the reports it made. */
  const submit = async (ids: string[], as: string): Promise<string[]> => {
    const result = (await verify.actions.run('crm_expense', 'submit_for_reimbursement', ids.length === 1
      ? { as, recordId: ids[0] }
      : { as, params: { _selectedIds: ids } })) as Rec;
    return result.reports as string[];
  };
  const linesOf = (reportId: string): Promise<Rec[]> => verify.rows('crm_expense', { crm_expense_report: reportId });

  beforeAll(async () => {
    verify = await hotcrmStack();
    manager = await signUpPerson(verify, 'manager@expense-module.test', {
      name: 'Expense Manager', positions: ['crm_sales_manager'], permissionSets: ['sales_manager'],
    });
    spender = await signUpPerson(verify, 'spender@expense-module.test', {
      name: 'Expense Spender', positions: ['crm_sales_rep'], permissionSets: ['sales_rep'],
    });
    loner = await signUpPerson(verify, 'loner@expense-module.test', {
      name: 'Expense Loner', positions: ['crm_marketing_user'], permissionSets: ['marketing_user'],
    });
    finance = await signUpPerson(verify, 'finance@expense-module.test', {
      name: 'Expense Finance', positions: ['crm_finance_controller'], permissionSets: ['finance_controller'],
    });
    await systemUpdate(verify, 'sys_user', { id: spender.id, manager_id: manager.id });
  }, 120_000);

  it('a sales rep records one with the new fields defaulted; it starts as a draft and on no report', async () => {
    const exp = await insert(taxi(40, { merchant: 'City Cabs', receipt_number: 'R-1' }), spender.token);
    const stored = await row(exp.id);
    expect(stored).toMatchObject({ status: 'draft', paid_by: 'employee', source: 'manual', merchant: 'City Cabs', receipt_number: 'R-1' });
    expect(stored.crm_expense_report ?? null).toBeNull();
    expect(await openRequests(exp.id)).toHaveLength(0);
  });

  it('nobody submits or approves an expense on its own: its status is not a person\'s to write', async () => {
    const exp = await insert(taxi(), spender.token);
    await update({ id: exp.id, status: 'submitted' }, spender.token);
    expect((await row(exp.id)).status, 'read-only to people').toBe('draft');
    expect(await openRequests(exp.id)).toHaveLength(0);
  });

  it('one expense, one click: a report with it is submitted, and the manager decides it', async () => {
    const exp = await insert(taxi(), spender.token);
    const [reportId] = await submit([exp.id], spender.token);
    const stored = await report(reportId!);
    expect(stored).toMatchObject({ status: 'submitted', owner_id: spender.id, approver: manager.id, total_amount: 40, reimbursable_amount: 40 });
    expect(stored.submitted_date, 'stamped when it was submitted').toBeTruthy();
    expect(await row(exp.id)).toMatchObject({ crm_expense_report: reportId, status: 'submitted', approver: manager.id });
    expect((await verify.apiAs(manager.token, 'GET', `/data/crm_expense_report/${reportId}`)).status, 'the report is shared to the approver').toBe(200);
    expect((await verify.apiAs(manager.token, 'GET', `/data/crm_expense/${exp.id}`)).status, 'and so is each expense on it').toBe(200);
    expect(await act(reportId!, spender.token, 'approve'), 'nobody decides their own').not.toBe(200);
    expect(await act(reportId!, manager.token, 'approve')).toBe(200);
    expect((await report(reportId!)).status).toBe('approved');
    expect((await report(reportId!)).approved_date).toBeTruthy();
    expect((await row(exp.id)).status, 'the expense follows').toBe('approved');
  });

  it('several expenses go on one report; the total is all of them, the amount to pay back only what the employee paid', async () => {
    const a = await insert(taxi(30), spender.token);
    const b = await insert(taxi(50, { paid_by: 'company', merchant: 'Rail Co' }), spender.token);
    const c = await insert(taxi(20), spender.token);
    const reports = await submit([a.id, b.id, c.id], spender.token);
    expect(reports, 'no project anywhere, so one report').toHaveLength(1);
    expect(await report(reports[0]!)).toMatchObject({ total_amount: 100, reimbursable_amount: 50 });
    expect((await linesOf(reports[0]!)).map((l) => l.status)).toEqual(['submitted', 'submitted', 'submitted']);
  });

  it(`sends a report totalling ${EXPENSE_FINANCE_REVIEW_AMOUNT} or more to finance after the manager`, async () => {
    const a = await insert(taxi(EXPENSE_FINANCE_REVIEW_AMOUNT / 2), spender.token);
    const b = await insert(taxi(EXPENSE_FINANCE_REVIEW_AMOUNT / 2), spender.token);
    const [reportId] = await submit([a.id, b.id], spender.token);
    expect(await act(reportId!, manager.token, 'approve')).toBe(200);
    expect((await report(reportId!)).status, 'still waiting on finance').toBe('submitted');
    expect(await act(reportId!, finance.token, 'approve')).toBe(200);
    expect((await report(reportId!)).status).toBe('approved');
    expect((await row(a.id)).status).toBe('approved');
  });

  it('goes to the Finance Controllers when the submitter has no manager', async () => {
    const exp = await insert(taxi(), loner.token);
    const [reportId] = await submit([exp.id], loner.token);
    expect(await openRequests(reportId!)).toHaveLength(1);
    expect(await act(reportId!, finance.token, 'approve')).toBe(200);
    expect((await report(reportId!)).status).toBe('approved');
  });

  it('locks its expenses while it waits; a recall puts both back to Draft, and Submit sends it again', async () => {
    const exp = await insert(taxi(), spender.token);
    const [reportId] = await submit([exp.id], spender.token);
    await expect(update({ id: exp.id, amount: 41 }, spender.token)).rejects.toThrow(/waiting for approval/);
    await expect(verify.hooks.run('crm_expense', 'delete', { id: exp.id }, { as: spender.token })).rejects.toThrow(/waiting for approval/);
    expect(await act(reportId!, spender.token, 'recall')).toBe(200);
    expect((await report(reportId!)).status).toBe('draft');
    expect((await row(exp.id)).status).toBe('draft');
    await update({ id: exp.id, amount: 41 }, spender.token);
    expect((await row(exp.id)).amount, 'a draft report\'s expense is the person\'s to correct').toBe(41);
    await verify.actions.run('crm_expense_report', 'submit_expense_report', { as: spender.token, recordId: reportId! });
    expect((await report(reportId!)).status).toBe('submitted');
    expect(await openRequests(reportId!)).toHaveLength(1);
  });

  it('a rejected report rejects its expenses; Back to Draft reopens both to be corrected', async () => {
    const exp = await insert(taxi(), spender.token);
    const [reportId] = await submit([exp.id], spender.token);
    expect(await act(reportId!, manager.token, 'reject')).toBe(200);
    expect((await report(reportId!)).status).toBe('rejected');
    expect((await row(exp.id)).status).toBe('rejected');
    await expect(update({ id: exp.id, amount: 39 }, spender.token)).rejects.toThrow(/rejected\. Move the report back to Draft/);
    await verify.actions.run('crm_expense_report', 'reopen_expense_report', { as: spender.token, recordId: reportId! });
    expect((await report(reportId!)).status).toBe('draft');
    expect((await row(exp.id)).status).toBe('draft');
  });

  it('finance marks an approved report paid, with the date and reference; nobody else can, and a paid report stays as it is', async () => {
    const exp = await insert(taxi(60), spender.token);
    const [reportId] = await submit([exp.id], spender.token);
    expect(await act(reportId!, manager.token, 'approve')).toBe(200);
    await expect(verify.actions.run('crm_expense_report', 'mark_expense_report_paid', {
      as: spender.token, recordId: reportId!, params: { payment_date: '2026-11-20' },
    })).rejects.toThrow(/Only finance/);
    await expect(verify.hooks.run('crm_expense_report', 'update', { id: reportId!, status: 'paid' }, { as: spender.token }))
      .rejects.toThrow(/marked as paid by finance/);
    await expect(verify.hooks.run('crm_expense_report', 'update', { id: reportId!, name: 'Renamed' }, { as: spender.token }))
      .rejects.toThrow(/is approved, so it can no longer be changed/);
    await verify.actions.run('crm_expense_report', 'mark_expense_report_paid', {
      as: finance.token, recordId: reportId!, params: { payment_date: '2026-11-20', payment_reference: 'TRF-0042' },
    });
    expect(await report(reportId!)).toMatchObject({ status: 'paid', payment_date: '2026-11-20', payment_reference: 'TRF-0042' });
    expect((await row(exp.id)).status, 'a paid report leaves its expenses Approved').toBe('approved');
    await expect(verify.hooks.run('crm_expense_report', 'update', { id: reportId!, payment_reference: 'X' }, { as: spender.token }))
      .rejects.toThrow(/is paid, so it can no longer be changed/);
  });

  it('a person cannot approve a report by hand; deleting a draft report frees its expenses', async () => {
    const exp = await insert(taxi(), spender.token);
    const [reportId] = await submit([exp.id], spender.token);
    await expect(verify.hooks.run('crm_expense_report', 'update', { id: reportId!, status: 'approved' }, { as: manager.token }),
      'held by its approval while it waits').rejects.toThrow();
    expect(await act(reportId!, spender.token, 'recall')).toBe(200);
    await expect(verify.hooks.run('crm_expense_report', 'update', { id: reportId!, status: 'approved' }, { as: spender.token }))
      .rejects.toThrow(/approved or rejected by its approvers/);
    await verify.hooks.run('crm_expense_report', 'delete', { id: reportId! }, { as: spender.token });
    expect((await row(exp.id)).crm_expense_report ?? null, 'deleting a draft report frees its expenses').toBeNull();
    const again = await submit([exp.id], spender.token);
    expect(again, 'and they can be submitted again').toHaveLength(1);
  });

  it('an administrator may delete a sent report, to repair: its expenses go back to Draft, on no report, and can be submitted again (hotcrm#2761)', async () => {
    const admin = await verify.signIn();
    const remove = (id: string) => verify.apiAs(admin, 'DELETE', `/data/crm_expense_report/${id}`);

    // Waiting for approval.
    const waiting = await insert(taxi(), spender.token);
    const [sent] = await submit([waiting.id], spender.token);
    await expect(verify.hooks.run('crm_expense_report', 'delete', { id: sent! }, { as: spender.token }),
      'its submitter cannot delete a report that has been sent').rejects.toThrow(/Only a draft expense report can be deleted/);
    expect(await row(waiting.id), 'a refused delete released nothing').toMatchObject({ crm_expense_report: sent, status: 'submitted' });
    expect((await remove(sent!)).status, 'an administrator can').toBeLessThan(300);
    expect(await verify.rows('crm_expense_report', { id: sent })).toHaveLength(0);
    const freed = await row(waiting.id);
    expect(freed.crm_expense_report ?? null, 'the expense is on no report').toBeNull();
    expect(freed.status, 'and no longer reads Submitted with nothing to be submitted on').toBe('draft');
    expect(await openRequests(sent!), 'nobody is left asked to decide a report that is gone').toHaveLength(0);
    const [again] = await submit([waiting.id], spender.token);
    expect(await row(waiting.id), 'it can be submitted again').toMatchObject({ crm_expense_report: again, status: 'submitted' });
    expect(again).not.toBe(sent);

    // Rejected.
    const refused = await insert(taxi(), spender.token);
    const [turnedDown] = await submit([refused.id], spender.token);
    expect(await act(turnedDown!, manager.token, 'reject')).toBe(200);
    expect((await row(refused.id)).status).toBe('rejected');
    await expect(verify.hooks.run('crm_expense_report', 'delete', { id: turnedDown! }, { as: spender.token }),
      'a rejected report goes back to Draft to be corrected; it is not deleted as it stands').rejects.toThrow(/Only a draft expense report can be deleted/);
    expect((await remove(turnedDown!)).status).toBeLessThan(300);
    const corrected = await row(refused.id);
    expect(corrected.crm_expense_report ?? null).toBeNull();
    expect(corrected.status, 'a rejected expense with no report is a draft again').toBe('draft');
    expect(await submit([refused.id], spender.token), 'and can be submitted again').toHaveLength(1);
  });

  it('nobody deletes an approved or a paid report, administrators included: a 409 in the caller\'s language, and it stays on record with its expenses (hotcrm#2761)', async () => {
    // Maintainer ruling on hotcrm#2761 (option 3): the administrator's repair
    // above is for a report whose approval cannot run; an approved or paid
    // report's approval has run. Deleting one used to release its expenses as
    // Approved on no report, still in the project's cost and never to be
    // submitted again.
    const admin = await verify.signIn();
    const remove = async (id: string, token: string, locale = 'en') => {
      const res = await verify.raw(`/api/v1/data/crm_expense_report/${id}`, {
        method: 'DELETE',
        headers: { authorization: `Bearer ${token}`, 'accept-language': locale },
      });
      const text = await res.text();
      const body = (() => { try { return JSON.parse(text) as Rec; } catch { return {} as Rec; } })();
      return { status: res.status, code: body.code as string | undefined, message: String(body.error ?? ''), text };
    };
    const reason = (locale: string, key: string): string =>
      (packFor(locale) as Rec).hooks.expense_report_rules.refusals.RECORD_LOCKED.reasons[key].message as string;
    const kept = async (reportId: string, expenseId: string, status: string): Promise<void> => {
      expect(await report(reportId), 'the report stays on record').toMatchObject({ status });
      expect(await row(expenseId), 'and so does its expense, on it, Approved').toMatchObject({ crm_expense_report: reportId, status: 'approved' });
    };

    const decided = await insert(taxi(), spender.token);
    const [approvedId] = await submit([decided.id], spender.token);
    expect(await act(approvedId!, manager.token, 'approve')).toBe(200);
    const approvedName = (await report(approvedId!)).name as string;
    expect(approvedName, 'the report has a name to put in the sentence').toBeTruthy();

    const byAdmin = await remove(approvedId!, admin);
    expect({ status: byAdmin.status, code: byAdmin.code }, byAdmin.text).toEqual({ status: 409, code: 'RECORD_LOCKED' });
    expect(byAdmin.message).toBe(`Expense report ${approvedName} is approved, so it cannot be deleted: an approved or paid report stays on record.`);
    await kept(approvedId!, decided.id, 'approved');
    const bySubmitter = await remove(approvedId!, spender.token);
    expect({ status: bySubmitter.status, code: bySubmitter.code }, 'a non-administrator is refused as before').toEqual({ status: 409, code: 'RECORD_LOCKED' });
    await kept(approvedId!, decided.id, 'approved');

    const settled = await insert(taxi(), spender.token);
    const [paidId] = await submit([settled.id], spender.token);
    expect(await act(paidId!, manager.token, 'approve')).toBe(200);
    await verify.actions.run('crm_expense_report', 'mark_expense_report_paid', {
      as: finance.token, recordId: paidId!, params: { payment_date: '2026-11-20' },
    });
    const paidName = (await report(paidId!)).name as string;
    const paidByAdmin = await remove(paidId!, admin);
    expect({ status: paidByAdmin.status, code: paidByAdmin.code }, paidByAdmin.text).toEqual({ status: 409, code: 'RECORD_LOCKED' });
    expect(paidByAdmin.message).toBe(`Expense report ${paidName} is paid, so it cannot be deleted: an approved or paid report stays on record.`);
    await kept(paidId!, settled.id, 'paid');
    const paidBySubmitter = await remove(paidId!, spender.token);
    expect({ status: paidBySubmitter.status, code: paidBySubmitter.code }, paidBySubmitter.text).toEqual({ status: 409, code: 'RECORD_LOCKED' });
    await kept(paidId!, settled.id, 'paid');

    const chinese = await remove(approvedId!, admin, 'zh-CN');
    expect({ status: chinese.status, code: chinese.code }, chinese.text).toEqual({ status: 409, code: 'RECORD_LOCKED' });
    expect(chinese.message).toBe(`报销单${approvedName}已批准，不能删除：已批准或已付款的报销单会保留在记录中。`);
    expect((await remove(paidId!, admin, 'zh-CN')).message).toBe(`报销单${paidName}已付款，不能删除：已批准或已付款的报销单会保留在记录中。`);
    for (const locale of ['ja-JP', 'es-ES']) {
      expect((await remove(approvedId!, admin, locale)).message, locale).toBe(reason(locale, 'delete_approved').replace('{{name}}', approvedName));
      expect((await remove(paidId!, admin, locale)).message, locale).toBe(reason(locale, 'delete_paid').replace('{{name}}', paidName));
    }
    await kept(approvedId!, decided.id, 'approved');
    await kept(paidId!, settled.id, 'paid');
  });

  it('refuses the whole selection, writing nothing, when an expense is someone else\'s or already on a report', async () => {
    const mine = await insert(taxi(), spender.token);
    const theirs = await insert(taxi(), loner.token);
    // From 19.0 the platform reads an action's selection in the caller's scope before the body runs
    // (objectstack#36132): an expense the spender cannot read is not found, ahead of the body's "not yours".
    await expect(submit([mine.id, theirs.id], spender.token)).rejects.toThrow(new RegExp(`Record ${theirs.id} not found`));
    expect((await row(mine.id)).crm_expense_report ?? null, 'nothing written').toBeNull();
    const [reportId] = await submit([mine.id], spender.token);
    await expect(submit([mine.id], spender.token)).rejects.toThrow(/already on an expense report/);
    expect((await linesOf(reportId!)).length).toBe(1);
  });

  it('a person cannot put an expense on a report: the platform drops the report they name, on create and on update, submitted or draft', async () => {
    // Measured on 18.5.0: the report field is read-only, so a person's value
    // is dropped before any hook runs and the write still answers 2xx. The
    // "201 onto a submitted report" seen during the screenshot pass
    // (hotcrm#2605) was this drop: the expense landed on no report.
    const post = async (doc: Rec): Promise<string> => {
      const res = await verify.apiAs(spender.token, 'POST', '/data/crm_expense', doc);
      expect(res.status, await res.clone().text()).toBe(201);
      const body: Rec = await res.json();
      return String((body.record ?? body.data ?? body).id);
    };
    const patch = async (id: string, doc: Rec): Promise<void> => {
      const res = await verify.apiAs(spender.token, 'PATCH', `/data/crm_expense/${id}`, doc);
      expect(res.status, await res.clone().text()).toBe(200);
    };
    const exp = await insert(taxi(), spender.token);
    const [reportId] = await submit([exp.id], spender.token);
    expect((await report(reportId!)).status).toBe('submitted');

    const created = await post(taxi(15, { crm_expense_report: reportId }));
    expect((await row(created)).crm_expense_report ?? null, 'created, on no report').toBeNull();
    const loose = await insert(taxi(16), spender.token);
    await patch(loose.id, { crm_expense_report: reportId });
    expect((await row(loose.id)).crm_expense_report ?? null, 'not moved onto the report').toBeNull();
    expect((await linesOf(reportId!)).map((l) => l.id), 'the submitted report holds what it was sent with').toEqual([exp.id]);
    expect((await report(reportId!)).total_amount).toBe(40);

    expect(await act(reportId!, spender.token, 'recall')).toBe(200);
    expect((await report(reportId!)).status).toBe('draft');
    const onDraft = await post(taxi(17, { crm_expense_report: reportId }));
    expect((await row(onDraft)).crm_expense_report ?? null, 'a draft report takes none by hand either').toBeNull();
    await patch(loose.id, { crm_expense_report: reportId });
    expect((await row(loose.id)).crm_expense_report ?? null).toBeNull();
    expect((await linesOf(reportId!)).map((l) => l.id)).toEqual([exp.id]);
  });

  it('so a report\'s Expenses list offers no New, whatever its status; a project\'s list keeps it', async () => {
    const create = (stackOf(EXPENSE_ID).objects[0].userActions as Rec).create as Rec;
    const exp = await insert(taxi(), spender.token);
    const [reportId] = await submit([exp.id], spender.token);
    const sent = await report(reportId!);
    expect(conditionHolds(verify, create.visibleWhen, { record: sent }), 'a submitted report').toBe(false);
    expect(conditionHolds(verify, create.visibleWhen, { record: { ...sent, status: 'draft' } }), 'a draft report').toBe(false);
    expect(conditionHolds(verify, create.visibleWhen, { record: { id: 'prj_1', name: 'Pilot', status: 'active' } }), 'a project').toBe(true);
  });

  it('finance reads every report; another rep reads none of the spender\'s', async () => {
    const exp = await insert(taxi(), spender.token);
    const [reportId] = await submit([exp.id], spender.token);
    expect((await verify.apiAs(finance.token, 'GET', `/data/crm_expense_report/${reportId}`)).status).toBe(200);
    expect((await verify.apiAs(finance.token, 'GET', `/data/crm_expense/${exp.id}`)).status).toBe(200);
    const other = await signUpPerson(verify, 'other-rep@expense-module.test', {
      name: 'Other Rep', positions: ['crm_sales_rep'], permissionSets: ['sales_rep'],
    });
    expect((await verify.apiAs(other.token, 'GET', `/data/crm_expense_report/${reportId}`)).status).not.toBe(200);
    expect((await verify.apiAs(other.token, 'GET', `/data/crm_expense/${exp.id}`)).status).not.toBe(200);
  });
});

/**
 * Each module disabled in turn, the other still usable — `module-split-plan.md`
 * item 15, and the card's acceptance. Measured on the shipped app booted by
 * `@objectstack/verify`, through the platform's package disable.
 */
describe('disabling either module leaves the other usable (hotcrm#2556, hotcrm#2559)', () => {
  let verify: VerifyStack;
  let admin: string;
  let spender: Person;
  let manager: Person;
  let pm: Person;
  let k = 0;
  const pkg = (id: string): string => `/packages/${id}`;

  beforeAll(async () => {
    verify = await hotcrmStack();
    admin = await verify.signIn();
    manager = await signUpPerson(verify, 'manager@expense-disable.test', {
      name: 'Disable Manager', positions: ['crm_sales_manager'], permissionSets: ['sales_manager'],
    });
    spender = await signUpPerson(verify, 'spender@expense-disable.test', {
      name: 'Disable Spender', positions: ['crm_project_member'], permissionSets: ['project_member'],
    });
    pm = await signUpPerson(verify, 'pm@expense-disable.test', {
      name: 'Disable PM', positions: ['crm_project_manager'], permissionSets: ['project_manager'],
    });
    await systemUpdate(verify, 'sys_user', { id: spender.id, manager_id: manager.id });
  }, 120_000);

  afterAll(async () => {
    await verify?.apiAs(admin, 'PATCH', `${pkg(EXPENSE_ID)}/enable`);
    await verify?.apiAs(admin, 'PATCH', `${pkg(PSA_ID)}/enable`);
  });

  const fieldsOf = async (object: string): Promise<string[]> => {
    const res = await verify.apiAs(admin, 'GET', `/meta/object/${object}`);
    const body = (await res.json()) as Rec;
    return Object.keys(((body.item ?? body.data ?? body).fields ?? {}) as Rec);
  };
  const navIds = async (app: string): Promise<string[]> => {
    const res = await verify.apiAs(admin, 'GET', `/meta/app/${app}`);
    const body = (await res.json()) as Rec;
    return walk(((body.item ?? body.data ?? body).navigation ?? []) as Rec[]).map((i) => String(i.id));
  };

  // A package switch re-registers metadata; past the 5 s default under the full suite (hotcrm#2623).
  it('with Project Delivery off, neither the expense nor the report has a Project field; a selection makes one report, approved by the manager', async () => {
    expect(await fieldsOf('crm_expense')).toContain('crm_project');
    expect(await fieldsOf('crm_expense_report')).toContain('crm_project');
    expect((await verify.apiAs(admin, 'PATCH', `${pkg(PSA_ID)}/disable`)).status).toBe(200);
    try {
      expect(await fieldsOf('crm_expense')).not.toContain('crm_project');
      expect(await fieldsOf('crm_expense_report')).not.toContain('crm_project');
      expect((await verify.apiAs(admin, 'GET', '/meta/app/crm_expenses')).status).toBe(200);
      const ids: string[] = [];
      for (const amount of [25, 15]) {
        const exp = await verify.hooks.run('crm_expense', 'insert', {
          name: `Lunch ${++k}`, expense_date: '2026-11-03', category: 'meals', amount,
        }, { as: spender.token });
        ids.push(exp.id);
      }
      const result = (await verify.actions.run('crm_expense', 'submit_for_reimbursement', { as: spender.token, params: { _selectedIds: ids } })) as Rec;
      expect(result.reports, 'no project to group by, so one report').toHaveLength(1);
      const reportId = result.reports[0] as string;
      const [request] = await verify.rows('sys_approval_request', { record_id: reportId, status: 'pending' });
      expect(request, 'the manager path runs').toBeTruthy();
      expect((await verify.apiAs(manager.token, 'POST', `/approvals/requests/${request!.id}/approve`, { comment: 'ok' })).status).toBe(200);
      expect((await verify.rows('crm_expense_report', { id: reportId }))[0]!.status).toBe('approved');
      expect((await verify.rows('crm_expense', { id: ids[0] }))[0]!.status).toBe('approved');
      // Measured at runtime: the project path never starts, so nothing reads
      // the absent project, and the manager path's run ends clean.
      expect(await flowRuns(verify, 'expense_report_project_approval', reportId)).toEqual([]);
      const runs = await flowRuns(verify, 'expense_report_approval', reportId);
      expect(runs.length).toBeGreaterThan(0);
      for (const run of runs) expect(run.error ?? null, `run ${run.id}`).toBeNull();
    } finally {
      expect((await verify.apiAs(admin, 'PATCH', `${pkg(PSA_ID)}/enable`)).status).toBe(200);
    }
    expect(await fieldsOf('crm_expense'), 'the field returns on enable').toContain('crm_project');
  }, 60_000);

  // A package switch re-registers metadata; past the 5 s default under the full suite (hotcrm#2623).
  it('with the expense module off, projects and timesheets work, and the expense entries leave the Project Delivery app', async () => {
    expect(await navIds('crm_psa')).toContain('nav_my_expenses');
    expect((await verify.apiAs(admin, 'PATCH', `${pkg(EXPENSE_ID)}/disable`)).status).toBe(200);
    try {
      expect((await verify.apiAs(admin, 'GET', '/meta/object/crm_expense')).status).toBe(404);
      expect((await verify.apiAs(admin, 'GET', '/meta/object/crm_expense_report')).status).toBe(404);
      expect((await verify.apiAs(admin, 'GET', '/meta/app/crm_expenses')).status).toBe(404);
      expect((await verify.apiAs(admin, 'GET', '/meta/app/crm_psa')).status).toBe(200);
      const ids = await navIds('crm_psa');
      expect(ids).not.toContain('nav_my_expenses');
      expect(ids).not.toContain('nav_expense_reports_to_approve');
      expect(ids).toContain('nav_my_timesheets');
      const fields = await fieldsOf('crm_project');
      expect(fields, 'the cost summaries stay on the project').toContain('actual_expense_cost');
      const [account] = await verify.rows('crm_account', {});
      const project = await verify.hooks.run('crm_project', 'insert', {
        name: `Disabled Expenses ${++k}`, crm_account: account!.id, kind: 'delivery',
      }, { as: pm.token });
      expect((await verify.apiAs(pm.token, 'GET', `/data/crm_project/${project.id}`)).status).toBe(200);
      await verify.hooks.run('crm_project', 'update', { id: project.id, description: 'Edited with expenses off.' }, { as: pm.token });
      expect((await verify.rows('crm_project', { id: project.id }))[0]!.description).toBe('Edited with expenses off.');
    } finally {
      expect((await verify.apiAs(admin, 'PATCH', `${pkg(EXPENSE_ID)}/enable`)).status).toBe(200);
    }
    expect(await navIds('crm_psa')).toContain('nav_my_expenses');
  }, 60_000);
});
