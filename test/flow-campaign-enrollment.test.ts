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

async function enrol(seed: Rec = {}, screen: Rec = { leadStatus: 'new' }) {
  const h = makeFlowHarness({ campaign_enrollment: CampaignEnrollmentFlow }, {
    crm_campaign: [campaign()],
    crm_lead: leads(),
    crm_campaign_member: [],
    ...seed,
  });
  const runId = await h.run('campaign_enrollment', { recordId: 'cmp1' });
  expect(runId, 'campaign_enrollment did not start').toBeTruthy();
  await h.resume(runId!, { recordId: 'cmp1', ...screen });
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
