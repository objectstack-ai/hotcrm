// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, vi } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import {
  hotcrmStack, signUpPerson, systemUpdate, recordEngineWrites, today, daysFromNow, type Person,
} from './helpers/verify-stack';

type Rec = Record<string, any>;

/**
 * Runtime tests for the SALES-side hooks — the real handler bodies, inside the
 * real engine's write path.
 *
 * Of the 24 hooks this app registers, only four had runtime coverage
 * (`opportunity_amount_rollup`, `opportunity_line_item_price_fill`,
 * `quote_total_rollup`, `lead_auto_assign`). Everything asserted below — the
 * whole opportunity lifecycle, the closed-record freeze, quote acceptance
 * drafting a contract, the delete-protection guards on account / contact /
 * product — was previously proven only to be *wired*, never to *work*.
 *
 * Every case runs on the shipped app booted by `@objectstack/verify`: a
 * person's write through the engine's write door (`hooks.run`) as the persona
 * the case is about, with the record put in its prior state by a system write
 * where no person's write can produce it (a closed deal, a settled quote, a
 * stamped clock); what is asserted is the row the engine stored, or the
 * engine's refusal. A deletion is the admin's, since the personas below hold
 * no delete rights.
 *
 * Companion file: hooks-runtime-service.test.ts (case, contract, campaign,
 * task, forecast, knowledge, lead).
 */

let verify: VerifyStack;
let admin: string;
let rep: Person;
let rep2: Person;
let manager: Person;
let k = 0;
beforeAll(async () => {
  verify = await hotcrmStack();
  admin = await verify.signIn();
  rep = await signUpPerson(verify, 'rep@hooks-runtime-sales.test', {
    name: 'Sales Rep', positions: ['sales_rep'], permissionSets: ['sales_rep'],
  });
  rep2 = await signUpPerson(verify, 'rep2@hooks-runtime-sales.test', {
    name: 'Second Rep', positions: ['sales_rep'], permissionSets: ['sales_rep'],
  });
  manager = await signUpPerson(verify, 'manager@hooks-runtime-sales.test', {
    name: 'Sales Manager', positions: ['sales_manager'], permissionSets: ['sales_manager'],
  });
}, 120_000);

const as = (who: Person | string) => ({ as: typeof who === 'string' ? who : who.token });
const stored = async (object: string, id: string): Promise<Rec> => (await verify.rows(object, { id }))[0]!;

/** An account of the rep's, written as the system. */
const accountOf = async (over: Rec = {}): Promise<Rec> =>
  (await verify.seed('crm_account', [{ name: `Sales Hooks Co ${++k}`, owner_id: rep.id, ...over }]))[0]!;

/** A deal of the rep's on its own account, written as the system (`over` is its stored state). */
const dealOf = async (over: Rec = {}): Promise<Rec> => {
  const acct = await accountOf();
  return (await verify.seed('crm_opportunity', [{
    name: `Deal ${++k}`, amount: 25_000, stage: 'proposal', close_date: '2030-06-30',
    crm_account: acct.id, owner_id: rep.id, ...over,
  }]))[0]!;
};

/** The rep creating a deal of their own. */
const repInserts = async (doc: Rec): Promise<Rec> => {
  const acct = await accountOf();
  return verify.hooks.run('crm_opportunity', 'insert', {
    name: `Deal ${++k}`, close_date: '2030-06-30', crm_account: acct.id, ...doc,
  }, as(rep));
};

const repUpdates = (object: string, id: string, doc: Rec) =>
  verify.hooks.run(object, 'update', { id, ...doc }, as(rep));

// ───────────────────────────────────────────────────────── opportunity ──

describe('opportunity_lifecycle', () => {
  it('derives probability, expected_revenue and forecast_category from stage on insert', async () => {
    const opp = await repInserts({ amount: 10_000, stage: 'proposal' });
    expect(opp.probability).toBe(60);
    expect(opp.expected_revenue).toBe(6_000);
    expect(opp.forecast_category).toBe('commit');
  });

  it.each([
    ['prospecting', 10, 'pipeline', {}],
    ['qualification', 25, 'pipeline', {}],
    ['needs_analysis', 40, 'best_case', {}],
    ['proposal', 60, 'commit', {}],
    ['negotiation', 80, 'commit', {}],
    ['closed_won', 100, 'closed', { win_reason: 'better_price' }],
    ['closed_lost', 0, 'omitted', { loss_reason: 'competitor' }],
  ] as const)('stage %s ⇒ probability %i, forecast %s', async (stage, probability, forecast, extra) => {
    const opp = await repInserts({ amount: 1_000, stage, ...extra });
    expect(opp.probability).toBe(probability);
    expect(opp.expected_revenue).toBe((1_000 * probability) / 100);
    expect(opp.forecast_category).toBe(forecast);
  });

  it('recomputes expected_revenue when only the amount changes', async () => {
    const opp = await repInserts({ amount: 10_000, stage: 'proposal' });
    const updated = await repUpdates('crm_opportunity', opp.id, { amount: 50_000 });
    expect(updated.expected_revenue).toBe(30_000); // 50k × 60%
  });

  it('stamps close_date and restarts the stage clock on the closed_won transition', async () => {
    const opp = await dealOf({ stage: 'negotiation', amount: 25_000, stage_entry_date: '2026-01-01' });
    const updated = await repUpdates('crm_opportunity', opp.id, { stage: 'closed_won', win_reason: 'better_price' });
    expect(updated.close_date).toBe(today());
    // `days_in_stage` is a FORMULA over `stage_entry_date` (#489); re-stamping
    // that column IS the reset. It used to write `days_in_stage = 0` against a
    // counter nothing ever incremented.
    expect(updated.stage_entry_date).toBe(today());
    expect(updated.probability).toBe(100);
    expect(updated.expected_revenue).toBe(25_000);
  });

  it('starts the stage clock on insert so a never-moved deal is visible to the sweep', async () => {
    const opp = await repInserts({ amount: 1_000, stage: 'prospecting' });
    expect(opp.stage_entry_date).toBe(today());
  });

  it('leaves the stage clock alone when the stage did not change', async () => {
    const opp = await dealOf({ stage: 'proposal', amount: 1_000, stage_entry_date: '2026-01-01' });
    const updated = await repUpdates('crm_opportunity', opp.id, { amount: 2_000 });
    expect(updated.stage_entry_date, 'an amount edit must not reset the stall clock').toBe('2026-01-01');
  });

  it('does not overwrite an explicitly supplied close_date', async () => {
    const opp = await dealOf({ stage: 'negotiation', amount: 1_000 });
    const updated = await repUpdates('crm_opportunity', opp.id, {
      stage: 'closed_won', win_reason: 'better_price', close_date: '2030-01-01',
    });
    expect(updated.close_date).toBe('2030-01-01');
  });

  it('freezes a closed opportunity against user edits to business fields', async () => {
    const opp = await dealOf({ stage: 'closed_won', win_reason: 'better_price', amount: 25_000 });
    await expect(repUpdates('crm_opportunity', opp.id, { amount: 1 })).rejects.toThrow(/closed \(closed_won\)/);
  });

  /**
   * #693's defect class, on this guard, as #720 settled it: deleting a contact
   * or a campaign a CLOSED opportunity references makes the engine clear that
   * lookup, which arrives here as an ordinary `beforeUpdate`. It used to be
   * refused — "Opportunity is closed (closed_won); … Attempted: primary_contact"
   * — which made the frozen deal able to keep that person undeletable. The
   * freeze now yields to that write shape and only to it; the full narrowness,
   * and the end-to-end deletes, live in
   * `test/freeze-guard-reference-cleanup.test.ts`.
   */
  const closedWithContact = async (extra: Rec = {}): Promise<Rec> => {
    const acct = await accountOf();
    const [contact] = await verify.seed('crm_contact', [{
      first_name: 'Cleo', last_name: `Link ${++k}`, email: `cleo${k}@hooks-runtime-sales.test`, crm_account: acct.id, owner_id: rep.id,
    }]);
    return (await verify.seed('crm_opportunity', [{
      name: `Acme Renewal ${k}`, stage: 'closed_won', win_reason: 'better_price', amount: 10, close_date: '2030-06-30',
      crm_account: acct.id, primary_contact: contact!.id, owner_id: rep.id, ...extra,
    }]))[0]!;
  };

  it('lets the engine clear a link on a closed opportunity', async () => {
    const opp = await closedWithContact();
    await expect(repUpdates('crm_opportunity', opp.id, { primary_contact: null })).resolves.toBeTruthy();
    expect((await stored('crm_opportunity', opp.id)).primary_contact).toBeNull();
  });

  it('still reports a mixed write as the edit it is', async () => {
    const opp = await closedWithContact();
    await expect(repUpdates('crm_opportunity', opp.id, { primary_contact: null, amount: 1 }))
      .rejects.toThrow(new RegExp(`Opportunity ${opp.name} is closed \\(closed_won\\); only .* may be edited`));
  });

  it('allows narrative, approval and system fields on a closed opportunity', async () => {
    // Written by the admin — the freeze judges every user, and only the admin
    // may also reassign the owner. The approval verdict is `readonly`: the
    // engine strips it from a person's payload, so it reaches the freeze as
    // nothing and is let through.
    for (const input of [
      { description: 'post-mortem' },
      { next_step: 'nothing' },
      { approval_status: 'approved' },
      { owner_id: rep2.id },
      { updated_at: '2026-01-01' },
    ]) {
      const opp = await dealOf({ stage: 'closed_lost', loss_reason: 'competitor', amount: 100 });
      await expect(verify.hooks.run('crm_opportunity', 'update', { id: opp.id, ...input }, as(admin)), JSON.stringify(input))
        .resolves.toBeTruthy();
    }
  });

  it('lets SYSTEM writes through the freeze (re-seed rewrites closed records)', async () => {
    // The seed re-evaluates `close_date: daysAgo(15)` on every boot, so a
    // re-seed legitimately rewrites closed opportunities. Guarding those threw
    // boot-time BodyRunner errors (#459).
    const opp = await dealOf({ stage: 'closed_won', win_reason: 'better_price', amount: 25_000 });
    await expect(systemUpdate(verify, 'crm_opportunity', { id: opp.id, amount: 30_000 })).resolves.toBeTruthy();
    expect((await stored('crm_opportunity', opp.id)).amount).toBe(30_000);
  });

  it('refuses an unknown stage before the derivation could guess at it', async () => {
    // The engine refuses a stage `crm_opportunity` does not declare before any
    // hook could see it — so no unknown stage ever reaches the derivation.
    await expect(repInserts({ amount: 1_000, stage: 'not_a_stage' })).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
  });
});

describe('opportunity_promote_account', () => {
  /** Close the deal won as the rep and wait for the async promote hook's activation task. */
  const closeWon = async (opp: Rec) => {
    await repUpdates('crm_opportunity', opp.id, { stage: 'closed_won', win_reason: 'better_price' });
    return vi.waitFor(async () => {
      const tasks = (await verify.rows('crm_task', { related_to_opportunity: opp.id }))
        .filter((t) => String(t.subject).startsWith('Activate new customer'));
      expect(tasks, 'no activation task created').toHaveLength(1);
      return tasks[0]!;
    }, { timeout: 10_000, interval: 50 });
  };

  it('promotes the account to customer and schedules an activation task on close-won', async () => {
    const opp = await dealOf({ stage: 'negotiation' });
    expect((await stored('crm_account', opp.crm_account)).type).toBe('prospect');
    const task = await closeWon(opp);

    expect((await stored('crm_account', opp.crm_account)).type).toBe('customer');
    expect(task.priority).toBe('high');
    expect(task.status).toBe('not_started');
    expect(task.related_to_opportunity).toBe(opp.id);
    expect(task.owner_id).toBe(rep.id);
    expect(task.due_date).toBe(daysFromNow(3));
  });

  it('does not re-promote an account that is already a customer', async () => {
    const acct = await accountOf({ type: 'customer' });
    const [opp] = await verify.seed('crm_opportunity', [{
      name: `Deal ${++k}`, amount: 25_000, stage: 'proposal', close_date: '2030-06-30', crm_account: acct.id, owner_id: rep.id,
    }]);
    const engine = recordEngineWrites(verify);
    try {
      await closeWon(opp!); // task still created
      const promotions = engine.of('crm_account', 'update').filter((w) => 'type' in (w.args[1] as Rec));
      expect(promotions, 'a customer account was promoted again').toHaveLength(0);
    } finally {
      engine.restore();
    }
  });

  /**
   * A rep's win promotes an account that is not the rep's (#2014). As the
   * caller, the read of an account the rep cannot see came back empty and the
   * promotion was skipped without a word; the hook declares `runAs: 'system'`.
   */
  it('promotes an account the rep does not own when the rep wins a deal on it', async () => {
    const [acct] = await verify.seed('crm_account', [{ name: `Not Mine Co ${++k}`, owner_id: manager.id }]);
    expect(await verify.rows('crm_account', { id: acct!.id }, as(rep)), 'the rep can see the account, so this proves nothing').toEqual([]);
    const opp = await dealOf({ stage: 'negotiation', crm_account: acct!.id });
    const task = await closeWon(opp);
    expect((await stored('crm_account', acct!.id)).type).toBe('customer');
    expect(task.owner_id).toBe(rep.id);
    expect((await stored('crm_account', acct!.id)).updated_by, 'the promotion was recorded as nobody’s write').toBe(rep.id);
  });

  it('is a no-op when the deal did not just become won', async () => {
    const moving = await dealOf({ stage: 'qualification' });
    await repUpdates('crm_opportunity', moving.id, { stage: 'proposal' });
    const won = await dealOf({ stage: 'closed_won', win_reason: 'better_price' }); // already won
    await repUpdates('crm_opportunity', won.id, { description: 'PO received' });
    // An async hook's work would land within this window; neither deal gets any.
    await new Promise((r) => setTimeout(r, 300));
    for (const opp of [moving, won]) {
      expect((await stored('crm_account', opp.crm_account)).type, 'the account was promoted').toBe('prospect');
      expect(await verify.rows('crm_task', { related_to_opportunity: opp.id }), 'an activation task appeared').toHaveLength(0);
    }
  });
});

// ────────────────────────────────────────────────────────────── quote ──

/** The rep's deal with a contact, the parties every quote names. */
const quoteParties = async (): Promise<{ account: Rec; contact: Rec; opp: Rec }> => {
  const acct = await accountOf();
  const [contact] = await verify.seed('crm_contact', [{
    first_name: 'Quinn', last_name: `Buyer ${++k}`, email: `quinn${k}@hooks-runtime-sales.test`, crm_account: acct.id, owner_id: rep.id,
  }]);
  const [opp] = await verify.seed('crm_opportunity', [{
    name: `Quoted Deal ${k}`, amount: 25_000, stage: 'proposal', close_date: '2030-06-30', crm_account: acct.id,
    primary_contact: contact!.id, owner_id: rep.id,
  }]);
  return { account: acct, contact: contact!, opp: opp! };
};

/** The rep drafting a quote on their deal. */
const repQuotes = async (doc: Rec = {}): Promise<Rec> => {
  const { account, contact, opp } = await quoteParties();
  return verify.hooks.run('crm_quote', 'insert', {
    name: `Q-${++k}`, crm_account: account.id, crm_contact: contact.id, crm_opportunity: opp.id, ...doc,
  }, as(rep));
};

/** A quote of the rep's in `status`, written as the system. */
const settledQuote = async (status: string): Promise<Rec> => {
  const { account, contact, opp } = await quoteParties();
  return (await verify.seed('crm_quote', [{
    name: `Q-${++k}`, status, crm_account: account.id, crm_contact: contact.id, crm_opportunity: opp.id,
    quote_date: '2026-01-01', expiration_date: '2030-12-31', discount: 0, owner_id: rep.id,
  }]))[0]!;
};

describe('quote_workflow', () => {
  it('defaults expiration_date to quote_date + 30 days on insert', async () => {
    expect((await repQuotes({ quote_date: '2026-01-01' })).expiration_date).toBe('2026-01-31');
  });

  it('falls back to today + 30 when no quote_date was supplied', async () => {
    expect((await repQuotes()).expiration_date).toBe(daysFromNow(30));
  });

  it('respects an explicit expiration_date', async () => {
    expect((await repQuotes({ quote_date: '2026-01-01', expiration_date: '2026-06-30' })).expiration_date).toBe('2026-06-30');
  });

  /** The quote as every quote surface titles it — what the freeze's sentence names. */
  const titleOf = async (quote: Rec) => String((await stored('crm_quote', quote.id)).display_title);
  const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  it.each(['accepted', 'expired'])('freezes a %s quote against user edits', async (status) => {
    const quote = await settledQuote(status);
    await expect(repUpdates('crm_quote', quote.id, { discount: 5 }))
      .rejects.toThrow(new RegExp(`Quote ${escape(await titleOf(quote))} is ${status}`));
  });

  /**
   * #693's defect class on this guard, as #720 settled it: deleting the
   * opportunity (or contact) a frozen quote references makes the engine clear
   * that lookup, and the freeze used to answer "Quote is accepted; only
   * internal_notes may be edited. Attempted: crm_opportunity." — a settled
   * quote keeping a deal undeletable. It now yields to that write shape and
   * only to it; see `test/freeze-guard-reference-cleanup.test.ts`.
   */
  it('lets the engine clear a link on a frozen quote', async () => {
    const quote = await settledQuote('accepted');
    await expect(repUpdates('crm_quote', quote.id, { crm_opportunity: null })).resolves.toBeTruthy();
    expect((await stored('crm_quote', quote.id)).crm_opportunity).toBeNull();
  });

  it('still reports a mixed write as the edit it is', async () => {
    const quote = await settledQuote('accepted');
    await expect(repUpdates('crm_quote', quote.id, { crm_opportunity: null, discount: 5 }))
      .rejects.toThrow(new RegExp(`Quote ${escape(await titleOf(quote))} is accepted; only internal_notes may be edited`));
  });

  it('allows internal_notes and framework columns on a frozen quote', async () => {
    // Written by the admin — the freeze judges every user, and only the admin
    // may also reassign the owner.
    for (const input of [{ internal_notes: 'signed' }, { owner_id: rep2.id }, { updated_at: '2026-01-01' }]) {
      const quote = await settledQuote('accepted');
      await expect(verify.hooks.run('crm_quote', 'update', { id: quote.id, ...input }, as(admin)), JSON.stringify(input))
        .resolves.toBeTruthy();
    }
  });

  it('lets SYSTEM writes through the freeze', async () => {
    const quote = await settledQuote('accepted');
    await expect(systemUpdate(verify, 'crm_quote', { id: quote.id, discount: 5 })).resolves.toBeTruthy();
    expect((await stored('crm_quote', quote.id)).discount).toBe(5);
  });
});

/**
 * #2014, ruled option C: accepting a quote closes its deal as won, so while an
 * approval holds that deal the ACCEPTANCE is refused — at the moment it is
 * made, loudly — instead of being admitted and having its close-won refused
 * one write later inside an async hook that swallowed it.
 */
describe('quote_workflow refuses an acceptance the deal’s approval holds (#2014)', () => {
  /** A presented quote of the rep's on `deal`, written as the system. */
  const presentedOn = async (deal: Rec): Promise<Rec> => {
    const [contact] = await verify.seed('crm_contact', [{
      first_name: 'Hal', last_name: `Held ${++k}`, email: `hal${k}@hooks-runtime-sales.test`, crm_account: deal.crm_account, owner_id: rep.id,
    }]);
    return (await verify.seed('crm_quote', [{
      name: `Held Q-${k}`, status: 'presented', crm_account: deal.crm_account, crm_contact: contact!.id, crm_opportunity: deal.id,
      quote_date: today(), expiration_date: '2030-12-31', owner_id: rep.id,
    }]))[0]!;
  };
  /** A deal of the rep's at negotiation, put in `state` by a system write (the verdict columns are readonly). */
  const dealIn = async (state: Rec): Promise<Rec> => {
    const deal = await dealOf({ stage: 'negotiation' });
    if (Object.keys(state).length > 0) await systemUpdate(verify, 'crm_opportunity', { id: deal.id, ...state });
    return deal;
  };
  const refusalOf = (write: Promise<unknown>): Promise<Rec | null> => write.then(() => null, (e: Rec) => e);

  it('refuses a sales rep’s acceptance while the deal waits on its Large Deal Approval — and nothing moves', async () => {
    // The real approval: the rep opens a deal over the threshold, the
    // `opportunity_approval_on_create` flow opens the request, and its approval
    // node locks the deal.
    const acct = await accountOf();
    const deal = await verify.hooks.run('crm_opportunity', 'insert', {
      name: `Large Deal ${++k}`, amount: 150_000, stage: 'proposal', close_date: '2030-06-30', crm_account: acct.id,
    }, as(rep));
    await vi.waitFor(async () => expect((await verify.rows('sys_approval_request', { record_id: deal.id, status: 'pending' })).length)
      .toBeGreaterThan(0), { timeout: 15_000, interval: 100 });
    const quote = await presentedOn(deal);

    const engine = recordEngineWrites(verify);
    let refusal: Rec | null;
    try {
      refusal = await refusalOf(repUpdates('crm_quote', quote.id, { status: 'accepted' }));
      await new Promise((r) => setTimeout(r, 400));
    } finally {
      engine.restore();
    }
    expect(refusal, 'the acceptance of a quote on a deal under approval went through').toBeTruthy();
    // The envelope a client branches on — code and status together.
    expect(refusal!.code).toBe('RECORD_LOCKED');
    expect(refusal!.status).toBe(409);
    // It names the quote as every screen does and the hold by the field the
    // rep sees on the deal — never a record id.
    const message = String(refusal!.message);
    expect(message).toContain(`Quote ${String((await stored('crm_quote', quote.id)).display_title)}`);
    expect(message).toContain('Approval Status is Pending');
    expect(message).not.toContain(deal.id);

    // Nothing moved: the quote is still presented, the deal still waits on its
    // manager, and no contract was drafted.
    expect((await stored('crm_quote', quote.id)).status).toBe('presented');
    const after = await stored('crm_opportunity', deal.id);
    expect(after.stage).toBe('proposal');
    expect(after.approval_status).toBe('pending');
    expect(await verify.rows('crm_contract', { crm_opportunity: deal.id })).toHaveLength(0);
    expect(engine.of('crm_contract', 'insert'), 'a contract was drafted for a refused acceptance').toHaveLength(0);
    expect(engine.of('crm_opportunity', 'update'), 'the deal was written for a refused acceptance').toHaveLength(0);
  });

  /**
   * "Held" means exactly what makes the rep's own close-won fail — no wider.
   * Each state is measured both ways on twin deals: the rep closing one by
   * hand is the control, and the acceptance on the other must be refused in
   * exactly the same states. A `rejected` Large Deal Approval is what a recall
   * leaves too (measured), and it holds nothing.
   */
  it.each([
    ['the shipped default', {}, false],
    ['an approved Large Deal Approval', { approval_status: 'approved' }, false],
    ['a rejected Large Deal Approval', { approval_status: 'rejected' }, false],
    ['an armed status-change gate awaiting its request', { status_change_approval_status: 'pending' }, true],
    ['a status change an approver rejected', { status_change_approval_status: 'rejected' }, true],
    ['an approved status change', { status_change_approval_status: 'approved' }, false],
    ['an armed qualification (立项) gate', { qualification_approval_status: 'pending' }, true],
    ['a qualification an approver rejected', { qualification_approval_status: 'rejected' }, true],
    ['an approved qualification', { qualification_approval_status: 'approved' }, false],
  ] as const)('%s: the acceptance is refused exactly when the rep’s own close-won is', async (_label, state, held) => {
    const twin = await dealIn(state);
    const close = await refusalOf(repUpdates('crm_opportunity', twin.id, { stage: 'closed_won', win_reason: 'better_price' }));
    expect(Boolean(close), `the control is off: the rep's own close-won ${held ? 'went through' : 'was refused'}`).toBe(held);

    const deal = await dealIn(state);
    const quote = await presentedOn(deal);
    const refusal = await refusalOf(repUpdates('crm_quote', quote.id, { status: 'accepted' }));
    if (held) {
      expect(refusal).toMatchObject({ code: 'RECORD_LOCKED', status: 409 });
      expect((await stored('crm_quote', quote.id)).status).toBe('presented');
      expect((await stored('crm_opportunity', deal.id)).stage).toBe('negotiation');
    } else {
      expect(refusal, `an acceptance the deal does not hold was refused: ${String(refusal?.message)}`).toBeNull();
      await vi.waitFor(async () => expect((await stored('crm_opportunity', deal.id)).stage).toBe('closed_won'),
        { timeout: 10_000, interval: 50 });
    }
  });
});

/**
 * The rep's presented quote on their own deal (in `stage`), priced at 120,000
 * by a line item, accepted by the rep — the ordinary CPQ path; the contract the
 * async draft hook writes, read back once it lands, and the opportunity writes
 * the engine received while both acceptance hooks ran.
 */
const acceptQuote = async (stage = 'proposal') => {
  const create = async (object: string, doc: Rec) => (await verify.hooks.run(object, 'insert', doc, as(rep))).id as string;
  const acct = await create('crm_account', { name: `Accepted Co ${++k}` });
  const contact = await create('crm_contact', {
    first_name: 'Ada', last_name: `Signer ${k}`, email: `ada${k}@hooks-runtime-sales.test`, crm_account: acct,
  });
  const [opp] = await verify.seed('crm_opportunity', [{
    name: `Accepted Deal ${k}`, amount: 25_000, stage, close_date: '2030-06-30', crm_account: acct, primary_contact: contact,
    owner_id: rep.id, ...(stage === 'closed_lost' ? { loss_reason: 'competitor' } : {}),
  }]);
  const quote = await create('crm_quote', {
    name: `Q-${k}`, crm_account: acct, crm_contact: contact, crm_opportunity: opp!.id,
    quote_date: today(), expiration_date: '2030-12-31',
  });
  const [product] = await verify.seed('crm_product', [{ name: `Accepted Product ${k}`, product_code: `ACC-${k}`, list_price: 120_000, is_active: true }]);
  await verify.hooks.run('crm_quote_line_item', 'insert', { crm_quote: quote, crm_product: product!.id, quantity: 1, unit_price: 120_000 }, as(rep));
  await vi.waitFor(async () => expect((await stored('crm_quote', quote)).total_price).toBe(120_000), { timeout: 10_000, interval: 50 });
  for (const status of ['in_review', 'presented']) {
    await verify.hooks.run('crm_quote', 'update', { id: quote, status }, as(rep));
  }
  const engine = recordEngineWrites(verify);
  try {
    await verify.hooks.run('crm_quote', 'update', { id: quote, status: 'accepted' }, as(rep));
    const contract = await vi.waitFor(async () => {
      const [row] = await verify.rows('crm_contract', { crm_opportunity: opp!.id });
      expect(row, 'no contract drafted').toBeTruthy();
      return row!;
    }, { timeout: 10_000, interval: 50 });
    // The close-won is its own async hook: give it the time to run, then wait
    // for whatever it wrote.
    await new Promise((r) => setTimeout(r, 400));
    await Promise.all(engine.writes.map((w) => w.settled));
    return { contract, acct, contact, opp: opp!, quote, oppUpdates: engine.of('crm_opportunity', 'update') };
  } finally {
    engine.restore();
  }
};

describe('quote_accepted_contract_draft', () => {
  /**
   * #2014: a sales rep holds `crm_contract.allowCreate: false`, and the draft
   * used to be written as the accepting caller — so a rep's acceptance closed
   * the deal and drafted no contract, the refusal swallowed by `onError: 'log'`.
   * The draft is elevated now (`runAs: 'system'`); the rep's own grant is not.
   */
  it('drafts a sales rep’s contract — a 12-month draft carrying the quote total and links', async () => {
    const { contract, acct, contact, opp } = await acceptQuote();
    expect(contract.status).toBe('draft');
    expect(contract.crm_account).toBe(acct);
    expect(contract.crm_contact).toBe(contact);
    expect(contract.crm_opportunity).toBe(opp.id);
    expect(contract.contract_value).toBe(120_000);
    expect(contract.contract_term_months).toBe(12);
    expect(contract.owner_id).toBe(rep.id);
    expect(contract.start_date).toBe(today());
    // Elevation is not anonymity: the draft is recorded as the rep's act.
    expect(contract.created_by).toBe(rep.id);
  });

  it('elevates the draft, not the rep — the rep still cannot write a contract by hand', async () => {
    const { acct, contact } = await acceptQuote();
    await expect(verify.hooks.run('crm_contract', 'insert', {
      crm_account: acct, crm_contact: contact, status: 'draft', contract_type: 'subscription',
      contract_term_months: 12, start_date: today(), end_date: daysFromNow(365), contract_value: 1,
    }, as(rep))).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('uses real calendar months for end_date, not days × 30', async () => {
    // `days * 30` shorted a 12-month term by ~5 days; contract_validation
    // tolerates ±1 month so the bug only ever slipped past by luck.
    const { contract } = await acceptQuote();
    const s = new Date(contract.start_date as string);
    const e = new Date(contract.end_date as string);
    const months =
      (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) +
      (e.getDate() >= s.getDate() ? 0 : -1);
    expect(months, `${contract.start_date} → ${contract.end_date} is not 12 calendar months`).toBe(12);
  });

  it('is a no-op unless the quote just became accepted', async () => {
    const { opp, quote } = await acceptQuote();
    // An edit of the already-accepted quote must draft nothing more.
    await verify.hooks.run('crm_quote', 'update', { id: quote, internal_notes: 'countersigned' }, as(rep));
    await new Promise((r) => setTimeout(r, 300));
    expect(await verify.rows('crm_contract', { crm_opportunity: opp.id }), 'a second contract was drafted').toHaveLength(1);
  });
});

describe('quote_on_accepted', () => {
  it('pushes the linked opportunity to closed_won, as the accepting rep', async () => {
    const { opp } = await acceptQuote('negotiation');
    const after = await stored('crm_opportunity', opp.id);
    expect(after.stage).toBe('closed_won');
    expect(after.close_date).toBe(today());
    expect(after.win_reason).toBe('quote_accepted');
    expect(after.updated_by).toBe(rep.id);
  });

  it('never reopens an already-closed opportunity', async () => {
    const { opp, oppUpdates } = await acceptQuote('closed_lost');
    expect((await stored('crm_opportunity', opp.id)).stage).toBe('closed_lost');
    expect(oppUpdates.filter((w) => 'stage' in (w.args[1] as Rec)), 'the hook wrote a stage on a closed deal').toHaveLength(0);
  });
});

describe('quote_line_item_price_fill', () => {
  const lineOn = async (product: Rec | null, doc: Rec = {}) => {
    const quote = await repQuotes();
    return verify.hooks.run('crm_quote_line_item', 'insert', {
      crm_quote: quote.id, quantity: 1, ...(product ? { crm_product: product.id } : {}), ...doc,
    }, as(rep));
  };
  const product = async (over: Rec = {}) =>
    (await verify.seed('crm_product', [{ name: `Priced ${++k}`, product_code: `PF-${k}`, is_active: true, list_price: 250, ...over }]))[0]!;

  it('stamps list_price and defaults unit_price from the product on insert', async () => {
    const line = await lineOn(await product());
    expect(line.list_price).toBe(250);
    expect(line.unit_price).toBe(250);
  });

  it('re-syncs list_price on update but never clobbers a negotiated unit_price', async () => {
    const p = await product();
    const line = await lineOn(p);
    await systemUpdate(verify, 'crm_product', { id: p.id, list_price: 300 });
    const updated = await repUpdates('crm_quote_line_item', line.id, { crm_product: p.id, unit_price: 199 });
    expect(updated.list_price).toBe(300);
    expect(updated.unit_price).toBe(199);
  });

  it('refuses a line with no product, and a product with no price, before the fill runs', async () => {
    // Neither shape can reach the hook: a line without a product cannot be
    // written (`crm_product` is required), and neither can a product without a
    // price (`list_price` is required) — both are the engine's refusal.
    await expect(lineOn(null, { unit_price: 10 })).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
    await expect(product({ list_price: null })).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
  });
});

// ──────────────────────────────────────────────────────────── account ──

/** The rep creating an account of their own. */
const repAccount = (doc: Rec) => verify.hooks.run('crm_account', 'insert', { name: `Account ${++k}`, ...doc }, as(rep));

describe('account_protection', () => {
  it.each(['example.com', 'ftp://example.com', 'www.example.com'])(
    'rejects the malformed website %s', async (website) => {
      await expect(repAccount({ website })).rejects.toThrow(/must start with http/);
    },
  );

  it.each(['http://example.com', 'https://example.com', 'HTTPS://EXAMPLE.COM'])(
    'accepts the valid website %s', async (website) => {
      await expect(repAccount({ website })).resolves.toBeTruthy();
    },
  );

  it('rejects negative annual_revenue but allows zero', async () => {
    // As the manager: `annual_revenue` is not editable by a sales rep.
    const managerAccount = (doc: Rec) =>
      verify.hooks.run('crm_account', 'insert', { name: `Revenue Co ${++k}`, ...doc }, as(manager));
    await expect(managerAccount({ annual_revenue: -1 })).rejects.toThrow(/greater than or equal to 0/);
    await expect(managerAccount({ annual_revenue: 0 })).resolves.toBeTruthy();
  });

  it('stamps last_activity_date when a USER changes owner or type', async () => {
    for (const input of [{ owner_id: rep2.id }, { type: 'customer' }] as Rec[]) {
      const acct = await accountOf({ type: 'prospect', last_activity_date: null });
      const updated = await verify.hooks.run('crm_account', 'update', { id: acct.id, ...input }, as(admin));
      expect(updated.last_activity_date, JSON.stringify(input)).toBe(today());
    }
  });

  it('does NOT stamp last_activity_date on a system write', async () => {
    // The platform's seed-ownership claim re-owns ownerless seeded accounts as
    // a system write (the retired demo_bootstrap sweep did, every 10 minutes);
    // stamping those flattened every seeded activity date to today and emptied
    // the churn report buckets.
    const acct = await accountOf({ owner_id: null, last_activity_date: null });
    await systemUpdate(verify, 'crm_account', { id: acct.id, owner_id: rep2.id });
    expect((await stored('crm_account', acct.id)).last_activity_date).toBeNull();
  });

  /**
   * The refusal is asserted as the WHOLE sentence, per branch (#721).
   *
   * The count switches noun, verb and closing pronoun together, and the
   * singular branch used to get only the noun — "1 open opportunity still
   * reference it. Close or reassign them first." The pin that was here,
   * `/1 open opportunity still reference/`, could not see that: it is
   * unanchored, so it matches the correct "still references" just as happily
   * as the broken "still reference". A message pin that passes on both
   * spellings of the thing it is pinning is not pinning anything — hence the
   * full strings below, one per branch, ending at the final period.
   *
   * Each refusal is the admin deleting a customer account the system wrote,
   * with the deals (at the stages named — a closed one counts like an open one,
   * #2019) and contracts named, plus a deal on another account (not counted).
   */
  const customerWith = async (stages: string[], contractStatuses: string[] = []): Promise<Rec> => {
    const acct = await accountOf({ type: 'customer' });
    const other = await accountOf();
    const settled: Record<string, Rec> = { closed_won: { win_reason: 'better_price' }, closed_lost: { loss_reason: 'competitor' } };
    await verify.seed('crm_opportunity', [
      ...stages.map((stage) => ({ name: `Deal ${++k}`, crm_account: acct.id, stage, ...settled[stage], amount: 10, close_date: '2030-06-30', owner_id: rep.id })),
      { name: `Elsewhere ${++k}`, crm_account: other.id, stage: 'proposal', amount: 10, close_date: '2030-06-30', owner_id: rep.id },
    ]);
    if (contractStatuses.length > 0) {
      const contactOf = async (accountId: string) => (await verify.seed('crm_contact', [{
        first_name: 'Cara', last_name: `Contract ${++k}`, email: `cara${k}@hooks-runtime-sales.test`, crm_account: accountId, owner_id: rep.id,
      }]))[0]!;
      const contract = (accountId: string, contactId: string, status: string) => ({
        status, crm_account: accountId, crm_contact: contactId, owner_id: rep.id, contract_type: 'subscription',
        contract_value: 1_000, contract_term_months: 12, start_date: '2026-01-01', end_date: '2026-12-31',
        billing_frequency: 'monthly', payment_terms: 'net_30',
      });
      const mine = await contactOf(acct.id);
      const theirs = await contactOf(other.id);
      await verify.seed('crm_contract', [
        ...contractStatuses.map((status) => contract(acct.id, mine.id, status)),
        contract(other.id, theirs.id, 'activated'), // other account
      ]);
    }
    return acct;
  };
  const refuseDelete = async (stages: string[], contractStatuses: string[] = []) =>
    verify.hooks.run('crm_account', 'delete', { id: (await customerWith(stages, contractStatuses)).id }, as(admin));

  it('refuses to delete a customer account with ONE opportunity (singular agreement)', async () => {
    await expect(refuseDelete(['proposal'])).rejects.toThrow(
      'Cannot delete customer account: 1 opportunity, open or closed, still references it. Delete the opportunity first, or mark the account inactive to retire it instead.',
    );
  });

  it('refuses to delete a customer account with SEVERAL opportunities (plural agreement)', async () => {
    await expect(refuseDelete(['proposal', 'negotiation'])).rejects.toThrow(
      'Cannot delete customer account: 2 opportunities, open or closed, still reference it. Delete the opportunities first, or mark the account inactive to retire it instead.',
    );
  });

  it('never mixes the two branches — no plural verb on 1, no singular verb on 2', async () => {
    // The defect was a stitched sentence, so guard the halves that were wrong
    // rather than only the halves that were right.
    const one = await refuseDelete(['proposal']).catch((e: Error) => e.message);
    expect(one).not.toMatch(/closed, still reference /);       // plural verb on a singular noun
    expect(one).not.toMatch(/Delete the opportunities/);       // plural object on one record

    const two = await refuseDelete(['proposal', 'negotiation']).catch((e: Error) => e.message);
    expect(two).not.toMatch(/closed, still references/);       // singular verb on a plural noun
    expect(two).not.toMatch(/Delete the opportunity first/);   // singular object on two records
  });

  /**
   * When the GUARD lets a delete through, what still stands in its way is the
   * engine's own referential rule: `crm_opportunity.crm_account` is required
   * and does not cascade, so ANY deal still on the account refuses the delete
   * — with the engine's envelope (it names the dependent object), never the
   * guard's sentence. That is how "the guard does not count this" reads on
   * the real engine.
   */
  const refusedByTheEngineNotTheGuard = (dependentObject: string) => async (err: Error & Rec) => {
    expect(err.message, 'the guard refused it').not.toContain('Cannot delete customer account');
    expect(err).toMatchObject({ code: 'DELETE_RESTRICTED', dependentObject });
  };

  /**
   * A closed deal is the account's sales history, and it keeps the account
   * (#2019). `crm_opportunity.crm_account` is required and does not cascade, so
   * the engine refuses the delete while ANY deal names the account, and a
   * closed deal cannot be moved off it (the closed-deal freeze). The guard used
   * to count open deals only and tell the user to "Close or reassign it
   * first" — measured on 17.7.0 as the admin: the deal closed (200), the same
   * delete answered 409 `DELETE_RESTRICTED` by the engine on
   * `crm_opportunity`. Now the guard counts what the engine counts, so closing
   * the deal changes nothing in the answer, and what its sentence says to do —
   * delete the deal — is what lets the account go.
   */
  it('a closed deal keeps its customer account: closing it changes nothing, deleting it frees the account', async () => {
    const acct = await customerWith(['proposal']);
    const [deal] = await verify.rows('crm_opportunity', { crm_account: acct.id });
    const refusal = 'Cannot delete customer account: 1 opportunity, open or closed, still references it. Delete the opportunity first, or mark the account inactive to retire it instead.';
    const deleteAccount = () => verify.hooks.run('crm_account', 'delete', { id: acct.id }, as(admin));

    await expect(deleteAccount()).rejects.toThrow(refusal);
    await verify.hooks.run('crm_opportunity', 'update', { id: deal!.id, stage: 'closed_lost', loss_reason: 'competitor' }, as(admin));
    const err = await deleteAccount().then(() => null, (e: Error & Rec) => e);
    expect(err, 'the account was deleted with its closed deal still on it').toBeTruthy();
    expect(err!.message).toBe(refusal);
    expect(err).toMatchObject({ code: 'DELETE_RESTRICTED', status: 409 });

    await verify.hooks.run('crm_opportunity', 'delete', { id: deal!.id }, as(admin));
    await expect(deleteAccount()).resolves.toBeDefined();
    expect(await verify.rows('crm_account', { id: acct.id })).toEqual([]);
  });

  it('the guard only protects customer accounts — a prospect’s deal is the engine’s refusal, and a bare prospect goes', async () => {
    const acct = await accountOf({ type: 'prospect' });
    await verify.seed('crm_opportunity', [{ name: `Open ${++k}`, crm_account: acct.id, stage: 'proposal', amount: 10, close_date: '2030-06-30', owner_id: rep.id }]);
    const err = await verify.hooks.run('crm_account', 'delete', { id: acct.id }, as(admin)).then(() => null, (e: Error & Rec) => e);
    expect(err, 'the delete went through despite the deal still on the account').toBeTruthy();
    await refusedByTheEngineNotTheGuard('crm_opportunity')(err!);
    // …and with nothing on it, a prospect goes.
    const bare = await accountOf({ type: 'prospect' });
    await expect(verify.hooks.run('crm_account', 'delete', { id: bare.id }, as(admin))).resolves.toBeDefined();
  });

  // ─── Activated contracts (#549) ──────────────────────────────────────
  //
  // `crm_contract` is master-detail under the account since #549, so deleting
  // an account cascades its contracts. The guard refuses while an ACTIVATED
  // contract exists — the same "live" definition `contact_integrity` uses —
  // and lets drafts, expired and terminated contracts go with the account.
  const refuseDeleteForContracts = (statuses: string[]) => refuseDelete([], statuses);

  it('refuses to delete a customer account with ONE activated contract (singular agreement)', async () => {
    await expect(refuseDeleteForContracts(['activated', 'draft'])).rejects.toThrow(
      'Cannot delete customer account: 1 activated contract still references it. Terminate or reassign it first.',
    );
  });

  it('refuses to delete a customer account with SEVERAL activated contracts (plural agreement)', async () => {
    await expect(refuseDeleteForContracts(['activated', 'activated'])).rejects.toThrow(
      'Cannot delete customer account: 2 activated contracts still reference it. Terminate or reassign them first.',
    );
  });

  it('the contract refusal carries the same envelope as the opportunity one', async () => {
    const err = await refuseDeleteForContracts(['activated']).catch((e: Error) => e) as Error & Rec;
    expect(err.code).toBe('DELETE_RESTRICTED');
    expect(err.status).toBe(409);
  });

  /**
   * ⚠️ MEASURED DEFECT — reported as a finding on this card, pinned here so the
   * fix is noticed. The guard lets drafts, expired and terminated contracts
   * through, and the comment above says they go with the account. Measured on
   * 17.7.0, the delete is refused all the same — by the engine, on the
   * account's CONTACTS: the cascade reaches a contact while the contracts
   * naming it as their required primary contact still exist. (The fixture
   * carries no deal on the account: a closed one keeps the account by design
   * since #2019, and would answer before the cascade this case measures.)
   */
  it('⚠️ an account whose contracts are all draft, expired or terminated still cannot be deleted (measured defect)', async () => {
    const err = await refuseDeleteForContracts(['draft', 'in_approval', 'expired', 'terminated'])
      .then(() => null, (e: Error & Rec) => e);
    expect(
      err,
      'the account was deleted with its settled contracts — the defect is fixed: rewrite this case to pin the cascade',
    ).toBeTruthy();
    await refusedByTheEngineNotTheGuard('crm_contract')(err!);
  });

  it('opportunities are reported before activated contracts', async () => {
    // One refusal at a time, opportunities first — the sentence a user reads
    // must not change depending on which count the engine answers first.
    await expect(refuseDelete(['proposal'], ['activated'])).rejects.toThrow(/1 opportunity, open or closed, still references it/);
  });

  // ─── billing_country / territory derivation (#621, #639) ─────────────
  //
  // The territory sharing rules filter on `territory`, and this hook is the
  // only writer of it AND of the `billing_country` it is classified from. If
  // the derivation stops running, both rules still SEED (the column exists)
  // but match nothing — the same silent territory outage #621 was filed for,
  // one layer down. So the behaviour is pinned per shape.
  //
  // The mapping itself is not re-stated here: it is authored in
  // `src/objects/_territory.ts` and pinned against this hook's LOWERED body by
  // `test/territory-single-source.test.ts`. What these cases own is the
  // handler's own contract — which writes derive, which leave the columns
  // alone, and that nothing throws.

  it.each([
    ['a country code',            { country: 'US' },                    'US',             'na'],
    ['lower case',                { country: 'de' },                    'DE',             'emea'],
    ['surrounding whitespace',    { country: '  fr  ' },                'FR',             'emea'],
    ['a full address',            { street: '1 Main', city: 'Austin', country: 'US' }, 'US', 'na'],
    // #639 acceptance criterion 1: the three spellings the issue names, plus
    // the legacy `UK` that the ISO rename must not have evicted.
    ['a full country name',       { country: 'Germany' },               'GERMANY',        'emea'],
    ['a trailing-space code',     { country: 'de ' },                   'DE',             'emea'],
    ['the legacy UK spelling',    { country: 'UK' },                    'UK',             'emea'],
    ['the ISO GB spelling',       { country: 'GB' },                    'GB',             'emea'],
    ['an uncovered country',      { country: 'SG' },                    'SG',             'other'],
  ] as [string, Rec, string, string][])(
    'derives %s onto billing_country + territory on insert',
    async (_label, billing_address, expectedCountry, expectedTerritory) => {
      const acct = await repAccount({ billing_address });
      // `billing_country` is what was TYPED (normalised); `territory` is the
      // classification. Keeping both visible is what lets an admin see why an
      // account landed in `other` — the pair, not either one alone.
      expect(acct.billing_country).toBe(expectedCountry);
      expect(acct.territory).toBe(expectedTerritory);
    },
  );

  it.each([
    ['a null address',        null],
    ['an address with no country', { city: 'Austin' }],
    ['a blank country',       { country: '   ' }],
  ] as [string, unknown][])(
    'projects %s onto null rather than throwing', async (_label, billing_address) => {
      // A `before*` hook that throws rejects the whole write, so every shape an
      // address column can hold must map to a value instead.
      const acct = await repAccount({ billing_address });
      expect(acct.billing_country).toBeNull();
      // …and the classification is STATED rather than left blank (#639): an
      // account belonging to no territory must not look like one nobody has
      // filled in yet.
      expect(acct.territory).toBe('other');
    },
  );

  it.each([
    ['a non-string country',  { country: 42 }],
    ['a non-object value',    'Austin, TX'],
  ] as [string, unknown][])('an address column cannot hold %s — the engine refuses it before the hook', async (_label, billing_address) => {
    // Two of the shapes the handler tolerates are not ones the address column
    // can hold: the write is refused, so they never reach the projection.
    await expect(repAccount({ billing_address })).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
  });

  it('states territory on an insert that carries no address at all', async () => {
    // The shape the `billing_address in input` guard alone would skip. There is
    // no previous value to preserve on an insert, so leaving it unset would
    // ship exactly the blank #639 ruled out.
    const acct = await repAccount({});
    expect(acct.territory).toBe('other');
    expect(acct.billing_country ?? null).toBeNull();
  });

  it('leaves billing_country alone when the write does not carry the address', async () => {
    // The regression that would silently empty both territories: recomputing
    // unconditionally would blank the column on every unrelated edit.
    const acct = await repAccount({ billing_address: { country: 'US' } });
    const updated = await repUpdates('crm_account', acct.id, { phone: '+1-512-555-0100' });
    expect(updated.billing_country).toBe('US');
    // Same rule for the classification: an unrelated edit must not re-derive
    // it, or a partial update would silently reclassify the account.
    expect(updated.territory).toBe('na');
  });

  it('clears billing_country and states `other` when the address is cleared', async () => {
    const acct = await repAccount({ billing_address: { country: 'US' } });
    const updated = await repUpdates('crm_account', acct.id, { billing_address: null });
    expect(updated.billing_country).toBeNull();
    expect(updated.territory).toBe('other');
  });

  it('reclassifies when an update moves the account to another country', async () => {
    const acct = await repAccount({ billing_address: { country: 'US' } });
    const updated = await repUpdates('crm_account', acct.id, { billing_address: { country: 'Germany' } });
    expect(updated.territory).toBe('emea');
  });

  it('derives on a SYSTEM write too — seeds and imports must land in a territory', async () => {
    // Unlike `last_activity_date`, this derivation is not user-gated: a seeded
    // or imported account with a billing country belongs to its territory
    // however it was written.
    const acct = await accountOf({ name: `Globex ${++k}`, billing_address: { country: 'DE' } });
    expect(acct.billing_country).toBe('DE');
    expect(acct.territory).toBe('emea');
  });
});

// ──────────────────────────────────────────────────────────── contact ──

/** The rep adding a contact to an account of theirs. */
const repContact = async (doc: Rec, accountId?: string) => verify.hooks.run('crm_contact', 'insert', {
  first_name: 'Ada', last_name: `Lovelace ${++k}`, crm_account: accountId ?? (await accountOf()).id, ...doc,
}, as(rep));

describe('contact_integrity', () => {
  it('lowercases the email before storing it', async () => {
    const n = ++k;
    const contact = await repContact({ email: `Ada.${n}@Example.COM` });
    expect(contact.email).toBe(`ada.${n}@example.com`);
  });

  it('rejects a duplicate email GLOBALLY, not just within one account', async () => {
    // A per-account lookup let a cross-account duplicate sail past the friendly
    // check and explode on the DB's global unique index mid-conversion.
    const email = `dup.${++k}@example.com`;
    await repContact({ email });
    await expect(repContact({ email: email.toUpperCase() })).rejects.toThrow(/already exists/);
  });

  it('does not flag a contact as its own duplicate on update', async () => {
    const contact = await repContact({ email: `self.${++k}@example.com` });
    await expect(repUpdates('crm_contact', contact.id, { email: contact.email })).resolves.toBeTruthy();
  });

  /** A contact of the rep's, referenced by the open work `refs` names, written as the system. */
  const referenced = async (refs: { opp?: string; quote?: string; contract?: string }): Promise<Rec> => {
    const acct = await accountOf();
    const [contact] = await verify.seed('crm_contact', [{
      first_name: 'Ada', last_name: 'Lovelace',
      email: `ref${++k}@hooks-runtime-sales.test`, crm_account: acct.id, owner_id: rep.id,
    }]);
    const [opp] = await verify.seed('crm_opportunity', [{
      name: `Referencing ${k}`, crm_account: acct.id, primary_contact: contact!.id, amount: 10, close_date: '2030-06-30', owner_id: rep.id,
      stage: refs.opp ?? 'closed_lost', ...(refs.opp ? {} : { loss_reason: 'competitor' }),
    }]);
    if (refs.quote) {
      await verify.seed('crm_quote', [{
        name: `Q-${k}`, status: refs.quote, crm_account: acct.id, crm_contact: contact!.id, crm_opportunity: opp!.id,
        quote_date: '2026-01-01', expiration_date: '2030-12-31', owner_id: rep.id,
      }]);
    }
    if (refs.contract) {
      await verify.seed('crm_contract', [{
        status: refs.contract, crm_account: acct.id, crm_contact: contact!.id, owner_id: rep.id, contract_type: 'subscription',
        contract_value: 1_000, contract_term_months: 12, start_date: '2026-01-01', end_date: '2026-12-31',
        billing_frequency: 'monthly', payment_terms: 'net_30',
      }]);
    }
    return contact!;
  };
  const deleteContact = (contact: Rec) => verify.hooks.run('crm_contact', 'delete', { id: contact.id }, as(admin));

  it('refuses to delete a contact referenced by open work', async () => {
    const contact = await referenced({ opp: 'proposal', quote: 'draft', contract: 'activated' });
    await expect(deleteContact(contact))
      .rejects.toThrow(/still referenced by 1 open opportunity\(ies\), 1 active quote\(s\), 1 active contract\(s\)/);
  });

  /**
   * #693: this guard also runs as a CASCADE child of an account delete
   * (`crm_contact.crm_account` is master-detail / cascade), and the hook cannot
   * tell the two apart. "Cannot delete contact" therefore told an account
   * deleter they had asked to delete a contact. The refusal now names the
   * contact and both consequences, which is true in either context.
   */
  it('names the contact it refuses, and says the account delete is blocked too', async () => {
    const contact = await referenced({ opp: 'proposal' });
    const err = await deleteContact(contact).then(() => null, (e: Error) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err!.message).toContain('Contact Ada Lovelace');
    expect(err!.message).toContain('neither can its account');
    // The old wording claimed an operation the caller may not have performed.
    expect(err!.message).not.toContain('Cannot delete contact');
    // …and the record id is not in the sentence either (#1243). It is what the
    // three reference counts were queried BY; it is not how the reader finds
    // the record.
    expect(err!.message).not.toContain(contact.id);
  });

  it('cannot store an unnamed contact, so the refusal names the contact and never keys it (#1243)', async () => {
    // This used to read `Contact c1 is still referenced by …`; the guard now
    // falls back to "This contact" when the record carries no usable name. On
    // the real engine that fallback has no producer: both name fields are
    // required, and clearing them is refused even to a system write — so the
    // record the fallback exists for cannot be stored, and every refusal names
    // its contact (above).
    const contact = await referenced({ contract: 'activated' });
    await expect(systemUpdate(verify, 'crm_contact', { id: contact.id, first_name: '   ', last_name: '   ' }))
      .rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
    const err = await deleteContact(contact).then(() => null, (e: Error) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err!.message).toContain('Contact Ada Lovelace');
    expect(err!.message).not.toContain(contact.id);
  });

  it('allows deleting a contact whose deals and quotes are all settled', async () => {
    // Settled deals and quotes do not hold the contact: the guard lets the
    // delete through and it lands.
    const contact = await referenced({ quote: 'rejected' });
    await expect(deleteContact(contact)).resolves.toBeDefined();
  });

  /**
   * A contract keeps its primary contact after it ends (#2019). The contract is
   * the account's signed record and is kept; its `crm_contact` is required, so
   * the engine refuses to delete the person while ANY contract names them,
   * activated or ended. The guard's sentence for an activated contract used to
   * end "Close or reassign those records first" — measured on 17.7.0 as the
   * admin: the contract terminated (200), then expired; the same delete
   * answered 409 `DELETE_RESTRICTED` by the engine on `crm_contract`, both
   * times. Ending the contract still changes nothing; what the sentence now
   * says to do — give the contract another primary contact — lets the person
   * go, and the contract stays.
   *
   * The ended contract is the ENGINE's refusal, not the guard's, on purpose:
   * the guard counts activated contracts only, because it also runs inside an
   * account delete, which takes ended contracts with it (see `contact.hook.ts`).
   */
  it('an ended contract keeps its primary contact: ending it changes nothing, another primary contact frees the person', async () => {
    for (const ending of ['terminated', 'expired']) {
      const contact = await referenced({ contract: 'activated' });
      const [contract] = await verify.rows('crm_contract', { crm_contact: contact.id });

      const guarded = await deleteContact(contact).then(() => null, (e: Error & Rec) => e);
      expect(guarded, `the contact under an activated contract was deleted (${ending} leg)`).toBeTruthy();
      expect(guarded).toMatchObject({ code: 'DELETE_RESTRICTED', status: 409 });
      expect(guarded!.message, ending).toContain('1 active contract(s)');
      expect(guarded!.message, ending).toContain('give each contract another primary contact: a contract keeps its primary contact even after it ends.');
      expect(guarded!.message, ending).not.toContain('Close or reassign those records');

      // An admin terminates; only the contract_expiration flow ages one out.
      await (ending === 'terminated'
        ? verify.hooks.run('crm_contract', 'update', { id: contract!.id, status: ending }, as(admin))
        : systemUpdate(verify, 'crm_contract', { id: contract!.id, status: ending }));
      const err = await deleteContact(contact).then(() => null, (e: Error & Rec) => e);
      expect(err, `the contact was deleted while its ${ending} contract still named it`).toBeTruthy();
      expect(err).toMatchObject({ code: 'DELETE_RESTRICTED', status: 409, dependentObject: 'crm_contract' });

      const [colleague] = await verify.seed('crm_contact', [{
        first_name: 'Grace', last_name: `Hopper ${++k}`, email: `colleague${k}@hooks-runtime-sales.test`,
        crm_account: contract!.crm_account, owner_id: rep.id,
      }]);
      await verify.hooks.run('crm_contract', 'update', { id: contract!.id, crm_contact: colleague!.id }, as(admin));
      await expect(deleteContact(contact), ending).resolves.toBeDefined();
      expect(await verify.rows('crm_contract', { id: contract!.id, status: ending }), 'the contract went with the person').toHaveLength(1);
    }
  });
});

// ──────────────────────────────────────────────────────────── product ──

describe('product_catalog', () => {
  /** A product written by the admin — the catalogue is not a rep's to author. */
  const adminProduct = (doc: Rec) => verify.hooks.run('crm_product', 'insert', {
    name: `Catalogue ${++k}`, product_code: `CAT-${k}`, is_active: true, ...doc,
  }, as(admin));

  it('rejects a list_price below cost, allows equal', async () => {
    await expect(adminProduct({ list_price: 5, cost: 10 })).rejects.toThrow(/must be greater than or equal to Cost/);
    await expect(adminProduct({ list_price: 10, cost: 10 })).resolves.toBeTruthy();
  });

  it('compares against the PREVIOUS cost when the update only changes price', async () => {
    const product = await adminProduct({ list_price: 20, cost: 10 });
    await expect(verify.hooks.run('crm_product', 'update', { id: product.id, list_price: 5 }, as(admin)))
      .rejects.toThrow(/greater than or equal to Cost/);
  });

  it('normalizes sku to uppercase', async () => {
    const n = ++k;
    expect((await adminProduct({ sku: `crm-pro-${n}`, list_price: 10 })).sku).toBe(`CRM-PRO-${n}`);
  });

  it('refuses to delete a product referenced by any line item, historical included', async () => {
    const product = await adminProduct({ list_price: 100 });
    const { opp } = await quoteParties();
    await verify.seed('crm_opportunity_line_item', [{ crm_opportunity: opp.id, crm_product: product.id, quantity: 1, unit_price: 100 }]);
    for (let i = 0; i < 2; i++) {
      const quote = await repQuotes();
      await verify.seed('crm_quote_line_item', [{ crm_quote: quote.id, crm_product: product.id, quantity: 1, unit_price: 100 }]);
    }
    await expect(verify.hooks.run('crm_product', 'delete', { id: product.id }, as(admin)))
      .rejects.toThrow(/referenced by 1 opportunity\(ies\) and 2 quote\(s\)/);
  });

  it('allows deleting an unreferenced product', async () => {
    const product = await adminProduct({ list_price: 100 });
    await expect(verify.hooks.run('crm_product', 'delete', { id: product.id }, as(admin))).resolves.toBeDefined();
  });
});
