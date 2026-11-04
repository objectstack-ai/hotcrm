// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, vi } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { OpportunityApprovalFlow } from '../src/sales/flows/opportunity-approval.flow';
import { hotcrmStack, signUpPerson, settleNotificationDeliveries, type Person } from './helpers/verify-stack';

type Rec = Record<string, any>;

/**
 * One notice per approval decision (#2371 row 5).
 *
 * Measured on 18.2.0 before this change, in the console: a rep whose own deal
 * was approved got two inbox notices about it, the platform's "Request
 * approved" (`approval.approved`, written by
 * `ApprovalService.notifyDecisionOutcome` in `@objectstack/plugin-approvals`
 * 18.2.0 to the request's submitter, inbox only) and this flow's "Deal
 * approved" (`opportunity_approved`, inbox and email to the owner).
 *
 * The flow now emails the owner every time, since the platform sends no email,
 * and adds its inbox notice only when the owner is not the submitter the
 * platform tells: here, a deal another user raised over the threshold.
 * Put `inbox` back on `notify_approved` / `notify_rejected` and the first two
 * cases go red; drop `notify_*_inbox` and the third does.
 */

/**
 * The `topic` deliveries on `channel` to one user about one deal. The flow's
 * notices link the deal; the platform's link the deal's approval request.
 */
const deliveries = async (s: VerifyStack, userId: string, channel: string, topic: string, recordId: string): Promise<Rec[]> => {
  const requests = (await s.rows('sys_approval_request', { record_id: recordId })).map((r) => String(r.id));
  return (await s.rows('sys_notification_delivery', { recipient_id: userId, channel, topic })).filter((d) => {
    const url = String(d.payload?.actionUrl ?? '');
    return url === `/crm_opportunity/${recordId}` || requests.some((id) => url.endsWith(`request=${id}`));
  });
};

describe('the approval flow notifies the owner once per decision (#2371 row 5)', () => {
  let verify: VerifyStack;
  let rep: Person;
  let manager: Person;
  let admin: Person;
  let accountId = '';
  let k = 0;

  beforeAll(async () => {
    verify = await hotcrmStack();
    const adminToken = await verify.signIn();
    admin = { token: adminToken, id: String((await verify.contextFor(adminToken)).userId) } as Person;
    rep = await signUpPerson(verify, 'rep@approval-one-notice.test', {
      name: 'One Notice Rep', positions: ['sales_rep'], permissionSets: ['sales_rep'],
    });
    manager = await signUpPerson(verify, 'manager@approval-one-notice.test', {
      name: 'One Notice Manager', positions: ['sales_manager'], permissionSets: ['sales_manager'],
    });
    const [account] = await verify.seed('crm_account', [{ name: 'One Notice Co', owner_id: rep.id, approval_status: 'approved' }]);
    accountId = String(account!.id);
  }, 180_000);

  /** A rep's deal raised over the threshold by `by`: the request is `by`'s. */
  const raised = async (by: Person): Promise<string> => {
    const [deal] = await verify.seed('crm_opportunity', [{
      name: `One Notice Deal ${++k}`, stage: 'proposal', amount: 42_000, close_date: '2030-06-30',
      crm_account: accountId, owner_id: rep.id,
    }]);
    const id = String(deal!.id);
    await settleNotificationDeliveries(verify, async () => {
      await verify.hooks.run('crm_opportunity', 'update', { id, amount: 150_000 }, { as: by.token });
    });
    return id;
  };

  const decide = async (id: string, verb: 'approve' | 'reject'): Promise<void> => {
    let open: Rec[] = [];
    await vi.waitFor(async () => {
      open = (await verify.rows('sys_approval_request', { record_id: id })).filter((r) => r.status === 'pending');
      expect(open, 'the deal has no single open approval request').toHaveLength(1);
    }, { timeout: 15_000, interval: 100 });
    await settleNotificationDeliveries(verify, async () => {
      const res = await verify.apiAs(manager.token, 'POST', `/approvals/requests/${open[0]!.id}/${verb}`, { comment: `${verb} by test.` });
      expect(res.status, await res.clone().text()).toBe(200);
    });
  };

  it('emails the owner on both outcomes, and notifies the inbox only from a decision node', () => {
    const node = (id: string): Rec => OpportunityApprovalFlow.nodes.find((n) => n.id === id)! as Rec;
    expect(node('notify_approved').config.channels).toEqual(['email']);
    expect(node('notify_rejected').config.channels).toEqual(['email']);
    expect(node('notify_approved_inbox').config.channels).toEqual(['inbox']);
    expect(node('notify_rejected_inbox').config.channels).toEqual(['inbox']);
  });

  it.each([
    ['approve', 'approval.approved', 'opportunity_approved'],
    ['reject', 'approval.rejected', 'opportunity_rejected'],
  ] as const)('the rep raised their own deal, %s: one inbox notice (the platform\'s) and the email', async (verb, platformTopic, flowTopic) => {
    const id = await raised(rep);
    await decide(id, verb);
    expect(await deliveries(verify, rep.id, 'inbox', platformTopic, id), 'the platform\'s notice').toHaveLength(1);
    expect(await deliveries(verify, rep.id, 'inbox', flowTopic, id), 'the flow\'s second inbox notice').toEqual([]);
    expect(await deliveries(verify, rep.id, 'email', flowTopic, id), 'the flow\'s email').toHaveLength(1);
  });

  it('someone else raised the rep\'s deal: the rep still gets the inbox notice, from the flow', async () => {
    const id = await raised(admin);
    await decide(id, 'approve');
    expect(await deliveries(verify, rep.id, 'inbox', 'approval.approved', id), 'the platform tells the submitter, not the rep').toEqual([]);
    expect(await deliveries(verify, admin.id, 'inbox', 'approval.approved', id), 'the submitter\'s notice').toHaveLength(1);
    expect(await deliveries(verify, rep.id, 'inbox', 'opportunity_approved', id), 'the owner\'s notice').toHaveLength(1);
    expect(await deliveries(verify, rep.id, 'email', 'opportunity_approved', id)).toHaveLength(1);
  });
});
