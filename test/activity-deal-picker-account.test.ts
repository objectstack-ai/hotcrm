// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { hotcrmStack, signUpPerson, type Person } from './helpers/verify-stack';

/**
 * A task's or an event's Related Opportunity picker offers only the deals of
 * the account the activity names, and never a lost one (#2573); its Related
 * Contact picker offers only that account's contacts (#2677).
 *
 * The rule is two `lookupFilters` entries on `related_to_opportunity`: rule 2,
 * `stage ne closed_lost`, and rule 1, `crm_account eq { $record:
 * 'related_to_account' }`. In a record form the console picker puts the
 * activity's account in place of the `{ $record }` reference and re-queries
 * when the account changes; with no account yet it leaves that entry out.
 * Both halves were read in the console on 18.6.0 (New and Edit forms, en and
 * zh-CN, PR bodies of #2676 and of #2677's PR).
 *
 * `related_to_contact` carries the account entry alone, with no `orEmpty`: a
 * contact's `crm_account` is its required master-detail parent (`notNull`),
 * so no contact is without an account for "or empty" to admit.
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
const contacts: Record<string, string> = {};

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
  const people = await verify.seed('crm_contact', [
    { first_name: 'Hana', last_name: 'Home', email: 'hana@activity-contact-picker.test', crm_account: home, owner_id: rep.id },
    { first_name: 'Hugo', last_name: 'Home', email: 'hugo@activity-contact-picker.test', crm_account: home, owner_id: rep.id },
    { first_name: 'Olga', last_name: 'Other', email: 'olga@activity-contact-picker.test', crm_account: other, owner_id: rep.id },
  ]);
  for (const row of people) contacts[String(row.first_name)] = String(row.id);
}, 120_000);

const pickerFilters = (activity: string, field = 'related_to_opportunity'): Entry[] =>
  (verify.metadata.object(activity)?.fields as Row | undefined)?.[field]?.lookupFilters;

/**
 * The candidate query for a form whose activity names `account`: each entry
 * of `field`'s picker with the form's value in place of its `{ $record }`
 * reference, read over `target` and kept to the rows this file seeded. Only
 * the two operators these fields declare are spelled; anything else fails.
 */
const candidates = async (
  activity: string,
  account: string,
  field = 'related_to_opportunity',
  target = 'crm_opportunity',
  seeded: Record<string, string> = deals,
): Promise<string[]> => {
  const where: Row = {};
  for (const entry of pickerFilters(activity, field)) {
    const ref = (entry.value as Row | null)?.$record;
    const value = ref === undefined ? entry.value : ({ related_to_account: account } as Row)[ref];
    if (entry.operator === 'eq') where[entry.field] = value;
    else if (entry.operator === 'ne') where[entry.field] = { $ne: value };
    else throw new Error(`unexpected operator ${entry.operator}`);
  }
  const ours = new Set(Object.values(seeded));
  const rows = await verify.rows(target, where, { as: rep.token });
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

describe("an activity's Related Contact picker (#2677)", () => {
  const contactPicker = (activity: string, account: string) =>
    candidates(activity, account, 'related_to_contact', 'crm_contact', contacts);

  it.each(ACTIVITIES)('%s declares the own-account rule', (activity) => {
    expect(pickerFilters(activity, 'related_to_contact')).toEqual([
      { field: 'crm_account', operator: 'eq', value: { $record: 'related_to_account' } },
    ]);
    const parent = (verify.metadata.object('crm_contact')?.fields as Row).crm_account;
    expect(parent.reference).toBe('crm_account');
    expect(parent.required).toBe(true);
  });

  it.each(ACTIVITIES)("%s on an account offers that account's contacts only", async (activity) => {
    expect(await contactPicker(activity, home)).toEqual([contacts.Hana, contacts.Hugo].sort());
    expect(await contactPicker(activity, other)).toEqual([contacts.Olga]);
  });
});
