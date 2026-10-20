// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import { bootStack, type VerifyStack } from '@objectstack/verify';
import artifact from '../objectstack.config';
import {
  hotcrmStack, buildArtifactAgain, bootOptions, signUpPerson, systemUpdate, flowRuns, type Person,
} from './helpers/verify-stack';

type Rec = Record<string, any>;

/**
 * An approval decision is recorded as the person who decided it (#2061 item 2).
 *
 * Every approval node in this app names an `approvalStatusField`, and the
 * platform's mirror writes the decision onto that column as the DECIDER:
 * `updated_by` becomes the approver, and the audit row for the verdict names
 * them. Each flow then resumed into an `update_record` that wrote the same
 * verdict again. That write runs as the run's trigger user, who is the
 * SUBMITTER, so it changed no value but stamped `updated_by` back to the
 * submitter. The record's Last Modified By then named the rep for a decision
 * their manager made.
 *
 * Measured on 18.0.0-next.3, with a rep submitting and a Sales Manager
 * deciding, on every decision branch of the five approval flows. The audit
 * trail was right throughout: the restating write changed no column, so it
 * left no audit row. Only `updated_by` was wrong, and only where the node
 * restated the verdict and nothing else. Those nodes are gone: both branches of
 * `account_approval` and `lead_conversion_approval`, the rejection of
 * `opportunity_approval` and the approval of
 * `opportunity_qualification_approval`. Each is pinned below.
 *
 * ⚠️ The post-decision writes that write a value of their own (an approval
 * date, the stage, a cleared request) stay. Through 18.0.0-next.5 they stamped
 * `updated_by` as the submitter. From 18.0.0 the platform runs the nodes after
 * a decision as the person who decided (objectstack changeset
 * `24321-resume-as-decider`), and measured on 18.0.0 `mark_approved` stamps
 * the approver. Who a resumed run's writes are attributed to is the
 * platform's question, not this app's, so ⛔ nothing here pins either answer
 * for those branches. Only their own values are pinned.
 */

let verify: VerifyStack;
let rep: Person;
let manager: Person;
let accountId: string;
let k = 0;

const people = async (s: VerifyStack, tag: string) => ({
  rep: await signUpPerson(s, `rep-${tag}@approval-decision-attribution.test`, {
    name: 'Attribution Rep', positions: ['sales_rep'], permissionSets: ['sales_rep'],
  }),
  // Holds the bench every one of these approval nodes routes to, so the
  // decision is a real approver's, not an admin rescue.
  manager: await signUpPerson(s, `manager-${tag}@approval-decision-attribution.test`, {
    name: 'Attribution Manager', positions: ['sales_manager'], permissionSets: ['sales_manager'],
  }),
});

beforeAll(async () => {
  verify = await hotcrmStack();
  ({ rep, manager } = await people(verify, 'app'));
  const [account] = await verify.seed('crm_account', [{ name: 'Attribution Co', owner_id: rep.id, approval_status: 'approved' }]);
  accountId = String(account!.id);
}, 120_000);

const stored = async (s: VerifyStack, object: string, id: string): Promise<Rec> => (await s.rows(object, { id }))[0]!;

/**
 * Decide the record's one open request as `decider`, and return the record as
 * stored afterwards. Guards the guard first: the request was submitted by
 * someone else, and `updated_by` names that submitter before the decision, so
 * an `updated_by` of the decider afterwards is the decision's doing.
 */
const decide = async (
  s: VerifyStack,
  object: string,
  id: string,
  decision: 'approve' | 'reject',
  who: { rep: Person; manager: Person },
): Promise<Rec> => {
  const open = (await s.rows('sys_approval_request', { record_id: id })).filter((r) => r.status === 'pending');
  expect(open, 'the record has no single open approval request').toHaveLength(1);
  expect(open[0]!.submitter_id, 'the submitter is not the rep').toBe(who.rep.id);
  expect((await stored(s, object, id)).updated_by, 'the rep did not write the record last before the decision').toBe(who.rep.id);
  const res = await s.apiAs(who.manager.token, 'POST', `/approvals/requests/${open[0]!.id}/${decision}`, { comment: `${decision}d.` });
  expect(res.status, await res.clone().text()).toBe(200);
  return stored(s, object, id);
};

const VERDICT = { approve: 'approved', reject: 'rejected' } as const;

describe('account_approval: both decisions are the approver\'s', () => {
  it.each(['approve', 'reject'] as const)('%s lands the verdict and leaves `updated_by` as the approver', async (decision) => {
    const res = await verify.apiAs(rep.token, 'POST', '/data/crm_account', { name: `Attribution ${decision} ${++k} Co` });
    expect(res.status, await res.clone().text()).toBe(201);
    const body: Rec = await res.json();
    const id = String((body.record ?? body.data ?? body).id);

    const after = await decide(verify, 'crm_account', id, decision, { rep, manager });
    expect(after.approval_status).toBe(VERDICT[decision]);
    expect(after.updated_by, 'a post-decision write re-stamped the submitter').toBe(manager.id);
    const [run] = await flowRuns(verify, 'account_approval', id);
    expect(run?.status, String(run?.error ?? '')).toBe('completed');
  });
});

describe('opportunity_approval: a rejection is the approver\'s, an approval still stamps its date', () => {
  // Born over the line, so the insert-time twin opens the request; both share
  // these nodes and edges.
  const bigDeal = async (): Promise<string> => {
    const deal = await verify.hooks.run('crm_opportunity', 'insert', {
      name: `Attribution Deal ${++k}`, stage: 'negotiation', amount: 150_000, close_date: '2030-06-30',
      crm_account: accountId, owner_id: rep.id,
    }, { as: rep.token });
    return String(deal.id);
  };

  it('reject lands `rejected` and leaves `updated_by` as the approver', async () => {
    const after = await decide(verify, 'crm_opportunity', await bigDeal(), 'reject', { rep, manager });
    expect(after.approval_status).toBe('rejected');
    expect(after.approved_date ?? null).toBeNull();
    expect(after.updated_by, 'a post-decision write re-stamped the submitter').toBe(manager.id);
  });

  it('approve lands `approved` and the approval date, which only `mark_approved` writes', async () => {
    const after = await decide(verify, 'crm_opportunity', await bigDeal(), 'approve', { rep, manager });
    expect(after.approval_status).toBe('approved');
    expect(after.approved_date, 'the approval date was not stamped').toBeTruthy();
  });
});

describe('opportunity_qualification_approval: an approval is the approver\'s', () => {
  it('approve lands `approved`, keeps the request ticked, and leaves `updated_by` as the approver', async () => {
    const [deal] = await verify.seed('crm_opportunity', [{
      name: `Attribution Qualification ${++k}`, stage: 'qualification', amount: 100, close_date: '2030-06-30',
      crm_account: accountId, owner_id: rep.id,
    }]);
    const id = String(deal!.id);
    // Armed as an install arms it: the verdict column is `readonly`, so only a
    // system write can put it in a state. The rep's own tick is the request.
    await systemUpdate(verify, 'crm_opportunity', { id, qualification_approval_status: 'pending', qualification_requested: false });
    await verify.hooks.run('crm_opportunity', 'update', { id, qualification_requested: true }, { as: rep.token });

    const after = await decide(verify, 'crm_opportunity', id, 'approve', { rep, manager });
    expect(after.qualification_approval_status).toBe('approved');
    expect(after.qualification_requested).toBe(true);
    expect(after.updated_by, 'a post-decision write re-stamped the submitter').toBe(manager.id);
  });
});

/**
 * The lead gate ships OFF (REQ-0005), so it is measured on an install that has
 * armed it, the one way an install does: `crm_lead.conversion_approval_status`
 * defaults to `pending`. A second boot, from a fresh build of the app's
 * configuration (`buildArtifactAgain`), because one configuration object holds
 * one live kernel.
 */
const armedLeadGate = (base: typeof artifact): typeof artifact => {
  const a = base as unknown as Rec;
  return {
    ...a,
    packages: (a.packages as Rec[]).map((p) => ({
      ...p,
      manifest: {
        ...p.manifest,
        objects: ((p.manifest.objects ?? []) as Rec[]).map((o) => (o.name !== 'crm_lead' ? o : {
          ...o,
          fields: {
            ...o.fields,
            conversion_approval_status: { ...o.fields.conversion_approval_status, defaultValue: 'pending' },
          },
        })),
      },
    })),
  } as typeof artifact;
};

describe('lead_conversion_approval (gate armed): both decisions are the approver\'s', () => {
  let armed: VerifyStack;
  let who: { rep: Person; manager: Person };
  beforeAll(async () => {
    armed = await bootStack(armedLeadGate(await buildArtifactAgain()), bootOptions());
    who = await people(armed, 'armed');
  }, 120_000);

  it('this boot really ships the gate armed', () => {
    // Guard the guard: on the shipped default no lead is ever born `pending`,
    // and every assertion below would be about a request that never opened.
    expect(armed.metadata.object('crm_lead')?.fields?.conversion_approval_status?.defaultValue).toBe('pending');
  });

  it.each(['approve', 'reject'] as const)('%s lands the verdict and leaves `updated_by` as the approver', async (decision) => {
    const company = `Attribution Lead ${decision} ${++k}`;
    const lead = await armed.hooks.run('crm_lead', 'insert', {
      company, email: `buyer${k}@attribution-${decision}.example.com`, first_name: 'Joe', last_name: 'Green',
      phone: '555', title: 'Buyer', lead_source: 'web', status: 'new',
    }, { as: who.rep.token });
    const id = String(lead.id);

    const after = await decide(armed, 'crm_lead', id, decision, who);
    expect(after.conversion_approval_status).toBe(VERDICT[decision]);
    expect(after.updated_by, 'a post-decision write re-stamped the submitter').toBe(who.manager.id);
    const [run] = await flowRuns(armed, 'lead_conversion_approval', id);
    expect(run?.status, String(run?.error ?? '')).toBe('completed');
  });
});
