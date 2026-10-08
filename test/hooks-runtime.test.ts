// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, vi } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import {
  hotcrmStack, hotcrmMemoryStack, signUpPerson, guestInsert, systemUpdate, recordEngineWrites, today, type Person,
} from './helpers/verify-stack';

/**
 * Runtime hook tests — the REAL handler code, inside the real engine's write
 * path.
 *
 * The metadata-contract tests (actions-flows-integrity) prove a hook is WIRED;
 * these prove it BEHAVES: the sum arithmetic, the skip-when-empty / skip-closed
 * guards, the least-loaded assignment pick, and the product price default all
 * run here with real inputs and asserted outputs. This is the layer `os build`
 * / `validate` can't reach.
 *
 * Every case runs on the shipped app booted by `@objectstack/verify`: a sales
 * rep's write through the engine's write door (`hooks.run`), or — where the
 * case is about a writer that is not a person (an import, a web form) — the
 * system's seed door or the anonymous form context; the record is put in its
 * prior state by a system write where no person's write can produce it.
 * What is asserted is the row the engine stored. The two rollups are
 * `async: true` hooks — the engine runs them after the write that fired them
 * has returned — so their result is waited for.
 *
 * Companion files: hooks-runtime-sales.test.ts, hooks-runtime-service.test.ts.
 */

type Rec = Record<string, any>;

let verify: VerifyStack;
/** The two holders of the `sales_rep` position — the round-robin's whole pool. */
let rep: Person;
let rep2: Person;
let k = 0;
beforeAll(async () => {
  verify = await hotcrmStack();
  rep = await signUpPerson(verify, 'rep@hooks-runtime.test', {
    name: 'Sales Rep', positions: ['sales_rep'], permissionSets: ['sales_rep'],
  });
  rep2 = await signUpPerson(verify, 'rep2@hooks-runtime.test', {
    name: 'Second Rep', positions: ['sales_rep'], permissionSets: ['sales_rep'],
  });
}, 120_000);

const repWrites = (object: string, op: 'insert' | 'update' | 'delete', doc: Rec): Promise<Rec> =>
  verify.hooks.run(object, op, doc, { as: rep.token });
const stored = async (object: string, id: string): Promise<Rec> => (await verify.rows(object, { id }))[0]!;

/** An account of the rep's, written as the system. */
const accountOf = async (): Promise<Rec> =>
  (await verify.seed('crm_account', [{ name: `Runtime Co ${++k}`, owner_id: rep.id }]))[0]!;

/** A deal of the rep's in `over`'s stored state, written as the system. */
const dealOf = async (over: Rec = {}): Promise<Rec> => {
  const acct = await accountOf();
  return (await verify.seed('crm_opportunity', [{
    name: `Runtime Deal ${++k}`, amount: 50_000, stage: 'qualification', close_date: '2030-06-30',
    crm_account: acct.id, owner_id: rep.id, ...over,
  }]))[0]!;
};

/** A catalogue product with a list price, written as the system. */
const productAt = async (list_price: number): Promise<Rec> =>
  (await verify.seed('crm_product', [{ name: `Runtime Product ${++k}`, product_code: `RT-${k}`, is_active: true, list_price }]))[0]!;

/** Wait for `object`'s row `id` to satisfy `check` (an `async: true` hook's result). */
const settles = (object: string, id: string, check: (row: Rec) => void): Promise<Rec> =>
  vi.waitFor(async () => {
    const row = await stored(object, id);
    check(row);
    return row;
  }, { timeout: 10_000, interval: 50 });

/** Give an `async: true` hook time to run, for a case whose claim is that it wrote nothing. */
const settle = () => new Promise((r) => setTimeout(r, 300));

describe('opportunity_amount_rollup', () => {
  /** The rep adding a line to `deal` (each line on its own priced product). */
  const addLine = async (deal: Rec, line: Rec): Promise<Rec> =>
    repWrites('crm_opportunity_line_item', 'insert', {
      crm_opportunity: deal.id, crm_product: (await productAt(line.unit_price)).id, ...line,
    });

  it('sets amount to the sum of line extended prices (qty × price × (1−disc%))', async () => {
    const deal = await dealOf({ amount: 50_000 });
    await addLine(deal, { quantity: 2, unit_price: 1000, discount: 0 });
    await addLine(deal, { quantity: 1, unit_price: 500, discount: 10 }); // 450
    // The manually-typed 50,000 is replaced by the rolled-up sum — the
    // engine stored the rollup's own update.
    await settles('crm_opportunity', deal.id, (d) => expect(d.amount).toBe(2450)); // 2000 + 450
  });

  it('leaves amount untouched when there are no line items (never zeros a manual deal)', async () => {
    const deal = await dealOf({ amount: 50_000 });
    const line = await addLine(deal, { quantity: 2, unit_price: 1000, discount: 0 });
    await settles('crm_opportunity', deal.id, (d) => expect(d.amount).toBe(2000));
    // The last line goes: the rollup finds nothing to sum and writes nothing.
    const recorder = recordEngineWrites(verify);
    try {
      await repWrites('crm_opportunity_line_item', 'delete', { id: line.id });
      await settle();
      expect(recorder.of('crm_opportunity', 'update'), 'the rollup rewrote the deal with no lines left').toEqual([]);
    } finally {
      recorder.restore();
    }
    expect((await stored('crm_opportunity', deal.id)).amount).toBe(2000);
  });

  it('skips closed deals (a settled amount is never rewritten by a line edit)', async () => {
    const deal = await dealOf({ stage: 'closed_won', win_reason: 'better_price', amount: 999, close_date: '2026-01-01' });
    // A line landing on a closed deal — written by the system, the writer no
    // freeze stands in front of (an import, a migration).
    await verify.seed('crm_opportunity_line_item', [{
      crm_opportunity: deal.id, crm_product: (await productAt(100)).id, quantity: 5, unit_price: 100, discount: 0,
    }]);
    await settle();
    expect((await stored('crm_opportunity', deal.id)).amount).toBe(999); // unchanged
  });
});

describe('opportunity_lifecycle · stage-age clock', () => {
  /**
   * `days_in_stage` is a formula over `stage_entry_date` (#489), so this hook
   * owns the only clock the `opportunity_stagnation` sweep and the
   * `stale_opportunities` view can read. Its predecessor wrote
   * `days_in_stage = 0` on a stage change against a counter nothing ever
   * incremented — the flow's `days_in_stage > 14` filter matched only seeded
   * rows. These pin the stamping contract in both directions.
   */
  const repDeal = async (doc: Rec = {}): Promise<Rec> => {
    const acct = await accountOf();
    return repWrites('crm_opportunity', 'insert', {
      name: `Clock Deal ${++k}`, stage: 'prospecting', amount: 1000, close_date: '2030-06-30', crm_account: acct.id, ...doc,
    });
  };
  const daysSince = (date: string) =>
    Math.round((Date.parse(`${today()}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`)) / 86_400_000);

  it('starts the clock on insert', async () => {
    const deal = await repDeal();
    expect((await stored('crm_opportunity', deal.id)).stage_entry_date).toBe(today());
  });

  it('does not overwrite a stage_entry_date the importer supplied', async () => {
    // A backfill — the system's seed door, the posture an import writes under.
    // `stage_entry_date` is `readonly`, so it is the importer's to supply, not a
    // person's.
    const deal = await dealOf({ stage: 'proposal', amount: 1000, stage_entry_date: '2020-01-01' });
    expect((await stored('crm_opportunity', deal.id)).stage_entry_date).toBe('2020-01-01');
  });

  it('restarts the clock when the stage changes', async () => {
    const deal = await dealOf({ stage: 'proposal', stage_entry_date: '2020-01-01' });
    await repWrites('crm_opportunity', 'update', { id: deal.id, stage: 'negotiation' });
    expect((await stored('crm_opportunity', deal.id)).stage_entry_date).toBe(today());
  });

  it('leaves the clock alone when the stage does not change', async () => {
    const deal = await dealOf({ stage: 'proposal', stage_entry_date: '2020-01-01' });
    await repWrites('crm_opportunity', 'update', { id: deal.id, amount: 25_000 });
    expect((await stored('crm_opportunity', deal.id)).stage_entry_date).toBe('2020-01-01');
  });

  it('never writes days_in_stage — it is a formula, not a stored counter', async () => {
    // What reads back is the formula over the clock, whatever a write carried:
    // an amount edit leaves it counting from the old entry date, a stage change
    // brings it to zero through the clock alone.
    const deal = await dealOf({ stage: 'proposal', stage_entry_date: '2020-01-01' });
    await repWrites('crm_opportunity', 'update', { id: deal.id, amount: 30_000 });
    expect((await stored('crm_opportunity', deal.id)).days_in_stage).toBe(daysSince('2020-01-01'));
    await repWrites('crm_opportunity', 'update', { id: deal.id, stage: 'negotiation' });
    expect((await stored('crm_opportunity', deal.id)).days_in_stage).toBe(0);
  });
});

describe('quote_total_rollup', () => {
  /** A quote of the rep's on a deal of theirs (`over` is its stored state), written as the system. */
  const quoteOf = async (over: Rec): Promise<Rec> => {
    const acct = await accountOf();
    const [contact] = await verify.seed('crm_contact', [{
      first_name: 'Quinn', last_name: `Buyer ${++k}`, email: `quinn${k}@hooks-runtime.test`, crm_account: acct.id, owner_id: rep.id,
    }]);
    const [deal] = await verify.seed('crm_opportunity', [{
      name: `Quoted Deal ${k}`, amount: 25_000, stage: 'proposal', close_date: '2030-06-30', crm_account: acct.id, owner_id: rep.id,
    }]);
    return (await verify.seed('crm_quote', [{
      name: `Q-${k}`, crm_account: acct.id, crm_contact: contact!.id, crm_opportunity: deal!.id,
      quote_date: '2026-01-01', expiration_date: '2030-12-31', owner_id: rep.id, ...over,
    }]))[0]!;
  };

  it('recomputes subtotal, quote-level discount_amount, and total (+tax +shipping)', async () => {
    const quote = await quoteOf({ status: 'draft', discount: 10, tax: 50, shipping_handling: 25 });
    for (const line of [
      { quantity: 4, unit_price: 100, discount: 0 }, // 400
      { quantity: 2, unit_price: 300, discount: 50 }, // 300
    ]) {
      await repWrites('crm_quote_line_item', 'insert', {
        crm_quote: quote.id, crm_product: (await productAt(line.unit_price)).id, ...line,
      });
    }
    await settles('crm_quote', quote.id, (q) => {
      expect(q.subtotal).toBe(700);           // 400 + 300
      expect(q.discount_amount).toBe(70);     // 700 × 10%
      expect(q.total_price).toBe(705);        // 700 − 70 + 50 + 25
    });
  });

  it('skips accepted quotes', async () => {
    const quote = await quoteOf({ status: 'accepted', discount: 0, tax: 0, shipping_handling: 0, total_price: 111 });
    // A line landing on an accepted quote — written by the system, the writer
    // no freeze stands in front of.
    await verify.seed('crm_quote_line_item', [{
      crm_quote: quote.id, crm_product: (await productAt(100)).id, quantity: 9, unit_price: 100, discount: 0,
    }]);
    await settle();
    expect((await stored('crm_quote', quote.id)).total_price).toBe(111);
  });
});

describe('line-item price fill', () => {
  it('defaults list_price + unit_price from the product on insert', async () => {
    const deal = await dealOf();
    const product = await productAt(250);
    const line = await repWrites('crm_opportunity_line_item', 'insert', {
      crm_opportunity: deal.id, crm_product: product.id, quantity: 1, // no unit_price entered
    });
    const row = await stored('crm_opportunity_line_item', line.id);
    expect(row.list_price).toBe(250);
    expect(row.unit_price).toBe(250);
  });

  it('never clobbers a negotiated unit_price on update (only re-syncs list_price)', async () => {
    const deal = await dealOf();
    const product = await productAt(250);
    const line = await repWrites('crm_opportunity_line_item', 'insert', {
      crm_opportunity: deal.id, crm_product: product.id, quantity: 1,
    });
    await systemUpdate(verify, 'crm_product', { id: product.id, list_price: 300 });
    await repWrites('crm_opportunity_line_item', 'update', { id: line.id, crm_product: product.id, unit_price: 199 });
    const row = await stored('crm_opportunity_line_item', line.id);
    expect(row.list_price).toBe(300);
    expect(row.unit_price).toBe(199); // preserved
  });
});

describe('lead_auto_assign', () => {
  /**
   * The pool is the two reps; `rep` already carries two open leads to `rep2`'s
   * one, so the least-loaded rep is `rep2`. Ownerless intake is a SYSTEM write
   * (an import, a seed load — the seed door); a person's write is stamped with
   * its creator before this hook runs.
   */
  let n = 0;
  const lead = (over: Rec = {}): Rec => ({
    first_name: 'Nora', last_name: `Intake ${++n}`, company: `NewCo ${n}`, email: `intake${n}@hooks-runtime.test`, ...over,
  });
  beforeAll(async () => {
    await verify.seed('crm_lead', [lead({ owner_id: rep.id }), lead({ owner_id: rep.id }), lead({ owner_id: rep2.id })]);
  });

  it('assigns an ownerless lead to the rep with the fewest open leads', async () => {
    const [written] = await verify.seed('crm_lead', [lead()]); // no owner
    expect((await stored('crm_lead', written!.id)).owner_id).toBe(rep2.id); // least-loaded
  });

  it('is a no-op when there is no rep pool (never blocks intake)', async () => {
    // The app on its own datasource, where nobody holds `sales_rep` yet.
    const empty = await hotcrmMemoryStack();
    expect(await empty.rows('sys_user_position', { position: 'sales_rep' }), 'the empty boot has a rep pool').toEqual([]);
    const [written] = await empty.seed('crm_lead', [lead()]);
    expect((await empty.rows('crm_lead', { id: written!.id }))[0]!.owner_id ?? null).toBeNull();
  }, 120_000);

  it('respects an explicit owner', async () => {
    // `rep` is the MORE loaded rep, so a round-robin would have moved it.
    const [written] = await verify.seed('crm_lead', [lead({ owner_id: rep.id })]);
    expect((await stored('crm_lead', written!.id)).owner_id).toBe(rep.id);
  });

  it('never throws when the rep-pool lookup is denied (anonymous Web-to-Lead)', async () => {
    // The public-form grant denies `find` on sys_user_position. The hook must
    // swallow that and leave the lead ownerless — NOT reject the insert.
    const written = await guestInsert(verify, 'crm_lead', lead({ company: 'FromWebForm' }));
    const row = await stored('crm_lead', written.id);
    expect(row.company).toBe('FromWebForm');
    expect(row.owner_id).toBeNull(); // ownerless, but the insert proceeded
  });
});
