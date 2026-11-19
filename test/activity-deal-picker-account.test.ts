// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { hotcrmStack, signUpPerson, type Person } from './helpers/verify-stack';

/**
 * A task's or an event's Related Opportunity picker offers only the deals of
 * the account the activity names, and never a lost one (#2573).
 *
 * The rule is two `lookupFilters` entries on `related_to_opportunity`: rule 2,
 * `stage ne closed_lost`, and rule 1, `crm_account eq { $record:
 * 'related_to_account' }`. In a record form the console picker puts the
 * activity's account in place of the `{ $record }` reference and re-queries
 * when the account changes; with no account yet it leaves that entry out.
 * Both halves were read in the console on 18.6.0 (New and Edit forms, en and
 * zh-CN, PR body).
 *
 * Pinned here on the booted app:
 *
 *   - the two entries as the registry serves them to the console, and the
 *     `{ $record }` path naming the activity's own account lookup;
 *   - what those entries admit for a rep reading under their own grants once
 *     the activity names an account: that account's open and won deals, not
 *     its lost one and not another account's.
 *
 * The picker narrows the choice only. A write that names another account's
 * deal is not refused by this rule (the platform's lookup-filter contract
 * leaves the save to the server side; measured 201 on 18.6.0).
 */

type Row = Record<string, any>;
type Entry = { field: string; operator: string; value: unknown };

const ACTIVITIES = ['crm_task', 'crm_event'] as const;

let verify: VerifyStack;
let rep: Person;
let home: string;
let other: string;
const deals: Record<string, string> = {};

beforeAll(async () => {
  verify = await hotcrmStack();
  await verify.signIn();
  rep = await signUpPerson(verify, 'rep@activity-deal-picker.test', {
    name: 'Picker Rep', positions: ['crm_sales_rep'], permissionSets: ['sales_rep'],
  });
  const [a, b] = await verify.seed('crm_account', [
    { name: 'Picker Home Co', owner_id: rep.id },
    { name: 'Picker Other Co', owner_id: rep.id },
  ]);
  home = String(a!.id);
  other = String(b!.id);
  const rows = await verify.seed('crm_opportunity', [
    { name: 'Picker Home Open', stage: 'negotiation', amount: 100, close_date: '2030-06-30', crm_account: home, owner_id: rep.id },
    { name: 'Picker Home Won', stage: 'closed_won', amount: 100, close_date: '2026-01-31', crm_account: home, owner_id: rep.id, win_reason: 'best_fit' },
    { name: 'Picker Home Lost', stage: 'closed_lost', amount: 100, close_date: '2026-01-31', crm_account: home, owner_id: rep.id, loss_reason: 'competitor' },
    { name: 'Picker Other Open', stage: 'negotiation', amount: 100, close_date: '2030-06-30', crm_account: other, owner_id: rep.id },
  ]);
  for (const row of rows) deals[String(row.name)] = String(row.id);
}, 120_000);

const pickerFilters = (activity: string): Entry[] =>
  (verify.metadata.object(activity)?.fields as Row | undefined)?.related_to_opportunity?.lookupFilters;

/**
 * The candidate query for a form whose activity names `account`: each entry
 * with the form's value in place of its `{ $record }` reference. Only the two
 * operators this field declares are spelled; anything else fails the test.
 */
const candidates = async (activity: string, account: string): Promise<string[]> => {
  const where: Row = {};
  for (const entry of pickerFilters(activity)) {
    const ref = (entry.value as Row | null)?.$record;
    const value = ref === undefined ? entry.value : ({ related_to_account: account } as Row)[ref];
    if (entry.operator === 'eq') where[entry.field] = value;
    else if (entry.operator === 'ne') where[entry.field] = { $ne: value };
    else throw new Error(`unexpected operator ${entry.operator}`);
  }
  const ours = new Set(Object.values(deals));
  const rows = await verify.rows('crm_opportunity', where, { as: rep.token });
  return rows.map((r) => String(r.id)).filter((id) => ours.has(id)).sort();
};

describe("an activity's Related Opportunity picker (#2573)", () => {
  it.each(ACTIVITIES)('%s declares the lost-deal rule and the own-account rule', (activity) => {
    expect(pickerFilters(activity)).toEqual([
      { field: 'stage', operator: 'ne', value: 'closed_lost' },
      { field: 'crm_account', operator: 'eq', value: { $record: 'related_to_account' } },
    ]);
    const account = (verify.metadata.object(activity)?.fields as Row).related_to_account;
    expect(account.type).toBe('lookup');
    expect(account.reference).toBe('crm_account');
  });

  it.each(ACTIVITIES)("%s on an account offers that account's open and won deals only", async (activity) => {
    expect(await candidates(activity, home)).toEqual(
      [deals['Picker Home Open'], deals['Picker Home Won']].sort(),
    );
    expect(await candidates(activity, other)).toEqual([deals['Picker Other Open']]);
  });
});
