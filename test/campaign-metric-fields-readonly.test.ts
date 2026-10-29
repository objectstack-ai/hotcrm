// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, vi } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import stack from './helpers/composed-stack';
import campaignHooks, { CAMPAIGN_METRIC_FIELDS } from '../src/marketing/objects/campaign.hook';
import campaignMemberHooks from '../src/marketing/objects/campaign_member.hook';
import opportunityCampaignMetricsHooks from '../src/sales/objects/opportunity.campaign-metrics.hook';
import leadCampaignMetricsHooks from '../src/sales/objects/lead.campaign-metrics.hook';
import { hotcrmStack, signUpPerson, systemUpdate, daysFromNow, type Person } from './helpers/verify-stack';

/**
 * The hook-maintained campaign numbers are read-only to a person (#2366 row 4).
 *
 * Measured on 18.2.0 before it (#2320 Marketing S3, S7): the campaign form
 * offered Number Sent, Responses, Leads, Converted Leads, Opportunities, Won
 * Opportunities and Actual Revenue as editable, and a member's form offered
 * Has Responded and Response Date. A value typed there stayed until the next
 * write the refresh hooks caught recomputed it.
 *
 * Both halves are pinned, because a disabled input is not a guard:
 *
 *  - the GUARD: each field is `readonly`, so a user's write of it is stripped
 *    by the engine — through the same write door the form saves through;
 *  - the WRITERS still land: all four refresh hooks run elevated (a readonly
 *    field is stripped only from a non-system write), and the member lifecycle
 *    hook's own stamp on the caller's write is kept.
 */

type Rec = Record<string, any>;

const objects: Rec[] = (stack as Rec).objects ?? [];
const fieldsOf = (name: string): Record<string, Rec> => objects.find((o) => o.name === name)!.fields;

const REFRESH_HOOKS = [
  ...campaignHooks, ...campaignMemberHooks, ...opportunityCampaignMetricsHooks, ...leadCampaignMetricsHooks,
].filter((h: Rec) => /_refresh$/.test(h.name)) as Rec[];

describe('the guard is declared', () => {
  it.each(CAMPAIGN_METRIC_FIELDS)('crm_campaign.%s is readonly', (field) => {
    expect(fieldsOf('crm_campaign')[field]?.readonly).toBe(true);
  });

  it.each(['has_responded', 'response_date'])('crm_campaign_member.%s is readonly', (field) => {
    expect(fieldsOf('crm_campaign_member')[field]?.readonly).toBe(true);
  });

  it('every refresh hook that writes the metric block runs elevated, so its write is not stripped', () => {
    expect(REFRESH_HOOKS.map((h) => h.name).sort()).toEqual([
      'campaign_attribution_refresh', 'campaign_lead_conversion_refresh',
      'campaign_member_metrics_refresh', 'campaign_metrics_refresh',
    ]);
    for (const hook of REFRESH_HOOKS) expect(hook.runAs, hook.name).toBe('system');
  });
});

let verify: VerifyStack;
let marketer: Person;
let k = 0;

beforeAll(async () => {
  verify = await hotcrmStack();
  marketer = await signUpPerson(verify, 'mkt@campaign-metric-readonly.test', {
    name: 'Metric Marketer', positions: ['marketing_user'], permissionSets: ['marketing_user'],
  });
}, 180_000);

const stored = async (object: string, id: string): Promise<Rec> => (await verify.rows(object, { id }))[0]!;
// Each case waits on async refresh hooks (up to 10 s), so the runtime
// describes carry a 30 s budget rather than vitest's 5 s default (#2357).
const settlesAt = (campaignId: string, expected: Rec) =>
  vi.waitFor(async () => expect(await stored('crm_campaign', campaignId)).toMatchObject(expected), { timeout: 10_000, interval: 50 });

/** A running campaign of the marketer's with one lead member, its count settled. */
const liveCampaign = async (): Promise<{ campaign: Rec; member: Rec }> => {
  const n = ++k;
  const [campaign] = await verify.seed('crm_campaign', [{
    name: `Readonly Push ${n}`, status: 'in_progress', start_date: daysFromNow(-7), end_date: daysFromNow(30), owner_id: marketer.id,
  }]);
  const [lead] = await verify.seed('crm_lead', [{
    first_name: 'Rhea', last_name: `Only ${n}`, company: `Only Co ${n}`, email: `rhea${n}@campaign-metric-readonly.test`,
    email_opt_out: false, owner_id: marketer.id,
  }]);
  const member = await verify.hooks.run('crm_campaign_member', 'insert', {
    crm_campaign: campaign!.id, crm_lead: lead!.id, status: 'sent',
  }, { as: marketer.token });
  await settlesAt(campaign!.id, { num_sent: 1, num_leads: 1 });
  return { campaign: campaign!, member };
};

describe('a person cannot type the numbers in', { timeout: 30_000 }, () => {
  it('drops the marketer’s write of a count and of Actual Revenue, and keeps the rest of the same write', async () => {
    const { campaign } = await liveCampaign();
    await verify.hooks.run('crm_campaign', 'update', {
      id: campaign.id, num_sent: 999, num_responses: 50, actual_revenue: 1_000_000, description: 'Spring wave two.',
    }, { as: marketer.token });
    const after = await stored('crm_campaign', campaign.id);
    expect(after).toMatchObject({ num_sent: 1, num_responses: 0, description: 'Spring wave two.' });
    expect(Number(after.actual_revenue ?? 0)).toBe(0);
  });

  it('drops the marketer’s Has Responded and Response Date on a member who has not responded', async () => {
    const { member } = await liveCampaign();
    await verify.hooks.run('crm_campaign_member', 'update', {
      id: member.id, has_responded: true, response_date: '2026-01-01T00:00:00.000Z',
    }, { as: marketer.token });
    const after = await stored('crm_campaign_member', member.id);
    expect(after.has_responded).toBe(false);
    expect(after.response_date ?? null).toBeNull();
  });
});

describe('the writers still land', { timeout: 30_000 }, () => {
  it('Mark Responded stamps the response, and the campaign counts it', async () => {
    const { campaign, member } = await liveCampaign();
    await verify.actions.run('crm_campaign_member', 'mark_responded', { as: marketer.token, recordId: member.id });
    const after = await stored('crm_campaign_member', member.id);
    expect(after.status).toBe('responded');
    expect(after.has_responded).toBe(true);
    expect(after.response_date).toBeTruthy();
    await settlesAt(campaign.id, { num_responses: 1 });
  });

  it('the marketer moving the status recomputes the block (campaign_metrics_refresh)', async () => {
    const { campaign } = await liveCampaign();
    // Knock the stored count off by a system write, so only a recompute puts it back.
    await systemUpdate(verify, 'crm_campaign', { id: campaign.id, num_sent: 0, num_leads: 0 });
    expect((await stored('crm_campaign', campaign.id)).num_sent).toBe(0);
    await verify.hooks.run('crm_campaign', 'update', { id: campaign.id, status: 'completed' }, { as: marketer.token });
    await settlesAt(campaign.id, { status: 'completed', num_sent: 1, num_leads: 1 });
  });
});
