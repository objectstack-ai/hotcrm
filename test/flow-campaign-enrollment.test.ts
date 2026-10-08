// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { CampaignEnrollmentFlow } from '../src/marketing/flows/campaign-enrollment.flow';
import { hotcrmStack, signUpPerson, daysFromNow, type Person } from './helpers/verify-stack';

type Rec = Record<string, any>;

/**
 * campaign_enrollment runtime tests.
 *
 * This is the console's bulk "enroll leads" screen action. Its dedupe gate sits
 * inside a `loop` body, so until the nested condition was authored as an
 * explicit CEL envelope it never opened and the action enrolled nobody at all —
 * see the regression guard in test/flow-scheduled.test.ts.
 *
 * Three things here are silently breakable and none is visible to metadata
 * validation: the `recordId` input contract, the eligibility filter (an
 * opted-out lead must never be enrolled in an email campaign), and the dedupe
 * that makes a re-run top up rather than double-enrol.
 *
 * Runs on the shipped app booted by `@objectstack/verify`: a marketer starts
 * the screen flow on a campaign (`flows.run`) and submits the screen
 * (`flows.resume`); the enrolment INSERT happens in the registered
 * `runAs: 'system'` callees, resolved by name off the real registry. The boot
 * replays the app's seed leads and contacts, and the eligibility filter rightly
 * enrols the eligible ones among them too — so every assertion about WHO was
 * enrolled is read over this file's own fixture people, and every assertion
 * that NOBODY was enrolled is read over the whole campaign.
 */

let verify: VerifyStack;
let marketer: Person;
let k = 0;
beforeAll(async () => {
  verify = await hotcrmStack();
  marketer = await signUpPerson(verify, 'marketer@flow-campaign-enrollment.test', {
    name: 'Enrolment Marketer', positions: ['marketing_user'], permissionSets: ['marketing_user'],
  });
}, 120_000);

/**
 * One campaign and the people who could be enrolled in it — the eligible ones
 * and one of every ineligible shape — written as the system, owned by the
 * marketer.
 */
async function world(campaignOver: Rec = {}) {
  const n = ++k;
  const [campaign] = await verify.seed('crm_campaign', [{
    name: `Spring Push ${n}`, status: 'in_progress', start_date: daysFromNow(-7), end_date: daysFromNow(30),
    owner_id: marketer.id, ...campaignOver,
  }]);
  const lead = async (key: string, over: Rec) => {
    const [row] = await verify.seed('crm_lead', [{
      first_name: 'Lee', last_name: `${key} ${n}`, company: `Acme ${key} ${n}`,
      email: `${key}.${n}@acme.flow-campaign-enrollment.test`, status: 'new', is_converted: false,
      email_opt_out: false, owner_id: marketer.id, ...over,
    }]);
    return [key, row!] as const;
  };
  const leads = Object.fromEntries(await Promise.all([
    lead('l_new', {}),
    lead('l_new2', {}),
    // Ineligible for various reasons — none may be enrolled.
    lead('l_optout', { email_opt_out: true }),
    lead('l_converted', { is_converted: true }),
    lead('l_other', { status: 'qualified' }),
  ])) as Record<string, Rec>;
  const [account] = await verify.seed('crm_account', [{ name: `Acme ${n}`, owner_id: marketer.id }]);
  /**
   * Contacts, the #597 mirror of the lead roster above.
   *
   * `crm_campaign_member.crm_contact` was a lookup no writer populated, so a
   * campaign could only ever reach LEADS — the existing customer base, which is
   * most of what a CRM knows, was unreachable by marketing. Same ineligibility
   * shapes as the leads: opted out, no email, wrong segment. There is no
   * `is_converted` twin — a contact IS the converted end state.
   */
  const contact = async (key: string, over: Rec) => {
    const [row] = await verify.seed('crm_contact', [{
      first_name: 'Cy', last_name: `${key} ${n}`, crm_account: account!.id, department: 'engineering',
      email: `${key}.${n}@acme.flow-campaign-enrollment.test`, email_opt_out: false, owner_id: marketer.id, ...over,
    }]);
    return [key, row!] as const;
  };
  const contacts = Object.fromEntries(await Promise.all([
    contact('c_eng', {}),
    contact('c_eng2', {}),
    contact('c_optout', { email_opt_out: true }),
    contact('c_other', { department: 'finance' }),
  ])) as Record<string, Rec>;
  return { campaign: campaign!, leads, contacts, account: account! };
}
type World = Awaited<ReturnType<typeof world>>;

/** Every screen field the flow declares — all three are `required`. */
const SCREEN = { memberSource: 'leads', leadStatus: 'new', contactDepartment: 'engineering' };

/** Run the screen action on `w`'s campaign as the marketer, and return its member rows. */
async function enrol(w: World, screen: Rec = SCREEN): Promise<Rec[]> {
  const run = await verify.flows.run('campaign_enrollment', { recordId: w.campaign.id }, { as: marketer.token });
  expect(run.runId, 'campaign_enrollment did not start').toBeTruthy();
  // Screen fields ONLY. `recordId` is a start-time input the console seeds on
  // the trigger, and from 17.0.0-rc.2 the engine holds a resume to the screen's
  // declared field contract (#4477) — re-sending it here is refused with
  // `INVALID_SCREEN_INPUT: Unknown screen field "recordId"`, which is the
  // engine correctly rejecting a signal the console never sends.
  await verify.flows.resume(run, screen, { as: marketer.token });
  return verify.rows('crm_campaign_member', { crm_campaign: w.campaign.id });
}

/** The fixture keys of the `side` (`crm_lead` / `crm_contact`) people among `members`. */
const enrolledKeys = (w: World, members: Rec[], side: 'crm_lead' | 'crm_contact'): string[] => {
  const people = side === 'crm_lead' ? w.leads : w.contacts;
  const byId = new Map(Object.entries(people).map(([key, row]) => [row.id, key]));
  return members.map((m) => byId.get(m[side])).filter((key): key is string => key !== undefined).sort();
};

/**
 * The email-less shape of `object`, attempted as the system: `email` is
 * `required` on both `crm_lead` and `crm_contact`, so no such person can be
 * written and the filter's `email: { $ne: null }` clause guards a row the
 * engine refuses to hold. Pinned as that refusal — the reason the clause can
 * select nobody.
 */
const emailLess = (object: 'crm_lead' | 'crm_contact', w: World) =>
  verify.seed(object, [object === 'crm_lead'
    ? { first_name: 'No', last_name: `Email ${k}`, company: `No Email ${k}`, status: 'new', email: null, owner_id: marketer.id }
    : { first_name: 'No', last_name: `Email ${k}`, crm_account: w.account.id, department: 'engineering', email: null, owner_id: marketer.id }]);

/** An existing member row on `campaign` — the state a re-run starts from. */
const existingMember = async (campaign: Rec, doc: Rec) =>
  verify.seed('crm_campaign_member', [{ crm_campaign: campaign.id, status: 'sent', ...doc }]);

describe('campaign_enrollment — screen action', () => {
  it('seeds its input from the console’s `recordId` contract', () => {
    const names = (CampaignEnrollmentFlow.variables ?? []).map((v) => v.name);
    expect(names, 'the console only seeds `recordId`').toContain('recordId');
  });

  it('enrols the eligible leads in the chosen status', async () => {
    const w = await world();
    const members = await enrol(w);
    expect(enrolledKeys(w, members, 'crm_lead')).toEqual(['l_new', 'l_new2']);
    for (const m of members) {
      expect(m.crm_campaign).toBe(w.campaign.id);
      expect(m.status).toBe('sent');
      expect(m.added_date, 'added_date should be stamped').toBeTruthy();
    }
  });

  it('never enrols an opted-out, converted, email-less or off-status lead', async () => {
    const w = await world();
    await expect(emailLess('crm_lead', w), 'an email-less lead cannot exist').rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
    const enrolled = enrolledKeys(w, await enrol(w), 'crm_lead');
    for (const key of ['l_optout', 'l_converted', 'l_other']) {
      expect(enrolled, `${key} must not be enrolled`).not.toContain(key);
    }
  });

  it('tops up rather than double-enrolling on a re-run', async () => {
    // Duplicate member rows inflated num_sent and the response rate.
    const w = await world();
    await existingMember(w.campaign, { crm_lead: w.leads.l_new!.id });
    const members = await enrol(w);
    expect(members.filter((m) => m.crm_lead === w.leads.l_new!.id), 'l_new was enrolled twice').toHaveLength(1);
    // …and the not-yet-enrolled lead still gets added.
    expect(enrolledKeys(w, members, 'crm_lead')).toContain('l_new2');
  });

  it('does not treat an enrolment in ANOTHER campaign as a duplicate', async () => {
    const w = await world();
    const other = await world();
    await existingMember(other.campaign, { crm_lead: w.leads.l_new!.id });
    const members = await enrol(w);
    expect(
      members.filter((m) => m.crm_lead === w.leads.l_new!.id),
      'a member row for a different campaign blocked enrolment',
    ).toHaveLength(1);
  });

  it.each(['completed', 'aborted'])('refuses to top up a %s campaign', async (status) => {
    // Enrolling into a finished campaign corrupts its final snapshot metrics.
    const w = await world({ status });
    expect(await enrol(w)).toHaveLength(0);
  });

  it('enrols into a campaign still in planning', async () => {
    const w = await world({ status: 'planning' });
    expect(enrolledKeys(w, await enrol(w), 'crm_lead').length).toBeGreaterThan(0);
  });
});

describe('campaign_enrollment — contacts (#597)', () => {
  const asContacts = (over: Rec = {}) => ({ ...SCREEN, memberSource: 'contacts', ...over });

  it('enrols the eligible contacts in the chosen department', async () => {
    const w = await world();
    const members = await enrol(w, asContacts());
    expect(enrolledKeys(w, members, 'crm_contact')).toEqual(['c_eng', 'c_eng2']);
    for (const m of members) {
      expect(m.crm_campaign).toBe(w.campaign.id);
      expect(m.crm_lead, 'a contact member must not also claim a lead').toBeNull();
      expect(m.status).toBe('sent');
      expect(m.added_date, 'added_date should be stamped').toBeTruthy();
    }
  });

  it('never enrols an opted-out, email-less or off-segment contact', async () => {
    const w = await world();
    await expect(emailLess('crm_contact', w), 'an email-less contact cannot exist').rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
    const enrolled = enrolledKeys(w, await enrol(w, asContacts()), 'crm_contact');
    for (const key of ['c_optout', 'c_other']) {
      expect(enrolled, `${key} must not be enrolled`).not.toContain(key);
    }
  });

  it('tops up rather than double-enrolling a contact on a re-run', async () => {
    const w = await world();
    await existingMember(w.campaign, { crm_contact: w.contacts.c_eng!.id });
    const members = await enrol(w, asContacts());
    expect(
      members.filter((m) => m.crm_contact === w.contacts.c_eng!.id),
      'c_eng was enrolled twice',
    ).toHaveLength(1);
    expect(enrolledKeys(w, members, 'crm_contact')).toContain('c_eng2');
  });

  it('does not treat a LEAD enrolment as a duplicate of a contact enrolment', async () => {
    // Two different records of two different relationships; the seed datasets
    // in src/data/marketing.seed.ts key them separately for the same reason.
    // The lead member carries the SAME id string as the contact — a lead row
    // written under the contact's id — so only the relationship tells them apart.
    const w = await world();
    const [twin] = await verify.seed('crm_lead', [{
      id: w.contacts.c_eng!.id, first_name: 'Twin', last_name: `Lead ${k}`, company: `Twin ${k}`,
      email: `twin.${k}@acme.flow-campaign-enrollment.test`, status: 'contacted', owner_id: marketer.id,
    }]);
    expect(twin!.id).toBe(w.contacts.c_eng!.id);
    await existingMember(w.campaign, { crm_lead: twin!.id });
    const members = await enrol(w, asContacts());
    expect(members.filter((m) => m.crm_contact === w.contacts.c_eng!.id)).toHaveLength(1);
  });

  it.each(['completed', 'aborted'])('refuses to top up a %s campaign with contacts either', async (status) => {
    const w = await world({ status });
    expect(await enrol(w, asContacts())).toHaveLength(0);
  });

  it('the two branches are exclusive — picking contacts enrols no leads', async () => {
    const w = await world();
    expect((await enrol(w, asContacts())).filter((m) => m.crm_lead)).toHaveLength(0);
  });

  it('…and picking leads enrols no contacts', async () => {
    const w = await world();
    expect((await enrol(w)).filter((m) => m.crm_contact)).toHaveLength(0);
  });
});
