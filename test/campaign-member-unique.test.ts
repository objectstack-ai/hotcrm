// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, vi } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import stack, { hookNamed, packFor } from './helpers/composed-stack';
import { hotcrmStack, signUpPerson, daysFromNow, type Person } from './helpers/verify-stack';

/**
 * One membership per person per campaign, whichever door writes it (#2498).
 *
 * Measured on 18.5.0 at `079228a` before this change, as a marketing user:
 * `POST /api/v1/data/crm_campaign_member` with the same campaign and lead
 * answered 201 twice, and once the first member responded the campaign read
 * a 50% response rate for its one person. Enroll Members and Add to Campaign
 * already skipped a person on the campaign; the object did not.
 *
 * Now `campaign_member_unique` refuses the second membership on every door,
 * naming the person and the campaign in the caller's language, and the
 * object's two `unique: 'organization'` indexes back it against a race.
 * On the shipped app booted by `@objectstack/verify`.
 */

type Rec = Record<string, any>;
let verify: VerifyStack;
let marketer: Person;
let k = 0;

beforeAll(async () => {
  verify = await hotcrmStack();
  marketer = await signUpPerson(verify, 'marketer@campaign-member-unique.test', {
    name: 'Unique Marketer', positions: ['crm_marketing_user'], permissionSets: ['marketing_user'],
  });
}, 180_000);

const campaignOf = async (): Promise<Rec> => (await verify.seed('crm_campaign', [{
  name: `Unique Webinar ${++k}`, status: 'planning', start_date: daysFromNow(-30), end_date: daysFromNow(30), owner_id: marketer.id,
}]))[0]!;
const leadOf = async (): Promise<Rec> => (await verify.seed('crm_lead', [{
  first_name: 'Una', last_name: `Lead ${++k}`, company: `Unique Co ${k}`, email: `lead${k}@campaign-member-unique.test`,
  status: 'new', is_converted: false, email_opt_out: false, owner_id: marketer.id,
}]))[0]!;
const contactOf = async (): Promise<Rec> => {
  const [account] = await verify.seed('crm_account', [{ name: `Unique Account ${++k}`, owner_id: marketer.id }]);
  return (await verify.seed('crm_contact', [{
    first_name: 'Cy', last_name: `Contact ${k}`, crm_account: account!.id, department: 'engineering',
    email: `contact${k}@campaign-member-unique.test`, email_opt_out: false, owner_id: marketer.id,
  }]))[0]!;
};
/** The campaign's Campaign Members panel's New, an import run as the user, and REST: this one request. */
const create = async (doc: Rec, locale?: string) => {
  const res = locale
    ? await verify.raw('/api/v1/data/crm_campaign_member', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${marketer.token}`, 'accept-language': locale },
      body: JSON.stringify(doc),
    })
    : await verify.apiAs(marketer.token, 'POST', '/data/crm_campaign_member', doc);
  return { status: res.status, body: (await res.json()) as Rec };
};
const membersOf = (where: Rec): Promise<Rec[]> => verify.rows('crm_campaign_member', where);

describe('the demo seed', () => {
  // Read before any case below adds a member: the boot's own 51 seeded members.
  it('loads all 51 members, with no person twice on one campaign', async () => {
    const seeded = await verify.rows('crm_campaign_member', {});
    const keys = seeded.map((m) => `${m.crm_campaign}|${m.crm_lead ?? ''}|${m.crm_contact ?? ''}`);
    expect(keys).toHaveLength(51);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('a second membership for the same person is refused (#2498)', () => {
  it('the same lead twice: 201, then 409 naming the lead and the campaign, and one member', async () => {
    const campaign = await campaignOf();
    const lead = await leadOf();
    expect((await create({ crm_campaign: campaign.id, crm_lead: lead.id })).status).toBe(201);
    const again = await create({ crm_campaign: campaign.id, crm_lead: lead.id });
    expect(again.status, JSON.stringify(again.body)).toBe(409);
    expect(again.body.code).toBe('DUPLICATE_VALUE');
    expect(again.body.error).toBe(`Una ${lead.last_name} is already a member of ${campaign.name}. Open that membership instead of adding another.`);
    expect(await membersOf({ crm_campaign: campaign.id, crm_lead: lead.id })).toHaveLength(1);
  });

  it('answers a zh-CN caller in Chinese', async () => {
    const campaign = await campaignOf();
    const lead = await leadOf();
    expect((await create({ crm_campaign: campaign.id, crm_lead: lead.id })).status).toBe(201);
    const again = await create({ crm_campaign: campaign.id, crm_lead: lead.id }, 'zh-CN');
    expect(again.status).toBe(409);
    expect(again.body.error).toBe(`Una ${lead.last_name} 已是 ${campaign.name} 的成员。请打开已有的那条成员记录，不要再添加一条。`);
  });

  it('the same contact twice is refused too; two different contacts both join', async () => {
    const campaign = await campaignOf();
    const [one, two] = [await contactOf(), await contactOf()];
    expect((await create({ crm_campaign: campaign.id, crm_contact: one.id })).status).toBe(201);
    expect((await create({ crm_campaign: campaign.id, crm_contact: two.id })).status).toBe(201);
    const again = await create({ crm_campaign: campaign.id, crm_contact: one.id });
    expect(again.status, JSON.stringify(again.body)).toBe(409);
    expect(again.body.error).toContain(`Cy Contact`);
    expect(await membersOf({ crm_campaign: campaign.id })).toHaveLength(2);
  });

  it('the same lead in another campaign, and two leads in one campaign, both join', async () => {
    const [first, second] = [await campaignOf(), await campaignOf()];
    const [lead, other] = [await leadOf(), await leadOf()];
    expect((await create({ crm_campaign: first.id, crm_lead: lead.id })).status).toBe(201);
    expect((await create({ crm_campaign: second.id, crm_lead: lead.id })).status).toBe(201);
    expect((await create({ crm_campaign: first.id, crm_lead: other.id })).status).toBe(201);
  });

  it('an edit that moves a member onto a person already on the campaign is refused; an edit that moves nothing is not', async () => {
    const campaign = await campaignOf();
    const [lead, other] = [await leadOf(), await leadOf()];
    await create({ crm_campaign: campaign.id, crm_lead: lead.id });
    const second = (await create({ crm_campaign: campaign.id, crm_lead: other.id })).body;
    const id = second.record?.id ?? second.id;
    const moved = await verify.apiAs(marketer.token, 'PATCH', `/data/crm_campaign_member/${id}`, { crm_lead: lead.id });
    expect(moved.status, await moved.clone().text()).toBe(409);
    expect((await membersOf({ id }))[0]!.crm_lead).toBe(other.id);
    const edited = await verify.apiAs(marketer.token, 'PATCH', `/data/crm_campaign_member/${id}`, { crm_campaign: campaign.id, crm_lead: other.id, status: 'responded' });
    expect(edited.status, await edited.clone().text()).toBe(200);
  });

  it('a system write is held to it too', async () => {
    const campaign = await campaignOf();
    const lead = await leadOf();
    await verify.seed('crm_campaign_member', [{ crm_campaign: campaign.id, crm_lead: lead.id }]);
    const refused = await verify.seed('crm_campaign_member', [{ crm_campaign: campaign.id, crm_lead: lead.id }]).then(() => null, (e: Rec) => e);
    expect(refused, 'a second system insert went through').toBeTruthy();
    expect(await membersOf({ crm_campaign: campaign.id, crm_lead: lead.id })).toHaveLength(1);
  });

  it('one batch that names the same lead twice: the hook sees neither row stored, and the index refuses the batch', async () => {
    const campaign = await campaignOf();
    const lead = await leadOf();
    const refused = await verify.seed('crm_campaign_member', [
      { crm_campaign: campaign.id, crm_lead: lead.id },
      { crm_campaign: campaign.id, crm_lead: lead.id },
    ]).then(() => null, (e: Rec) => e);
    expect(refused, 'a batch holding the same lead twice went through').toBeTruthy();
    expect(String(refused!.message)).toContain("a unique constraint on 'Campaign', 'Lead'");
    expect(await membersOf({ crm_campaign: campaign.id, crm_lead: lead.id })).toHaveLength(0);
  });

  it('Add to Campaign after a direct add finds the lead already a member, and adds nobody', async () => {
    const campaign = await campaignOf();
    const lead = await leadOf();
    await create({ crm_campaign: campaign.id, crm_lead: lead.id });
    await verify.actions.run('crm_lead', 'create_campaign', { as: marketer.token, recordId: lead.id, params: { campaignId: campaign.id } });
    expect(await membersOf({ crm_campaign: campaign.id, crm_lead: lead.id })).toHaveLength(1);
  });

  it('the response rate counts the person once: one member, responded, reads 100%', async () => {
    const campaign = await campaignOf();
    const lead = await leadOf();
    const first = (await create({ crm_campaign: campaign.id, crm_lead: lead.id })).body;
    expect((await create({ crm_campaign: campaign.id, crm_lead: lead.id })).status).toBe(409);
    const id = first.record?.id ?? first.id;
    expect((await verify.apiAs(marketer.token, 'PATCH', `/data/crm_campaign_member/${id}`, { status: 'responded' })).status).toBe(200);
    await vi.waitFor(async () => {
      const row = (await verify.rows('crm_campaign', { id: campaign.id }))[0]!;
      expect([row.num_responses, row.response_rate]).toEqual([1, 100]);
    }, { timeout: 10_000, interval: 100 });
  });
});

describe('the backstop and the catalogue', () => {
  it('declares one unique index per side, scoped to the organization', () => {
    const object = ((stack as Rec).objects as Rec[]).find((o) => o.name === 'crm_campaign_member')!;
    const indexes = (object.indexes ?? []) as Rec[];
    expect(indexes.filter((i) => i.unique === 'organization').map((i) => i.fields)).toEqual([
      ['crm_campaign', 'crm_lead'], ['crm_campaign', 'crm_contact'],
    ]);
  });

  it('declares its refusal, with a translation in every locale the app ships', () => {
    const refusal = (hookNamed('campaign_member_unique').refusals as Rec).DUPLICATE_VALUE as Rec;
    expect([refusal.status, refusal.params]).toEqual([409, ['person', 'campaign']]);
    for (const locale of ['zh-CN', 'ja-JP', 'es-ES']) {
      const pack = packFor(locale) as Rec;
      expect(pack?.hooks?.campaign_member_unique?.refusals?.DUPLICATE_VALUE?.message, locale).toMatch(/\{\{ person \}\}.*\{\{ campaign \}\}|\{\{ campaign \}\}.*\{\{ person \}\}/);
    }
  });
});
