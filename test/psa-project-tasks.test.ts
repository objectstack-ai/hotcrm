// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { hotcrmStack, signUpPerson, predicateUpdate, type Person } from './helpers/verify-stack';
import { ProjectTask } from '../src/psa/objects/project_task.object';

type Rec = Record<string, any>;

/**
 * Project tasks (hotcrm#2545, PSA phase 2a), on the shipped app booted by
 * `@objectstack/verify`, driven as the people who plan and staff a project.
 *
 * - The project's Percent Complete is computed from its tasks with no
 *   subtasks, weighted by planned hours, cancelled ones left out, Completed
 *   counted as 100 (`project_task_progress`); people cannot type it.
 * - A task's Actual Hours sums the time entries booked against it.
 * - The tree and the predecessors stay inside one project, with no loop
 *   (`project_task_rules`); a time entry names a task of its own project.
 * - The project manager writes the plan; the team reads it (ruling D).
 */

let verify: VerifyStack;
let admin: string;
let pm: Person;
let consultant: Person;
let outsider: Person;
let account: Rec;
let rate: Rec;
let project: Rec;
let other: Rec;
let k = 0;

const insert = (object: string, doc: Rec, as: string): Promise<Rec> => verify.hooks.run(object, 'insert', doc, { as });
const update = (object: string, doc: Rec, as: string): Promise<Rec> => verify.hooks.run(object, 'update', doc, { as });
const row = async (object: string, id: string, as?: string): Promise<Rec | undefined> =>
  (await verify.rows(object, { id }, as ? { as } : undefined))[0];
const percent = async (id: string): Promise<number | null> => {
  const v = (await row('crm_project', id))!.percent_complete;
  return v == null ? null : Number(v);
};
const refusal = (err: unknown): Rec => err as Rec;

beforeAll(async () => {
  verify = await hotcrmStack();
  admin = await verify.signIn();
  pm = await signUpPerson(verify, 'pm@psa-project-tasks.test', {
    name: 'Plan PM', positions: ['crm_project_manager'], permissionSets: ['project_manager'],
  });
  consultant = await signUpPerson(verify, 'consultant@psa-project-tasks.test', {
    name: 'Plan Consultant', positions: ['crm_project_member'], permissionSets: ['project_member'],
  });
  outsider = await signUpPerson(verify, 'outsider@psa-project-tasks.test', {
    name: 'Plan Outsider', positions: ['crm_project_member'], permissionSets: ['project_member'],
  });
  [account] = await verify.rows('crm_account', {});
  expect(account, 'fixture: the seed holds an account').toBeTruthy();
  rate = await insert('crm_rate_card', { name: `Plan Consultant ${++k}`, seniority: 'intermediate', unit: 'hour', cost_rate: 50, bill_rate: 120 }, admin);
  project = await insert('crm_project', { name: `Plan Rollout ${++k}`, crm_account: account.id, kind: 'delivery' }, pm.token);
  other = await insert('crm_project', { name: `Plan Other ${++k}`, crm_account: account.id, kind: 'delivery' }, pm.token);
  await insert('crm_project_member', { crm_project: project.id, person: pm.id, responsibility: 'project_manager', rate_card: rate.id }, pm.token);
  await insert('crm_project_member', { crm_project: project.id, person: consultant.id, responsibility: 'consultant', rate_card: rate.id }, pm.token);
}, 120_000);

describe('project_task_progress: Percent Complete follows the tasks, weighted by planned hours', () => {
  let design: Rec;
  let build: Rec;
  let phase: Rec;
  let api: Rec;
  let ui: Rec;

  it('reads empty while the project has no task', async () => {
    expect(await percent(project.id)).toBeNull();
  });

  it('weighs each task by its planned hours', async () => {
    // 40 h at 50 % and 10 h at 100 %: (20 + 10) / 50 = 60 %, not the plain mean 75 %.
    design = await insert('crm_project_task', { crm_project: project.id, name: 'Design', planned_hours: 40, percent_complete: 50, status: 'in_progress' }, pm.token);
    build = await insert('crm_project_task', { crm_project: project.id, name: 'Kick-off', planned_hours: 10, percent_complete: 100, status: 'in_progress' }, pm.token);
    expect(await percent(project.id)).toBe(60);
  });

  it('counts a Completed task as 100 % and stores 100 on it', async () => {
    await update('crm_project_task', { id: design.id, status: 'completed' }, pm.token);
    expect(Number((await row('crm_project_task', design.id))!.percent_complete)).toBe(100);
    expect(await percent(project.id)).toBe(100);
  });

  it('counts a summary task through its subtasks only', async () => {
    // The summary's own 999 h at 0 % would drag the figure down if counted.
    phase = await insert('crm_project_task', { crm_project: project.id, name: 'Build', planned_hours: 999, percent_complete: 0 }, pm.token);
    api = await insert('crm_project_task', { crm_project: project.id, name: 'API', parent_task: phase.id, planned_hours: 30, percent_complete: 0 }, pm.token);
    ui = await insert('crm_project_task', { crm_project: project.id, name: 'UI', parent_task: phase.id, planned_hours: 20, percent_complete: 50 }, pm.token);
    // (40·100 + 10·100 + 30·0 + 20·50) / 100 = 60 %.
    expect(await percent(project.id)).toBe(60);
  });

  it('leaves a cancelled task out', async () => {
    await update('crm_project_task', { id: api.id, status: 'cancelled' }, pm.token);
    // (4000 + 1000 + 1000) / 70 = 85.7 %.
    expect(await percent(project.id)).toBe(85.7);
  });

  it('counts each task the same when none has planned hours', async () => {
    const flat = await insert('crm_project', { name: `Plan Flat ${++k}`, crm_account: account.id, kind: 'internal' }, pm.token);
    await insert('crm_project_task', { crm_project: flat.id, name: 'Write the playbook', percent_complete: 30 }, pm.token);
    await insert('crm_project_task', { crm_project: flat.id, name: 'Train the team', percent_complete: 60 }, pm.token);
    expect(await percent(flat.id)).toBe(45);
  });

  it('moves with a task deleted or moved to another project', async () => {
    const res = await verify.apiAs(pm.token, 'DELETE', `/data/crm_project_task/${ui.id}`);
    expect(res.status, await res.clone().text()).toBeLessThan(300);
    // The cancelled API still names Build as its parent, so Build stays a
    // summary and is not counted: (40·100 + 10·100) / 50 = 100 %.
    expect(await percent(project.id)).toBe(100);
    await update('crm_project_task', { id: build.id, crm_project: other.id }, pm.token);
    expect(await percent(project.id)).toBe(100);
    expect(await percent(other.id)).toBe(100);
  });

  it('is not typed by a person', async () => {
    const res = await verify.apiAs(pm.token, 'PATCH', `/data/crm_project/${project.id}`, { percent_complete: 7 });
    expect(res.status, await res.clone().text()).toBe(200);
    expect(await percent(project.id)).toBe(100);
  });
});

describe('project_task_rules: a task moved out of Completed gives up its 100 % (hotcrm#2768)', () => {
  let plan: Rec;
  let design: Rec;
  let rollout: Rec;

  const task = async (id: string): Promise<Rec> => (await row('crm_project_task', id))!;
  const complete = async (): Promise<void> => {
    await update('crm_project_task', { id: rollout.id, status: 'completed' }, pm.token);
    expect(Number((await task(rollout.id)).percent_complete)).toBe(100);
    // (40·50 + 60·100) / 100 = 80 %.
    expect(await percent(plan.id)).toBe(80);
  };

  beforeAll(async () => {
    plan = await insert('crm_project', { name: `Plan Reopen ${++k}`, crm_account: account.id, kind: 'delivery' }, pm.token);
    design = await insert('crm_project_task', { crm_project: plan.id, name: 'Design', planned_hours: 40, percent_complete: 50, status: 'in_progress' }, pm.token);
    rollout = await insert('crm_project_task', { crm_project: plan.id, name: 'Roll out site three', planned_hours: 60, percent_complete: 0 }, pm.token);
    // 40 h at 50 % and 60 h not started: 2000 / 100 = 20 %.
    expect(await percent(plan.id)).toBe(20);
  });

  it('goes back to 0 % when the task is moved back to Not Started, and the project drops back', async () => {
    await complete();
    await update('crm_project_task', { id: rollout.id, status: 'not_started' }, pm.token);
    const t = await task(rollout.id);
    expect(t.status).toBe('not_started');
    expect(Number(t.percent_complete)).toBe(0);
    expect(await percent(plan.id)).toBe(20);
  });

  it('goes back to 0 % for In Progress, On Hold and Cancelled alike', async () => {
    for (const status of ['in_progress', 'on_hold']) {
      await complete();
      await update('crm_project_task', { id: rollout.id, status }, pm.token);
      expect(Number((await task(rollout.id)).percent_complete), status).toBe(0);
      expect(await percent(plan.id), status).toBe(20);
    }
    await complete();
    await update('crm_project_task', { id: rollout.id, status: 'cancelled' }, pm.token);
    expect(Number((await task(rollout.id)).percent_complete)).toBe(0);
    // Cancelled is left out: Design alone, 50 %.
    expect(await percent(plan.id)).toBe(50);
    // The 100 does not come back when the cancelled task is taken up again.
    await update('crm_project_task', { id: rollout.id, status: 'in_progress' }, pm.token);
    expect(Number((await task(rollout.id)).percent_complete)).toBe(0);
    expect(await percent(plan.id)).toBe(20);
  });

  it('keeps a percentage given in the same save', async () => {
    await complete();
    await update('crm_project_task', { id: rollout.id, status: 'in_progress', percent_complete: 70 }, pm.token);
    expect(Number((await task(rollout.id)).percent_complete)).toBe(70);
    // (40·50 + 60·70) / 100 = 62 %.
    expect(await percent(plan.id)).toBe(62);
  });

  it('does not take the unchanged 100 a form sends back as a percentage given', async () => {
    await complete();
    await update('crm_project_task', { id: rollout.id, name: 'Roll out site three', status: 'not_started', percent_complete: 100 }, pm.token);
    expect(Number((await task(rollout.id)).percent_complete)).toBe(0);
    expect(await percent(plan.id)).toBe(20);
  });

  it('leaves the percentage alone on any other move, and on a Completed task that stays Completed', async () => {
    await update('crm_project_task', { id: design.id, status: 'on_hold' }, pm.token);
    expect(Number((await task(design.id)).percent_complete)).toBe(50);
    await update('crm_project_task', { id: design.id, status: 'in_progress' }, pm.token);
    expect(Number((await task(design.id)).percent_complete)).toBe(50);
    await complete();
    await update('crm_project_task', { id: rollout.id, name: 'Roll out site three (done)' }, pm.token);
    expect(Number((await task(rollout.id)).percent_complete)).toBe(100);
    expect(await percent(plan.id)).toBe(80);
  });

  it('keeps the figure of a Completed task that does not read 100 (a row from before hotcrm#2545)', async () => {
    const legacy = await insert('crm_project', { name: `Plan Legacy ${++k}`, crm_account: account.id, kind: 'delivery' }, pm.token);
    const t = await insert('crm_project_task', { crm_project: legacy.id, name: 'Migrate the archive', planned_hours: 10, status: 'completed' }, pm.token);
    // Written straight to the driver: no hook today stores a Completed task below 100.
    const ql = verify.kernel.getService<Rec>('objectql');
    await ql.getDriverForObject('crm_project_task').update(ql.resolveObjectName('crm_project_task'), t.id, { percent_complete: 80 });
    // That 80 was not written by the hook, so it is the owner's: a form that
    // sends it back with the new status keeps it, and so does a status-only save.
    await update('crm_project_task', { id: t.id, name: 'Migrate the archive', status: 'in_progress', percent_complete: 80 }, pm.token);
    expect(Number((await task(t.id)).percent_complete)).toBe(80);
  });

  it('lets one update move several Completed tasks at once (a predicate update)', async () => {
    const bulk = await insert('crm_project', { name: `Plan Bulk ${++k}`, crm_account: account.id, kind: 'delivery' }, pm.token);
    const a = await insert('crm_project_task', { crm_project: bulk.id, name: 'Site one', status: 'completed' }, pm.token);
    const b = await insert('crm_project_task', { crm_project: bulk.id, name: 'Site two', status: 'completed' }, pm.token);
    await predicateUpdate(verify, 'crm_project_task', { status: 'in_progress' }, { id: { $in: [a.id, b.id] } }, pm.token);
    expect((await task(a.id)).status).toBe('in_progress');
    expect((await task(b.id)).status).toBe('in_progress');
    // One payload serves every row on this path, so the hook does not reset the
    // percentage there (see `project_task.hook.ts`); a by-id save does.
  });
});

describe('project_task_rules: the tree and the predecessors stay inside the project', () => {
  let a: Rec;
  let b: Rec;
  let c: Rec;
  let elsewhere: Rec;

  beforeAll(async () => {
    a = await insert('crm_project_task', { crm_project: project.id, name: 'Phase A' }, pm.token);
    b = await insert('crm_project_task', { crm_project: project.id, name: 'Step B', parent_task: a.id }, pm.token);
    c = await insert('crm_project_task', { crm_project: project.id, name: 'Step C', parent_task: b.id, predecessors: [b.id] }, pm.token);
    elsewhere = await insert('crm_project_task', { crm_project: other.id, name: 'Elsewhere' }, pm.token);
  });

  it('stores the parent and the predecessors', async () => {
    const t = (await row('crm_project_task', c.id))!;
    expect(t.parent_task).toBe(b.id);
    expect(t.predecessors).toEqual([b.id]);
    expect(t.schedule_type).toBe('task');
  });

  it('draws a milestone as a milestone', async () => {
    const m = await insert('crm_project_task', { crm_project: project.id, name: 'Go-live', is_milestone: true }, pm.token);
    expect((await row('crm_project_task', m.id))!.schedule_type).toBe('milestone');
  });

  // The value above is for the Gantt alone: a person reads the Milestone
  // checkbox, so the record page, the drawer and the form leave this field
  // out (hotcrm#2769). The Gantt still receives it, as the two cases above
  // read it from the same rows.
  it('keeps the value the Gantt reads off the record page and the form', () => {
    expect((ProjectTask.fields.schedule_type as Rec).hidden).toBe(true);
    expect((ProjectTask.fields.is_milestone as Rec).hidden).not.toBe(true);
  });

  it('refuses a parent from another project', async () => {
    const err = refusal(await update('crm_project_task', { id: b.id, parent_task: elsewhere.id }, pm.token).catch((e) => e));
    expect(err.code).toBe('VALIDATION_FAILED');
    expect(err.userMessage).toBe('The parent task must be another task of the same project.');
  });

  it('refuses a parent that is one of the task\'s own subtasks', async () => {
    const err = refusal(await update('crm_project_task', { id: a.id, parent_task: c.id }, pm.token).catch((e) => e));
    expect(err.code).toBe('VALIDATION_FAILED');
    expect(err.userMessage).toBe('This parent task is one of this task\'s own subtasks. Pick a task that is not under this one.');
  });

  it('refuses a predecessor from another project, or the task itself', async () => {
    for (const ids of [[elsewhere.id], [c.id]]) {
      const err = refusal(await update('crm_project_task', { id: c.id, predecessors: ids }, pm.token).catch((e) => e));
      expect(err.code).toBe('VALIDATION_FAILED');
      expect(err.userMessage).toBe('A predecessor must be another task of the same project.');
    }
  });
});

describe('time booked against a task', () => {
  let task: Rec;
  let foreign: Rec;
  let sheet: Rec;

  beforeAll(async () => {
    task = await insert('crm_project_task', { crm_project: project.id, name: 'Data migration', planned_hours: 16 }, pm.token);
    foreign = await insert('crm_project_task', { crm_project: other.id, name: 'Other migration' }, pm.token);
    sheet = await insert('crm_timesheet', { crm_project: project.id, period_start: '2026-11-02', period_end: '2026-11-08' }, consultant.token);
  });

  it('sums onto the task\'s Actual Hours, and only the hours that name it', async () => {
    await insert('crm_time_entry', { crm_timesheet: sheet.id, entry_date: '2026-11-03', hours: 6, crm_project_task: task.id }, consultant.token);
    const second = await insert('crm_time_entry', { crm_timesheet: sheet.id, entry_date: '2026-11-04', hours: 2.5, crm_project_task: task.id }, consultant.token);
    await insert('crm_time_entry', { crm_timesheet: sheet.id, entry_date: '2026-11-05', hours: 4 }, consultant.token);
    expect(Number((await row('crm_project_task', task.id))!.actual_hours)).toBe(8.5);
    await update('crm_time_entry', { id: second.id, hours: 3 }, consultant.token);
    expect(Number((await row('crm_project_task', task.id))!.actual_hours)).toBe(9);
  });

  it('refuses a task of another project', async () => {
    const err = refusal(await insert('crm_time_entry', {
      crm_timesheet: sheet.id, entry_date: '2026-11-06', hours: 1, crm_project_task: foreign.id,
    }, consultant.token).catch((e) => e));
    expect(err.code).toBe('VALIDATION_FAILED');
    expect(err.userMessage).toBe('The task must be one of this timesheet\'s project tasks.');
  });
});

describe('who reads and writes the plan', () => {
  let task: Rec;

  beforeAll(async () => {
    task = await insert('crm_project_task', { crm_project: project.id, name: 'Cut-over rehearsal', planned_hours: 8 }, pm.token);
  });

  it('lets the team read the plan and nobody outside it', async () => {
    expect(await row('crm_project_task', task.id, consultant.token)).toBeTruthy();
    expect(await row('crm_project_task', task.id, outsider.token)).toBeUndefined();
  });

  it('keeps the plan the project manager\'s: the team cannot add or edit a task', async () => {
    const add = await verify.apiAs(consultant.token, 'POST', '/data/crm_project_task', { crm_project: project.id, name: 'Sneaky task' });
    expect(add.status, await add.clone().text()).toBe(403);
    const edit = await verify.apiAs(consultant.token, 'PATCH', `/data/crm_project_task/${task.id}`, { percent_complete: 90 });
    expect(edit.status, await edit.clone().text()).toBe(403);
  });
});
