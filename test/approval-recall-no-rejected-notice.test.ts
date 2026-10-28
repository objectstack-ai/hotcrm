// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, vi } from 'vitest';
import { bootStack, type VerifyStack } from '@objectstack/verify';
import {
  hotcrmStack, buildArtifactAgain, armedLeadGate, bootOptions, signUpPerson, flowRuns, notificationsTo,
  settleNotificationDeliveries, type Person,
} from './helpers/verify-stack';

type Rec = Record<string, any>;

/**
 * A recall is not a rejection (#2349).
 *
 * `@objectstack/plugin-approvals` 18.2.0 `ApprovalService.recall` resumes the
 * waiting run down the approval node's `reject` edge, with
 * `output.decision = 'recall'` (a rejection resumes the same edge with
 * `decision = 'reject'`). In `opportunity_approval`, `account_approval` and
 * `lead_conversion_approval` that edge went straight to `notify_rejected`, so a
 * rep who took their own request back was told an approver had turned it down,
 * in the inbox and (for a deal) by email. Measured on 18.2.0 before this change:
 * every recall below wrote the flow's "rejected" notice.
 *
 * The resume lands the decision as the flow variable `<nodeId>.decision`, which
 * an edge reads as `vars.<nodeId>.decision`. Each reject edge is now a
 * partitioned pair: a recall ends the run, anything else notifies as before.
 * The other two approval flows route reject to `clear_request` and notify on
 * neither, so they are not here.
 *
 * Every case drives the real door — `POST /approvals/requests/{id}/recall` as
 * the submitter, `/reject` as the approver — and reads the notifications off
 * the messaging outbox (`notificationsTo`), which `notify` writes inside the
 * resumed run.
 */

const people = async (s: VerifyStack, tag: string) => ({
  rep: await signUpPerson(s, `rep-${tag}@approval-recall.test`, {
    name: 'Recall Rep', positions: ['sales_rep'], permissionSets: ['sales_rep'],
  }),
  manager: await signUpPerson(s, `manager-${tag}@approval-recall.test`, {
    name: 'Recall Manager', positions: ['sales_manager'], permissionSets: ['sales_manager'],
  }),
});

type Who = Awaited<ReturnType<typeof people>>;
type Verb = 'recall' | 'reject' | 'approve';

/** The record's one pending request, acted on through the approvals door. */
const act = async (s: VerifyStack, id: string, who: Person, verb: Verb): Promise<void> => {
  let open: Rec[] = [];
  await vi.waitFor(async () => {
    open = (await s.rows('sys_approval_request', { record_id: id })).filter((r) => r.status === 'pending');
    expect(open, 'the record has no single open approval request').toHaveLength(1);
  }, { timeout: 15_000, interval: 100 });
  await settleNotificationDeliveries(s, async () => {
    const res = await s.apiAs(who.token, 'POST', `/approvals/requests/${open[0]!.id}/${verb}`, { comment: `${verb} by test.` });
    expect(res.status, await res.clone().text()).toBe(200);
  });
};

/** The `topic` notices the record's owner was sent about this one record. */
const noticesAbout = async (s: VerifyStack, owner: Person, topic: string, object: string, id: string): Promise<Rec[]> =>
  (await notificationsTo(s, owner.id, topic)).filter((n) => n.payload?.actionUrl === `/${object}/${id}`);

/** The run behind the record, finished, and whether its `notify_rejected` node ran. */
const finishedRun = async (s: VerifyStack, flow: string, id: string): Promise<{ notifiedRejected: boolean }> => {
  const runs = await flowRuns(s, flow, id);
  expect(runs, `not one ${flow} run for the record`).toHaveLength(1);
  expect(runs[0]!.status, String(runs[0]!.error ?? '')).toBe('completed');
  const nodes = (runs[0]!.summary?.nodes ?? []) as Rec[];
  return { notifiedRejected: nodes.some((n) => n.nodeId === 'notify_rejected' && n.runs > 0) };
};

describe('opportunity_approval: a recall ends the run without the rejected notice', () => {
  let verify: VerifyStack;
  let who: Who;
  let director: Person;
  let accountId: string;
  let k = 0;
  beforeAll(async () => {
    verify = await hotcrmStack();
    who = await people(verify, 'opp');
    // `director_signoff` routes here, so the second tier is a real approver's.
    director = await signUpPerson(verify, 'director-opp@approval-recall.test', {
      name: 'Recall Director', positions: ['sales_director'], permissionSets: ['sales_manager'],
    });
    const [account] = await verify.seed('crm_account', [{ name: 'Recall Co', owner_id: who.rep.id, approval_status: 'approved' }]);
    accountId = String(account!.id);
  }, 180_000);

  /** A rep's deal raised across the line by the rep: the request is theirs, pending. */
  const dealInApproval = async (amount: number): Promise<string> => {
    const [deal] = await verify.seed('crm_opportunity', [{
      name: `Recall Deal ${++k}`, stage: 'proposal', amount: 42_000, close_date: '2030-06-30',
      crm_account: accountId, owner_id: who.rep.id,
    }]);
    const id = String(deal!.id);
    await verify.hooks.run('crm_opportunity', 'update', { id, amount }, { as: who.rep.token });
    return id;
  };

  it('recalling at Sales Manager review (e4) sends no notice', async () => {
    const id = await dealInApproval(120_000);
    await act(verify, id, who.rep, 'recall');
    expect((await verify.rows('sys_approval_request', { record_id: id })).map((r) => r.status)).toEqual(['recalled']);
    expect(await noticesAbout(verify, who.rep, 'opportunity_rejected', 'crm_opportunity', id)).toEqual([]);
    expect(await finishedRun(verify, 'opportunity_approval', id)).toEqual({ notifiedRejected: false });
  });

  it('recalling at Sales Director sign-off (e8) sends no notice', async () => {
    const id = await dealInApproval(600_000);
    await act(verify, id, who.manager, 'approve');
    await act(verify, id, who.rep, 'recall');
    expect((await verify.rows('sys_approval_request', { record_id: id })).map((r) => r.status).sort()).toEqual(['approved', 'recalled']);
    expect(await noticesAbout(verify, who.rep, 'opportunity_rejected', 'crm_opportunity', id)).toEqual([]);
    expect(await finishedRun(verify, 'opportunity_approval', id)).toEqual({ notifiedRejected: false });
  });

  it('a Sales Manager\'s rejection still notifies the owner, once', async () => {
    const id = await dealInApproval(120_000);
    await act(verify, id, who.manager, 'reject');
    expect(await noticesAbout(verify, who.rep, 'opportunity_rejected', 'crm_opportunity', id)).toHaveLength(1);
    expect(await finishedRun(verify, 'opportunity_approval', id)).toEqual({ notifiedRejected: true });
  });

  it('a Sales Director\'s rejection still notifies the owner, once', async () => {
    const id = await dealInApproval(600_000);
    await act(verify, id, who.manager, 'approve');
    await act(verify, id, director, 'reject');
    expect(await noticesAbout(verify, who.rep, 'opportunity_rejected', 'crm_opportunity', id)).toHaveLength(1);
    expect(await finishedRun(verify, 'opportunity_approval', id)).toEqual({ notifiedRejected: true });
  });
});

describe('account_approval: a recall ends the run without the rejected notice', () => {
  let verify: VerifyStack;
  let who: Who;
  let k = 0;
  beforeAll(async () => {
    verify = await hotcrmStack();
    who = await people(verify, 'account');
  }, 180_000);

  /** An account a rep creates on the New form: born blank, so its request opens, submitted by the rep. */
  const accountInApproval = async (): Promise<string> => {
    const res = await verify.apiAs(who.rep.token, 'POST', '/data/crm_account', { name: `Recall Account ${++k} Co` });
    expect(res.status, await res.clone().text()).toBe(201);
    const body: Rec = await res.json();
    return String((body.record ?? body.data ?? body).id);
  };

  it('recalling sends no notice', async () => {
    const id = await accountInApproval();
    await act(verify, id, who.rep, 'recall');
    expect((await verify.rows('sys_approval_request', { record_id: id })).map((r) => r.status)).toEqual(['recalled']);
    expect(await noticesAbout(verify, who.rep, 'account_rejected', 'crm_account', id)).toEqual([]);
    expect(await finishedRun(verify, 'account_approval', id)).toEqual({ notifiedRejected: false });
  });

  it('a Sales Manager\'s rejection still notifies the owner, once', async () => {
    const id = await accountInApproval();
    await act(verify, id, who.manager, 'reject');
    expect(await noticesAbout(verify, who.rep, 'account_rejected', 'crm_account', id)).toHaveLength(1);
    expect(await finishedRun(verify, 'account_approval', id)).toEqual({ notifiedRejected: true });
  });
});

describe('lead_conversion_approval (gate armed): a recall ends the run without the rejected notice', () => {
  let armed: VerifyStack;
  let who: Who;
  let k = 0;
  beforeAll(async () => {
    armed = await bootStack(armedLeadGate(await buildArtifactAgain()), bootOptions());
    who = await people(armed, 'lead');
  }, 180_000);

  it('this boot really ships the gate armed', () => {
    expect(armed.metadata.object('crm_lead')?.fields?.conversion_approval_status?.defaultValue).toBe('pending');
  });

  /** A lead the rep creates on the armed install: born `pending`, so its request opens, submitted by the rep. */
  const leadInApproval = async (): Promise<string> => {
    const lead = await armed.hooks.run('crm_lead', 'insert', {
      company: `Recall Lead ${++k}`, email: `buyer${k}@recall-lead.example.com`, first_name: 'Joe', last_name: 'Green',
      phone: '555', title: 'Buyer', lead_source: 'web', status: 'new',
    }, { as: who.rep.token });
    return String(lead.id);
  };

  it('recalling sends no notice', async () => {
    const id = await leadInApproval();
    await act(armed, id, who.rep, 'recall');
    expect((await armed.rows('sys_approval_request', { record_id: id })).map((r) => r.status)).toEqual(['recalled']);
    expect(await noticesAbout(armed, who.rep, 'lead_conversion_rejected', 'crm_lead', id)).toEqual([]);
    expect(await finishedRun(armed, 'lead_conversion_approval', id)).toEqual({ notifiedRejected: false });
  });

  it('a Sales Manager\'s rejection still notifies the owner, once', async () => {
    const id = await leadInApproval();
    await act(armed, id, who.manager, 'reject');
    expect(await noticesAbout(armed, who.rep, 'lead_conversion_rejected', 'crm_lead', id)).toHaveLength(1);
    expect(await finishedRun(armed, 'lead_conversion_approval', id)).toEqual({ notifiedRejected: true });
  });
});
