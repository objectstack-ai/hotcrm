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
 * Each rung is signed up the way Setup staffs it: added as a holder of the
 * position, with no set assigned by hand. The position distributes the sets it
 * declares (ADR-0131 D3/D4), so what the holder can do is what the binding
 * gives. The pre-#2338 refusal is not re-run here, because the binding cannot
 * be removed from a booted stack: it was measured on `main` on 18.2.0 against
 * a dev server, the same holder answering 403 `PERMISSION_DENIED` on every
 * campaign, and is quoted in the PR.
 */

const RUNGS = ['marketing_manager', 'marketing_director'] as const;
const declaredSets = (position: string): string[] =>
  ((CrmPositions.find((p) => p.name === position) as Rec | undefined)?.permissionSets ?? []) as string[];

let verify: VerifyStack;
let specialist: Person;
const rung: Record<string, Person> = {};
let k = 0;

beforeAll(async () => {
  verify = await hotcrmStack();
  specialist = await signUpPerson(verify, 'specialist@marketing-leadership.test', {
    name: 'Leadership Specialist', positions: ['marketing_user'],
  });
  for (const position of RUNGS) {
    rung[position] = await signUpPerson(verify, `${position}@marketing-leadership.test`, {
      name: `Leadership ${position}`, positions: [position],
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
  return body.data ?? body;
};

describe('the marketing rungs edit a live campaign a specialist owns (#2338 item 3)', () => {
  it.each(RUNGS)('%s declares the marketing staff set', (position) => {
    expect(declaredSets(position)).toEqual(['marketing_user']);
  });

  it.each(RUNGS)('a holder of %s resolves that set through the position alone', async (position) => {
    expect((await permissionsOf(rung[position]!)).permissionSets).toContain('marketing_user');
  });

  it.each(RUNGS)('%s holds campaign edit and member create, the grants Edit and Enroll need', async (position) => {
    const { objects } = await permissionsOf(rung[position]!);
    expect(objects.crm_campaign).toMatchObject({ allowRead: true, allowEdit: true });
    expect(objects.crm_campaign_member).toMatchObject({ allowCreate: true, allowEdit: true });
  });

  it.each(RUNGS)('%s updates it, and the change is stored', async (position) => {
    const campaign = await liveCampaign();
    expect(campaign.owner_id).toBe(specialist.id);
    const res = await verify.apiAs(rung[position]!.token, 'PATCH', `/data/crm_campaign/${campaign.id}`, {
      description: `Edited by ${position}`,
    });
    expect(res.status, await res.clone().text()).toBe(200);
    expect((await verify.rows('crm_campaign', { id: campaign.id }))[0]?.description).toBe(`Edited by ${position}`);
  });
});
