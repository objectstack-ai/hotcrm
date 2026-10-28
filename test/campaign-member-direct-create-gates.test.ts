// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import stack, { hookNamed } from './helpers/composed-stack';
import { hotcrmStack, signUpPerson, daysFromNow, runShippedHook, type Person } from './helpers/verify-stack';

type Rec = Record<string, any>;

/**
 * A member made without the enroll flows meets the same two gates (#2344).
 *
 * #2336 put both enrollment gates (a campaign that is not Planning or In
 * Progress, a person with Email Opt Out ticked) into the two enroll flows,
 * which Enroll Members and Add to Campaign reach the insert through. The
 * Campaign Members panel's **New**, an import run as the user and REST create
 * the member directly, and answered 201 on a Completed campaign with an
 * opted-out lead (measured on 18.2.0 at `0f17c6c`).
 * `campaign_member_enrollment_gate` now refuses those on the object.
 *
 * The gate is written twice, as CEL in the flows and as JS in the hook, because
 * a lowered hook body cannot import and a flow edge cannot call a hook. The
 * first block below is what holds the two copies together: it drives the flow
 * door and the REST door over EVERY campaign status `crm_campaign` declares and
 * both opt-out states, and asks for the same verdict in the same words. A
 * status added to the object later is driven through both without an edit
 * here.
 *
 * Every door is driven as a marketing user, who may enroll, through
 * `@objectstack/verify` over the shipped app; the panel's New is the same
 * `POST /api/v1/data/crm_campaign_member` the REST cases send.
 */

let verify: VerifyStack;
let marketer: Person;
let k = 0;

beforeAll(async () => {
  verify = await hotcrmStack();
  marketer = await signUpPerson(verify, 'marketer@campaign-member-direct-create-gates.test', {
    name: 'Direct Marketer', positions: ['marketing_user'], permissionSets: ['marketing_user'],
  });
}, 180_000);

const campaignOf = async (status: string): Promise<Rec> => (await verify.seed('crm_campaign', [{
  name: `Direct ${status} ${++k}`, status, start_date: daysFromNow(-30), end_date: daysFromNow(30), owner_id: marketer.id,
}]))[0]!;

const leadOf = async (over: Rec = {}): Promise<Rec> => (await verify.seed('crm_lead', [{
  first_name: 'Dee', last_name: `Direct ${++k}`, company: `Direct Co ${k}`, email: `lead${k}@campaign-member-direct-create-gates.test`,
  status: 'new', is_converted: false, email_opt_out: false, owner_id: marketer.id, ...over,
}]))[0]!;

const contactOf = async (over: Rec = {}): Promise<Rec> => {
  const [account] = await verify.seed('crm_account', [{ name: `Direct Account ${++k}`, owner_id: marketer.id }]);
  return (await verify.seed('crm_contact', [{
    first_name: 'Cy', last_name: `Direct ${k}`, crm_account: account!.id, department: 'engineering',
    email: `contact${k}@campaign-member-direct-create-gates.test`, email_opt_out: false, owner_id: marketer.id, ...over,
  }]))[0]!;
};

/** The flow door: Add to Campaign, which starts the side's enroll flow. */
const addLead = (leadId: string, campaignId: string) =>
  verify.actions.run('crm_lead', 'create_campaign', { as: marketer.token, recordId: leadId, params: { campaignId } }) as Promise<Rec>;
const addContact = (contactId: string, campaignId: string) =>
  verify.actions.run('crm_contact', 'add_contact_to_campaign', { as: marketer.token, recordId: contactId, params: { campaignId } }) as Promise<Rec>;

/** The direct doors: the panel's New and REST are this one request. */
const create = async (doc: Rec) => {
  const res = await verify.apiAs(marketer.token, 'POST', '/data/crm_campaign_member', doc);
  return { status: res.status, body: (await res.json()) as Rec };
};
const edit = async (id: string, doc: Rec) => {
  const res = await verify.apiAs(marketer.token, 'PATCH', `/data/crm_campaign_member/${id}`, doc);
  return { status: res.status, body: (await res.json()) as Rec };
};

const membersOf = (campaignId: string) => verify.rows('crm_campaign_member', { crm_campaign: campaignId });

const SIDES = [
  { side: 'lead', add: addLead, person: leadOf, column: 'crm_lead' },
  { side: 'contact', add: addContact, person: contactOf, column: 'crm_contact' },
] as const;

/** Every status the campaign object declares, read off the shipped metadata. */
const CAMPAIGN_STATUSES: string[] = ((((stack as Rec).objects as Rec[]).find((o) => o.name === 'crm_campaign')!
  .fields.status.options) as Rec[]).map((o) => String(o.value));

describe('the direct door answers as the flow door does (#2344)', () => {
  it('drives every declared campaign status, so a new one is checked on both doors', () => {
    expect(CAMPAIGN_STATUSES, 'the statuses the gate was written against').toEqual(
      expect.arrayContaining(['planning', 'in_progress', 'completed', 'aborted']),
    );
  });

  it.each(SIDES.flatMap((s) => CAMPAIGN_STATUSES.map((status) => [s.side, status, s] as const)))(
    '%s side, %s campaign: the same verdict, in the same words',
    async (_side, status, s) => {
      const campaign = await campaignOf(status);
      const viaFlow = await s.add((await s.person()).id, campaign.id);
      const person = await s.person();
      const direct = await create({ crm_campaign: campaign.id, [s.column]: person.id, status: 'sent' });

      if (viaFlow.status === 'refused') {
        expect([direct.status, direct.body?.code], JSON.stringify(direct.body)).toEqual([400, 'VALIDATION_FAILED']);
        expect(direct.body?.userMessage, 'the direct refusal reads as the flow refusal').toBe(viaFlow.refusalMessage);
        expect((await membersOf(campaign.id)).filter((m) => m[s.column] === person.id)).toHaveLength(0);
      } else {
        expect(viaFlow, 'fixture: the flow door enrolled').toMatchObject({ success: true, output: { enrolled: true } });
        expect(direct.status, JSON.stringify(direct.body)).toBe(201);
      }
    },
  );

  it.each(SIDES)('$side side, opted out: refused 403 in the flow\'s words, and no member is written', async (s) => {
    const campaign = await campaignOf('in_progress');
    const person = await s.person({ email_opt_out: true });
    const viaFlow = await s.add(person.id, campaign.id);
    expect(viaFlow, 'fixture: the flow door refused').toMatchObject({ status: 'refused' });

    const direct = await create({ crm_campaign: campaign.id, [s.column]: person.id, status: 'sent' });
    expect([direct.status, direct.body?.code], JSON.stringify(direct.body)).toEqual([403, 'FORBIDDEN']);
    expect(direct.body?.userMessage, 'the direct refusal reads as the flow refusal').toBe(viaFlow.refusalMessage);
    expect(await membersOf(campaign.id)).toHaveLength(0);
  });

  it('a closed campaign is named before an opted-out person, as the flows order them', async () => {
    const campaign = await campaignOf('completed');
    const direct = await create({ crm_campaign: campaign.id, crm_lead: (await leadOf({ email_opt_out: true })).id, status: 'sent' });
    expect([direct.status, direct.body?.code], JSON.stringify(direct.body)).toEqual([400, 'VALIDATION_FAILED']);
  });
});

describe('what still passes (#2344)', () => {
  it('a system write: the seed stores a member of a Completed campaign naming an opted-out lead', async () => {
    const campaign = await campaignOf('completed');
    const lead = await leadOf({ email_opt_out: true });
    await verify.seed('crm_campaign_member', [{ crm_campaign: campaign.id, crm_lead: lead.id, status: 'sent' }]);
    expect((await membersOf(campaign.id)).map((m) => m.crm_lead)).toEqual([lead.id]);
  });

  it('an edit that moves nothing: Responded on a Completed campaign\'s member, the form re-sending its campaign and lead', async () => {
    const campaign = await campaignOf('completed');
    const lead = await leadOf();
    const [member] = await verify.seed('crm_campaign_member', [{ crm_campaign: campaign.id, crm_lead: lead.id, status: 'sent' }]);
    const edited = await edit(member!.id, { crm_campaign: campaign.id, crm_lead: lead.id, status: 'responded' });
    expect(edited.status, JSON.stringify(edited.body)).toBe(200);
    expect((await verify.rows('crm_campaign_member', { id: member!.id }))[0]?.status).toBe('responded');
  });

  it('an edit that moves nothing: Unsubscribed on a member whose lead already opted out', async () => {
    const campaign = await campaignOf('in_progress');
    const lead = await leadOf({ email_opt_out: true });
    const [member] = await verify.seed('crm_campaign_member', [{ crm_campaign: campaign.id, crm_lead: lead.id, status: 'sent' }]);
    const edited = await edit(member!.id, { status: 'unsubscribed' });
    expect(edited.status, JSON.stringify(edited.body)).toBe(200);
  });
});

describe('an edit that moves a member is checked like a create (#2344)', () => {
  it('moving a member to a Completed campaign is refused, and the member stays where it was', async () => {
    const open = await campaignOf('in_progress');
    const closed = await campaignOf('completed');
    const [member] = await verify.seed('crm_campaign_member', [{ crm_campaign: open.id, crm_lead: (await leadOf()).id, status: 'sent' }]);
    const edited = await edit(member!.id, { crm_campaign: closed.id });
    expect([edited.status, edited.body?.code], JSON.stringify(edited.body)).toEqual([400, 'VALIDATION_FAILED']);
    expect((await verify.rows('crm_campaign_member', { id: member!.id }))[0]?.crm_campaign).toBe(open.id);
  });

  it('moving a member to an opted-out lead is refused, and the member keeps its lead', async () => {
    const campaign = await campaignOf('in_progress');
    const lead = await leadOf();
    const [member] = await verify.seed('crm_campaign_member', [{ crm_campaign: campaign.id, crm_lead: lead.id, status: 'sent' }]);
    const edited = await edit(member!.id, { crm_lead: (await leadOf({ email_opt_out: true })).id });
    expect([edited.status, edited.body?.code], JSON.stringify(edited.body)).toEqual([403, 'FORBIDDEN']);
    expect((await verify.rows('crm_campaign_member', { id: member!.id }))[0]?.crm_lead).toBe(lead.id);
  });
});

describe('the gate holds in the body that ships (#2344)', () => {
  // The boot above runs the hook in-process; the artifact ships its lowered
  // body and runs it in the runtime's QuickJS sandbox. These run that body.
  const gate = hookNamed('campaign_member_enrollment_gate');
  const insert = (input: Rec, as?: string): Promise<Rec | null> =>
    runShippedHook(verify, gate, { event: 'beforeInsert', as, input }).then(() => null, (e: Rec) => e);

  it('refuses a closed campaign and an opted-out person, with the envelope the REST door answers', async () => {
    const closed = await insert({ crm_campaign: (await campaignOf('aborted')).id, crm_lead: (await leadOf()).id }, marketer.token);
    expect([closed?.name, closed?.code, closed?.status]).toEqual(['SandboxError', 'VALIDATION_FAILED', 400]);
    const optedOut = await insert({ crm_campaign: (await campaignOf('planning')).id, crm_contact: (await contactOf({ email_opt_out: true })).id }, marketer.token);
    expect([optedOut?.name, optedOut?.code, optedOut?.status]).toEqual(['SandboxError', 'FORBIDDEN', 403]);
  });

  it('lets an open campaign and an opted-in person through, and lets a write with no user through', async () => {
    expect(await insert({ crm_campaign: (await campaignOf('in_progress')).id, crm_lead: (await leadOf()).id }, marketer.token)).toBeNull();
    expect(await insert({ crm_campaign: (await campaignOf('completed')).id, crm_lead: (await leadOf({ email_opt_out: true })).id })).toBeNull();
  });
});
