// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, vi } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import {
  hotcrmStack, signUpPerson, systemUpdate, runScheduledFlow, runShippedHook, notificationsTo,
  settleNotificationDeliveries, daysFromNow, type Person,
} from './helpers/verify-stack';
import { hookNamed } from './helpers/composed-stack';

type Rec = Record<string, any>;

/**
 * Records the app DERIVES from a private opportunity do not carry its name.
 *
 * `src/docs/crm_admin_access.md` declares that "a deal flagged Private is visible only
 * to its owner, including to the sets that hold org-wide opportunity read
 * (Sales Manager, Marketing User)". The deal itself is held back by the
 * `opportunity_private_owner_only` row policies; this file pins the other half
 * of the promise — what the app writes FROM such a deal:
 *
 *  - the activation task `opportunity_promote_account` books when the deal is
 *    won, and the stall task `opportunity_stagnation` books when it sits in one
 *    stage too long, are titled WITHOUT the deal's name. Who may read a task is
 *    decided by `crm_task`'s own grants and its owner, not by the deal's, so a
 *    task's title is written for every reader of the task. Global search
 *    indexes `crm_task.subject`, so the same title keeps the name out of search;
 *  - a copy made with `clone_opportunity` carries the name and the amount, so
 *    it keeps the flag and is private too.
 *
 * Each title still reaches the owner, the task still links the deal through
 * `related_to_opportunity`, and a deal that is NOT private keeps its named
 * title (the controls below), so every case states the invariant against a
 * reading that would show it broken.
 *
 * Everything runs on the shipped app booted by `@objectstack/verify`, as the
 * personas the declaration names: the deal's owner (a sales rep), a sales
 * manager and a marketing user — the two sets with org-wide opportunity read.
 * Fixture deals are written as the system with the owner as `owner_id`; every
 * reading is taken over this file's own rows.
 */

let verify: VerifyStack;
let owner: Person;
let manager: Person;
let marketer: Person;
let k = 0;

beforeAll(async () => {
  verify = await hotcrmStack();
  owner = await signUpPerson(verify, 'owner@private-opportunity-derived-records.test', {
    name: 'Deal Owner', positions: ['sales_rep'], permissionSets: ['sales_rep'],
  });
  manager = await signUpPerson(verify, 'manager@private-opportunity-derived-records.test', {
    name: 'Org-wide Reader', positions: ['sales_manager'], permissionSets: ['sales_manager'],
  });
  marketer = await signUpPerson(verify, 'marketer@private-opportunity-derived-records.test', {
    name: 'Marketing Reader', positions: ['marketing_user'], permissionSets: ['marketing_user'],
  });
}, 120_000);

const PRIVATE_ACTIVATION = 'Activate new customer (private opportunity)';
const PRIVATE_STALL = 'Advance stalled deal (private opportunity)';

/** A deal of the owner's, on an account of the owner's, as the system writes it. */
const dealOf = async (over: Rec): Promise<Rec> => {
  const n = ++k;
  const [account] = await verify.seed('crm_account', [{ name: `Private Derived Co ${n}`, owner_id: owner.id }]);
  const [deal] = await verify.seed('crm_opportunity', [{
    name: `Northwind Harbor Expansion ${n}`, amount: 42_000, stage: 'negotiation', close_date: '2030-06-30',
    crm_account: account!.id, owner_id: owner.id, approval_status: 'approved', ...over,
  }]);
  return deal!;
};

/** The HTTP status `who` gets reading one record through the data API. */
const readStatus = async (who: Person, object: string, id: string): Promise<number> =>
  (await verify.apiAs(who.token, 'GET', `/data/${object}/${id}`)).status;

/** One record as `who` reads it through the data API. */
const readAs = async (who: Person, object: string, id: string): Promise<Rec> =>
  ((await (await verify.apiAs(who.token, 'GET', `/data/${object}/${id}`)).json()) as Rec).record;

/** The global-search hits `who` gets for `q`, restricted to the given record ids. */
const searchHits = async (who: Person, q: string, ids: string[]): Promise<Rec[]> => {
  const res = await verify.apiAs(who.token, 'GET', `/search?q=${encodeURIComponent(q)}`);
  expect(res.status, 'global search answered').toBe(200);
  const body = (await res.json()) as Rec;
  return ((body.hits ?? []) as Rec[]).filter((h) => ids.includes(String(h.id)));
};

/** The owner wins the deal; resolves with the activation task the async hook books. */
const winAndAwaitTask = async (deal: Rec, extra: Rec = {}): Promise<Rec> => {
  await verify.hooks.run('crm_opportunity', 'update', {
    id: deal.id, stage: 'closed_won', win_reason: 'better_price', ...extra,
  }, { as: owner.token });
  return vi.waitFor(async () => {
    const [task] = await verify.rows('crm_task', { related_to_opportunity: deal.id });
    expect(task, 'no activation task was booked').toBeTruthy();
    return task!;
  }, { timeout: 10_000, interval: 25 });
};

describe('the activation task of a won private opportunity (opportunity_promote_account)', () => {
  it('is titled without the deal name, and still reaches its owner and links the deal', async () => {
    const deal = await dealOf({ is_private: true });
    const task = await winAndAwaitTask(deal);

    expect(task.subject).toBe(PRIVATE_ACTIVATION);
    expect(task.subject).not.toContain(deal.name);
    expect(task.owner_id, 'the owner still gets the step').toBe(owner.id);
    expect(task.related_to_opportunity, 'the task still links the deal').toBe(deal.id);
    expect(await readStatus(owner, 'crm_task', task.id)).toBe(200);
  });

  it('reads without the deal name to every holder of org-wide task read', async () => {
    const deal = await dealOf({ is_private: true });
    const task = await winAndAwaitTask(deal);

    // The premise: the deal itself is held back from the org-wide reader…
    expect(await readStatus(manager, 'crm_opportunity', deal.id)).toBe(404);
    // …while the task stays readable through `crm_task`'s own grant, so its
    // title is what this reader sees.
    const seen = await readAs(manager, 'crm_task', task.id);
    expect(seen.subject).toBe(PRIVATE_ACTIVATION);
    expect(JSON.stringify(seen)).not.toContain(deal.name);
  });

  it('keeps the private deal name out of global search for a reader who cannot read the deal', async () => {
    const deal = await dealOf({ is_private: true });
    const task = await winAndAwaitTask(deal);

    expect(await searchHits(manager, deal.name, [deal.id, task.id])).toEqual([]);
    // Control: search does index the name — the owner, who can read the deal, finds it.
    const ownHits = await searchHits(owner, deal.name, [deal.id, task.id]);
    expect(ownHits.map((h) => `${h.object}:${h.id}`)).toEqual([`crm_opportunity:${deal.id}`]);
  });

  it('follows the flag the winning write sets', async () => {
    const madePrivate = await dealOf({ is_private: false });
    expect((await winAndAwaitTask(madePrivate, { is_private: true })).subject).toBe(PRIVATE_ACTIVATION);

    const madePublic = await dealOf({ is_private: true });
    expect((await winAndAwaitTask(madePublic, { is_private: false })).subject)
      .toBe(`Activate new customer for opportunity ${madePublic.name}`);
  });

  it('a non-private deal keeps its named title (control)', async () => {
    const deal = await dealOf({ is_private: false });
    expect((await winAndAwaitTask(deal)).subject).toBe(`Activate new customer for opportunity ${deal.name}`);
  });

  it('the shipped hook body titles a private deal without its name', async () => {
    // The body `objectstack build` lowers the hook to, in the runtime's
    // sandbox — the form production runs (`runShippedHook`). The title is
    // composed inside the body, so this is where a lowering regression shows.
    const deal = await dealOf({ is_private: true });
    const [stored] = await verify.rows('crm_opportunity', { id: deal.id });
    await runShippedHook(verify, hookNamed('opportunity_promote_account'), {
      event: 'afterUpdate', input: { id: deal.id, stage: 'closed_won' }, previous: stored, as: owner.token,
    });
    const [task] = await verify.rows('crm_task', { related_to_opportunity: deal.id });
    expect(task?.subject).toBe(PRIVATE_ACTIVATION);
  });
});

describe('the stall task of a private opportunity (opportunity_stagnation)', () => {
  /** A deal that entered its stage a month ago, so the sweep picks it up. */
  const stalledDeal = async (over: Rec): Promise<Rec> => {
    const deal = await dealOf({ stage: 'proposal', ...over });
    await systemUpdate(verify, 'crm_opportunity', { id: deal.id, stage_entry_date: daysFromNow(-30) });
    return deal;
  };
  const sweep = () => settleNotificationDeliveries(verify, () => runScheduledFlow(verify, 'opportunity_stagnation'));
  const openStallTasks = async (dealId: string): Promise<Rec[]> =>
    (await verify.rows('crm_task', { related_to_opportunity: dealId })).filter((t) => t.status !== 'completed');

  it('is titled without the deal name, readable to its owner, and the owner is still nudged', async () => {
    const deal = await stalledDeal({ is_private: true });
    await sweep();

    const tasks = await openStallTasks(deal.id);
    expect(tasks.map((t) => t.subject)).toEqual([PRIVATE_STALL]);
    expect(tasks[0]!.owner_id).toBe(owner.id);
    expect(tasks[0]!.related_to_opportunity).toBe(deal.id);
    const nudges = (await notificationsTo(verify, owner.id, 'deal_stalled'))
      .filter((n) => n.payload?.actionUrl === `/crm_opportunity/${deal.id}`);
    expect(nudges, 'the owner is still nudged').toHaveLength(1);
  });

  it('reads without the deal name to an org-wide task reader, and stays out of their search', async () => {
    const deal = await stalledDeal({ is_private: true });
    await sweep();
    const [task] = await openStallTasks(deal.id);

    expect(await readStatus(manager, 'crm_opportunity', deal.id)).toBe(404);
    expect((await readAs(manager, 'crm_task', task!.id)).subject).toBe(PRIVATE_STALL);
    expect(await searchHits(manager, deal.name, [deal.id, task!.id])).toEqual([]);
  });

  it('is booked once per stall episode across sweeps, whichever way the flag moves', async () => {
    const madePrivate = await stalledDeal({ is_private: false });
    const madePublic = await stalledDeal({ is_private: true });
    await sweep();
    await systemUpdate(verify, 'crm_opportunity', { id: madePrivate.id, is_private: true });
    await systemUpdate(verify, 'crm_opportunity', { id: madePublic.id, is_private: false });
    await sweep();

    expect(await openStallTasks(madePrivate.id), 'a second stall task for one episode').toHaveLength(1);
    expect(await openStallTasks(madePublic.id), 'a second stall task for one episode').toHaveLength(1);
  });

  it('a non-private deal keeps its named title (control)', async () => {
    const deal = await stalledDeal({ is_private: false });
    await sweep();
    expect((await openStallTasks(deal.id)).map((t) => t.subject)).toEqual([`Advance stalled deal: ${deal.name}`]);
  });
});

describe('a copy of a private opportunity (clone_opportunity)', () => {
  const cloneAsOwner = async (deal: Rec): Promise<Rec> => {
    const result = (await verify.actions.run('crm_opportunity', 'clone_opportunity', {
      as: owner.token, recordId: deal.id,
    })) as Rec;
    const [copy] = await verify.rows('crm_opportunity', { id: result.id });
    expect(copy, 'no copy was written').toBeTruthy();
    return copy!;
  };

  it('is private, so it reaches its owner and no org-wide opportunity reader', async () => {
    const deal = await dealOf({ is_private: true, stage: 'qualification' });
    const copy = await cloneAsOwner(deal);

    expect(copy.is_private).toBe(true);
    expect(copy.owner_id).toBe(owner.id);
    expect(await readStatus(owner, 'crm_opportunity', copy.id)).toBe(200);
    expect(await readStatus(manager, 'crm_opportunity', copy.id)).toBe(404);
    expect(await readStatus(marketer, 'crm_opportunity', copy.id)).toBe(404);
    expect(await searchHits(manager, deal.name, [deal.id, copy.id])).toEqual([]);
  });

  it('a copy of a non-private deal is not private (control)', async () => {
    const deal = await dealOf({ is_private: false, stage: 'qualification' });
    const copy = await cloneAsOwner(deal);

    expect(copy.is_private).toBe(false);
    expect(await readStatus(manager, 'crm_opportunity', copy.id)).toBe(200);
  });
});
