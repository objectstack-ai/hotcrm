// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { hotcrmStack, signUpPerson, type Person } from './helpers/verify-stack';
import { SalesLeadershipProfile, SalesManagerProfile } from '../src/sales/profiles';

type Rec = Record<string, any>;

/**
 * Executives and sales directors read what a sales manager reads, and change
 * none of it they do not own (#2492, ruled A 2026-11-15). Their own deals,
 * amount included, they create and edit (#2514).
 *
 * Before: `crm_executive` and `crm_sales_director` held no permission set, so
 * a holder carried `crm_user` alone. The large-deal shares showed them the big
 * open deals and nothing else: 0 accounts, 403 on cases, contracts, quotes and
 * forecasts.
 *
 * After: both positions distribute `sales_leadership`: read, at the manager's
 * depth, on every object `sales_manager` reads; the private-deal row filter on
 * the deal View All (ADR-0058); no object-level create, edit, delete, transfer
 * or export. The one field it opens is the deal amount (#2514): the
 * `crm_user` floor's own-deal create and edit carry it, and a rep's deal
 * still answers 403.
 *
 * On the shipped app booted by `@objectstack/verify`, REST as each position's
 * holder, over rows a sales rep owns.
 */

let verify: VerifyStack;
let rep: Person;
const leaders: Record<string, Person> = {};
const rows: Record<string, Rec> = {};

const POSITIONS = ['crm_executive', 'crm_sales_director'] as const;
const status = async (who: Person, method: string, path: string, body?: unknown) =>
  (await verify.apiAs(who.token, method, path, body)).status;
const ids = async (who: Person, path: string): Promise<string[]> => {
  const res = await verify.apiAs(who.token, 'GET', path);
  expect(res.status, await res.clone().text()).toBe(200);
  const body = (await res.json()) as Rec;
  const list: Rec[] = body.data?.records ?? body.records ?? body.data ?? [];
  return list.map((r) => String(r.id));
};

beforeAll(async () => {
  verify = await hotcrmStack();
  rep = await signUpPerson(verify, 'rep@sales-leadership-reach.test', {
    name: 'Book Owner', positions: ['crm_sales_rep'], permissionSets: ['sales_rep'],
  });
  for (const position of POSITIONS) {
    // The position alone: the set must arrive through its binding in positions.ts.
    leaders[position] = await signUpPerson(verify, `${position}@sales-leadership-reach.test`, {
      name: `Leader ${position}`, positions: [position],
    });
  }
  const owner_id = rep.id;
  const [account] = await verify.seed('crm_account', [{ name: 'Leadership Read Corp', type: 'customer', industry: 'technology', owner_id }]);
  const [contact] = await verify.seed('crm_contact', [{
    first_name: 'Lea', last_name: 'Reader', email: 'lea@sales-leadership-reach.test', crm_account: account!.id, owner_id,
  }]);
  // Below the large-deal threshold, so no large-deal share opens either one.
  const deal = { stage: 'negotiation', close_date: '2030-06-30', crm_account: account!.id, owner_id, amount: 20_000 };
  const [open, hidden] = await verify.seed('crm_opportunity', [
    { ...deal, name: 'Leadership: open deal' },
    { ...deal, name: 'Leadership: private deal', is_private: true },
  ]);
  const [quote] = await verify.seed('crm_quote', [{
    name: 'Leadership Quote', crm_account: account!.id, crm_contact: contact!.id, owner_id, status: 'draft',
    quote_date: '2030-01-01', expiration_date: '2030-02-01',
  }]);
  const [contract] = await verify.seed('crm_contract', [{
    crm_account: account!.id, crm_contact: contact!.id, contract_type: 'subscription', contract_value: 12_000, owner_id,
    start_date: '2026-01-01', end_date: '2027-01-01', name: 'Fixture Contract', contract_term_months: 12,
  }]);
  const [forecast] = await verify.seed('crm_forecast', [{
    owner_id, period: 'quarter', period_start: '2021-01-01', period_end: '2021-03-31', period_label: 'Q1 2021',
    source: 'manual', quota: 100_000, commit_amount: 40_000,
  }]);
  const [kase] = await verify.seed('crm_case', [{
    subject: 'Leadership: routine case', description: 'It broke.', crm_account: account!.id, crm_contact: contact!.id,
    origin: 'web', priority: 'medium', status: 'in_progress', owner_id,
  }]);
  Object.assign(rows, {
    crm_account: account, crm_contact: contact, crm_opportunity: open, private: hidden,
    crm_quote: quote, crm_contract: contract, crm_forecast: forecast, crm_case: kase,
  });
  const owners = await Promise.all(Object.entries(rows).map(async ([key, row]) => {
    const object = key === 'private' ? 'crm_opportunity' : key;
    return (await verify.rows(object, { id: row!.id }))[0]?.owner_id;
  }));
  expect(owners.every((o) => o === rep.id), 'fixture: the rep owns every row').toBe(true);
}, 180_000);

afterAll(async () => {
  await verify?.stop();
});

describe('the set is read only, at the manager\'s reach (#2492 ruling A)', () => {
  it('grants read and nothing else on every object it names', () => {
    for (const [object, grant] of Object.entries(SalesLeadershipProfile.objects) as [string, Rec][]) {
      expect(grant.allowRead, object).toBe(true);
      for (const write of ['allowCreate', 'allowEdit', 'allowDelete', 'modifyAllRecords', 'allowTransfer', 'allowExport']) {
        expect(grant[write] ?? false, `${object}.${write}`).toBe(false);
      }
    }
  });

  it('reads every object sales_manager reads, at the same depth', () => {
    const managerReads = Object.entries(SalesManagerProfile.objects as Record<string, Rec>).filter(([, g]) => g.allowRead);
    const leadership = SalesLeadershipProfile.objects as Record<string, Rec>;
    for (const [object, grant] of managerReads) {
      expect(leadership[object]?.allowRead, `${object}: the manager reads it`).toBe(true);
      expect(leadership[object]?.viewAllRecords, `${object}: View All as the manager's`)
        .toBe(Boolean(grant.viewAllRecords || grant.modifyAllRecords));
    }
    expect(Object.keys(leadership).filter((o) => !managerReads.some(([m]) => m === o)), 'reads the manager does not').toEqual([]);
  });

  it('edits no field it names but the deal amount, and carries the private-deal row filter', () => {
    const editable = (Object.entries(SalesLeadershipProfile.fields) as [string, Rec][])
      .filter(([, rule]) => rule.editable === true).map(([field]) => field);
    // #2514: the amount a holder's OWN deal needs; the record reach stays the
    // floor's own-only, pinned over REST below.
    expect(editable).toEqual(['crm_opportunity.amount']);
    expect(SalesLeadershipProfile.rowLevelSecurity.map((p) => p.object)).toContain('crm_opportunity');
  });
});

describe.each(POSITIONS)('what a %s holder reads', (position) => {
  it.each(['crm_account', 'crm_contact', 'crm_opportunity', 'crm_quote', 'crm_contract', 'crm_forecast', 'crm_case'])(
    'a rep\'s %s: 200',
    async (object) => {
      expect(await status(leaders[position]!, 'GET', `/data/${object}/${rows[object]!.id}`)).toBe(200);
    },
  );

  it('lists the rep\'s open deal and not the rep\'s private one', async () => {
    const listed = await ids(leaders[position]!, '/data/crm_opportunity?top=500');
    expect(listed).toContain(String(rows.crm_opportunity!.id));
    expect(listed).not.toContain(String(rows.private!.id));
    expect(await status(leaders[position]!, 'GET', `/data/crm_opportunity/${rows.private!.id}`)).not.toBe(200);
  });
});

describe.each(POSITIONS)('what a %s holder may not do', (position) => {
  it.each(['crm_account', 'crm_contact', 'crm_opportunity', 'crm_quote', 'crm_contract', 'crm_forecast', 'crm_case'])(
    'refuses an edit and a delete of the rep\'s %s',
    async (object) => {
      const patch: Rec = {
        crm_account: { industry: 'finance' }, crm_contact: { last_name: 'Changed' }, crm_opportunity: { name: 'Leader edit' },
        crm_quote: { name: 'Leader edit' }, crm_contract: { contract_value: 1 }, crm_forecast: { commit_amount: 1 },
        crm_case: { subject: 'Leader edit' },
      };
      expect(await status(leaders[position]!, 'PATCH', `/data/${object}/${rows[object]!.id}`, patch[object])).toBe(403);
      expect(await status(leaders[position]!, 'DELETE', `/data/${object}/${rows[object]!.id}`)).toBe(403);
    },
  );

  it('refuses a new quote, contract, forecast or case', async () => {
    const account = rows.crm_account!.id;
    const contact = rows.crm_contact!.id;
    const who = leaders[position]!;
    expect(await status(who, 'POST', '/data/crm_quote', { name: 'Leader quote', crm_account: account, crm_contact: contact, quote_date: '2030-01-01', expiration_date: '2030-02-01' })).toBe(403);
    expect(await status(who, 'POST', '/data/crm_contract', { crm_account: account, crm_contact: contact, contract_type: 'subscription', contract_value: 1, start_date: '2026-01-01', end_date: '2027-01-01', contract_term_months: 12 })).toBe(403);
    expect(await status(who, 'POST', '/data/crm_forecast', { period: 'quarter', period_start: '2022-01-01', period_end: '2022-03-31', period_label: 'Q1 2022', source: 'manual', quota: 1 })).toBe(403);
    expect(await status(who, 'POST', '/data/crm_case', { subject: 'Leader case', description: 'x', crm_account: account, priority: 'low', origin: 'web' })).toBe(403);
  });

  it.each(['crm_account', 'crm_contact', 'crm_opportunity', 'crm_quote', 'crm_contract', 'crm_case'])(
    'refuses the %s export',
    async (object) => {
      expect(await status(leaders[position]!, 'GET', `/data/${object}/export?format=json`)).toBe(403);
    },
  );
});

describe.each(POSITIONS)('a %s holder\'s own deals (#2514)', (position) => {
  const deal = () => ({
    name: `Own deal ${position}`, crm_account: rows.crm_account!.id, amount: 100,
    stage: 'prospecting', close_date: '2030-09-30',
  });

  it('creates a deal with an amount, and edits that amount', async () => {
    const who = leaders[position]!;
    const created = await verify.apiAs(who.token, 'POST', '/data/crm_opportunity', deal());
    expect(created.status, await created.clone().text()).toBe(201);
    const body = (await created.json()) as Rec;
    const id = String((body.record ?? body.data ?? body).id);
    const [row] = await verify.rows('crm_opportunity', { id });
    expect(row?.owner_id).toBe(who.id);
    expect(Number(row?.amount)).toBe(100);

    const edited = await verify.apiAs(who.token, 'PATCH', `/data/crm_opportunity/${id}`, { amount: 250 });
    expect(edited.status, await edited.clone().text()).toBe(200);
    expect(Number((await verify.rows('crm_opportunity', { id }))[0]?.amount)).toBe(250);
  });

  it('still may not change the amount on a rep\'s deal', async () => {
    const id = rows.crm_opportunity!.id;
    expect(await status(leaders[position]!, 'PATCH', `/data/crm_opportunity/${id}`, { amount: 1 })).toBe(403);
    expect(Number((await verify.rows('crm_opportunity', { id }))[0]?.amount)).toBe(20_000);
  });
});
