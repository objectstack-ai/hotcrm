// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { VerifyStack } from '@objectstack/verify';
import { flowRuns, hotcrmStack, notificationsTo, signUpPerson, type Person } from './helpers/verify-stack';
import { REPO_ROOT } from './helpers/repo-root';
import {
  BUDGET_EXCEEDED_PERCENT, BUDGET_WARNING_PERCENT, EXPENSE_FINANCE_REVIEW_AMOUNT, PROJECT_FINANCE_REVIEW_BUDGET,
} from '../src/psa/objects/_thresholds';
import { ProjectInitiationApprovalFlow } from '../src/psa/flows/project-initiation-approval.flow';
import { TimesheetApprovalFlow, TimesheetApprovalOnCreateFlow } from '../src/psa/flows/submission-approval.flow';
import { allFlows } from '../objectstack.composition';
import { ProjectBudgetAlertFlow } from '../src/psa/flows/project-budget-alert.flow';

type Rec = Record<string, any>;

/**
 * Project Delivery, phase 1b (hotcrm#2316): approvals and cost control on the
 * shipped app booted by `@objectstack/verify`, driven through the real doors
 * (record writes as the people, `POST /approvals/requests/{id}/…`).
 *
 * - `project_initiation_approval`: a project goes Draft → In Approval →
 *   Approved through a Project Director's decision, and a large budget also
 *   through a Finance Controller's. A person cannot write the decision.
 * - `timesheet_approval` / `expense_report_project_approval`: the stamped
 *   approver (the project's Project Manager) decides, nobody decides their
 *   own, a large timesheet or expense report also goes to finance, and a
 *   recall puts the record back to Draft. Expenses are sent on a report, one
 *   per project (hotcrm#2559); a report with no project goes to the
 *   submitter's manager instead (`test/expense-module.test.ts`).
 * - `project_budget_status` / `project_budget_alert`: the signal moves with
 *   approved cost, and its crossing tells the PM and finance once.
 * - `time_entry_locked`: a timesheet's submission on a locked project is
 *   refused, a draft never is; an expense report's goes back to Draft with a
 *   notice.
 * - a Closed or Cancelled project (hotcrm#2491): no new timesheet, none moved
 *   onto it, and a draft already there is editable but not submitted;
 *   Completed and Active take both. An expense is the expense module's since
 *   hotcrm#2556, so Project Delivery has no hook on it (ADR-0130 R4): the
 *   picker offers no over project, and a report submitted there anyway goes
 *   back to Draft with an inbox notice instead of being refused.
 */

let verify: VerifyStack;
let admin: string;
let pm: Person;
let consultant: Person;
let director: Person;
let finance: Person;
let account: Rec;
let card: Rec;
let k = 0;

const insert = (object: string, doc: Rec, as: string): Promise<Rec> => verify.hooks.run(object, 'insert', doc, { as });
const update = (object: string, doc: Rec, as: string): Promise<Rec> => verify.hooks.run(object, 'update', doc, { as });
const row = async (object: string, id: string): Promise<Rec> => (await verify.rows(object, { id }))[0]!;
const num = (v: unknown): number => Number(v ?? 0);
const openRequests = (id: string): Promise<Rec[]> => verify.rows('sys_approval_request', { record_id: id, status: 'pending' });
const flowNamed = (name: string): Rec => (allFlows as Rec[]).find((f) => f.name === name)!;

/**
 * Submit for Reimbursement on these expenses, as `as` (hotcrm#2559): the
 * reports it made, one per project.
 */
const submitReport = async (ids: string[], as: string): Promise<string[]> => {
  const result = (await verify.actions.run('crm_expense', 'submit_for_reimbursement', { as, params: { _selectedIds: ids } })) as Rec;
  return result.reports as string[];
};

/**
 * An expense report submitted on an over or locked project comes back as a
 * Draft with its expenses, no request opens, and its submitter is told why,
 * naming the template.
 */
const expectTurnedBack = async (reportId: string, template: string): Promise<void> => {
  expect((await row('crm_expense_report', reportId)).status).toBe('draft');
  for (const line of await verify.rows('crm_expense', { crm_expense_report: reportId })) expect(line.status).toBe('draft');
  expect(await openRequests(reportId)).toHaveLength(0);
  await vi.waitFor(async () => {
    const notices = (await notificationsTo(verify, consultant.id, 'expense_report_turned_back'))
      .filter((n) => n.payload?.actionUrl === `/crm_expense_report/${reportId}`);
    expect(notices.map((n) => n.payload?.template ?? n.template)).toEqual([template]);
  }, { timeout: 15_000, interval: 100 });
};

/** POST a decision on the one open request of a record; returns the HTTP status. */
const act = async (recordId: string, token: string, action: 'approve' | 'reject' | 'recall'): Promise<number> => {
  const [request] = await openRequests(recordId);
  expect(request, `no open approval request on ${recordId}`).toBeTruthy();
  const res = await verify.apiAs(token, 'POST', `/approvals/requests/${request!.id}/${action}`, { comment: `${action} in test.` });
  return res.status;
};

/**
 * A Draft project with its version 1 budget planned (hotcrm#2547): one line of
 * `budget`, so the version's total, and once approved the project's Approved
 * Budget, is `budget`.
 */
const plannedProject = async (name: string, budget: number, extra: Rec = {}): Promise<Rec> => {
  const p = await insert('crm_project', { name: `${name} ${++k}`, crm_account: account.id, kind: 'delivery', ...extra }, pm.token);
  const version = await insert('crm_project_budget', { crm_project: p.id }, pm.token);
  await insert('crm_project_budget_line', {
    crm_project_budget: version.id, category: 'other', description: 'Delivery', quantity: 1, unit_cost: budget,
  }, pm.token);
  return p;
};

/** A project staffed with the PM and the consultant, through approval and Active (as admin, so no tier is under test). */
const activeProject = async (budget: number): Promise<Rec> => {
  const p = await plannedProject('Approvals Rollout', budget, { planned_revenue: budget * 2 });
  await insert('crm_project_member', { crm_project: p.id, person: pm.id, responsibility: 'project_manager', rate_card: card.id }, pm.token);
  await insert('crm_project_member', { crm_project: p.id, person: consultant.id, responsibility: 'consultant', rate_card: card.id }, pm.token);
  await update('crm_project', { id: p.id, status: 'in_approval' }, pm.token);
  expect(await act(p.id, director.token, 'approve')).toBe(200);
  if (budget >= PROJECT_FINANCE_REVIEW_BUDGET) expect(await act(p.id, finance.token, 'approve')).toBe(200);
  await update('crm_project', { id: p.id, status: 'active' }, pm.token);
  return p;
};

/** A submitted timesheet of `hours` by the consultant, approved by the PM. Cost is hours × 50. */
const approvedHours = async (projectId: string, start: string, hours: number): Promise<Rec> => {
  const end = new Date(Date.parse(`${start}T00:00:00Z`) + 6 * 86_400_000).toISOString().slice(0, 10);
  const sheet = await insert('crm_timesheet', { crm_project: projectId, period_start: start, period_end: end }, consultant.token);
  await insert('crm_time_entry', { crm_timesheet: sheet.id, entry_date: start, hours: Math.min(hours, 24), is_billable: true }, consultant.token);
  if (hours > 24) {
    const second = new Date(Date.parse(`${start}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
    await insert('crm_time_entry', { crm_timesheet: sheet.id, entry_date: second, hours: hours - 24, is_billable: true }, consultant.token);
  }
  await update('crm_timesheet', { id: sheet.id, status: 'submitted' }, consultant.token);
  expect(await act(sheet.id, pm.token, 'approve')).toBe(200);
  return sheet;
};

beforeAll(async () => {
  verify = await hotcrmStack();
  admin = await verify.signIn();
  pm = await signUpPerson(verify, 'pm@psa-approvals.test', {
    name: 'Approvals PM', positions: ['crm_project_manager'], permissionSets: ['project_manager'],
  });
  consultant = await signUpPerson(verify, 'consultant@psa-approvals.test', {
    name: 'Approvals Consultant', positions: ['crm_project_member'], permissionSets: ['project_member'],
  });
  director = await signUpPerson(verify, 'director@psa-approvals.test', {
    name: 'Approvals Director', positions: ['crm_project_director'], permissionSets: ['project_manager', 'finance_controller'],
  });
  finance = await signUpPerson(verify, 'finance@psa-approvals.test', {
    name: 'Approvals Finance', positions: ['crm_finance_controller'], permissionSets: ['finance_controller'],
  });
  [account] = await verify.rows('crm_account', {});
  card = await insert('crm_rate_card', {
    name: `Approvals Consultant ${++k}`, seniority: 'senior', unit: 'hour', cost_rate: 50, bill_rate: 100,
  }, finance.token);
}, 120_000);

describe('the hook bodies keep their copies of the constants', () => {
  it('project.hook.ts cuts Budget Status at the lines in _thresholds.ts', () => {
    const body = readFileSync(join(REPO_ROOT, 'src/psa/objects/project.hook.ts'), 'utf8');
    expect(body).toContain(`const BUDGET_WARNING_PERCENT = ${BUDGET_WARNING_PERCENT};`);
    expect(body).toContain(`const BUDGET_EXCEEDED_PERCENT = ${BUDGET_EXCEEDED_PERCENT};`);
  });
});

describe('project initiation (project_initiation_approval, project_status_guard)', () => {
  it('starts a person\'s project as Draft, and sends it for approval only with a budget', async () => {
    expect(ProjectInitiationApprovalFlow.name).toBe('project_initiation_approval');
    await expect(insert('crm_project', { name: `Born Active ${++k}`, crm_account: account.id, kind: 'delivery', status: 'active' }, pm.token))
      .rejects.toThrow(/starts as Draft/);
    const p = await insert('crm_project', { name: `No Budget ${++k}`, crm_account: account.id, kind: 'delivery' }, pm.token);
    await expect(update('crm_project', { id: p.id, status: 'in_approval' }, pm.token)).rejects.toThrow(/Add the project's budget/);
    expect(await openRequests(p.id)).toHaveLength(0);
  });

  it('is approved by a Project Director, and then the PM makes it Active', async () => {
    const p = await plannedProject('Small Rollout', PROJECT_FINANCE_REVIEW_BUDGET - 1);
    await expect(update('crm_project', { id: p.id, status: 'approved' }, pm.token), 'a person never writes the decision')
      .rejects.toThrow(/approved or rejected by its approver/);
    await update('crm_project', { id: p.id, status: 'in_approval' }, pm.token);
    expect(await openRequests(p.id)).toHaveLength(1);
    await expect(update('crm_project', { id: p.id, description: 'Edited while deciding.' }, pm.token), 'the budget is held while it is decided')
      .rejects.toThrow(/locked while an approval is in progress/);
    expect(await act(p.id, pm.token, 'approve'), 'a project manager is not on the slate').not.toBe(200);
    expect(await act(p.id, director.token, 'approve')).toBe(200);
    const approved = await row('crm_project', p.id);
    expect(approved.status).toBe('approved');
    expect(num(approved.approved_budget), 'its version 1 is the baseline').toBe(PROJECT_FINANCE_REVIEW_BUDGET - 1);
    await update('crm_project', { id: p.id, status: 'active' }, pm.token);
    expect((await row('crm_project', p.id)).status).toBe('active');
  });

  it(`also needs a Finance Controller at a budget of ${PROJECT_FINANCE_REVIEW_BUDGET}, whose rejection sends it back`, async () => {
    const p = await plannedProject('Large Rollout', PROJECT_FINANCE_REVIEW_BUDGET);
    await update('crm_project', { id: p.id, status: 'in_approval' }, pm.token);
    expect(await act(p.id, director.token, 'approve')).toBe(200);
    expect((await row('crm_project', p.id)).status, 'still waiting on finance').toBe('in_approval');
    expect(await act(p.id, finance.token, 'reject')).toBe(200);
    expect((await row('crm_project', p.id)).status).toBe('rejected');
    await update('crm_project', { id: p.id, status: 'draft' }, pm.token);
    expect((await row('crm_project', p.id)).status).toBe('draft');
  });

  it('goes back to Draft when the PM recalls it', async () => {
    const p = await plannedProject('Recalled Rollout', 1000);
    await update('crm_project', { id: p.id, status: 'in_approval' }, pm.token);
    expect(await act(p.id, pm.token, 'recall')).toBe(200);
    expect((await row('crm_project', p.id)).status).toBe('draft');
    expect(await openRequests(p.id)).toHaveLength(0);
  });
});

describe('timesheets and expense reports (timesheet_approval, expense_report_project_approval)', () => {
  let project: Rec;
  beforeAll(async () => {
    project = await activeProject(1_000_000);
  }, 60_000);

  it('leaves the decision to the approval: nobody sets Approved by hand, except an administrator', async () => {
    expect(TimesheetApprovalFlow.name).toBe('timesheet_approval');
    expect(TimesheetApprovalOnCreateFlow.name, 'its insert twin, the same nodes').toBe('timesheet_approval_on_create');
    const sheet = await insert('crm_timesheet', { crm_project: project.id, period_start: '2026-10-05', period_end: '2026-10-11' }, consultant.token);
    await insert('crm_time_entry', { crm_timesheet: sheet.id, entry_date: '2026-10-05', hours: 2 }, consultant.token);
    await update('crm_timesheet', { id: sheet.id, status: 'submitted' }, consultant.token);
    expect(await openRequests(sheet.id)).toHaveLength(1);
    expect(await act(sheet.id, consultant.token, 'approve'), 'the submitter is not on the slate').not.toBe(200);
    expect(await act(sheet.id, pm.token, 'reject')).toBe(200);
    expect((await row('crm_timesheet', sheet.id)).status).toBe('rejected');
    await update('crm_timesheet', { id: sheet.id, status: 'draft' }, consultant.token);
    await expect(update('crm_timesheet', { id: sheet.id, status: 'approved' }, pm.token)).rejects.toThrow(/approved or rejected by its approver/);
  });

  it('puts a recalled timesheet back to Draft, where it can be corrected', async () => {
    const sheet = await insert('crm_timesheet', { crm_project: project.id, period_start: '2026-10-12', period_end: '2026-10-18' }, consultant.token);
    const entry = await insert('crm_time_entry', { crm_timesheet: sheet.id, entry_date: '2026-10-12', hours: 2 }, consultant.token);
    await update('crm_timesheet', { id: sheet.id, status: 'submitted' }, consultant.token);
    expect(await act(sheet.id, consultant.token, 'recall')).toBe(200);
    expect((await row('crm_timesheet', sheet.id)).status).toBe('draft');
    await update('crm_time_entry', { id: entry.id, hours: 3 }, consultant.token);
    expect(num((await row('crm_time_entry', entry.id)).hours)).toBe(3);
  });

  it('does not ask the project manager to approve their own hours: an administrator decides', async () => {
    const sheet = await insert('crm_timesheet', { crm_project: project.id, period_start: '2026-10-19', period_end: '2026-10-25' }, pm.token);
    await insert('crm_time_entry', { crm_timesheet: sheet.id, entry_date: '2026-10-19', hours: 4 }, pm.token);
    await update('crm_timesheet', { id: sheet.id, status: 'submitted' }, pm.token);
    expect(await act(sheet.id, pm.token, 'approve'), 'nobody approves their own hours').not.toBe(200);
    expect(await act(sheet.id, admin, 'approve')).toBe(200);
    expect((await row('crm_timesheet', sheet.id)).status).toBe('approved');
  });

  it(`sends a report totalling ${EXPENSE_FINANCE_REVIEW_AMOUNT} or more to finance after the PM, and costs its expenses only then`, async () => {
    expect(flowNamed('expense_report_project_approval'), 'the project path').toBeDefined();
    const before = num((await row('crm_project', project.id)).actual_expense_cost);
    const ids: string[] = [];
    for (const amount of [EXPENSE_FINANCE_REVIEW_AMOUNT / 2, EXPENSE_FINANCE_REVIEW_AMOUNT / 2]) {
      ids.push((await insert('crm_expense', {
        name: `Workshop ${++k}`, crm_project: project.id, expense_date: '2026-10-06', category: 'equipment', amount,
      }, consultant.token)).id);
    }
    const [reportId, ...rest] = await submitReport(ids, consultant.token);
    expect(rest, 'one project, one report').toEqual([]);
    const report = await row('crm_expense_report', reportId!);
    expect(report).toMatchObject({ crm_project: project.id, approver: pm.id, total_amount: EXPENSE_FINANCE_REVIEW_AMOUNT });
    expect((await row('crm_expense', ids[0]!)).approver, 'each expense carries the report\'s approver').toBe(pm.id);
    expect((await verify.apiAs(pm.token, 'GET', `/data/crm_expense_report/${reportId}`)).status, 'shared to the approver').toBe(200);
    expect((await verify.apiAs(pm.token, 'GET', `/data/crm_expense/${ids[0]}`)).status).toBe(200);
    expect(await act(reportId!, consultant.token, 'approve'), 'nobody decides their own').not.toBe(200);
    expect(await act(reportId!, pm.token, 'approve')).toBe(200);
    expect((await row('crm_expense_report', reportId!)).status, 'still waiting on finance').toBe('submitted');
    expect(num((await row('crm_project', project.id)).actual_expense_cost) - before).toBe(0);
    expect(await act(reportId!, finance.token, 'approve')).toBe(200);
    expect((await row('crm_expense_report', reportId!)).status).toBe('approved');
    expect((await row('crm_expense', ids[0]!)).status).toBe('approved');
    expect(num((await row('crm_project', project.id)).actual_expense_cost) - before).toBe(EXPENSE_FINANCE_REVIEW_AMOUNT);
    // Paid back: the expenses stay Approved, so the project's cost does not move.
    await verify.actions.run('crm_expense_report', 'mark_expense_report_paid', { as: finance.token, recordId: reportId!, params: { payment_date: '2026-10-20' } });
    expect(num((await row('crm_project', project.id)).actual_expense_cost) - before).toBe(EXPENSE_FINANCE_REVIEW_AMOUNT);
  });

  it('puts the expenses of each project on a report of their own, and the rest on one with no project', async () => {
    const other = await activeProject(1_000_000);
    const spend = async (projectId: string | null): Promise<string> => (await insert('crm_expense', {
      name: `Trip ${++k}`, ...(projectId ? { crm_project: projectId } : {}), expense_date: '2026-10-08', category: 'travel', amount: 30,
    }, consultant.token)).id;
    const ids = [await spend(project.id), await spend(other.id), await spend(project.id), await spend(null)];
    const reports = await submitReport(ids, consultant.token);
    expect(reports, 'two projects and one without').toHaveLength(3);
    const byProject = new Map<string, Rec>();
    for (const id of reports) {
      const r = await row('crm_expense_report', id);
      byProject.set(String(r.crm_project ?? ''), r);
    }
    expect(byProject.get(project.id)).toMatchObject({ total_amount: 60, approver: pm.id });
    expect(byProject.get(other.id)).toMatchObject({ total_amount: 30, approver: pm.id });
    const loose = byProject.get('')!;
    expect(loose.total_amount).toBe(30);
    expect(await flowRuns(verify, 'expense_report_project_approval', loose.id), 'no project: the manager path').toEqual([]);
    expect((await flowRuns(verify, 'expense_report_approval', loose.id)).length).toBeGreaterThan(0);
  });
});

describe('cost control (project_budget_status, project_budget_alert, time_entry_locked)', () => {
  let project: Rec;
  beforeAll(async () => {
    project = await activeProject(1000);
  }, 60_000);

  it('keeps Budget Status from approved cost, and tells the PM and finance once per crossing', async () => {
    expect(ProjectBudgetAlertFlow.name).toBe('project_budget_alert');
    expect((await row('crm_project', project.id)).budget_status).toBe('on_track');
    await approvedHours(project.id, '2026-09-07', 16); // 800 of 1000: 80 %, the warning line
    expect((await row('crm_project', project.id)).budget_status).toBe('warning');
    const warned = await vi.waitFor(async () => {
      const rows = await verify.rows('sys_notification_delivery', { topic: 'project_budget_warning' });
      const inbox = rows.filter((r) => r.channel === 'inbox' && r.payload?.actionUrl === `/crm_project/${project.id}`);
      expect(inbox.map((r) => r.recipient_id).sort()).toEqual([finance.id, pm.id].sort());
      return inbox;
    }, { timeout: 15_000, interval: 100 });
    expect(warned).toHaveLength(2);

    await approvedHours(project.id, '2026-09-14', 2); // 900: still warning, no second notice
    expect((await row('crm_project', project.id)).budget_status).toBe('warning');
    const again = (await verify.rows('sys_notification_delivery', { topic: 'project_budget_warning' }))
      .filter((r) => r.channel === 'inbox' && r.payload?.actionUrl === `/crm_project/${project.id}`);
    expect(again, 'staying in warning sends nothing more').toHaveLength(2);

    await approvedHours(project.id, '2026-09-21', 2); // 1000: exceeded
    expect((await row('crm_project', project.id)).budget_status).toBe('exceeded');
    await vi.waitFor(async () => {
      const rows = (await verify.rows('sys_notification_delivery', { topic: 'project_budget_exceeded' }))
        .filter((r) => r.channel === 'inbox' && r.payload?.actionUrl === `/crm_project/${project.id}`);
      expect(rows.map((r) => r.recipient_id).sort()).toEqual([finance.id, pm.id].sort());
    }, { timeout: 15_000, interval: 100 });
  });

  it('raises the budget by an approved top-up version, and Budget Status moves with it (hotcrm#2547)', async () => {
    const held = await row('crm_project', project.id);
    expect(num(held.approved_budget)).toBe(1000);
    expect(held.budget_status).toBe('exceeded');

    const topUp = await insert('crm_project_budget', { crm_project: project.id, reason: 'Scope grew.' }, pm.token);
    await insert('crm_project_budget_line', {
      crm_project_budget: topUp.id, category: 'other', description: 'Delivery', quantity: 1, unit_cost: 4000,
    }, pm.token);
    await update('crm_project_budget', { id: topUp.id, status: 'in_approval' }, pm.token);
    expect(await act(topUp.id, director.token, 'approve')).toBe(200);
    expect(await act(topUp.id, finance.token, 'approve'), 'four times the baseline also needs finance').toBe(200);
    const raised = await row('crm_project', project.id);
    expect(num(raised.approved_budget), 'the new baseline').toBe(4000);
    expect(raised.budget_status).toBe('on_track');
  });

  it('refuses a timesheet\'s submission on a locked project, never a draft, turns an expense\'s back, and takes both once unlocked', async () => {
    await update('crm_project', { id: project.id, time_entry_locked: true }, pm.token);
    const sheet = await insert('crm_timesheet', { crm_project: project.id, period_start: '2026-09-28', period_end: '2026-10-04' }, consultant.token);
    await insert('crm_time_entry', { crm_timesheet: sheet.id, entry_date: '2026-09-28', hours: 1 }, consultant.token);
    await expect(update('crm_timesheet', { id: sheet.id, status: 'submitted' }, consultant.token))
      .rejects.toThrow(/locked for time and expenses/);
    const exp = await insert('crm_expense', {
      name: `Hotel ${++k}`, crm_project: project.id, expense_date: '2026-09-29', category: 'lodging', amount: 90,
    }, consultant.token);
    const [reportId] = await submitReport([exp.id], consultant.token);
    await expectTurnedBack(reportId!, 'crm.expense_report_project_locked');
    await expect(update('crm_timesheet', { id: sheet.id, status: 'submitted' }, admin), 'nobody is exempt')
      .rejects.toThrow(/locked for time and expenses/);

    await update('crm_project', { id: project.id, time_entry_locked: false }, pm.token);
    await update('crm_timesheet', { id: sheet.id, status: 'submitted' }, consultant.token);
    expect((await row('crm_timesheet', sheet.id)).status).toBe('submitted');
    await verify.actions.run('crm_expense_report', 'submit_expense_report', { as: consultant.token, recordId: reportId! });
    expect((await row('crm_expense_report', reportId!)).status).toBe('submitted');
    expect((await row('crm_expense', exp.id)).status).toBe('submitted');
    expect(await openRequests(reportId!)).toHaveLength(1);
  });
});

describe('a project that is over takes no time or spend (hotcrm#2491)', () => {
  const projects: Record<string, Rec> = {};
  let draftSheet: Rec;
  let draftExpense: Rec;
  let start = Date.parse('2026-10-05T00:00:00Z');
  /** A fresh one-week period, so no two timesheets of the consultant on one project clash. */
  const week = (): { period_start: string; period_end: string } => {
    const s = new Date(start).toISOString().slice(0, 10);
    const e = new Date(start + 6 * 86_400_000).toISOString().slice(0, 10);
    start += 7 * 86_400_000;
    return { period_start: s, period_end: e };
  };
  const expense = (projectId: string): Rec => ({
    name: `Taxi ${++k}`, crm_project: projectId, expense_date: '2026-10-06', category: 'travel', amount: 40,
  });
  const moveTo = async (p: Rec, ...statuses: string[]): Promise<Rec> => {
    for (const status of statuses) await update('crm_project', { id: p.id, status }, pm.token);
    expect((await row('crm_project', p.id)).status).toBe(statuses.at(-1));
    return p;
  };

  beforeAll(async () => {
    projects.active = await activeProject(1000);
    projects.completed = await moveTo(await activeProject(1000), 'completed');
    projects.closed = await moveTo(await activeProject(1000), 'completed', 'closed');
    projects.cancelled = await moveTo(await activeProject(1000), 'cancelled');
    // Drafts written while the project was Active, which then closes under them.
    const closing = await activeProject(1000);
    draftSheet = await insert('crm_timesheet', { crm_project: closing.id, ...week() }, consultant.token);
    await insert('crm_time_entry', { crm_timesheet: draftSheet.id, entry_date: draftSheet.period_start, hours: 2 }, consultant.token);
    draftExpense = await insert('crm_expense', expense(closing.id), consultant.token);
    projects.closing = await moveTo(closing, 'completed', 'closed');
  }, 120_000);

  it.each([
    ['closed', 'Closed'],
    ['cancelled', 'Cancelled'],
  ])('a %s project refuses a new timesheet, naming the project and its status, and turns back an expense submitted on it', async (status, label) => {
    const p = projects[status]!;
    await expect(insert('crm_timesheet', { crm_project: p.id, ...week() }, consultant.token))
      .rejects.toThrow(`${p.name} is ${label}, so it takes no new timesheets.`);
    await expect(insert('crm_timesheet', { crm_project: p.id, ...week() }, admin), 'nobody is exempt')
      .rejects.toThrow(`${p.name} is ${label}`);
    expect(await verify.rows('crm_timesheet', { crm_project: p.id })).toEqual([]);
    // The picker does not offer it; a write through the API is caught at submission.
    const exp = await insert('crm_expense', expense(p.id), consultant.token);
    const [reportId] = await submitReport([exp.id], consultant.token);
    await expectTurnedBack(reportId!, 'crm.expense_report_project_over');
  });

  it.each(['completed', 'active'])('a %s project takes a new timesheet and expense, and their submission', async (status) => {
    const p = projects[status]!;
    const sheet = await insert('crm_timesheet', { crm_project: p.id, ...week() }, consultant.token);
    await insert('crm_time_entry', { crm_timesheet: sheet.id, entry_date: sheet.period_start, hours: 1 }, consultant.token);
    await update('crm_timesheet', { id: sheet.id, status: 'submitted' }, consultant.token);
    expect((await row('crm_timesheet', sheet.id)).status).toBe('submitted');
    const exp = await insert('crm_expense', expense(p.id), consultant.token);
    const [reportId] = await submitReport([exp.id], consultant.token);
    expect((await row('crm_expense_report', reportId!)).status).toBe('submitted');
    expect((await row('crm_expense', exp.id)).status).toBe('submitted');
  });

  it('refuses moving a timesheet onto a closed or cancelled project', async () => {
    const sheet = await insert('crm_timesheet', { crm_project: projects.active!.id, ...week() }, consultant.token);
    for (const status of ['closed', 'cancelled']) {
      const p = projects[status]!;
      await expect(update('crm_timesheet', { id: sheet.id, crm_project: p.id }, consultant.token))
        .rejects.toThrow(`${p.name} is ${status === 'closed' ? 'Closed' : 'Cancelled'}, so it takes no new timesheets.`);
    }
    expect((await row('crm_timesheet', sheet.id)).crm_project).toBe(projects.active!.id);
  });

  it('keeps a draft already on a closed project editable and movable, and stops only its submission', async () => {
    const p = projects.closing!;
    await update('crm_timesheet', { id: draftSheet.id, notes: 'Written before the close.' }, consultant.token);
    await update('crm_expense', { id: draftExpense.id, amount: 45 }, consultant.token);
    expect((await row('crm_timesheet', draftSheet.id)).notes).toBe('Written before the close.');
    expect((await row('crm_expense', draftExpense.id)).amount).toBe(45);

    await expect(update('crm_timesheet', { id: draftSheet.id, status: 'submitted' }, consultant.token))
      .rejects.toThrow(`${p.name} is Closed, so this timesheet cannot be submitted.`);
    expect((await row('crm_timesheet', draftSheet.id)).status).toBe('draft');
    const [reportId] = await submitReport([draftExpense.id], consultant.token);
    await expectTurnedBack(reportId!, 'crm.expense_report_project_over');

    // As the notice says: delete the report, move the expense, submit again.
    await verify.hooks.run('crm_expense_report', 'delete', { id: reportId! }, { as: consultant.token });
    await update('crm_expense', { id: draftExpense.id, crm_project: projects.active!.id }, consultant.token);
    const [again] = await submitReport([draftExpense.id], consultant.token);
    expect((await row('crm_expense_report', again!)).crm_project).toBe(projects.active!.id);
    expect((await row('crm_expense', draftExpense.id)).status, 'moved to an open project, it goes on').toBe('submitted');
  });
});
