// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, vi } from 'vitest';
import { bootStack, type VerifyStack } from '@objectstack/verify';
import {
  hotcrmStack, bootOptions, buildArtifactAgain, signUpPerson, guestInsert, systemUpdate, recordEngineWrites, today, type Person,
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

// Generic over the operation, as `hooks.run` is (@objectstack/verify 18.0.0-next.0): an insert or
// an update answers the row, a delete answers the engine's own `boolean | number`.
const repWrites = <Op extends 'insert' | 'update' | 'delete'>(object: string, op: Op, doc: Rec) =>
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

  it("adds up on QTE-0007's shape: the header's subtotal is the sum of the line totals beside it (#2069)", async () => {
    // A 10% quote with an untaxed line and a discounted one, then the rep tries
    // a 5% rate on the second line, as hosted QTE-0007 carried. On 4.0.1 the
    // rate reached only that line's Total: lines 10,945 beside a header of
    // 9,810. Tax is the quote's own amount, so the rate is refused.
    const quote = await quoteOf({ status: 'draft', discount: 10 });
    const lines: Rec[] = [];
    for (const line of [
      { quantity: 2, unit_price: 5000, discount: 0 }, // 10,000
      { quantity: 1, unit_price: 1000, discount: 10 }, // 900
    ]) {
      lines.push(await repWrites('crm_quote_line_item', 'insert', {
        crm_quote: quote.id, crm_product: (await productAt(line.unit_price)).id, ...line,
      }));
    }
    const rated = await repWrites('crm_quote_line_item', 'update', { id: lines[1]!.id, tax_rate: 5 })
      .then(() => null, (e: Rec) => [e.code, e.status]);
    const q = await settles('crm_quote', quote.id, (row) => expect(row.subtotal).toBe(10_900));
    const shown = await verify.rows('crm_quote_line_item', { crm_quote: quote.id });
    expect({
      lines: shown.reduce((sum, l) => sum + Number(l.total_price), 0),
      subtotal: q.subtotal,
      total: q.total_price,
    }).toEqual({ lines: 10_900, subtotal: 10_900, total: 9_810 }); // 10,900 − 1,090
    expect(rated, 'a line took a tax rate of its own').toEqual(['INVALID_FIELD', 400]);
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

  describe("quote_workflow · the quote's own pricing edit re-derives its totals in that write (#2083)", () => {
    // QTE-0005's shape, where #2083 measured the stale total: 80,000 of lines, 6,400 tax.
    const priced = { subtotal: 80_000, discount: 0, discount_amount: 0, tax: 6_400, shipping_handling: 0, total_price: 86_400 };

    it.each([
      [{ tax: 7_000 }, { discount_amount: 0, total_price: 87_000 }],
      [{ discount: 10 }, { discount_amount: 8_000, total_price: 78_400 }], // 80,000 − 8,000 + 6,400
      [{ shipping_handling: 500 }, { discount_amount: 0, total_price: 86_900 }],
    ])('a rep editing %o stores %o', async (edit, totals) => {
      const quote = await quoteOf({ status: 'draft', ...priced });
      await repWrites('crm_quote', 'update', { id: quote.id, ...edit });
      expect(await stored('crm_quote', quote.id)).toMatchObject({ ...edit, ...totals });
    });

    it('re-derives nothing on a settled quote: a rep is refused as before, a system write passes as written', async () => {
      const quote = await quoteOf({ status: 'accepted', ...priced });
      const refused = await repWrites('crm_quote', 'update', { id: quote.id, discount: 10 })
        .then(() => null, (e: Rec) => [e.code, e.status]);
      expect(refused, 'the freeze admitted a rep edit').toEqual(['RECORD_LOCKED', 409]);
      await systemUpdate(verify, 'crm_quote', { id: quote.id, tax: 7_000 });
      expect(await stored('crm_quote', quote.id)).toMatchObject({ ...priced, tax: 7_000 });
    });

    it('drafts the contract at the re-derived total when the rep accepts right after an edit', async () => {
      const quote = await quoteOf({ status: 'presented', ...priced });
      await repWrites('crm_quote', 'update', { id: quote.id, discount: 10 });
      await repWrites('crm_quote', 'update', { id: quote.id, status: 'accepted' });
      const contract = await vi.waitFor(async () => {
        const [row] = await verify.rows('crm_contract', { crm_opportunity: quote.crm_opportunity });
        expect(row, 'no contract drafted').toBeTruthy();
        return row!;
      }, { timeout: 10_000, interval: 50 });
      expect(contract.contract_value).toBe(78_400);
    });
  });
});

describe('opportunity_line_item_price_fill', () => {
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
    // The app on its own datasource, where nobody holds `sales_rep` yet. The
    // SQL in-memory one: `driver-memory` refuses every tenant-scoped call since
    // 18.0.0-next.0 (verify 34dba5a, until ADR-0131 C8), and a build of its own,
    // as one configuration holds one live kernel (objectstack#22301).
    const empty = await bootStack(await buildArtifactAgain(), bootOptions());
    expect(await empty.rows('sys_user_position', { position: 'sales_rep' }), 'the empty boot has a rep pool').toEqual([]);
    const [written] = await empty.seed('crm_lead', [lead()]);
    expect((await empty.rows('crm_lead', { id: written!.id }))[0]!.owner_id ?? null).toBeNull();
  }, 120_000);

  it('respects an explicit owner', async () => {
    // `rep` is the MORE loaded rep, so a round-robin would have moved it.
    const [written] = await verify.seed('crm_lead', [lead({ owner_id: rep.id })]);
    expect((await stored('crm_lead', written!.id)).owner_id).toBe(rep.id);
  });

  it('routes an anonymous Web-to-Lead submission into the rep pool (#2014)', async () => {
    // The form's own grant reads nothing, so as the caller the pool read came
    // back empty and every web lead landed ownerless. The hook declares
    // `runAs: 'system'`: who works an enquiry is the business's routing.
    const written = await guestInsert(verify, 'crm_lead', lead({ company: 'FromWebForm' }));
    const row = await stored('crm_lead', written.id);
    expect(row.lead_source, 'not the guest submission this case is about').toBe('web');
    expect([rep.id, rep2.id], 'a web lead was not routed to the rep pool').toContain(row.owner_id);
  });

  /**
   * The acceptance of #2014's F9 at the platform's own anonymous door,
   * `POST /forms/:slug/submit` (`verify.api` serves it since 18.0.0-next.0).
   * Both elevated hooks find something about this submission — an owner, and
   * the contact it repeats — and neither finding may reach the submitter:
   * since objectstack#22437 the door answers the new record's id and nothing
   * else, so no public form is an email-existence oracle (maintainer ruling on
   * #2014, item 4 B: the platform fixed the door first).
   */
  it('a web lead is routed and flagged, and the anonymous answer carries only its id (#2014)', async () => {
    const address = `known${++k}@hooks-runtime.test`;
    const [known] = await verify.seed('crm_contact', [{
      first_name: 'Ada', last_name: 'Known', email: address, crm_account: (await accountOf()).id, owner_id: rep.id,
    }]);
    const res = await verify.api('/forms/contact-us/submit', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ first_name: 'Ada', last_name: 'Again', email: address.toUpperCase(), company: 'Web Co', description: 'Back again.' }),
    });
    expect(res.status).toBe(201);
    const answer = await res.json() as Rec;
    expect(Object.keys(answer), 'the anonymous answer carries more than the new id').toEqual(['id']);
    const row = await stored('crm_lead', String(answer.id));
    expect(row.lead_source, 'not the guest submission this case is about').toBe('web');
    expect([rep.id, rep2.id], 'a web lead was not routed to the rep pool').toContain(row.owner_id);
    expect(row.duplicate_status, 'a web duplicate was not flagged').toBe('suspected');
    expect(row.duplicate_of_contact).toBe(known!.id);
  });

  it('both lead intake hooks stay inside the new lead’s organization (AGENTS.md rule 10)', async () => {
    // Elevated, the rep pool, the load counts and the duplicate scan are
    // organization-neutral, so each is pinned to the organization the writer
    // named on the lead. Two organizations: the other one's rep is the LESS
    // loaded, and the other one holds a contact at the same address — an
    // unpinned read picks that rep and flags that contact. A boot (and a
    // build) of its own: once an install holds two organizations, every
    // system insert must name one.
    const twoOrgs = await bootStack(await buildArtifactAgain(), bootOptions());
    const orgs = await twoOrgs.seed('sys_organization', [
      { name: 'Lead Org', slug: 'lead-org' }, { name: 'Other Org', slug: 'other-org' },
    ]);
    const [own, other] = [String(orgs[0]!.id), String(orgs[1]!.id)];
    const ownRep = await signUpPerson(twoOrgs, 'own.rep@hooks-runtime.test', { name: 'Own Rep' });
    const otherRep = await signUpPerson(twoOrgs, 'other.rep@hooks-runtime.test', { name: 'Other Rep' });
    await twoOrgs.seed('sys_user_position', [
      { user_id: ownRep.id, position: 'sales_rep', organization_id: own },
      { user_id: otherRep.id, position: 'sales_rep', organization_id: other },
    ]);
    await twoOrgs.seed('crm_lead', [lead({ owner_id: ownRep.id, organization_id: own })]);
    const contactIn = async (organization_id: string, email: string) => {
      const [acct] = await twoOrgs.seed('crm_account', [{ name: `Org Co ${++k}`, organization_id }]);
      return (await twoOrgs.seed('crm_contact', [{ first_name: 'Ada', last_name: 'Org', email, crm_account: acct!.id, organization_id }]))[0]!;
    };
    const ownContact = await contactIn(own, `own${++k}@hooks-runtime.test`);
    const shared = `shared${++k}@hooks-runtime.test`;
    await contactIn(other, shared);
    const intake = async (email: string) => {
      const [written] = await twoOrgs.seed('crm_lead', [lead({ email, organization_id: own })]);
      return (await twoOrgs.rows('crm_lead', { id: written!.id }))[0]!;
    };
    const crossing = await intake(shared);
    expect(crossing.owner_id, 'the intake crossed into another organization’s rep pool').toBe(ownRep.id);
    expect(crossing.duplicate_status ?? null, 'the duplicate scan matched a contact in another organization').toBeNull();
    // Anti-vacuum: the scan does run on this boot, inside the organization.
    expect((await intake(String(ownContact.email))).duplicate_of_contact, 'the scan found nothing at all').toBe(ownContact.id);
  }, 120_000);
});
