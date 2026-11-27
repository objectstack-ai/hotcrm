// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, vi } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { extractHookBody } from '@objectstack/cli/hook-body';
import caseHooks from '../src/service/objects/case.hook';
import {
  LEGACY_ESCALATION_TITLE_PREFIX, LEGACY_ESCALATION_TITLE_UNTITLED, LEGACY_STALL_TITLE_PREFIX,
  LEGACY_STALL_TITLE_PRIVATE, LEGACY_RENEWAL_TITLE_PREFIX, LEGACY_TITLE_CAP,
} from '../src/sales/objects/_legacy-task-titles';
import {
  hotcrmStack, signUpPerson, systemUpdate, runScheduledFlow, settleNotificationDeliveries, committedFile, type Person,
} from './helpers/verify-stack';

type Rec = Record<string, any>;

/**
 * Upgrade continuity for the three gates that find their own task (#2494,
 * #2522).
 *
 * The gates read `crm_task.automation_key` since the automatic titles became
 * text in the organization's language. A task written before that release
 * carries no key, so each gate also recognises a key-less task by the exact
 * English title the previous release wrote and matched
 * (`src/sales/objects/_legacy-task-titles.ts`). Each case below seeds such a
 * pre-release task — no key, the old title — and runs the gate: the sweep
 * books no second task, and closing the case completes it.
 */

const day = (daysFromNow: number): string => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
};

describe('the case hook\'s inline copy of the escalation titles is the shared one', () => {
  it('case_close_escalation_task spells both legacy titles exactly', () => {
    const hook = (caseHooks as Rec[]).find((h) => h.name === 'case_close_escalation_task')!;
    const { source } = extractHookBody(hook.handler, `hook '${String(hook.name)}'`);
    expect(source).toContain(`startsWith(${JSON.stringify(LEGACY_ESCALATION_TITLE_PREFIX)})`);
    expect(source).toContain(`=== ${JSON.stringify(LEGACY_ESCALATION_TITLE_UNTITLED)}`);
  });
});

let verify: VerifyStack;
let rep: Person;
let agent: Person;
let k = 0;

beforeAll(async () => {
  verify = await hotcrmStack();
  await verify.signIn();
  rep = await signUpPerson(verify, 'rep@legacy-task-titles.test', {
    name: 'Legacy Rep', positions: ['crm_sales_rep'], permissionSets: ['sales_rep'],
  });
  agent = await signUpPerson(verify, 'agent@legacy-task-titles.test', { name: 'Legacy Agent', permissionSets: ['service_agent'] });
}, 120_000);

const account = async (): Promise<Rec> =>
  (await verify.seed('crm_account', [{ name: `Legacy Co ${++k}`, tier: 'enterprise', owner_id: rep.id }]))[0]!;
const sweep = (flow: string) => settleNotificationDeliveries(verify, () => runScheduledFlow(verify, flow));
/** A task as the previous release wrote it: the English title, no `automation_key`. */
const preReleaseTask = async (doc: Rec): Promise<Rec> =>
  (await verify.seed('crm_task', [{ type: 'follow_up', status: 'not_started', owner_id: rep.id, ...doc }]))[0]!;

describe('the stall sweep recognises a pre-release stall task', { timeout: 60_000 }, () => {
  const stalled = async (over: Rec): Promise<Rec> => {
    const acct = await account();
    const [opp] = await verify.seed('crm_opportunity', [{
      name: `Legacy Stalled Deal ${++k}`, amount: 50_000, stage: 'proposal', close_date: '2030-06-30', crm_account: acct.id, owner_id: rep.id, ...over,
    }]);
    await systemUpdate(verify, 'crm_opportunity', { id: opp!.id, stage_entry_date: day(-30) });
    return opp!;
  };
  const openTasks = async (oppId: string) =>
    (await verify.rows('crm_task', { related_to_opportunity: oppId })).filter((t) => t.status !== 'completed');

  it('in each of its three old shapes, and books no second task', async () => {
    const named = await stalled({});
    const long = await stalled({ name: `Legacy Long Deal ${++k} `.padEnd(250, 'x') });
    const hidden = await stalled({ is_private: true });
    const cut = `${(LEGACY_STALL_TITLE_PREFIX + long.name).slice(0, LEGACY_TITLE_CAP - 1)}…`;
    for (const [opp, subject] of [
      [named, LEGACY_STALL_TITLE_PREFIX + named.name],
      [long, cut],
      [hidden, LEGACY_STALL_TITLE_PRIVATE],
    ] as const) {
      await preReleaseTask({ subject, priority: 'high', related_to_type: 'crm_opportunity', related_to_opportunity: opp.id });
    }
    await sweep('opportunity_stagnation');
    for (const opp of [named, long, hidden]) {
      const tasks = await openTasks(opp.id);
      expect(tasks, `a second stall task for ${opp.name.slice(0, 40)}`).toHaveLength(1);
      expect(tasks[0]!.automation_key ?? null).toBeNull();
    }
  });

  it('control: a key-less task under another title is not a stall task, so the deal is nudged', async () => {
    const opp = await stalled({});
    await preReleaseTask({ subject: 'Call the buyer', priority: 'high', related_to_type: 'crm_opportunity', related_to_opportunity: opp.id });
    await sweep('opportunity_stagnation');
    expect((await openTasks(opp.id)).map((t) => t.automation_key ?? null).sort()).toEqual([null, 'stalled_deal'].sort());
  });
});

describe('the renewal sweep recognises a pre-release renewal reminder', { timeout: 60_000 }, () => {
  it('and books no second reminder for that contract', async () => {
    const acct = await account();
    const [contact] = await verify.seed('crm_contact', [{
      first_name: 'Lia', last_name: `Legacy ${++k}`, email: `lia${k}@legacy-task-titles.test`, crm_account: acct.id, owner_id: rep.id,
    }]);
    const [contract] = await verify.seed('crm_contract', [{
      status: 'activated', crm_account: acct.id, crm_contact: contact!.id, owner_id: rep.id,
      contract_type: 'subscription', contract_value: 90_000, auto_renewal: false, renewal_notice_days: 30,
      name: 'Fixture Contract', contract_term_months: 12, start_date: day(20 - 365), end_date: day(20),
      billing_frequency: 'monthly', payment_terms: 'net_30', signed_copy: await committedFile(verify, rep.id),
    }]);
    await preReleaseTask({
      subject: `${LEGACY_RENEWAL_TITLE_PREFIX}${contract!.contract_number}`, priority: 'high',
      related_to_type: 'crm_account', related_to_account: acct.id,
    });
    await sweep('contract_renewal');
    const reminders = (await verify.rows('crm_task', { related_to_account: acct.id })).filter((t) => t.status !== 'completed');
    expect(reminders, 'a second renewal reminder for the contract').toHaveLength(1);
    expect(reminders[0]!.automation_key ?? null).toBeNull();
  });
});

describe('closing a case completes its pre-release escalation tasks', { timeout: 60_000 }, () => {
  it('in both old shapes, and leaves a key-less task under another title open', async () => {
    const acct = await account();
    const opened = await verify.hooks.run('crm_case', 'insert', {
      subject: `Legacy outage ${++k}`, description: 'Down since yesterday.', crm_account: acct.id, status: 'new', priority: 'medium',
    }, { as: agent.token });
    const [kase] = await verify.rows('crm_case', { id: opened.id });
    const onCase = { priority: 'urgent', related_to_type: 'crm_case', related_to_case: opened.id, related_to_account: acct.id };
    const titled = await preReleaseTask({ ...onCase, subject: `${LEGACY_ESCALATION_TITLE_PREFIX}${kase!.case_number} · ${kase!.subject}` });
    const untitled = await preReleaseTask({ ...onCase, subject: LEGACY_ESCALATION_TITLE_UNTITLED });
    const own = await preReleaseTask({ ...onCase, priority: 'normal', subject: 'Send the replacement part' });

    await verify.hooks.run('crm_case', 'update', { id: opened.id, status: 'closed', resolution: 'Restored.' }, { as: agent.token });
    await vi.waitFor(async () => {
      for (const task of [titled, untitled]) {
        const [row] = await verify.rows('crm_task', { id: task.id });
        expect(row?.status, `pre-release task "${String(task.subject)}" was not completed`).toBe('completed');
      }
    }, { timeout: 15_000, interval: 50 });
    const [mine] = await verify.rows('crm_task', { id: own.id });
    expect(mine?.status).toBe('not_started');
  });
});
