// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { ExpressionEngine } from '@objectstack/formula';
import { CompleteTaskAction } from '../src/sales/actions/task.actions';
import { hotcrmStack, signUpPerson, today, type Person } from './helpers/verify-stack';

/**
 * `complete_task` — one click from an open task to a completed one (#2128).
 *
 * The action is a declarative update (`operation: 'update'`, `patch: { status:
 * 'completed' }`): no body, the platform's action door writes the patch to the
 * record as the caller. Each case below runs it through that door —
 * `@objectstack/verify`'s `actions.run`, the same `POST /actions/crm_task/complete_task`
 * the console's runner posts to — and reads back what the engine stored.
 *
 * What it pins:
 *
 *  - the write: an open task ends Completed, at 100%, dated today. The patch
 *    names the status alone; the other two are `task_completion`'s stamps, so
 *    they arriving at all is the proof the hook fired on the action's write;
 *  - the gate: a rep who cannot edit the task does not complete it;
 *  - the button: it is offered on an open task and withheld from a completed one.
 */

type Row = Record<string, any>;

let verify: VerifyStack;
let owner: Person;
let otherRep: Person;
let k = 0;

const openTask = (status = 'not_started'): Promise<Row> =>
  verify.hooks.run('crm_task', 'insert', {
    subject: `Complete me ${++k}`, status, priority: 'normal', due_date: '2030-01-15',
  }, { as: owner.token });

const stored = async (id: string): Promise<Row> => (await verify.rows('crm_task', { id }))[0]!;

const complete = (id: string, who: Person = owner): Promise<unknown> =>
  verify.actions.run('crm_task', 'complete_task', { as: who.token, recordId: id });

beforeAll(async () => {
  verify = await hotcrmStack();
  owner = await signUpPerson(verify, 'owner@task-complete.test', {
    name: 'Tess Owner', positions: ['sales_rep'], permissionSets: ['sales_rep'],
  });
  otherRep = await signUpPerson(verify, 'other@task-complete.test', {
    name: 'Otto Other', positions: ['sales_rep'], permissionSets: ['sales_rep'],
  });
}, 180_000);

describe('complete_task — the write', () => {
  it('writes the status alone; the completion hook stamps the rest', () => {
    // ⛔ One writer per fact: `task_completion` owns the date and the percent.
    expect(CompleteTaskAction.operation).toBe('update');
    expect(CompleteTaskAction.patch).toEqual({ status: 'completed' });
  });

  it.each(['not_started', 'in_progress', 'waiting', 'deferred'])(
    'leaves a %s task Completed, at 100%%, dated today',
    async (status) => {
      const task = await openTask(status);
      const before = await stored(task.id);
      expect(before.status).toBe(status);
      expect(before.completed_date ?? null).toBeNull();

      await complete(task.id);

      const after = await stored(task.id);
      expect(after.status).toBe('completed');
      expect(after.is_completed).toBe(true);
      expect(Number(after.progress_percent)).toBe(100);
      expect(String(after.completed_date).slice(0, 10)).toBe(today());
    },
  );
});

describe('complete_task — the gate', () => {
  it('refuses a rep who cannot edit the task, and the task stays open', async () => {
    // `crm_task` is `private` and a rep's grant is own-scoped, so another rep's
    // task is not theirs to read or edit. The write runs as the caller, so the
    // platform refuses it — the button is not a way around the grant.
    const task = await openTask();
    const err = (await complete(task.id, otherRep).then(() => null, (e: Row) => e)) as Row | null;
    expect(err, "another rep completed a task they cannot edit").toBeTruthy();
    // ADR-0112 envelope: the code and the status are the contract.
    expect(err!.code).toBe('RECORD_NOT_FOUND');
    expect(err!.status).toBe(404);
    expect((await stored(task.id)).status).toBe('not_started');
  });
});

describe('complete_task — the button', () => {
  const predicate = (CompleteTaskAction.visible as Row)?.source ?? CompleteTaskAction.visible;
  const visible = (record: Row) =>
    ExpressionEngine.evaluate({ dialect: 'cel', source: String(predicate) }, { record });

  it.each(['not_started', 'in_progress', 'waiting', 'deferred'])('is offered on a %s task', (status) => {
    expect(visible({ id: 't1', status })).toMatchObject({ ok: true, value: true });
  });

  it('is withheld from a completed task', () => {
    expect(visible({ id: 't1', status: 'completed' })).toMatchObject({ ok: true, value: false });
  });

  it('is withheld before the record has loaded (fails closed)', () => {
    expect(visible({})).toMatchObject({ ok: true, value: false });
  });
});
