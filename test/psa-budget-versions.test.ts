// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { VerifyStack } from '@objectstack/verify';
import { hotcrmStack, signUpPerson, type Person } from './helpers/verify-stack';
import { REPO_ROOT } from './helpers/repo-root';
import { BUDGET_TOP_UP_FINANCE_REVIEW_PERCENT } from '../src/psa/objects/_thresholds';
import { HOURS_PER_DAY } from '../src/psa/objects/_psa-picklists';
import { ProjectBudgetApprovalFlow } from '../src/psa/flows/project-budget-approval.flow';
import { projectBudgets } from '../src/psa/data/psa.seed';

type Rec = Record<string, any>;

/**
 * Project budget versions, PSA phase 2c (hotcrm#2547), on the shipped app
 * booted by `@objectstack/verify`, through the real doors (record writes as
 * the people, `POST /approvals/requests/{id}/…`).
 *
 * - `project_budget_rules`: a version is numbered and named, one is open per
 *   project, a person's starts as Draft, the decision is the approval's,
 *   version 1 goes with the project, a top-up is complete and has a reason
 *   before it is sent, and only an open version is deleted.
 * - `project_budget_follow` + `project_initiation_approval`: version 1 rides
 *   on the project's approval, back to Draft when the project is rejected.
 * - `project_budget_approval` + `project_budget_baseline`: a top-up goes to
 *   the Project Director or PMO, and also to a Finance Controller when it
 *   raises the baseline by BUDGET_TOP_UP_FINANCE_REVIEW_PERCENT or more; the
 *   version approved becomes the one baseline, and the project's Approved
 *   Budget (a summary over it) follows.
 * - `project_budget_line_amount`: a line's month, unit cost and amount, and
 *   the lock on a sent version's lines.
 */

let verify: VerifyStack;
let admin: string;
let pm: Person;
let consultant: Person;
let director: Person;
let finance: Person;
let account: Rec;
let hourly: Rec;
let daily: Rec;
let k = 0;

const insert = (object: string, doc: Rec, as: string): Promise<Rec> => verify.hooks.run(object, 'insert', doc, { as });
const update = (object: string, doc: Rec, as: string): Promise<Rec> => verify.hooks.run(object, 'update', doc, { as });
const remove = (object: string, id: string, as: string): Promise<unknown> => verify.hooks.run(object, 'delete', { id }, { as });
const row = async (object: string, id: string, as?: string): Promise<Rec | undefined> =>
  (await verify.rows(object, { id }, as ? { as } : undefined))[0];
const num = (v: unknown): number => Number(v ?? 0);
const openRequests = (id: string): Promise<Rec[]> => verify.rows('sys_approval_request', { record_id: id, status: 'pending' });
const versionsOf = async (projectId: string): Promise<Rec[]> =>
  (await verify.rows('crm_project_budget', { crm_project: projectId })).sort((a, b) => num(a.version) - num(b.version));

/** POST a decision on the one open request of a record; returns the HTTP status. */
const act = async (recordId: string, token: string, action: 'approve' | 'reject' | 'recall'): Promise<number> => {
  const [request] = await openRequests(recordId);
  expect(request, `no open approval request on ${recordId}`).toBeTruthy();
  const res = await verify.apiAs(token, 'POST', `/approvals/requests/${request!.id}/${action}`, { comment: `${action} in test.` });
  return res.status;
};

/** A version's one `other` line of `amount`, so its total is `amount`. */
const flatLine = (budgetId: string, amount: number, as: string): Promise<Rec> =>
  insert('crm_project_budget_line', { crm_project_budget: budgetId, category: 'other', description: 'Delivery', quantity: 1, unit_cost: amount }, as);

/** A Draft project with its version 1 of `amount`. */
const plannedProject = async (amount: number): Promise<{ project: Rec; v1: Rec }> => {
  const project = await insert('crm_project', { name: `Budget Rollout ${++k}`, crm_account: account.id, kind: 'delivery' }, pm.token);
  const v1 = await insert('crm_project_budget', { crm_project: project.id }, pm.token);
  await flatLine(v1.id, amount, pm.token);
  return { project, v1 };
};

/** A project approved by the director with its version 1 of `amount` as the baseline (under the finance threshold). */
const approvedProject = async (amount: number): Promise<{ project: Rec; v1: Rec }> => {
  const planned = await plannedProject(amount);
  await update('crm_project', { id: planned.project.id, status: 'in_approval' }, pm.token);
  expect(await act(planned.project.id, director.token, 'approve')).toBe(200);
  return planned;
};

beforeAll(async () => {
  verify = await hotcrmStack();
  admin = await verify.signIn();
  pm = await signUpPerson(verify, 'pm@psa-budgets.test', {
    name: 'Budgets PM', positions: ['crm_project_manager'], permissionSets: ['project_manager'],
  });
  consultant = await signUpPerson(verify, 'consultant@psa-budgets.test', {
    name: 'Budgets Consultant', positions: ['crm_project_member'], permissionSets: ['project_member'],
  });
  director = await signUpPerson(verify, 'director@psa-budgets.test', {
    name: 'Budgets Director', positions: ['crm_project_director'], permissionSets: ['project_manager', 'finance_controller'],
  });
  finance = await signUpPerson(verify, 'finance@psa-budgets.test', {
    name: 'Budgets Finance', positions: ['crm_finance_controller'], permissionSets: ['finance_controller'],
  });
  [account] = await verify.rows('crm_account', {});
  hourly = await insert('crm_rate_card', { name: `Budget Consultant ${++k}`, seniority: 'senior', unit: 'hour', cost_rate: 60, bill_rate: 120 }, finance.token);
  daily = await insert('crm_rate_card', { name: `Budget Architect ${++k}`, seniority: 'lead', unit: 'day', cost_rate: 900, bill_rate: 1800 }, finance.token);
}, 120_000);

describe('the threshold and the readiness copies', () => {
  it(`sends a top-up of ${BUDGET_TOP_UP_FINANCE_REVIEW_PERCENT}% or more to finance, from the named constant`, () => {
    expect(BUDGET_TOP_UP_FINANCE_REVIEW_PERCENT).toBe(10);
    const edges = ProjectBudgetApprovalFlow.edges.filter((e) => e.source === 'check_raise');
    const text = JSON.stringify(edges);
    expect(text).toContain(`>= ${BUDGET_TOP_UP_FINANCE_REVIEW_PERCENT} * vars.projectRecord.approved_budget`);
    expect(text).toContain(`< ${BUDGET_TOP_UP_FINANCE_REVIEW_PERCENT} * vars.projectRecord.approved_budget`);
  });

  it('asks the same readiness of version 1 (project_status_guard) as of a top-up (project_budget_rules)', () => {
    const block = (file: string): string => {
      const body = readFileSync(join(REPO_ROOT, file), 'utf8');
      const start = body.indexOf("if (lines.length === 0) problem = 'it has no lines.';");
      const end = body.indexOf("problem = 'its total is zero.';", start);
      expect(start, `${file} holds the readiness check`).toBeGreaterThan(0);
      return body.slice(start, end).replace(/\s+/g, ' ');
    };
    expect(block('src/psa/objects/project.hook.ts')).toBe(block('src/psa/objects/project_budget.hook.ts'));
  });

  it('counts a day card as HOURS_PER_DAY hours in project_budget_line_amount', () => {
    const body = readFileSync(join(REPO_ROOT, 'src/psa/objects/project_budget.hook.ts'), 'utf8');
    expect(body).toContain(`const HOURS_PER_DAY = ${HOURS_PER_DAY};`);
  });
});

describe('the seeded budgets', () => {
  const project = async (name: string): Promise<Rec> => (await verify.rows('crm_project', { name }))[0]!;

  it('give each project its Approved Budget from the baseline version, and Wayne a superseded version 1', async () => {
    expect(projectBudgets.records.length).toBe(8);
    expect(num((await project('Stark Medical Pilot Delivery')).approved_budget)).toBe(78000);
    expect(num((await project('Vertex Developer Platform Onboarding')).approved_budget)).toBe(36000);
    expect(num((await project('Initech Phase 1 Delivery')).approved_budget)).toBe(60000);
    const wayne = await project('Wayne Operations Module Rollout');
    expect(num(wayne.approved_budget)).toBe(165000);
    const [v1, v2] = await versionsOf(wayne.id);
    expect([num(v1!.version), num(v2!.version)], 'the seed keeps its version numbers').toEqual([1, 2]);
    expect([v1!.status, v1!.is_baseline, num(v1!.total_cost)]).toEqual(['superseded', false, 150000]);
    expect([v2!.status, v2!.is_baseline, num(v2!.total_cost)]).toEqual(['approved', true, 165000]);
  });

  it('leave a ready top-up in Draft on Stark, and the draft project its draft version 1', async () => {
    const [, stark2] = await versionsOf((await project('Stark Medical Pilot Delivery')).id);
    expect([stark2!.status, num(stark2!.total_cost), num(stark2!.labor_hours)]).toEqual(['draft', 85800, 1080]);
    const internal = await project('Delivery Practice Enablement');
    expect(num(internal.approved_budget), 'nothing approved yet').toBe(0);
    const [v1] = await versionsOf(internal.id);
    expect([v1!.status, num(v1!.total_cost)]).toEqual(['draft', 15000]);
  });
});

describe('a version (project_budget_rules)', () => {
  it('is numbered and named, starts as Draft, and is the only open one on its project', async () => {
    const { project, v1 } = await plannedProject(1000);
    const stored = (await row('crm_project_budget', v1.id))!;
    expect([num(stored.version), stored.name, stored.status]).toEqual([1, `${project.name} · v1`, 'draft']);
    await expect(insert('crm_project_budget', { crm_project: project.id }, pm.token))
      .rejects.toThrow(/already has an open budget version \(version 1\)/);
    await remove('crm_project_budget', v1.id, pm.token);
    await expect(insert('crm_project_budget', { crm_project: project.id, status: 'approved' }, pm.token))
      .rejects.toThrow(/starts as Draft/);
    const again = await insert('crm_project_budget', { crm_project: project.id }, pm.token);
    expect(num((await row('crm_project_budget', again.id))!.version), 'numbers follow the versions left').toBe(1);
  });

  it('is never decided by a person, and an approved one is not deleted', async () => {
    const { v1 } = await approvedProject(1000);
    await expect(update('crm_project_budget', { id: v1.id, status: 'superseded' }, finance.token)).rejects.toThrow(/approved or rejected by its approver/);
    await expect(remove('crm_project_budget', v1.id, pm.token)).rejects.toThrow(/Only an open budget version/);
    expect((await row('crm_project_budget', v1.id))!.status).toBe('approved');
  });

  it('is cost, so a team member does not read it', async () => {
    const { project, v1 } = await plannedProject(1000);
    await insert('crm_project_member', { crm_project: project.id, person: consultant.id, responsibility: 'consultant', rate_card: hourly.id }, pm.token);
    expect(await row('crm_project', project.id, consultant.token), 'the member reads the project').toBeTruthy();
    await expect(verify.rows('crm_project_budget', { id: v1.id }, { as: consultant.token }), 'no grant on the object')
      .rejects.toThrow(/permission/);
    expect(await row('crm_project_budget', v1.id, finance.token), 'finance reads every version').toBeTruthy();
  });
});

describe('a line (project_budget_line_amount)', () => {
  it('costs labor at its rate card per hour, keeps a typed unit cost, and plans by month', async () => {
    const { v1 } = await plannedProject(500);
    const a = await insert('crm_project_budget_line', {
      crm_project_budget: v1.id, category: 'labor', description: 'Build', rate_card: hourly.id, hours: 10, period: '2026-12-17',
    }, pm.token);
    const b = await insert('crm_project_budget_line', {
      crm_project_budget: v1.id, category: 'labor', description: 'Design', rate_card: daily.id, hours: 8,
    }, pm.token);
    const c = await insert('crm_project_budget_line', {
      crm_project_budget: v1.id, category: 'labor', description: 'Review', rate_card: hourly.id, hours: 2, unit_cost: 75,
    }, pm.token);
    const la = (await row('crm_project_budget_line', a.id))!;
    expect([num(la.unit_cost), num(la.amount), String(la.period).slice(0, 10)]).toEqual([60, 600, '2026-12-01']);
    const lb = (await row('crm_project_budget_line', b.id))!;
    expect([num(lb.unit_cost), num(lb.amount)]).toEqual([900 / HOURS_PER_DAY, 900]);
    expect(num((await row('crm_project_budget_line', c.id))!.amount), 'a typed unit cost is kept').toBe(150);
    const version = (await row('crm_project_budget', v1.id))!;
    expect([num(version.total_cost), num(version.labor_cost), num(version.labor_hours)]).toEqual([2150, 1650, 20]);
  });
});

describe('version 1 rides on the project (project_budget_follow, project_initiation_approval, project_status_guard)', () => {
  it('is sent only with the project, and only when complete', async () => {
    const { project, v1 } = await plannedProject(1000);
    await expect(update('crm_project_budget', { id: v1.id, status: 'in_approval' }, pm.token)).rejects.toThrow(/approved with the project/);
    const loose = await insert('crm_project_budget_line', { crm_project_budget: v1.id, category: 'labor', description: 'Loose', hours: 4 }, pm.token);
    await expect(update('crm_project', { id: project.id, status: 'in_approval' }, pm.token))
      .rejects.toThrow(/not ready to approve: the labor line "Loose" names no rate card/);
    await remove('crm_project_budget_line', loose.id, pm.token);
    await update('crm_project', { id: project.id, status: 'in_approval' }, pm.token);
    const riding = (await row('crm_project_budget', v1.id))!;
    expect([riding.status, riding.with_initiation]).toEqual(['in_approval', true]);
    expect(await openRequests(v1.id), 'no approval of its own').toHaveLength(0);
    await expect(flatLine(v1.id, 50, pm.token), 'its lines are held while it is decided').rejects.toThrow(/cannot change/);
  });

  it('goes back to Draft when the project is rejected, and becomes the baseline when it is approved', async () => {
    const { project, v1 } = await plannedProject(2000);
    await update('crm_project', { id: project.id, status: 'in_approval' }, pm.token);
    expect(await act(project.id, director.token, 'reject')).toBe(200);
    const back = (await row('crm_project_budget', v1.id))!;
    expect([back.status, back.with_initiation]).toEqual(['draft', false]);
    await flatLine(v1.id, 500, pm.token);
    await update('crm_project', { id: project.id, status: 'draft' }, pm.token);
    await update('crm_project', { id: project.id, status: 'in_approval' }, pm.token);
    expect(await act(project.id, director.token, 'approve')).toBe(200);
    const baseline = (await row('crm_project_budget', v1.id))!;
    expect([baseline.status, baseline.is_baseline]).toEqual(['approved', true]);
    const approved = (await row('crm_project', project.id))!;
    expect([approved.status, num(approved.approved_budget)]).toEqual(['approved', 2500]);
  });
});

describe('a top-up (project_budget_approval, project_budget_baseline)', () => {
  it(`under ${BUDGET_TOP_UP_FINANCE_REVIEW_PERCENT}% needs a reason and a Project Director, and supersedes the baseline`, async () => {
    expect(ProjectBudgetApprovalFlow.name).toBe('project_budget_approval');
    const { project, v1 } = await approvedProject(10000);
    const v2 = await insert('crm_project_budget', { crm_project: project.id }, pm.token);
    expect(num((await row('crm_project_budget', v2.id))!.version)).toBe(2);
    await flatLine(v2.id, 10999, pm.token);
    await expect(update('crm_project_budget', { id: v2.id, status: 'in_approval' }, pm.token)).rejects.toThrow(/Say why this top-up is needed/);
    await update('crm_project_budget', { id: v2.id, reason: 'One more workshop.', status: 'in_approval' }, pm.token);
    expect(await act(v2.id, pm.token, 'approve'), 'the PM asking is not on the slate').not.toBe(200);
    expect(await act(v2.id, director.token, 'approve')).toBe(200);
    expect(await openRequests(v2.id), 'under the threshold: no finance step').toHaveLength(0);
    const [first, second] = await versionsOf(project.id);
    expect([first!.id, first!.status, first!.is_baseline]).toEqual([v1.id, 'superseded', false]);
    expect([second!.status, second!.is_baseline]).toEqual(['approved', true]);
    expect(num((await row('crm_project', project.id))!.approved_budget)).toBe(10999);
  });

  it(`of ${BUDGET_TOP_UP_FINANCE_REVIEW_PERCENT}% or more also needs a Finance Controller, whose rejection leaves the baseline`, async () => {
    const { project } = await approvedProject(10000);
    const v2 = await insert('crm_project_budget', { crm_project: project.id, reason: 'A fourth site.' }, pm.token);
    await flatLine(v2.id, 11000, pm.token);
    await update('crm_project_budget', { id: v2.id, status: 'in_approval' }, pm.token);
    expect(await act(v2.id, director.token, 'approve')).toBe(200);
    expect((await row('crm_project_budget', v2.id))!.status, 'still waiting on finance').toBe('in_approval');
    expect(await act(v2.id, finance.token, 'reject')).toBe(200);
    expect((await row('crm_project_budget', v2.id))!.status).toBe('rejected');
    expect(num((await row('crm_project', project.id))!.approved_budget), 'the baseline stands').toBe(10000);

    await update('crm_project_budget', { id: v2.id, status: 'draft' }, pm.token);
    await update('crm_project_budget', { id: v2.id, status: 'in_approval' }, pm.token);
    expect(await act(v2.id, director.token, 'approve')).toBe(200);
    expect(await act(v2.id, finance.token, 'approve')).toBe(200);
    const versions = await versionsOf(project.id);
    expect(versions.filter((v) => v.is_baseline), 'exactly one baseline').toHaveLength(1);
    expect(num((await row('crm_project', project.id))!.approved_budget)).toBe(11000);
  });

  it('goes back to Draft when the PM recalls it', async () => {
    const { project } = await approvedProject(1000);
    const v2 = await insert('crm_project_budget', { crm_project: project.id, reason: 'Recalled in test.' }, pm.token);
    await flatLine(v2.id, 1050, pm.token);
    await update('crm_project_budget', { id: v2.id, status: 'in_approval' }, pm.token);
    expect(await act(v2.id, pm.token, 'recall')).toBe(200);
    expect((await row('crm_project_budget', v2.id))!.status).toBe('draft');
    expect(await openRequests(v2.id)).toHaveLength(0);
  });

  it('is carried over for a project from before versions, as the backfill writes it (an administrator\'s REST writes)', async () => {
    const legacy = await verify.hooks.run('crm_project', 'insert', {
      name: `Legacy Rollout ${++k}`, crm_account: account.id, kind: 'delivery', status: 'active',
    }, { system: true });
    const idOf = async (res: Response): Promise<string> => {
      const body = await res.json() as Rec;
      expect(res.status, JSON.stringify(body)).toBeLessThan(300);
      return String((body.record ?? body.data ?? body).id);
    };
    const versionId = await idOf(await verify.apiAs(admin, 'POST', '/data/crm_project_budget', {
      crm_project: legacy.id, status: 'approved', notes: 'Carried over.',
    }));
    await idOf(await verify.apiAs(admin, 'POST', '/data/crm_project_budget_line', {
      crm_project_budget: versionId, category: 'other', description: 'Approved Budget carried over', quantity: 1, unit_cost: 42000,
    }));
    const version = (await row('crm_project_budget', versionId))!;
    expect([version.status, version.is_baseline, num(version.version)]).toEqual(['approved', true, 1]);
    expect(num((await row('crm_project', legacy.id))!.approved_budget)).toBe(42000);
  });

  it('is how the Approved Budget changes: it is never typed', async () => {
    const { project } = await approvedProject(1000);
    await update('crm_project', { id: project.id, approved_budget: 99999 }, admin).catch(() => undefined);
    expect(num((await row('crm_project', project.id))!.approved_budget)).toBe(1000);
  });
});
