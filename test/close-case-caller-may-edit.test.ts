// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, vi } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { hotcrmStack, signUpPerson, systemUpdate, today, type Person } from './helpers/verify-stack';

type Rec = Record<string, any>;

/**
 * Close Case changes a case only for a caller who may edit it.
 *
 * `close_case` runs `runAs: 'user'` (AGENTS.md house rule 9), so its one write,
 * the `close` node, is the caller's own user-context update and the engine
 * applies the caller's grants to it. A person who may read the case but not
 * edit it is refused, and so is a person who cannot read it at all: nothing is
 * written either way. A person who may edit the case closes it exactly as
 * before: the resolution, the optional article, `is_closed`, the SLA clock
 * (`closed_date`, `resolution_time_hours`, a late finish's breach flag), and the
 * follow-up of an escalated case (its escalation task completed, the account's
 * last activity date moved).
 *
 * No step of the close is elevated, and none needs to be: every readonly column
 * a close changes is derived by `case_sla_defaults` on the caller's own write,
 * which the "closes it as before" cases below read back off the stored row. The
 * shape itself is pinned in `test/readonly-write-semantics.test.ts`.
 *
 * Every person here holds one of the app's shipped permission sets and goes
 * through the shipped doors: the record read (`GET`), their own edit (`PATCH`),
 * and the screen flow (`flows.run`, then `flows.resume` with the screen's
 * fields). The read and edit answers are asserted beside each refusal, so a
 * refusal can only pass for a person who genuinely may not edit the case. The
 * boot's seed shares the database, so every reading is taken by id.
 */

let verify: VerifyStack;
let agent: Person;
let otherAgent: Person;
let manager: Person;
let rep: Person;
let salesManager: Person;
let marketer: Person;
let admin: Person;
let accountId: string;
let k = 0;

/** The escalation follow-up task `case_status_side_effects` opens, by its subject. */
const ESCALATION_SUBJECT = /^Escalated: CASE-\d+ · /;
/** Each async-hook test's budget: it must outlive its own `vi.waitFor` (10 s). */
const WAIT_BUDGET_MS = 30_000;

beforeAll(async () => {
  verify = await hotcrmStack();
  agent = await signUpPerson(verify, 'agent@close-case-caller-may-edit.test', { name: 'Case Agent', permissionSets: ['service_agent'] });
  otherAgent = await signUpPerson(verify, 'other-agent@close-case-caller-may-edit.test', { name: 'Other Agent', permissionSets: ['service_agent'] });
  // On the Service Manager bench from the start: an escalation hands the case to them.
  manager = await signUpPerson(verify, 'manager@close-case-caller-may-edit.test', {
    name: 'Service Manager', positions: ['service_manager'], permissionSets: ['service_agent'],
  });
  rep = await signUpPerson(verify, 'rep@close-case-caller-may-edit.test', { name: 'Account Rep', positions: ['sales_rep'], permissionSets: ['sales_rep'] });
  salesManager = await signUpPerson(verify, 'sales-manager@close-case-caller-may-edit.test', {
    name: 'Sales Manager', positions: ['sales_manager'], permissionSets: ['sales_manager'],
  });
  marketer = await signUpPerson(verify, 'marketer@close-case-caller-may-edit.test', { name: 'Marketer', permissionSets: ['marketing_user'] });
  admin = await signUpPerson(verify, 'admin@close-case-caller-may-edit.test', { name: 'Administrator', permissionSets: ['system_admin'] });
  accountId = await accountOfRep('Close Case Co');
}, 120_000);

/** An account the rep owns, whose last activity is long past. */
async function accountOfRep(name: string): Promise<string> {
  const [account] = await verify.seed('crm_account', [{ name, owner_id: rep.id }]);
  const id = String(account!.id);
  await systemUpdate(verify, 'crm_account', { id, last_activity_date: '2020-01-01' });
  return id;
}

/** A new, medium-priority case the agent opened and owns. */
const openCase = async (over: Rec = {}): Promise<string> => String((await verify.hooks.run('crm_case', 'insert', {
  subject: `Printer on fire ${++k}`, description: 'It is on fire.', crm_account: accountId, status: 'new', priority: 'medium', ...over,
}, { as: agent.token })).id);

const stored = async (id: string): Promise<Rec> => (await verify.rows('crm_case', { id }))[0]!;
const escalationTasks = async (caseId: string): Promise<Rec[]> =>
  (await verify.rows('crm_task', { related_to_case: caseId })).filter((t) => ESCALATION_SUBJECT.test(String(t.subject)));

/** The shipped Escalate Case action, run by the agent, and the wait for the task its hook opens. */
async function escalate(id: string): Promise<void> {
  const run = await verify.flows.run('escalate_case', { recordId: id }, { as: agent.token });
  await verify.flows.resume(run, { reason: 'Customer CFO called' }, { as: agent.token });
  await vi.waitFor(async () => expect(await escalationTasks(id)).toHaveLength(1), { timeout: 10_000, interval: 50 });
}

/** Run Close Case on `id` as `who`; resolve with the refusal's envelope, or `null` when it closed. */
async function closeCase(who: Person, id: string, screen: Rec = { resolution: 'Replaced the faulty unit' }): Promise<Rec | null> {
  const run = await verify.flows.run('close_case', { recordId: id }, { as: who.token });
  expect(run.runId, 'close_case did not start').toBeTruthy();
  return verify.flows.resume(run, screen, { as: who.token }).then(
    () => null,
    (e: Rec) => ({ code: e?.code, status: e?.status, nodes: e?.details?.summary?.nodes ?? [] }),
  );
}

/** The case's reading and editing answers for `who`, through the record door. */
async function standing(who: Person, id: string): Promise<{ read: number; edit: number }> {
  const read = (await verify.apiAs(who.token, 'GET', `/data/crm_case/${id}`)).status;
  const edit = (await verify.apiAs(who.token, 'PATCH', `/data/crm_case/${id}`, { priority: 'high' })).status;
  return { read, edit };
}

describe('Close Case changes a case only for a caller who may edit it', () => {
  describe('a person who may not edit the case is refused, and the case is unchanged', () => {
    const cases: Array<[label: string, who: () => Person, fixture: () => Promise<string>, standing: { read: number; edit: number }]> = [
      ['a sales rep, on the case they own and may only read', () => rep, async () => {
        const [kase] = await verify.seed('crm_case', [{
          subject: `Rep case ${++k}`, description: 'Raised by the account rep.', crm_account: accountId,
          status: 'new', priority: 'medium', owner_id: rep.id,
        }]);
        return String(kase!.id);
      }, { read: 200, edit: 403 }],
      ['a sales manager, who may read every case', () => salesManager, () => openCase(), { read: 200, edit: 403 }],
      ['the service agent a case was escalated away from, who keeps read only', () => agent, async () => {
        const id = await openCase();
        await escalate(id);
        expect(await stored(id), 'fixture: the escalation handed the case to the manager').toMatchObject({
          status: 'escalated', owner_id: manager.id, escalated_from: agent.id,
        });
        return id;
      }, { read: 200, edit: 403 }],
      ['a marketing user, who may not read cases', () => marketer, () => openCase(), { read: 403, edit: 403 }],
      ['a service agent who may not read this case', () => otherAgent, () => openCase(), { read: 404, edit: 404 }],
    ];

    it.each(cases)('%s', { timeout: WAIT_BUDGET_MS }, async (_label, who, fixture, expected) => {
      const id = await fixture();
      expect(await standing(who(), id), 'fixture: the person’s read and edit answers on this case').toEqual(expected);
      const before = await stored(id);

      const refusal = await closeCase(who(), id);
      expect(refusal, 'Close Case must refuse a caller who may not edit the case').not.toBeNull();
      expect({ code: refusal!.code, status: refusal!.status }).toEqual({ code: 'FLOW_FAILED', status: 400 });
      // Refused at the caller's own write, not at the screen contract.
      expect(refusal!.nodes).toContainEqual(expect.objectContaining({ nodeId: 'close', status: 'failure' }));
      expect(await stored(id), 'a refused close must leave the case unchanged').toEqual(before);
    });
  });

  describe('a person who may edit the case closes it as before', () => {
    const cases: Array<[label: string, who: () => Person, fixture: () => Promise<string>]> = [
      ['the service agent who owns it', () => agent, () => openCase()],
      ['the service manager it was escalated to', () => manager, async () => {
        const id = await openCase();
        await escalate(id);
        return id;
      }],
      ['an administrator', () => admin, () => openCase()],
    ];

    it.each(cases)('%s', { timeout: WAIT_BUDGET_MS }, async (_label, who, fixture) => {
      const id = await fixture();
      const [article] = await verify.seed('crm_knowledge_article', [{
        title: `Replace the fuser unit #${++k}`, status: 'published',
        body: 'Power down, open the rear panel and swap the fuser.', summary: 'Fuser replacement.',
      }]);
      const refusal = await closeCase(who(), id, { resolution: 'Replaced the faulty unit', resolved_by_article: article!.id });
      expect(refusal, 'Close Case must close the case for a caller who may edit it').toBeNull();

      const row = await stored(id);
      expect(row).toMatchObject({
        status: 'closed', is_closed: true, resolution: 'Replaced the faulty unit',
        resolved_by_article: article!.id, updated_by: who().id,
      });
      expect(row.closed_date, 'the close stamped no closed date').toBeTruthy();
      expect(typeof row.resolution_time_hours, 'the close computed no resolution time').toBe('number');
    });

    it('a late close records the SLA breach as the clock stops', async () => {
      const id = await openCase();
      await systemUpdate(verify, 'crm_case', { id, sla_due_date: new Date(Date.now() - 3_600_000).toISOString() });
      expect(await closeCase(agent, id)).toBeNull();
      expect(await stored(id)).toMatchObject({ status: 'closed', is_closed: true, is_sla_violated: true });
    });

    it('closing an escalated case completes its follow-up task and moves the account’s last activity date', { timeout: WAIT_BUDGET_MS }, async () => {
      const account = await accountOfRep('Close Case Follow-up Co');
      const id = await openCase({ crm_account: account });
      await escalate(id);
      const [task] = await escalationTasks(id);
      expect(task, 'fixture: the escalation opened the rep’s task').toMatchObject({ status: 'not_started', owner_id: rep.id });
      expect((await verify.rows('crm_account', { id: account }))[0]?.last_activity_date, 'fixture').toBe('2020-01-01');

      expect(await closeCase(manager, id)).toBeNull();
      await vi.waitFor(async () => {
        const [done] = await verify.rows('crm_task', { id: task!.id });
        expect(done).toMatchObject({ status: 'completed', is_completed: true, updated_by: manager.id });
        expect((await verify.rows('crm_account', { id: account }))[0]?.last_activity_date).toBe(today());
      }, { timeout: 10_000, interval: 50 });
    });
  });
});
