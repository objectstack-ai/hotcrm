// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { CrmPositions } from '../src/sales/sharing/positions';
import { hotcrmStack, signUpPerson, daysFromNow, type Person } from './helpers/verify-stack';

type Rec = Record<string, any>;

/**
 * The Marketing Manager and the Marketing Director edit a live campaign a
 * specialist owns (#2338 item 3).
 *
 * Both positions promise it ("edits every live campaign, whoever owns it"),
 * and `campaign_leadership_*` (`src/marketing/sharing/campaign.sharing.ts`)
 * shares every live campaign to them at `edit`. Until #2338 neither position
 * declared a permission set, so a holder carried `crm_user` alone, whose
 * campaign grant is read-only: the object-level gate refused the update with
 * 403 before any share was consulted. Measured on 18.2.0 in a browser: the
 * record offered no Edit and no Enroll.
 *
 * Each rung is signed up the way Setup staffs it, holding the position and
 * every set the position declares, and drives the REST door the edit form
 * uses. The control holds the same position and no set, the pre-#2338 shape,
 * so the refusal it gets is what the binding removes.
 */

const RUNGS = ['marketing_manager', 'marketing_director'] as const;
const declaredSets = (position: string): string[] =>
  ((CrmPositions.find((p) => p.name === position) as Rec | undefined)?.permissionSets ?? []) as string[];

let verify: VerifyStack;
let specialist: Person;
const rung: Record<string, Person & { sets: string[] }> = {};
const bare: Record<string, Person> = {};
let k = 0;

beforeAll(async () => {
  verify = await hotcrmStack();
  specialist = await signUpPerson(verify, 'specialist@marketing-leadership.test', {
    name: 'Leadership Specialist', positions: ['marketing_user'], permissionSets: declaredSets('marketing_user'),
  });
  for (const position of RUNGS) {
    const sets = declaredSets(position);
    rung[position] = {
      ...(await signUpPerson(verify, `${position}@marketing-leadership.test`, {
        name: `Leadership ${position}`, positions: [position], permissionSets: sets,
      })),
      sets,
    };
    bare[position] = await signUpPerson(verify, `${position}.bare@marketing-leadership.test`, {
      name: `Leadership ${position} without a set`, positions: [position],
    });
  }
}, 180_000);

/** A live campaign the specialist owns: the record `campaign_leadership_*` shares to both rungs. */
const liveCampaign = async (): Promise<Rec> => {
  const [campaign] = await verify.seed('crm_campaign', [{
    name: `Leadership ${++k}`, status: 'planning', is_active: true,
    start_date: daysFromNow(7), end_date: daysFromNow(37), owner_id: specialist.id,
  }]);
  return campaign!;
};

const permissionsOf = async (who: Person): Promise<Rec> => {
  const res = await verify.apiAs(who.token, 'GET', '/auth/me/permissions');
  expect(res.status, await res.clone().text()).toBe(200);
  const body: Rec = await res.json();
  return (body.data ?? body).objects;
};

describe('the marketing rungs edit a live campaign a specialist owns (#2338 item 3)', () => {
  it.each(RUNGS)('%s declares the marketing staff set', (position) => {
    expect(rung[position]!.sets).toEqual(['marketing_user']);
  });

  it.each(RUNGS)('%s holds campaign edit and member create, the grants Edit and Enroll need', async (position) => {
    const objects = await permissionsOf(rung[position]!);
    expect(objects.crm_campaign).toMatchObject({ allowRead: true, allowEdit: true });
    expect(objects.crm_campaign_member).toMatchObject({ allowCreate: true, allowEdit: true });
  });

  it.each(RUNGS)('%s updates it, and the change is stored', async (position) => {
    const campaign = await liveCampaign();
    const res = await verify.apiAs(rung[position]!.token, 'PATCH', `/data/crm_campaign/${campaign.id}`, {
      description: `Edited by ${position}`,
    });
    expect(res.status, await res.clone().text()).toBe(200);
    expect((await verify.rows('crm_campaign', { id: campaign.id }))[0]?.description).toBe(`Edited by ${position}`);
  });

  it.each(RUNGS)('%s holding the position alone, as before #2338, is refused and nothing is stored', async (position) => {
    const campaign = await liveCampaign();
    const res = await verify.apiAs(bare[position]!.token, 'PATCH', `/data/crm_campaign/${campaign.id}`, {
      description: `Edited by a bare ${position}`,
    });
    const body: Rec = await res.json();
    expect([res.status, body?.code]).toEqual([403, 'PERMISSION_DENIED']);
    expect((await verify.rows('crm_campaign', { id: campaign.id }))[0]?.description ?? null).toBeNull();
  });
});
