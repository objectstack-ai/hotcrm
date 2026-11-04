// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { hotcrmStack, signUpPerson, type Person } from './helpers/verify-stack';

/**
 * A forecast is titled by its period and its owner: "Q4 2026 · Nina Reyes"
 * (#2242, the #2194 T1-U08 ruling).
 *
 * A forecast is one row per owner × period. Titled by the period alone, two
 * reps' Q4 rows read the same in Recent items and in a lookup. The title is
 * the stored `display_title` (#2230), and the owner's name in it is read one
 * hop through the `owner_id` lookup, never a copied text column, so a row
 * handed to another owner is re-titled by that write.
 *
 * Measured against the booted app, by insert and by update by id.
 */

type Rec = Record<string, any>;

let verify: VerifyStack;
let nina: Person;
let omar: Person;
let admin: string;

const stored = async (id: string): Promise<Rec> => (await verify.rows('crm_forecast', { id }))[0]!;

/** A hand-entered Q4 2026 forecast, so no nightly sweep owns the row. */
const q4 = async (over: Rec = {}): Promise<string> => {
  const [row] = await verify.seed('crm_forecast', [{
    period: 'quarter',
    period_start: '2026-10-01',
    period_end: '2026-12-31',
    period_label: 'Q4 2026',
    source: 'manual',
    commit_amount: 10_000,
    ...over,
  }]);
  return String(row!.id);
};

beforeAll(async () => {
  verify = await hotcrmStack();
  nina = await signUpPerson(verify, 'nina@forecast-owner-title.test', {
    name: 'Nina Reyes', positions: ['sales_rep'], permissionSets: ['sales_rep'],
  });
  omar = await signUpPerson(verify, 'omar@forecast-owner-title.test', {
    name: 'Omar Diaz', positions: ['sales_rep'], permissionSets: ['sales_rep'],
  });
  admin = await verify.signIn();
}, 180_000);

describe('the forecast title names the period and the owner', () => {
  it("two owners' forecasts for the same quarter have different titles", async () => {
    const ninas = await stored(await q4({ owner_id: nina.id }));
    const omars = await stored(await q4({ owner_id: omar.id }));
    expect(ninas.display_title).toBe('Q4 2026 · Nina Reyes');
    expect(omars.display_title).toBe('Q4 2026 · Omar Diaz');
    expect(ninas.display_title).not.toBe(omars.display_title);
  });

  it('a forecast with no owner is titled by its period label alone', async () => {
    const row = await stored(await q4());
    expect(row.owner_id ?? null).toBeNull();
    expect(row.display_title).toBe('Q4 2026');
  });

  it('the name comes from the lookup: handing the row to another owner re-titles it', async () => {
    const id = await q4({ owner_id: nina.id });
    const res = await verify.apiAs(admin, 'PATCH', `/data/crm_forecast/${id}`, { owner_id: omar.id });
    expect(res.status, await res.text()).toBe(200);
    expect((await stored(id)).display_title).toBe('Q4 2026 · Omar Diaz');
  });
});
