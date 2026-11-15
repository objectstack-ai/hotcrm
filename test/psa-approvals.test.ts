// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { VerifyStack } from '@objectstack/verify';
import { hotcrmStack, signUpPerson, type Person } from './helpers/verify-stack';
import { REPO_ROOT } from './helpers/repo-root';
import {
  BUDGET_EXCEEDED_PERCENT, BUDGET_WARNING_PERCENT, EXPENSE_FINANCE_REVIEW_AMOUNT, PROJECT_FINANCE_REVIEW_BUDGET,
} from '../src/psa/objects/_thresholds';
import { ProjectInitiationApprovalFlow } from '../src/psa/flows/project-initiation-approval.flow';
import {
  ExpenseApprovalFlow, ExpenseApprovalOnCreateFlow, TimesheetApprovalFlow, TimesheetApprovalOnCreateFlow,
} from '../src/psa/flows/submission-approval.flow';
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
 * - `timesheet_approval` / `expense_approval`: the stamped approver decides,
 *   nobody decides their own, a large expense also goes to finance, and a
 *   recall puts the record back to Draft.
 * - `project_budget_status` / `project_budget_alert`: the signal moves with
 *   approved cost, and its crossing tells the PM and finance once.
 * - `time_entry_locked`: a submission on a locked project is refused, a
 *   draft never is.
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

/** POST a decision on the one open request of a record; returns the HTTP status. */
const act = async (recordId: string, token: string, action: 'approve' | 'reject' | 'recall'): Promise<number> => {
  const [request] = await openRequests(recordId);
  expect(request, `no open approval request on ${recordId}`).toBeTruthy();
  const res = await verify.apiAs(token, 'POST', `/approvals/requests/${request!.id}/${action}`, { comment: `${action} in test.` });
  return res.status;
};

/** A project staffed with the PM and the consultant, through approval and Active (as admin, so no tier is under test). */
const activeProject = async (budget: number): Promise<Rec> => {
  const p = await insert('crm_project', {
    name: `Approvals Rollout ${++k}`, crm_account: account.id, kind: 'delivery', planned_revenue: budget * 2, approved_budget: budget,
  }, pm.token);
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
    await expect(update('crm_project', { id: p.id, status: 'in_approval' }, pm.token)).rejects.toThrow(/Set the Approved Budget/);
    expect(await openRequests(p.id)).toHaveLength(0);
  });

  it('is approved by a Project Director, and then the PM makes it Active', async () => {
    const p = await insert('crm_project', {
      name: `Small Rollout ${++k}`, crm_account: account.id, kind: 'delivery', approved_budget: PROJECT_FINANCE_REVIEW_BUDGET - 1,
    }, pm.token);
    await expect(update('crm_project', { id: p.id, status: 'approved' }, pm.token), 'a person never writes the decision')
      .rejects.toThrow(/approved or rejected by its approver/);
    await update('crm_project', { id: p.id, status: 'in_approval' }, pm.token);
    expect(await openRequests(p.id)).toHaveLength(1);
    await expect(update('crm_project', { id: p.id, description: 'Edited while deciding.' }, pm.token), 'the budget is held while it is decided')
      .rejects.toThrow(/locked while an approval is in progress/);
    expect(await act(p.id, pm.token, 'approve'), 'a project manager is not on the slate').not.toBe(200);
    expect(await act(p.id, director.token, 'approve')).toBe(200);
    expect((await row('crm_project', p.id)).status).toBe('approved');
    await update('crm_project', { id: p.id, status: 'active' }, pm.token);
    expect((await row('crm_project', p.id)).status).toBe('active');
  });

  it(`also needs a Finance Controller at a budget of ${PROJECT_FINANCE_REVIEW_BUDGET}, whose rejection sends it back`, async () => {
    const p = await insert('crm_project', {
      name: `Large Rollout ${++k}`, crm_account: account.id, kind: 'delivery', approved_budget: PROJECT_FINANCE_REVIEW_BUDGET,
    }, pm.token);
    await update('crm_project', { id: p.id, status: 'in_approval' }, pm.token);
    expect(await act(p.id, director.token, 'approve')).toBe(200);
    expect((await row('crm_project', p.id)).status, 'still waiting on finance').toBe('in_approval');
    expect(await act(p.id, finance.token, 'reject')).toBe(200);
    expect((await row('crm_project', p.id)).status).toBe('rejected');
    await update('crm_project', { id: p.id, status: 'draft' }, pm.token);
    expect((await row('crm_project', p.id)).status).toBe('draft');
  });

  it('goes back to Draft when the PM recalls it', async () => {
    const p = await insert('crm_project', {
      name: `Recalled Rollout ${++k}`, crm_account: account.id, kind: 'delivery', approved_budget: 1000,
    }, pm.token);
    await update('crm_project', { id: p.id, status: 'in_approval' }, pm.token);
    expect(await act(p.id, pm.token, 'recall')).toBe(200);
    expect((await row('crm_project', p.id)).status).toBe('draft');
    expect(await openRequests(p.id)).toHaveLength(0);
  });
});

describe('timesheets and expenses (timesheet_approval, expense_approval)', () => {
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

  it(`sends an expense of ${EXPENSE_FINANCE_REVIEW_AMOUNT} or more to finance after the PM, and costs it only then`, async () => {
    expect(ExpenseApprovalFlow.name).toBe('expense_approval');
    const before = num((await row('crm_project', project.id)).actual_expense_cost);
    const exp = await insert('crm_expense', {
      name: `Workshop ${++k}`, crm_project: project.id, expense_date: '2026-10-06', category: 'equipment', amount: EXPENSE_FINANCE_REVIEW_AMOUNT,
    }, consultant.token);
    await update('crm_expense', { id: exp.id, status: 'submitted' }, consultant.token);
    expect(await act(exp.id, pm.token, 'approve')).toBe(200);
    expect((await row('crm_expense', exp.id)).status, 'still waiting on finance').toBe('submitted');
    expect(num((await row('crm_project', project.id)).actual_expense_cost) - before).toBe(0);
    expect(await act(exp.id, finance.token, 'approve')).toBe(200);
    expect((await row('crm_expense', exp.id)).status).toBe('approved');
    expect(num((await row('crm_project', project.id)).actual_expense_cost) - before).toBe(EXPENSE_FINANCE_REVIEW_AMOUNT);
  });

  it('opens the approval for an expense entered already Submitted', async () => {
    expect(ExpenseApprovalOnCreateFlow.name).toBe('expense_approval_on_create');
    const exp = await insert('crm_expense', {
      name: `Taxi ${++k}`, crm_project: project.id, expense_date: '2026-10-07', category: 'travel', amount: 40, status: 'submitted',
    }, consultant.token);
    expect(await openRequests(exp.id)).toHaveLength(1);
    expect(await act(exp.id, pm.token, 'approve')).toBe(200);
    expect((await row('crm_expense', exp.id)).status).toBe('approved');
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

  it('moves Budget Status when finance raises the budget', async () => {
    // Approved Budget is read-only from In Approval on to people (`readonlyWhen`),
    // so the raise is the system's write here, as an approved budget change will be.
    await verify.hooks.run('crm_project', 'update', { id: project.id, approved_budget: 4000 }, { as: admin });
    expect((await row('crm_project', project.id)).budget_status).toBe('on_track');
  });

  it('refuses a submission on a locked project, never a draft, and takes it again once unlocked', async () => {
    await update('crm_project', { id: project.id, time_entry_locked: true }, pm.token);
    const sheet = await insert('crm_timesheet', { crm_project: project.id, period_start: '2026-09-28', period_end: '2026-10-04' }, consultant.token);
    await insert('crm_time_entry', { crm_timesheet: sheet.id, entry_date: '2026-09-28', hours: 1 }, consultant.token);
    await expect(update('crm_timesheet', { id: sheet.id, status: 'submitted' }, consultant.token))
      .rejects.toThrow(/locked for time and expenses/);
    const exp = await insert('crm_expense', {
      name: `Hotel ${++k}`, crm_project: project.id, expense_date: '2026-09-29', category: 'lodging', amount: 90,
    }, consultant.token);
    await expect(update('crm_expense', { id: exp.id, status: 'submitted' }, consultant.token))
      .rejects.toThrow(/locked for time and expenses/);
    await expect(update('crm_timesheet', { id: sheet.id, status: 'submitted' }, admin), 'nobody is exempt')
      .rejects.toThrow(/locked for time and expenses/);

    await update('crm_project', { id: project.id, time_entry_locked: false }, pm.token);
    await update('crm_timesheet', { id: sheet.id, status: 'submitted' }, consultant.token);
    expect((await row('crm_timesheet', sheet.id)).status).toBe('submitted');
  });
});
