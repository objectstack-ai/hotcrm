// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { CampaignEnrollmentFlow } from '../src/flows/campaign-enrollment.flow';
import { makeFlowHarness, type Rec } from './helpers/flow-harness';

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
 */

const campaign = (over: Rec = {}): Rec => ({
  id: 'cmp1', name: 'Spring Push', status: 'in_progress', ...over,
});

const leads = (): Rec[] => [
  { id: 'l_new', status: 'new', is_converted: false, email: 'a@acme.io', email_opt_out: false },
  { id: 'l_new2', status: 'new', is_converted: false, email: 'b@acme.io', email_opt_out: false },
  // Ineligible for various reasons — none may be enrolled.
  { id: 'l_optout', status: 'new', is_converted: false, email: 'c@acme.io', email_opt_out: true },
  { id: 'l_converted', status: 'new', is_converted: true, email: 'd@acme.io', email_opt_out: false },
  { id: 'l_noemail', status: 'new', is_converted: false, email: null, email_opt_out: false },
  { id: 'l_other', status: 'qualified', is_converted: false, email: 'e@acme.io', email_opt_out: false },
];

/**
 * Contacts, the #597 mirror of the lead roster above.
 *
 * `crm_campaign_member.crm_contact` was a lookup no writer populated, so a
 * campaign could only ever reach LEADS — the existing customer base, which is
 * most of what a CRM knows, was unreachable by marketing. Same ineligibility
 * shapes as the leads: opted out, no email, wrong segment. There is no
 * `is_converted` twin — a contact IS the converted end state.
 */
const contacts = (): Rec[] => [
  { id: 'c_eng', department: 'engineering', email: 'x@acme.io', email_opt_out: false },
  { id: 'c_eng2', department: 'engineering', email: 'y@acme.io', email_opt_out: false },
  { id: 'c_optout', department: 'engineering', email: 'z@acme.io', email_opt_out: true },
  { id: 'c_noemail', department: 'engineering', email: null, email_opt_out: false },
  { id: 'c_other', department: 'finance', email: 'w@acme.io', email_opt_out: false },
];

/** Every screen field the flow declares — all three are `required`. */
const SCREEN = { memberSource: 'leads', leadStatus: 'new', contactDepartment: 'engineering' };

async function enrol(seed: Rec = {}, screen: Rec = SCREEN) {
  const h = makeFlowHarness({ campaign_enrollment: CampaignEnrollmentFlow }, {
    crm_campaign: [campaign()],
    crm_lead: leads(),
    crm_contact: contacts(),
    crm_campaign_member: [],
    ...seed,
  });
  const runId = await h.run('campaign_enrollment', { recordId: 'cmp1' });
  expect(runId, 'campaign_enrollment did not start').toBeTruthy();
  // Screen fields ONLY. `recordId` is a start-time input the console seeds on
  // the trigger, and from 17.0.0-rc.2 the engine holds a resume to the screen's
  // declared field contract (#4477) — re-sending it here is refused with
  // `INVALID_SCREEN_INPUT: Unknown screen field "recordId"`, which is the
  // engine correctly rejecting a signal the console never sends.
  await h.resume(runId!, screen);
  return h;
}

describe('campaign_enrollment — screen action', () => {
  it('seeds its input from the console’s `recordId` contract', () => {
    const names = (CampaignEnrollmentFlow.variables ?? []).map((v) => v.name);
    expect(names, 'the console only seeds `recordId`').toContain('recordId');
  });

  it('enrols the eligible leads in the chosen status', async () => {
    const h = await enrol();
    const members = h.store.crm_campaign_member;
    expect(members.map((m) => m.crm_lead).sort()).toEqual(['l_new', 'l_new2']);
    for (const m of members) {
      expect(m.crm_campaign).toBe('cmp1');
      expect(m.status).toBe('sent');
      expect(m.added_date, 'added_date should be stamped').toBeTruthy();
    }
  });

  it('never enrols an opted-out, converted, email-less or off-status lead', async () => {
    const h = await enrol();
    const enrolled = h.store.crm_campaign_member.map((m) => m.crm_lead);
    for (const id of ['l_optout', 'l_converted', 'l_noemail', 'l_other']) {
      expect(enrolled, `${id} must not be enrolled`).not.toContain(id);
    }
  });

  it('tops up rather than double-enrolling on a re-run', async () => {
    // Duplicate member rows inflated num_sent and the response rate.
    const h = await enrol({
      crm_campaign_member: [{ id: 'm_existing', crm_campaign: 'cmp1', crm_lead: 'l_new', status: 'sent' }],
    });
    const forNew = h.store.crm_campaign_member.filter((m) => m.crm_lead === 'l_new');
    expect(forNew, 'l_new was enrolled twice').toHaveLength(1);
    // …and the not-yet-enrolled lead still gets added.
    expect(h.store.crm_campaign_member.map((m) => m.crm_lead)).toContain('l_new2');
  });

  it('does not treat an enrolment in ANOTHER campaign as a duplicate', async () => {
    const h = await enrol({
      crm_campaign_member: [{ id: 'm_other', crm_campaign: 'cmp_other', crm_lead: 'l_new', status: 'sent' }],
    });
    const forNew = h.store.crm_campaign_member.filter(
      (m) => m.crm_lead === 'l_new' && m.crm_campaign === 'cmp1',
    );
    expect(forNew, 'a member row for a different campaign blocked enrolment').toHaveLength(1);
  });

  it.each(['completed', 'aborted'])('refuses to top up a %s campaign', async (status) => {
    // Enrolling into a finished campaign corrupts its final snapshot metrics.
    const h = await enrol({ crm_campaign: [campaign({ status })] });
    expect(h.store.crm_campaign_member).toHaveLength(0);
  });

  it('enrols into a campaign still in planning', async () => {
    const h = await enrol({ crm_campaign: [campaign({ status: 'planning' })] });
    expect(h.store.crm_campaign_member.length).toBeGreaterThan(0);
  });
});

describe('campaign_enrollment — contacts (#597)', () => {
  const asContacts = (over: Rec = {}) => ({ ...SCREEN, memberSource: 'contacts', ...over });

  it('enrols the eligible contacts in the chosen department', async () => {
    const h = await enrol({}, asContacts());
    const members = h.store.crm_campaign_member;
    expect(members.map((m) => m.crm_contact).sort()).toEqual(['c_eng', 'c_eng2']);
    for (const m of members) {
      expect(m.crm_campaign).toBe('cmp1');
      expect(m.crm_lead, 'a contact member must not also claim a lead').toBeUndefined();
      expect(m.status).toBe('sent');
      expect(m.added_date, 'added_date should be stamped').toBeTruthy();
    }
  });

  it('never enrols an opted-out, email-less or off-segment contact', async () => {
    const h = await enrol({}, asContacts());
    const enrolled = h.store.crm_campaign_member.map((m) => m.crm_contact);
    for (const id of ['c_optout', 'c_noemail', 'c_other']) {
      expect(enrolled, `${id} must not be enrolled`).not.toContain(id);
    }
  });

  it('tops up rather than double-enrolling a contact on a re-run', async () => {
    const h = await enrol({
      crm_campaign_member: [{ id: 'm_existing', crm_campaign: 'cmp1', crm_contact: 'c_eng', status: 'sent' }],
    }, asContacts());
    expect(
      h.store.crm_campaign_member.filter((m) => m.crm_contact === 'c_eng'),
      'c_eng was enrolled twice',
    ).toHaveLength(1);
    expect(h.store.crm_campaign_member.map((m) => m.crm_contact)).toContain('c_eng2');
  });

  it('does not treat a LEAD enrolment as a duplicate of a contact enrolment', async () => {
    // Two different records of two different relationships; the seed datasets
    // in src/data/marketing.seed.ts key them separately for the same reason.
    const h = await enrol({
      crm_campaign_member: [{ id: 'm_lead', crm_campaign: 'cmp1', crm_lead: 'c_eng', status: 'sent' }],
    }, asContacts());
    expect(h.store.crm_campaign_member.filter((m) => m.crm_contact === 'c_eng')).toHaveLength(1);
  });

  it.each(['completed', 'aborted'])('refuses to top up a %s campaign with contacts either', async (status) => {
    const h = await enrol({ crm_campaign: [campaign({ status })] }, asContacts());
    expect(h.store.crm_campaign_member).toHaveLength(0);
  });

  it('the two branches are exclusive — picking contacts enrols no leads', async () => {
    const h = await enrol({}, asContacts());
    expect(h.store.crm_campaign_member.filter((m) => m.crm_lead)).toHaveLength(0);
  });

  it('…and picking leads enrols no contacts', async () => {
    const h = await enrol();
    expect(h.store.crm_campaign_member.filter((m) => m.crm_contact)).toHaveLength(0);
  });
});
