// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, vi } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { hotcrmStack, signUpPerson, recordEngineWrites, type Person } from './helpers/verify-stack';

/**
 * Closing a case completes its escalation follow-up task (#2073 item 3).
 *
 * `case_status_side_effects` opens an urgent "Escalated: CASE-…" task for the
 * account owner on every escalation, and nothing closed it: measured before
 * the fix, a case escalated through **Escalate Case** and then closed left its
 * task `not_started`, `urgent`, `is_completed: false`, in the owner's My Open
 * Tasks, whichever door closed it (`close_case` as the manager, `close_case`
 * as the agent, the manager's own `PATCH`). `case_close_escalation_task` now
 * completes it.
 *
 * The people are the ones the card is about: an agent opens and escalates the
 * case, the escalation hands it to the service manager, and the task belongs
 * to the sales rep who owns the account. The manager's `crm_task` read is
 * `own`, so the manager cannot see the rep's task (`GET` answers 404); the
 * `PATCH` leg is the one that holds the hook's `runAs: 'system'` in place.
 *
 * Every state is reached through a shipped door, and the boot's seed shares
 * the database, so every reading is taken by id.
 */

type Rec = Record<string, any>;
const ESCALATION_SUBJECT = /^Escalated: CASE-\d+ · /;

let verify: VerifyStack;
let agent: Person;
let manager: Person;
let rep: Person;
let accountId: string;
let k = 0;

const open = async (): Promise<string> => {
  const kase = await verify.hooks.run('crm_case', 'insert', {
    subject: `Printer on fire ${++k}`, description: 'The customer called twice.', crm_account: accountId, status: 'new', priority: 'medium',
  }, { as: agent.token });
  return String(kase.id);
};

/** The shipped Escalate Case action, and the wait for the task its hook opens. */
const escalate = async (id: string, who: Person, expectTasks = 1): Promise<void> => {
  const run = await verify.flows.run('escalate_case', { recordId: id }, { as: who.token });
  await verify.flows.resume(run, { reason: 'Customer CFO called' }, { as: who.token });
  await vi.waitFor(async () => expect(await escalationTasks(id)).toHaveLength(expectTasks), { timeout: 10_000, interval: 50 });
};

/** The shipped Close Case action. */
const closeByFlow = async (id: string, who: Person): Promise<void> => {
  const run = await verify.flows.run('close_case', { recordId: id }, { as: who.token });
  await verify.flows.resume(run, { resolution: 'Replaced the unit' }, { as: who.token });
};

/** The manager closes or reopens the case by editing its status. */
const patchCase = async (id: string, doc: Rec): Promise<void> => {
  const res = await verify.apiAs(manager.token, 'PATCH', `/data/crm_case/${id}`, doc);
  expect(res.status, `PATCH crm_case ${JSON.stringify(doc)}: ${await res.clone().text()}`).toBe(200);
};

const tasksOf = (caseId: string): Promise<Rec[]> => verify.rows('crm_task', { related_to_case: caseId });
const escalationTasks = async (caseId: string): Promise<Rec[]> =>
  (await tasksOf(caseId)).filter((t) => ESCALATION_SUBJECT.test(String(t.subject)));

/** Wait until every escalation task of the case is completed, and return them. */
const completedTasks = (caseId: string): Promise<Rec[]> =>
  vi.waitFor(async () => {
    const rows = await escalationTasks(caseId);
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) expect(row.status, `task ${row.id} is still ${row.status}`).toBe('completed');
    return rows;
  }, { timeout: 10_000, interval: 50 });

/** The task updates the engine received for one task id while `recorder` was attached. */
const updatesTo = (recorder: ReturnType<typeof recordEngineWrites>, taskId: string): Rec[] =>
  recorder.of('crm_task', 'update')
    .filter((w) => (w.args[1] as Rec | undefined)?.id === taskId || (w.args[2] as Rec | undefined)?.where?.id === taskId)
    .map((w) => w.args[1] as Rec);

beforeAll(async () => {
  verify = await hotcrmStack();
  // Service grants with no position: a case the agent opens stays theirs.
  agent = await signUpPerson(verify, 'agent@escalation-task-on-close.test', { name: 'Case Agent', permissionSets: ['service_agent'] });
  // The `service_manager` pool the escalation hands the case to.
  manager = await signUpPerson(verify, 'manager@escalation-task-on-close.test', {
    name: 'Service Manager', positions: ['service_manager'], permissionSets: ['service_manager'],
  });
  rep = await signUpPerson(verify, 'rep@escalation-task-on-close.test', {
    name: 'Account Rep', positions: ['sales_rep'], permissionSets: ['sales_rep'],
  });
  const [account] = await verify.seed('crm_account', [{ name: 'Escalated Close Co', tier: 'enterprise', owner_id: rep.id }]);
  accountId = String(account!.id);
}, 120_000);

describe('case_close_escalation_task: closing an escalated case completes its escalation task', () => {
  it('fixture: the escalation hands the case to the manager, and the task is the rep’s, open and urgent', async () => {
    const id = await open();
    await escalate(id, agent);
    const [kase] = await verify.rows('crm_case', { id });
    expect(kase).toMatchObject({ status: 'escalated', owner_id: manager.id, escalated_from: agent.id });
    const [task] = await escalationTasks(id);
    expect(task).toMatchObject({ status: 'not_started', priority: 'urgent', is_completed: false, owner_id: rep.id });
    // The manager cannot read the rep's task as themselves.
    const res = await verify.apiAs(manager.token, 'GET', `/data/crm_task/${task!.id}`);
    expect(res.status).toBe(404);
  });

  it('Close Case, run by the manager who owns the case', async () => {
    const id = await open();
    await escalate(id, agent);
    await closeByFlow(id, manager);
    const [task] = await completedTasks(id);
    expect(task).toMatchObject({ is_completed: true, owner_id: rep.id, progress_percent: 100 });
    expect(task!.completed_date, 'no completed date was stamped').toBeTruthy();
    // Who completed it stays on the record: the person who closed the case.
    expect(task!.updated_by).toBe(manager.id);
  });

  it('Close Case, run by the agent the case was escalated from', async () => {
    const id = await open();
    await escalate(id, agent);
    await closeByFlow(id, agent);
    const [task] = await completedTasks(id);
    expect(task!.updated_by).toBe(agent.id);
  });

  it('the manager’s own edit of the status to Closed, a door no flow is on', async () => {
    const id = await open();
    await escalate(id, agent);
    await patchCase(id, { status: 'closed', resolution: 'Fixed by hand' });
    const [task] = await completedTasks(id);
    expect(task!.updated_by).toBe(manager.id);
  });

  it('a case escalated twice has two tasks, and both are completed', async () => {
    const id = await open();
    await escalate(id, agent);
    await patchCase(id, { status: 'in_progress' });
    await escalate(id, manager, 2);
    await closeByFlow(id, manager);
    expect(await completedTasks(id)).toHaveLength(2);
  });

  it('the untitled shape the insert falls back to is completed too', async () => {
    // `case_status_side_effects` titles a case with no number and no subject
    // "Escalated case needs attention". No door produces that case today (the
    // subject is required; `escalation-task-subject.test.ts` pins the refusal),
    // so the task is written through the seed door in that exact shape.
    const id = await open();
    await escalate(id, agent);
    const [untitled] = await verify.seed('crm_task', [{
      subject: 'Escalated case needs attention', status: 'not_started', priority: 'urgent', type: 'follow_up',
      owner_id: rep.id, related_to_type: 'crm_case', related_to_case: id, related_to_account: accountId,
    }]);
    await closeByFlow(id, manager);
    await completedTasks(id);
    await vi.waitFor(async () => {
      const [row] = await verify.rows('crm_task', { id: untitled!.id });
      expect(row).toMatchObject({ status: 'completed', is_completed: true });
    }, { timeout: 10_000, interval: 50 });
  });
});

describe('what the close leaves alone', () => {
  it('another task on the same case, written by a person, stays open', async () => {
    const id = await open();
    const own = await verify.hooks.run('crm_task', 'insert', {
      subject: 'Call the customer back', status: 'not_started', priority: 'normal', related_to_case: id,
    }, { as: agent.token });
    await escalate(id, agent);
    await closeByFlow(id, manager);
    await completedTasks(id);
    const [mine] = await verify.rows('crm_task', { id: own.id });
    expect(mine).toMatchObject({ status: 'not_started', is_completed: false });
  });

  it('a task its owner already completed is not written again', async () => {
    const id = await open();
    await escalate(id, agent);
    const [task] = await escalationTasks(id);
    const done = await verify.apiAs(rep.token, 'PATCH', `/data/crm_task/${task!.id}`, { status: 'completed' });
    expect(done.status, await done.clone().text()).toBe(200);
    const [before] = await verify.rows('crm_task', { id: task!.id });
    expect(before).toMatchObject({ status: 'completed', updated_by: rep.id });

    // A sibling escalated case closed in the same window proves the hook ran.
    const sibling = await open();
    await escalate(sibling, agent);
    const recorder = recordEngineWrites(verify);
    try {
      await closeByFlow(id, manager);
      await closeByFlow(sibling, manager);
      await completedTasks(sibling);
      await new Promise((r) => setTimeout(r, 300));
    } finally {
      recorder.restore();
    }
    expect(updatesTo(recorder, String(task!.id)), 'the completed task was written again').toHaveLength(0);
    const [after] = await verify.rows('crm_task', { id: task!.id });
    expect(after).toMatchObject({ status: 'completed', updated_by: rep.id, completed_date: before!.completed_date });
  });

  it('another case’s escalation task stays open', async () => {
    const closing = await open();
    const other = await open();
    await escalate(closing, agent);
    await escalate(other, agent);
    await closeByFlow(closing, manager);
    await completedTasks(closing);
    const [task] = await escalationTasks(other);
    expect(task).toMatchObject({ status: 'not_started', is_completed: false });
  });

  it('a case closed with no escalation writes no task', async () => {
    const id = await open();
    const own = await verify.hooks.run('crm_task', 'insert', {
      subject: 'Send the replacement part', status: 'in_progress', priority: 'high', related_to_case: id,
    }, { as: agent.token });
    const recorder = recordEngineWrites(verify);
    try {
      await closeByFlow(id, agent);
      await new Promise((r) => setTimeout(r, 500));
    } finally {
      recorder.restore();
    }
    expect(updatesTo(recorder, String(own.id))).toHaveLength(0);
    const [mine] = await verify.rows('crm_task', { id: own.id });
    expect(mine).toMatchObject({ status: 'in_progress', is_completed: false });
  });

  it('reopening a closed case leaves its task completed, and closing it again writes nothing more', async () => {
    const id = await open();
    await escalate(id, agent);
    await closeByFlow(id, manager);
    const [first] = await completedTasks(id);
    await patchCase(id, { status: 'in_progress' });
    const recorder = recordEngineWrites(verify);
    try {
      await patchCase(id, { status: 'closed', resolution: 'Fixed for good' });
      await new Promise((r) => setTimeout(r, 500));
    } finally {
      recorder.restore();
    }
    expect(updatesTo(recorder, String(first!.id))).toHaveLength(0);
    const [again] = await verify.rows('crm_task', { id: first!.id });
    expect(again).toMatchObject({ status: 'completed', completed_date: first!.completed_date });
  });
});
