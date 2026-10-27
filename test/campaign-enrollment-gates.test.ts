// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, vi } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import stack from './helpers/composed-stack';
import { hotcrmStack, signUpPerson, daysFromNow, type Person } from './helpers/verify-stack';

type Rec = Record<string, any>;

/**
 * The one enrollment door holds both gates, and a member is one person (#2336).
 *
 * Found by the #2320 browser pass (track 4, D1 and D2). Add to Campaign on a
 * lead or a contact starts the side's enroll flow directly, and until #2336
 * those flows checked neither the campaign's status nor the person's
 * `email_opt_out`. Only Enroll Members did. So the row menu enrolled a lead
 * into a Completed campaign, which moved that campaign's recorded `num_sent`,
 * `num_leads` and response rate, and put a lead who had opted out of email
 * on a send list. And `crm_campaign_member` had only an "at least one" rule,
 * so an edit could store a Lead and a Contact on the same member.
 *
 * Each door is driven the way its caller drives it, through
 * `@objectstack/verify` over the shipped app, as a marketing user (who may
 * enroll), and the stored rows are read back.
 */

let verify: VerifyStack;
let marketer: Person;
let manager: Person;
let k = 0;

beforeAll(async () => {
  verify = await hotcrmStack();
  marketer = await signUpPerson(verify, 'marketer@campaign-enrollment-gates.test', {
    name: 'Gates Marketer', positions: ['marketing_user'], permissionSets: ['marketing_user'],
  });
  manager = await signUpPerson(verify, 'manager@campaign-enrollment-gates.test', {
    name: 'Gates Manager', positions: ['sales_manager'], permissionSets: ['sales_manager'],
  });
}, 180_000);

const campaignOf = async (status: string): Promise<Rec> => (await verify.seed('crm_campaign', [{
  name: `Gates ${status} ${++k}`, status, start_date: daysFromNow(-30), end_date: daysFromNow(30), owner_id: marketer.id,
}]))[0]!;

const leadOf = async (over: Rec = {}, owner: Person = marketer): Promise<Rec> => (await verify.seed('crm_lead', [{
  first_name: 'Leo', last_name: `Gates ${++k}`, company: `Gates Co ${k}`, email: `lead${k}@campaign-enrollment-gates.test`,
  status: 'new', is_converted: false, email_opt_out: false, owner_id: owner.id, ...over,
}]))[0]!;

const contactOf = async (over: Rec = {}): Promise<Rec> => {
  const [account] = await verify.seed('crm_account', [{ name: `Gates Account ${++k}`, owner_id: marketer.id }]);
  return (await verify.seed('crm_contact', [{
    first_name: 'Cora', last_name: `Gates ${k}`, crm_account: account!.id, department: 'engineering',
    email: `contact${k}@campaign-enrollment-gates.test`, email_opt_out: false, owner_id: marketer.id, ...over,
  }]))[0]!;
};

const addLead = (leadId: string, campaignId: string) =>
  verify.actions.run('crm_lead', 'create_campaign', { as: marketer.token, recordId: leadId, params: { campaignId } }) as Promise<Rec>;
const addContact = (contactId: string, campaignId: string) =>
  verify.actions.run('crm_contact', 'add_contact_to_campaign', { as: marketer.token, recordId: contactId, params: { campaignId } }) as Promise<Rec>;

const membersOf = (campaignId: string) => verify.rows('crm_campaign_member', { crm_campaign: campaignId });

/** The recorded numbers marketing reads a campaign's ROI from. */
const METRICS = ['num_sent', 'num_leads', 'num_responses', 'num_converted_leads', 'response_rate'] as const;
const metricsOf = async (campaignId: string): Promise<Rec> => {
  const [row] = await verify.rows('crm_campaign', { id: campaignId });
  return Object.fromEntries(METRICS.map((m) => [m, row?.[m] ?? null]));
};

const SIDES = [
  { side: 'lead', add: addLead, person: () => leadOf(), column: 'crm_lead' },
  { side: 'contact', add: addContact, person: () => contactOf(), column: 'crm_contact' },
] as const;

describe('Add to Campaign refuses a campaign that is not open (#2336 D1)', () => {
  it.each(SIDES.flatMap((s) => (['completed', 'aborted'] as const).map((status) => [s.side, status, s] as const)))(
    '%s side, %s campaign: refused, naming the campaign, nobody enrolled, metrics unchanged',
    async (_side, status, s) => {
      const campaign = await campaignOf(status);
      // A member it took while it ran, so the campaign has numbers to keep.
      await verify.seed('crm_campaign_member', [{ crm_campaign: campaign.id, crm_lead: (await leadOf()).id, status: 'sent' }]);
      const [closed] = await verify.rows('crm_campaign', { id: campaign.id });
      const before = await vi.waitFor(async () => {
        const m = await metricsOf(campaign.id);
        expect(m.num_sent, 'fixture: the campaign recorded its member').toBe(1);
        return m;
      }, { timeout: 10_000, interval: 50 });

      const person = await s.person();
      const answer = await s.add(person.id, campaign.id);

      expect(answer).toMatchObject({ success: true, status: 'refused', output: { enrolled: false } });
      expect(answer.refusalMessage, 'the refusal names the campaign').toContain(String(closed!.display_title));
      const rows = (await membersOf(campaign.id)).filter((m) => m[s.column] === person.id);
      expect(rows, `the ${status} campaign took a member`).toHaveLength(0);
      expect(await metricsOf(campaign.id), `the ${status} campaign's recorded metrics moved`).toEqual(before);
    },
  );

  it.each(SIDES)('$side side, planning campaign: enrolls (the control)', async (s) => {
    const campaign = await campaignOf('planning');
    const person = await s.person();
    expect(await s.add(person.id, campaign.id)).toMatchObject({ success: true, output: { enrolled: true } });
    expect((await membersOf(campaign.id)).filter((m) => m[s.column] === person.id)).toHaveLength(1);
  });
});

describe('Add to Campaign refuses a person who opted out of email (#2336 D1)', () => {
  it('lead side: refused, naming the lead, and no member is written', async () => {
    const campaign = await campaignOf('in_progress');
    const lead = await leadOf({ email_opt_out: true });
    const answer = await addLead(lead.id, campaign.id);
    expect(answer).toMatchObject({ success: true, status: 'refused', output: { enrolled: false } });
    expect(answer.refusalMessage, 'the refusal names the lead').toContain(`${lead.first_name} ${lead.last_name}`);
    expect(await membersOf(campaign.id)).toHaveLength(0);
  });

  it('contact side: refused, naming the contact, and no member is written', async () => {
    const campaign = await campaignOf('in_progress');
    const contact = await contactOf({ email_opt_out: true });
    const [stored] = await verify.rows('crm_contact', { id: contact.id });
    const answer = await addContact(contact.id, campaign.id);
    expect(answer).toMatchObject({ success: true, status: 'refused', output: { enrolled: false } });
    expect(answer.refusalMessage, 'the refusal names the contact').toContain(String(stored!.full_name));
    expect(await membersOf(campaign.id)).toHaveLength(0);
  });

  it.each(SIDES)('$side side, opted in: enrolls (the control)', async (s) => {
    const campaign = await campaignOf('in_progress');
    const person = await s.person();
    expect(await s.add(person.id, campaign.id)).toMatchObject({ success: true, output: { enrolled: true } });
    expect(await membersOf(campaign.id)).toHaveLength(1);
  });
});

/**
 * Enroll Members still SKIPS an opted-out person: its own query filter keeps
 * them out of the loop, so the run is clean and nobody is counted refused.
 * The order matters on 18.2.0 because a refusal inside the loop's guarded
 * region would be counted as a refused person (measured with the filter
 * removed: the run ended `refused`, the opted-out leads counted as refused).
 */
describe('Enroll Members counts an opted-out person as skipped, not refused (#2336)', () => {
  it('a segment holding an opted-out lead ends clean, with the static success message', async () => {
    const campaign = await campaignOf('in_progress');
    const status = 'contacted';
    const optedIn = await leadOf({ status });
    const optedOut = await leadOf({ status, email_opt_out: true });
    const run = await verify.flows.run('campaign_enrollment', { recordId: campaign.id }, { as: marketer.token });
    const result = await verify.flows.resume(run, { memberSource: 'leads', leadStatus: status, contactDepartment: 'engineering' }, { as: marketer.token }) as Rec;
    expect(result.status, 'a skipped person ended the run refused').not.toBe('refused');
    expect(result.successMessage).toBe('Eligible members enrolled in campaign.');
    const enrolled = (await membersOf(campaign.id)).map((m) => m.crm_lead);
    expect(enrolled).toContain(optedIn.id);
    expect(enrolled).not.toContain(optedOut.id);
  });
});

describe('the Add to Campaign picker lists only open campaigns (#2336)', () => {
  const member = ((stack as Rec).objects as Rec[]).find((o) => o.name === 'crm_campaign_member')!;
  const actions: Rec[] = (stack as Rec).actions ?? [];

  it('the campaign field the pickers resolve from filters to Planning and In Progress', () => {
    expect(member.fields.crm_campaign.lookupFilters).toEqual([
      { field: 'status', operator: 'in', value: ['planning', 'in_progress'] },
    ]);
  });

  it.each(['create_campaign', 'add_contact_to_campaign'])('%s resolves its campaign param from that field', (name) => {
    const action = actions.find((a) => a.name === name)!;
    expect(action.params).toEqual([expect.objectContaining({ name: 'campaignId', field: 'crm_campaign', objectOverride: 'crm_campaign_member' })]);
  });
});

describe('a campaign member carries a Lead or a Contact, not both (#2336 D2)', () => {
  /** The console's own doors: the member form's create and its edit. */
  const create = async (doc: Rec) => {
    const res = await verify.apiAs(marketer.token, 'POST', '/data/crm_campaign_member', doc);
    return { status: res.status, body: (await res.json()) as Rec };
  };
  const edit = async (id: string, doc: Rec) => {
    const res = await verify.apiAs(marketer.token, 'PATCH', `/data/crm_campaign_member/${id}`, doc);
    return { status: res.status, body: (await res.json()) as Rec };
  };
  const idOf = (body: Rec): string => String(body?.id ?? body?.data?.id ?? body?.record?.id);
  /** The envelope names no rule, so the rule is told apart by its own declared message. */
  const exclusive = (((stack as Rec).objects as Rec[]).find((o) => o.name === 'crm_campaign_member')!.validations as Rec[])
    .find((v) => v.name === 'lead_and_contact_exclusive')!;

  it('a new member naming both is refused', async () => {
    const campaign = await campaignOf('in_progress');
    const made = await create({ crm_campaign: campaign.id, crm_lead: (await leadOf()).id, crm_contact: (await contactOf()).id, status: 'sent' });
    expect([made.status, made.body?.code], JSON.stringify(made.body)).toEqual([400, 'VALIDATION_FAILED']);
    expect(made.body?.error, 'refused by some other rule').toBe(exclusive.message);
    expect(await membersOf(campaign.id)).toHaveLength(0);
  });

  it('adding a Lead to a contact member is refused, and the member keeps its Contact alone', async () => {
    const campaign = await campaignOf('in_progress');
    const contact = await contactOf();
    const made = await create({ crm_campaign: campaign.id, crm_contact: contact.id, status: 'sent' });
    expect(made.status, JSON.stringify(made.body)).toBe(201);
    const id = idOf(made.body);
    const edited = await edit(id, { crm_lead: (await leadOf()).id });
    expect([edited.status, edited.body?.code], JSON.stringify(edited.body)).toEqual([400, 'VALIDATION_FAILED']);
    expect(edited.body?.error, 'refused by some other rule').toBe(exclusive.message);
    const [stored] = await verify.rows('crm_campaign_member', { id });
    expect({ lead: stored!.crm_lead ?? null, contact: stored!.crm_contact }).toEqual({ lead: null, contact: contact.id });
  });

  it.each(['crm_lead', 'crm_contact'] as const)('a member naming only its %s is stored (the control)', async (column) => {
    const campaign = await campaignOf('in_progress');
    const person = column === 'crm_lead' ? await leadOf() : await contactOf();
    const made = await create({ crm_campaign: campaign.id, [column]: person.id, status: 'sent' });
    expect(made.status, JSON.stringify(made.body)).toBe(201);
    expect((await verify.rows('crm_campaign_member', { id: idOf(made.body) }))[0]?.[column]).toBe(person.id);
  });
});

/**
 * Lead conversion promotes a member by writing `status` alone
 * (`campaign_lead_conversion_refresh`): the member keeps its Lead and gains no
 * Contact, so the exclusive rule admits the promotion. Driven through the real
 * Convert Lead screen flow by a sales manager converting their own lead.
 */
describe('converting a lead that is a campaign member still promotes the membership (#2336)', () => {
  it('the member reads converted, still on its lead, with no contact', async () => {
    const campaign = await campaignOf('in_progress');
    const lead = await leadOf({ status: 'qualified', company: `Gates Convert ${++k}` }, manager);
    const [member] = await verify.seed('crm_campaign_member', [{ crm_campaign: campaign.id, crm_lead: lead.id, status: 'responded' }]);

    const started = await verify.flows.run('lead_conversion', { recordId: lead.id }, { as: manager.token });
    const opened = started as unknown as Rec;
    const prefilled: Rec = {};
    for (const f of ((opened.screen ?? opened.output?.screen)?.fields ?? []) as Rec[]) {
      if (f.defaultValue !== undefined) prefilled[f.name] = f.defaultValue;
    }
    let run = await verify.flows.resume(started, { ...prefilled, createOpportunity: false }, { as: manager.token });
    // The conversion ends on a result screen (#2297), which pauses once more.
    if ((run as unknown as Rec).status === 'paused') run = await verify.flows.resume(run, {}, { as: manager.token });
    const done = run as unknown as Rec;
    expect(done.error ?? null).toBeNull();
    const [converted] = await verify.rows('crm_lead', { id: lead.id });
    expect(converted!.is_converted, 'fixture: the lead converted').toBe(true);

    await vi.waitFor(async () => {
      const [row] = await verify.rows('crm_campaign_member', { id: member!.id });
      expect({ status: row!.status, lead: row!.crm_lead, contact: row!.crm_contact ?? null })
        .toEqual({ status: 'converted', lead: lead.id, contact: null });
    }, { timeout: 10_000, interval: 50 });
  });
});
