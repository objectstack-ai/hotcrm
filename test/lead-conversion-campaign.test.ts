// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, vi } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { hotcrmStack, signUpPerson, type Person } from './helpers/verify-stack';
import { LeadConversionFlow } from '../src/sales/flows/lead-conversion.flow';

type Rec = Record<string, any>;

/**
 * A converted lead's new deal is credited to the campaign the lead last
 * responded to (#2515, decision thread 2026-11-15).
 *
 * Before: `crm_lead` has no campaign field and the conversion flow never read
 * the lead's `crm_campaign_member` rows, so the deal it created had no
 * Campaign. Win it and the campaign still read 0 opportunities, 0 won,
 * revenue 0, ROI −100%, unless a rep filled Campaign by hand.
 *
 * After: the Yes-opportunity branch reads the lead's responded memberships
 * and writes the most recent one's campaign onto the new deal. No responded
 * membership, no Campaign. The deal is new, so nothing a rep chose is there
 * to overwrite, and no node of the flow updates an opportunity afterwards.
 *
 * As a sales rep on the shipped app booted by `@objectstack/verify`.
 */

let verify: VerifyStack;
let rep: Person;
let marketer: Person;
let k = 0;

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();
const isoDay = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

beforeAll(async () => {
  verify = await hotcrmStack();
  rep = await signUpPerson(verify, 'rep@lead-conversion-campaign.test', {
    name: 'Campaign Rep', positions: ['crm_sales_rep'], permissionSets: ['sales_rep'],
  });
  marketer = await signUpPerson(verify, 'marketer@lead-conversion-campaign.test', {
    name: 'Campaign Marketer', positions: ['crm_marketing_user'], permissionSets: ['marketing_user'],
  });
}, 120_000);

const campaignOf = async (label: string): Promise<Rec> => (await verify.seed('crm_campaign', [{
  name: `${label} ${++k}`, status: 'in_progress', start_date: isoDay(-60), end_date: isoDay(30), owner_id: marketer.id,
}]))[0]!;

const leadFor = (company: string) => {
  const n = ++k;
  return verify.hooks.run('crm_lead', 'insert', {
    company, email: `buyer${n}@lead-conversion-campaign.test`, first_name: 'Theo', last_name: `Park${n}`,
    lead_source: 'web', status: 'qualified', estimated_amount: 40_000,
  }, { as: rep.token });
};

/** A membership with the response stated outright, so the order is the test's, not the clock's. */
const member = (campaign: Rec, lead: Rec, status: string, response_date: string | null) =>
  verify.seed('crm_campaign_member', [{
    crm_campaign: campaign.id, crm_lead: lead.id, status, has_responded: response_date !== null, response_date,
  }]);

const screenOf = (run: Rec): Rec | undefined => run.screen ?? run.output?.screen;

/** Convert as the rep, the way the console does: screen_1's prefilled bag plus the box. */
async function convert(leadId: string, createOpportunity = true): Promise<Rec> {
  const started = await verify.flows.run('lead_conversion', { recordId: leadId }, { as: rep.token }) as Rec;
  const first = screenOf(started);
  expect(first?.nodeId).toBe('screen_1');
  const bag: Rec = {};
  for (const f of (first!.fields ?? []) as Rec[]) if (f.defaultValue !== undefined) bag[f.name] = f.defaultValue;
  const run = await verify.flows.resume(started as never, { ...bag, createOpportunity }, { as: rep.token }) as Rec;
  expect(screenOf(run)?.nodeId, 'the conversion did not end on the result screen').toBe('result');
  const [lead] = await verify.rows('crm_lead', { id: leadId });
  expect(Boolean(lead?.is_converted), 'the lead was not converted').toBe(true);
  return lead!;
}

const dealOf = async (lead: Rec): Promise<Rec> => (await verify.rows('crm_opportunity', { id: lead.converted_opportunity }))[0]!;
const campaignRow = async (id: string): Promise<Rec> => (await verify.rows('crm_campaign', { id }))[0]!;

describe('the flow reads the lead\'s responded memberships on the opportunity branch only (#2515)', () => {
  const nodes = LeadConversionFlow.nodes as Rec[];
  const edges = LeadConversionFlow.edges as Rec[];
  const next = (id: string) => edges.filter((e) => e.source === id).map((e) => e.target);

  it('Yes → find memberships → pick → create opportunity; No skips them', () => {
    expect(edges.find((e) => e.source === 'decision_opportunity' && e.label === 'Yes')?.target).toBe('find_responded_memberships');
    expect(next('find_responded_memberships')).toEqual(['pick_opportunity_campaign']);
    expect(next('pick_opportunity_campaign')).toEqual(['create_opportunity']);
    expect(edges.find((e) => e.source === 'decision_opportunity' && e.label === 'No')?.target).toBe('no_opportunity');
  });

  it('writes Campaign only on the create, and updates no opportunity anywhere', () => {
    const create = nodes.find((n) => n.id === 'create_opportunity')!;
    expect(JSON.stringify(create.config.fields.crm_campaign)).toContain('opportunityCampaignId');
    expect(nodes.filter((n) => n.type === 'update_record' && n.config?.objectName === 'crm_opportunity')).toEqual([]);
  });
});

describe('as a sales rep, the converted deal is credited to the lead\'s campaign (#2515)', () => {
  it('the most recent responded membership wins; a newer membership that never responded credits nothing', async () => {
    const [older, recent, unanswered] = [await campaignOf('Spring'), await campaignOf('Summer'), await campaignOf('Autumn')];
    const lead = await leadFor(`Skyline Media ${++k}`);
    // The most recent response is written FIRST, so insertion order cannot pass for the pick.
    await member(recent, lead, 'responded', daysAgo(2));
    await member(older, lead, 'responded', daysAgo(20));
    await member(unanswered, lead, 'sent', null);

    const deal = await dealOf(await convert(lead.id));
    expect(deal.crm_campaign).toBe(recent.id);
  });

  it('no responded membership, no Campaign', async () => {
    const campaign = await campaignOf('Sent Only');
    const lead = await leadFor(`Quiet Co ${++k}`);
    await member(campaign, lead, 'sent', null);
    const deal = await dealOf(await convert(lead.id));
    expect(deal.crm_campaign ?? null).toBeNull();

    const bare = await dealOf(await convert((await leadFor(`Bare Co ${++k}`)).id));
    expect(bare.crm_campaign ?? null, 'a lead in no campaign').toBeNull();
  });

  it('without an opportunity, the conversion reads no membership and creates no deal', async () => {
    const campaign = await campaignOf('No Deal');
    const lead = await leadFor(`Solo Co ${++k}`);
    await member(campaign, lead, 'responded', daysAgo(1));
    const after = await convert(lead.id, false);
    expect(after.converted_opportunity ?? null).toBeNull();
    expect(await verify.rows('crm_opportunity', { crm_campaign: campaign.id })).toEqual([]);
  });

  it('winning the deal moves the campaign\'s opportunity, won and revenue counters', async () => {
    const campaign = await campaignOf('Attribution');
    const lead = await leadFor(`Won Co ${++k}`);
    await member(campaign, lead, 'responded', daysAgo(3));
    const deal = await dealOf(await convert(lead.id));
    expect(deal.crm_campaign).toBe(campaign.id);

    await verify.hooks.run('crm_opportunity', 'update', {
      id: deal.id, stage: 'closed_won', win_reason: 'better_price',
    }, { as: rep.token });
    await vi.waitFor(async () => expect(await campaignRow(campaign.id)).toMatchObject({
      num_opportunities: 1, num_won_opportunities: 1, actual_revenue: 40_000,
    }), { timeout: 10_000, interval: 50 });
  }, 30_000);
});
