// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import { bootStack, type BootOptions, type VerifyStack } from '@objectstack/verify';
import { ApprovalsServicePlugin } from '@objectstack/plugin-approvals';
import artifact from '../objectstack.config';
import { bootOptions, buildArtifactAgain, flowRuns, hotcrmStack, signUpPerson, type Person } from './helpers/verify-stack';

type Rec = Record<string, any>;

/**
 * Timesheet and expense approval NEEDS the `approvals` capability (hotcrm#2570).
 *
 * A timesheet set to Submitted, and an expense report that Submit for
 * Reimbursement sends on a project, move on only through an `approval` node
 * (`timesheet_approval`, `expense_report_project_approval`), and the hooks
 * refuse a person who writes Approved or Rejected by hand, administrators
 * excepted. The maintainer ruled (#2570, option C, 2026-11-18) that the app
 * does not grow a second path for a deployment without approvals: every
 * package `requires` the capability, and every hosted plan mounts it
 * (objectstack#35069, cloud#4845). So the published page and the handbook say
 * the approval needs it, and what an administrator does where it is missing.
 *
 * This file boots both compositions, as `account-approval-gate.test.ts` does
 * for accounts (#2075), and pins each half:
 *
 *   - WITH approvals, a submission opens one request for the project's
 *     Project Manager, whose decision approves it and moves the project's cost.
 *   - WITHOUT approvals, the submission saves and the record reads Submitted;
 *     the flow run fails at its approval node, nobody is asked, the cost does
 *     not move, and the Project Manager who tries to decide by hand is refused
 *     with a message that sends them to an Inbox this deployment does not
 *     have. Only an administrator moves it on, by setting the status, and the
 *     cost then follows. That is the repair the docs name.
 *
 * The full behaviour on the composition with approvals (tiers, recall, the
 * lock, a closed project) stays in `psa-approvals.test.ts`.
 */

/**
 * The composition WITHOUT approvals: the app's own boot minus
 * `ApprovalsServicePlugin`, and `approvals` dropped from every package's
 * `requires` (`bootStack` mounts the provider of each required capability, as
 * `objectstack serve` does), from a fresh build of the configuration because
 * one configuration object holds one live kernel. Same construction as
 * `account-approval-gate.test.ts`.
 */
const APP_BOOT = bootOptions();
const WITHOUT_APPROVALS_BOOT: BootOptions = {
  ...APP_BOOT,
  extraPlugins: (APP_BOOT.extraPlugins ?? []).filter((p) => !(p instanceof ApprovalsServicePlugin)),
};
const withoutApprovals = (base: typeof artifact): typeof artifact => {
  const a = base as unknown as Rec;
  return {
    ...a,
    packages: (a.packages as Rec[]).map((p) => ({
      ...p,
      manifest: { ...p.manifest, requires: ((p.manifest.requires ?? []) as string[]).filter((token) => token !== 'approvals') },
    })),
  } as typeof artifact;
};

/** One delivery team on one stack: a Draft project the PM and a consultant are staffed on. */
interface Team {
  s: VerifyStack;
  admin: string;
  pm: Person;
  consultant: Person;
  project: Rec;
}

let k = 0;

const team = async (s: VerifyStack, tag: string): Promise<Team> => {
  const admin = await s.signIn();
  const pm = await signUpPerson(s, `pm-${tag}@psa-approvals-composition.test`, {
    name: 'Composition PM', positions: ['crm_project_manager'], permissionSets: ['project_manager'],
  });
  const consultant = await signUpPerson(s, `consultant-${tag}@psa-approvals-composition.test`, {
    name: 'Composition Consultant', positions: ['crm_project_member'], permissionSets: ['project_member'],
  });
  const finance = await signUpPerson(s, `finance-${tag}@psa-approvals-composition.test`, {
    name: 'Composition Finance', positions: ['crm_finance_controller'], permissionSets: ['finance_controller'],
  });
  const [account] = await s.rows('crm_account', {});
  const card = await s.hooks.run('crm_rate_card', 'insert', {
    name: `Composition Consultant ${tag} ${++k}`, seniority: 'senior', unit: 'hour', cost_rate: 50, bill_rate: 100,
  }, { as: finance.token });
  // A Draft project takes time and spend; nothing below needs it approved,
  // which on the composition without approvals it could not be.
  const project = await s.hooks.run('crm_project', 'insert', {
    name: `Composition Rollout ${tag} ${++k}`, crm_account: account!.id, kind: 'delivery',
  }, { as: pm.token });
  for (const [person, responsibility] of [[pm, 'project_manager'], [consultant, 'consultant']] as const) {
    await s.hooks.run('crm_project_member', 'insert', {
      crm_project: project.id, person: person.id, responsibility, rate_card: card.id,
    }, { as: pm.token });
  }
  return { s, admin, pm, consultant, project };
};

const row = async (s: VerifyStack, object: string, id: string): Promise<Rec> => (await s.rows(object, { id }))[0]!;
const cost = async (t: Team, field: 'actual_labor_cost' | 'actual_expense_cost'): Promise<number> =>
  Number((await row(t.s, 'crm_project', t.project.id))[field] ?? 0);

/** The consultant's timesheet of 8 hours (cost 400), set to Submitted by the consultant. */
const submittedTimesheet = async (t: Team, start: string): Promise<Rec> => {
  const end = new Date(Date.parse(`${start}T00:00:00Z`) + 6 * 86_400_000).toISOString().slice(0, 10);
  const sheet = await t.s.hooks.run('crm_timesheet', 'insert', { crm_project: t.project.id, period_start: start, period_end: end }, { as: t.consultant.token });
  await t.s.hooks.run('crm_time_entry', 'insert', { crm_timesheet: sheet.id, entry_date: start, hours: 8, is_billable: true }, { as: t.consultant.token });
  await t.s.hooks.run('crm_timesheet', 'update', { id: sheet.id, status: 'submitted' }, { as: t.consultant.token });
  return sheet;
};

/** One expense of 500 on the project, sent by Submit for Reimbursement: the report it made. */
const submittedReport = async (t: Team): Promise<{ reportId: string; expenseId: string }> => {
  const expense = await t.s.hooks.run('crm_expense', 'insert', {
    name: `Workshop ${++k}`, crm_project: t.project.id, expense_date: '2026-10-06', category: 'equipment', amount: 500,
  }, { as: t.consultant.token });
  const result = (await t.s.actions.run('crm_expense', 'submit_for_reimbursement', {
    as: t.consultant.token, params: { _selectedIds: [expense.id] },
  })) as Rec;
  const reports = result.reports as string[];
  expect(reports, 'one project, one report').toHaveLength(1);
  return { reportId: reports[0]!, expenseId: String(expense.id) };
};

describe('WITH approvals in the composition — a submission reaches its approver', () => {
  let t: Team;
  const openRequests = (id: string): Promise<Rec[]> => t.s.rows('sys_approval_request', { record_id: id, status: 'pending' });
  const decide = async (id: string, token: string): Promise<number> => {
    const [request] = await openRequests(id);
    expect(request, `no open approval request on ${id}`).toBeTruthy();
    return (await t.s.apiAs(token, 'POST', `/approvals/requests/${request!.id}/approve`, { comment: 'approved.' })).status;
  };
  beforeAll(async () => {
    t = await team(await hotcrmStack(), 'with');
  }, 120_000);

  it('a submitted timesheet opens one request, which the Project Manager approves into the project\'s labor cost', async () => {
    const before = await cost(t, 'actual_labor_cost');
    const sheet = await submittedTimesheet(t, '2026-10-05');
    expect((await row(t.s, 'crm_timesheet', sheet.id)).status).toBe('submitted');
    expect(await openRequests(sheet.id), 'the timesheet is not in the approval inbox').toHaveLength(1);
    expect(await decide(sheet.id, t.pm.token)).toBe(200);
    expect((await row(t.s, 'crm_timesheet', sheet.id)).status).toBe('approved');
    expect(await cost(t, 'actual_labor_cost') - before).toBe(400);
  });

  it('a submitted expense report opens one request, which the Project Manager approves into the project\'s expense cost', async () => {
    const before = await cost(t, 'actual_expense_cost');
    const { reportId, expenseId } = await submittedReport(t);
    expect((await row(t.s, 'crm_expense_report', reportId)).status).toBe('submitted');
    expect(await openRequests(reportId), 'the report is not in the approval inbox').toHaveLength(1);
    expect(await decide(reportId, t.pm.token)).toBe(200);
    expect((await row(t.s, 'crm_expense_report', reportId)).status).toBe('approved');
    expect((await row(t.s, 'crm_expense', expenseId)).status).toBe('approved');
    expect(await cost(t, 'actual_expense_cost') - before).toBe(500);
  });
});

describe('WITHOUT approvals in the composition — a submission waits until an administrator decides (#2570)', () => {
  let t: Team;
  beforeAll(async () => {
    t = await team(await bootStack(withoutApprovals(await buildArtifactAgain()), WITHOUT_APPROVALS_BOOT), 'without');
  }, 180_000);

  it('this boot really carries no approval engine', () => {
    // Guard the guard: with the engine present every assertion below would be
    // about the other composition.
    expect(t.s.metadata.object('sys_approval_request')).toBeUndefined();
  });

  /** A person's hand-set decision through the console's door: PATCH the record's status. */
  const setStatus = (object: string, id: string, status: string, token: string): Promise<Response> =>
    t.s.apiAs(token, 'PATCH', `/data/${object}/${id}`, { status });

  /**
   * What the person deciding by hand is told: 403 FORBIDDEN, sending them to
   * an Inbox this deployment does not have (the console hides it: its nav item
   * requires `sys_approval_request`). Pinned on purpose: this refusal is the
   * subject of #2570, and the docs say what to do instead.
   */
  const expectSentToInbox = async (res: Response, message: string): Promise<void> => {
    const body: Rec = await res.json();
    expect(res.status).toBe(403);
    expect(body.code).toBe('FORBIDDEN');
    expect(body.userMessage).toBe(message);
  };

  /** The submission's one flow run: failed at its approval node, for want of an executor. */
  const expectFailedAtApproval = async (flow: string, id: string): Promise<void> => {
    const runs = await flowRuns(t.s, flow, id);
    expect(runs.map((r) => [r.status, r.node_id]), `${flow} on ${id}`).toEqual([['failed', 'approver_review']]);
    const steps = JSON.parse(String(runs[0]!.steps_json)) as Rec[];
    expect(steps.at(-1)).toMatchObject({ nodeType: 'approval', status: 'failure', error: { code: 'NO_EXECUTOR' } });
  };

  it('a submitted timesheet saves and reads Submitted, its approval fails, and the project\'s labor cost does not move', async () => {
    const before = await cost(t, 'actual_labor_cost');
    // The submitter's save answers as an ordinary success: nothing tells them
    // that nobody was asked.
    const sheet = await submittedTimesheet(t, '2026-10-05');
    expect((await row(t.s, 'crm_timesheet', sheet.id))).toMatchObject({ status: 'submitted', approver: t.pm.id });
    await expectFailedAtApproval('timesheet_approval', sheet.id);
    expect(await cost(t, 'actual_labor_cost') - before).toBe(0);

    // The Project Manager, the approver the handbook names, cannot decide it.
    await expectSentToInbox(await setStatus('crm_timesheet', sheet.id, 'approved', t.pm.token),
      'A timesheet is approved or rejected by its approver, from their Inbox, once it is submitted.');
    expect((await row(t.s, 'crm_timesheet', sheet.id)).status, 'still waiting, with nobody asked').toBe('submitted');

    // The repair the docs name: an administrator sets the status, and the cost follows.
    const res = await setStatus('crm_timesheet', sheet.id, 'approved', t.admin);
    expect(res.status, await res.clone().text()).toBe(200);
    expect((await row(t.s, 'crm_timesheet', sheet.id)).status).toBe('approved');
    expect(await cost(t, 'actual_labor_cost') - before).toBe(400);
  });

  it('a submitted expense report saves and reads Submitted, its approval fails, and the project\'s expense cost does not move', async () => {
    const before = await cost(t, 'actual_expense_cost');
    const { reportId, expenseId } = await submittedReport(t);
    expect((await row(t.s, 'crm_expense_report', reportId))).toMatchObject({ status: 'submitted', approver: t.pm.id });
    expect((await row(t.s, 'crm_expense', expenseId)).status).toBe('submitted');
    await expectFailedAtApproval('expense_report_project_approval', reportId);
    expect(await cost(t, 'actual_expense_cost') - before).toBe(0);

    await expectSentToInbox(await setStatus('crm_expense_report', reportId, 'approved', t.pm.token),
      'An expense report is approved or rejected by its approvers, from their Inbox, once it is submitted.');
    expect((await row(t.s, 'crm_expense_report', reportId)).status).toBe('submitted');

    // An administrator approves the report; its expenses follow, and the cost with them.
    const res = await setStatus('crm_expense_report', reportId, 'approved', t.admin);
    expect(res.status, await res.clone().text()).toBe(200);
    expect((await row(t.s, 'crm_expense_report', reportId)).status).toBe('approved');
    expect((await row(t.s, 'crm_expense', expenseId)).status).toBe('approved');
    expect(await cost(t, 'actual_expense_cost') - before).toBe(500);
  });

  it('a project sent In Approval waits there the same way, until an administrator approves it with its budget', async () => {
    const p = await t.s.hooks.run('crm_project', 'insert', {
      name: `Composition Initiation ${++k}`, crm_account: t.project.crm_account, kind: 'delivery',
    }, { as: t.pm.token });
    const version = await t.s.hooks.run('crm_project_budget', 'insert', { crm_project: p.id }, { as: t.pm.token });
    await t.s.hooks.run('crm_project_budget_line', 'insert', {
      crm_project_budget: version.id, category: 'other', description: 'Delivery', quantity: 1, unit_cost: 1000,
    }, { as: t.pm.token });
    await t.s.hooks.run('crm_project', 'update', { id: p.id, status: 'in_approval' }, { as: t.pm.token });
    expect((await row(t.s, 'crm_project', p.id)).status).toBe('in_approval');
    const runs = await flowRuns(t.s, 'project_initiation_approval', p.id);
    expect(runs.map((r) => r.status)).toEqual(['failed']);

    const res = await setStatus('crm_project', p.id, 'approved', t.admin);
    expect(res.status, await res.clone().text()).toBe(200);
    const approved = await row(t.s, 'crm_project', p.id);
    expect(approved.status).toBe('approved');
    expect(Number(approved.approved_budget ?? 0), 'its version 1 rides along').toBe(1000);
  });
});
