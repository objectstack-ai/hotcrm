// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import accountHooks from '../src/objects/account.hook';
import contactHooks from '../src/objects/contact.hook';
import opportunityHooks from '../src/objects/opportunity.hook';
import productHooks from '../src/objects/product.hook';
import quoteHooks from '../src/objects/quote.hook';
import quoteLineItemHooks from '../src/objects/quote_line_item.hook';
import {
  makeHarness, makeCtx, hookNamed, today, daysFromNow, type Rec,
} from './helpers/hook-harness';

/**
 * Runtime tests for the SALES-side hooks — the real handler bodies, executed
 * against a controllable in-memory data layer.
 *
 * Of the 24 hooks this app registers, only four had runtime coverage
 * (`opportunity_amount_rollup`, `opportunity_line_item_price_fill`,
 * `quote_total_rollup`, `lead_auto_assign`). Everything asserted below — the
 * whole opportunity lifecycle, the closed-record freeze, quote acceptance
 * drafting a contract, the delete-protection guards on account / contact /
 * product — was previously proven only to be *wired*, never to *work*.
 *
 * Companion file: hooks-runtime-service.test.ts (case, contract, campaign,
 * task, forecast, knowledge, lead).
 */

const SYSTEM = undefined;                 // no ctx.user ⇒ system / seed write
const USER = { id: 'user_1' };            // an authenticated human edit

// ───────────────────────────────────────────────────────── opportunity ──

describe('opportunity_lifecycle', () => {
  const hook = hookNamed(opportunityHooks, 'opportunity_lifecycle');

  it('derives probability, expected_revenue and forecast_category from stage on insert', async () => {
    const input: Rec = { name: 'Deal', amount: 10_000, stage: 'proposal' };
    await hook.handler(makeCtx({ event: 'beforeInsert', input, user: USER }));
    expect(input.probability).toBe(60);
    expect(input.expected_revenue).toBe(6_000);
    expect(input.forecast_category).toBe('commit');
  });

  it.each([
    ['prospecting', 10, 'pipeline'],
    ['qualification', 25, 'pipeline'],
    ['needs_analysis', 40, 'best_case'],
    ['proposal', 60, 'commit'],
    ['negotiation', 80, 'commit'],
    ['closed_won', 100, 'closed'],
    ['closed_lost', 0, 'omitted'],
  ])('stage %s ⇒ probability %i, forecast %s', async (stage, probability, forecast) => {
    const input: Rec = { amount: 1_000, stage };
    await hook.handler(makeCtx({ event: 'beforeInsert', input, user: USER }));
    expect(input.probability).toBe(probability);
    expect(input.expected_revenue).toBe((1_000 * probability) / 100);
    expect(input.forecast_category).toBe(forecast);
  });

  it('recomputes expected_revenue when only the amount changes', async () => {
    const input: Rec = { amount: 50_000 };
    const previous: Rec = { stage: 'proposal', amount: 10_000, probability: 60 };
    await hook.handler(makeCtx({ event: 'beforeUpdate', input, previous, user: USER }));
    expect(input.expected_revenue).toBe(30_000); // 50k × 60%
  });

  it('stamps close_date and restarts the stage clock on the closed_won transition', async () => {
    const input: Rec = { stage: 'closed_won' };
    const previous: Rec = { stage: 'negotiation', amount: 25_000, stage_entry_date: '2026-01-01' };
    await hook.handler(makeCtx({ event: 'beforeUpdate', input, previous, user: USER }));
    expect(input.close_date).toBe(today());
    // `days_in_stage` is a FORMULA over `stage_entry_date` (#489); re-stamping
    // that column IS the reset. It used to write `days_in_stage = 0` against a
    // counter nothing ever incremented.
    expect(input.stage_entry_date).toBe(today());
    expect(input.probability).toBe(100);
    expect(input.expected_revenue).toBe(25_000);
  });

  it('starts the stage clock on insert so a never-moved deal is visible to the sweep', async () => {
    const input: Rec = { name: 'New Deal', amount: 1_000, stage: 'prospecting' };
    await hook.handler(makeCtx({ event: 'beforeInsert', input, user: USER }));
    expect(input.stage_entry_date).toBe(today());
  });

  it('leaves the stage clock alone when the stage did not change', async () => {
    const input: Rec = { amount: 2_000 };
    const previous: Rec = { stage: 'proposal', amount: 1_000, stage_entry_date: '2026-01-01' };
    await hook.handler(makeCtx({ event: 'beforeUpdate', input, previous, user: USER }));
    expect(input.stage_entry_date, 'an amount edit must not reset the stall clock').toBeUndefined();
  });

  it('does not overwrite an explicitly supplied close_date', async () => {
    const input: Rec = { stage: 'closed_won', close_date: '2030-01-01' };
    const previous: Rec = { stage: 'negotiation', amount: 1_000 };
    await hook.handler(makeCtx({ event: 'beforeUpdate', input, previous, user: USER }));
    expect(input.close_date).toBe('2030-01-01');
  });

  it('freezes a closed opportunity against user edits to business fields', async () => {
    const previous: Rec = { stage: 'closed_won', amount: 25_000 };
    await expect(
      hook.handler(makeCtx({ event: 'beforeUpdate', input: { amount: 1 }, previous, user: USER })),
    ).rejects.toThrow(/closed \(closed_won\)/);
  });

  /**
   * #693's defect class, on this guard: deleting a contact or a campaign a
   * CLOSED opportunity references makes the engine clear that lookup, which
   * arrives here as an ordinary `beforeUpdate`. Measured end-to-end,
   * `DELETE /crm_contact/<id>` used to answer "Opportunity is closed
   * (closed_won); … Attempted: primary_contact." — an object the caller never
   * addressed, described as an edit they never made.
   */
  it('describes a cleared link as a link, and names the opportunity', async () => {
    const previous: Rec = { id: 'o1', name: 'Acme Renewal', stage: 'closed_won', primary_contact: 'c1' };
    const err = await hook
      .handler(makeCtx({
        event: 'beforeUpdate', input: { primary_contact: null }, previous, user: USER,
      }))
      .then(() => null, (e: Error) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err!.message).toContain('Opportunity Acme Renewal (o1)');
    expect(err!.message).toContain('its link(s) primary_contact cannot be cleared');
    expect(err!.message).toContain('blocks deleting the record(s) they point at');
    expect(err!.message).not.toContain('may be edited');
  });

  it('still reports a mixed write as the edit it is', async () => {
    const previous: Rec = { id: 'o1', name: 'Acme Renewal', stage: 'closed_won', primary_contact: 'c1', amount: 10 };
    await expect(
      hook.handler(makeCtx({
        event: 'beforeUpdate', input: { primary_contact: null, amount: 1 }, previous, user: USER,
      })),
    ).rejects.toThrow(/Opportunity Acme Renewal \(o1\) is closed \(closed_won\); only .* may be edited/);
  });

  it('allows narrative, approval and system fields on a closed opportunity', async () => {
    const previous: Rec = { stage: 'closed_lost', amount: 100 };
    for (const input of [
      { description: 'post-mortem' },
      { next_step: 'nothing' },
      { approval_status: 'approved' },
      { owner_id: 'user_2' },
      { updated_at: '2026-01-01' },
    ]) {
      await expect(
        hook.handler(makeCtx({ event: 'beforeUpdate', input, previous, user: USER })),
      ).resolves.toBeUndefined();
    }
  });

  it('lets SYSTEM writes through the freeze (re-seed rewrites closed records)', async () => {
    // The seed re-evaluates `close_date: daysAgo(15)` on every boot, so a
    // re-seed legitimately rewrites closed opportunities. Guarding those threw
    // boot-time BodyRunner errors (#459).
    const previous: Rec = { stage: 'closed_won', amount: 25_000 };
    await expect(
      hook.handler(makeCtx({
        event: 'beforeUpdate', input: { amount: 30_000 }, previous, user: SYSTEM,
      })),
    ).resolves.toBeUndefined();
  });

  it('leaves an unknown stage entirely alone rather than guessing', async () => {
    const input: Rec = { amount: 1_000, stage: 'not_a_stage' };
    await hook.handler(makeCtx({ event: 'beforeInsert', input, user: USER }));
    expect(input.probability).toBeUndefined();
    expect(input.expected_revenue).toBeUndefined();
    expect(input.forecast_category).toBeUndefined();
  });
});

describe('opportunity_promote_account', () => {
  const hook = hookNamed(opportunityHooks, 'opportunity_promote_account');

  it('promotes the account to customer and schedules an activation task on close-won', async () => {
    const h = makeHarness({
      crm_account: [{ id: 'acc1', type: 'prospect', owner_id: 'rep1' }],
      crm_task: [],
    });
    await hook.handler(makeCtx({
      event: 'afterUpdate',
      input: { id: 'opp1', stage: 'closed_won', crm_account: 'acc1', owner_id: 'rep1' },
      previous: { id: 'opp1', stage: 'negotiation', crm_account: 'acc1' },
      user: USER,
      api: h.api,
    }));

    expect(h.rows('crm_account')[0].type).toBe('customer');
    const [task] = h.rows('crm_task');
    expect(task, 'no activation task created').toBeTruthy();
    expect(task.priority).toBe('high');
    expect(task.status).toBe('not_started');
    expect(task.related_to_opportunity).toBe('opp1');
    expect(task.owner_id).toBe('rep1');
    expect(task.due_date).toBe(daysFromNow(3));
  });

  it('does not re-promote an account that is already a customer', async () => {
    const h = makeHarness({ crm_account: [{ id: 'acc1', type: 'customer' }], crm_task: [] });
    await hook.handler(makeCtx({
      event: 'afterUpdate',
      input: { id: 'opp1', stage: 'closed_won', crm_account: 'acc1' },
      previous: { id: 'opp1', stage: 'proposal', crm_account: 'acc1' },
      user: USER,
      api: h.api,
    }));
    expect(h.callsFor('crm_account', 'update')).toHaveLength(0);
    expect(h.rows('crm_task')).toHaveLength(1); // task still created
  });

  it('is a no-op when the deal did not just become won', async () => {
    const h = makeHarness({ crm_account: [{ id: 'acc1', type: 'prospect' }], crm_task: [] });
    for (const [input, previous] of [
      [{ stage: 'proposal', crm_account: 'acc1' }, { stage: 'qualification' }],
      [{ stage: 'closed_won', crm_account: 'acc1' }, { stage: 'closed_won' }], // already won
    ] as const) {
      await hook.handler(makeCtx({ event: 'afterUpdate', input, previous, user: USER, api: h.api }));
    }
    expect(h.calls).toHaveLength(0);
  });
});

// ────────────────────────────────────────────────────────────── quote ──

describe('quote_workflow', () => {
  const hook = hookNamed(quoteHooks, 'quote_workflow');

  it('defaults expiration_date to quote_date + 30 days on insert', async () => {
    const input: Rec = { quote_date: '2026-01-01' };
    await hook.handler(makeCtx({ event: 'beforeInsert', input, user: USER }));
    expect(input.expiration_date).toBe('2026-01-31');
  });

  it('falls back to today + 30 when no quote_date was supplied', async () => {
    const input: Rec = {};
    await hook.handler(makeCtx({ event: 'beforeInsert', input, user: USER }));
    expect(input.expiration_date).toBe(daysFromNow(30));
  });

  it('respects an explicit expiration_date', async () => {
    const input: Rec = { quote_date: '2026-01-01', expiration_date: '2026-06-30' };
    await hook.handler(makeCtx({ event: 'beforeInsert', input, user: USER }));
    expect(input.expiration_date).toBe('2026-06-30');
  });

  it.each(['accepted', 'expired'])('freezes a %s quote against user edits', async (status) => {
    const previous: Rec = { status, total_price: 100 };
    await expect(
      hook.handler(makeCtx({
        event: 'beforeUpdate', input: { total_price: 1 }, previous, user: USER,
      })),
    ).rejects.toThrow(new RegExp(`Quote is ${status}`));
  });

  /**
   * #693's defect class, on this guard: deleting the opportunity (or contact) a
   * frozen quote references makes the engine clear that lookup. Measured
   * end-to-end, `DELETE /crm_opportunity/<id>` used to answer "Quote is
   * accepted; only internal_notes may be edited. Attempted: crm_opportunity."
   */
  it('describes a cleared link as a link, and names the quote', async () => {
    const previous: Rec = { id: 'q1', name: 'Q-1001', status: 'accepted', crm_opportunity: 'o1' };
    const err = await hook
      .handler(makeCtx({
        event: 'beforeUpdate', input: { crm_opportunity: null }, previous, user: USER,
      }))
      .then(() => null, (e: Error) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err!.message).toContain('Quote Q-1001 (q1)');
    expect(err!.message).toContain('its link(s) crm_opportunity cannot be cleared');
    expect(err!.message).toContain('blocks deleting the record(s) they point at');
    expect(err!.message).not.toContain('may be edited');
  });

  it('still reports a mixed write as the edit it is', async () => {
    const previous: Rec = { id: 'q1', name: 'Q-1001', status: 'accepted', crm_opportunity: 'o1', total_price: 100 };
    await expect(
      hook.handler(makeCtx({
        event: 'beforeUpdate', input: { crm_opportunity: null, total_price: 1 }, previous, user: USER,
      })),
    ).rejects.toThrow(/Quote Q-1001 \(q1\) is accepted; only internal_notes may be edited/);
  });

  it('allows internal_notes and framework columns on a frozen quote', async () => {
    const previous: Rec = { status: 'accepted', total_price: 100 };
    for (const input of [{ internal_notes: 'signed' }, { owner_id: 'user_2' }, { updated_at: 'x' }]) {
      await expect(
        hook.handler(makeCtx({ event: 'beforeUpdate', input, previous, user: USER })),
      ).resolves.toBeUndefined();
    }
  });

  it('lets SYSTEM writes through the freeze', async () => {
    const previous: Rec = { status: 'accepted', total_price: 100 };
    await expect(
      hook.handler(makeCtx({
        event: 'beforeUpdate', input: { total_price: 250 }, previous, user: SYSTEM,
      })),
    ).resolves.toBeUndefined();
  });
});

describe('quote_on_accepted', () => {
  const hook = hookNamed(quoteHooks, 'quote_on_accepted');

  const acceptQuote = async (h: ReturnType<typeof makeHarness>, extra: Rec = {}) =>
    hook.handler(makeCtx({
      event: 'afterUpdate',
      input: {
        id: 'q1', status: 'accepted', crm_account: 'acc1', crm_contact: 'con1',
        crm_opportunity: 'opp1', total_price: 120_000, owner_id: 'rep1', ...extra,
      },
      previous: { id: 'q1', status: 'presented' },
      user: USER,
      api: h.api,
    }));

  it('drafts a 12-month contract carrying the quote total and links', async () => {
    const h = makeHarness({
      crm_contract: [],
      crm_opportunity: [{ id: 'opp1', stage: 'proposal' }],
    });
    await acceptQuote(h);

    const [contract] = h.rows('crm_contract');
    expect(contract, 'no contract drafted').toBeTruthy();
    expect(contract.status).toBe('draft');
    expect(contract.crm_account).toBe('acc1');
    expect(contract.crm_contact).toBe('con1');
    expect(contract.crm_opportunity).toBe('opp1');
    expect(contract.contract_value).toBe(120_000);
    expect(contract.contract_term_months).toBe(12);
    expect(contract.owner_id).toBe('rep1');
    expect(contract.start_date).toBe(today());
  });

  it('uses real calendar months for end_date, not days × 30', async () => {
    // `days * 30` shorted a 12-month term by ~5 days; contract_validation
    // tolerates ±1 month so the bug only ever slipped past by luck.
    const h = makeHarness({ crm_contract: [], crm_opportunity: [] });
    await acceptQuote(h);

    const { start_date: start, end_date: end } = h.rows('crm_contract')[0];
    const s = new Date(start as string);
    const e = new Date(end as string);
    const months =
      (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) +
      (e.getDate() >= s.getDate() ? 0 : -1);
    expect(months, `${start} → ${end} is not 12 calendar months`).toBe(12);
  });

  it('pushes the linked opportunity to closed_won', async () => {
    const h = makeHarness({
      crm_contract: [],
      crm_opportunity: [{ id: 'opp1', stage: 'negotiation' }],
    });
    await acceptQuote(h);

    const opp = h.rows('crm_opportunity')[0];
    expect(opp.stage).toBe('closed_won');
    expect(opp.close_date).toBe(today());
  });

  it('never reopens an already-closed opportunity', async () => {
    const h = makeHarness({
      crm_contract: [],
      crm_opportunity: [{ id: 'opp1', stage: 'closed_lost' }],
    });
    await acceptQuote(h);
    expect(h.rows('crm_opportunity')[0].stage).toBe('closed_lost');
    expect(h.callsFor('crm_opportunity', 'update')).toHaveLength(0);
  });

  it('is a no-op unless the quote just became accepted', async () => {
    const h = makeHarness({ crm_contract: [], crm_opportunity: [] });
    await hook.handler(makeCtx({
      event: 'afterUpdate',
      input: { id: 'q1', status: 'accepted' },
      previous: { id: 'q1', status: 'accepted' },
      user: USER,
      api: h.api,
    }));
    expect(h.calls).toHaveLength(0);
  });
});

describe('quote_line_item_price_fill', () => {
  const hook = hookNamed(quoteLineItemHooks, 'quote_line_item_price_fill');

  it('stamps list_price and defaults unit_price from the product on insert', async () => {
    const h = makeHarness({ crm_product: [{ id: 'p1', list_price: 250 }] });
    const input: Rec = { crm_product: 'p1' };
    await hook.handler(makeCtx({ event: 'beforeInsert', input, user: USER, api: h.api }));
    expect(input.list_price).toBe(250);
    expect(input.unit_price).toBe(250);
  });

  it('re-syncs list_price on update but never clobbers a negotiated unit_price', async () => {
    const h = makeHarness({ crm_product: [{ id: 'p1', list_price: 250 }] });
    const input: Rec = { crm_product: 'p1', unit_price: 199 };
    await hook.handler(makeCtx({ event: 'beforeUpdate', input, user: USER, api: h.api }));
    expect(input.list_price).toBe(250);
    expect(input.unit_price).toBe(199);
  });

  it('is a no-op when no product is chosen or the product has no price', async () => {
    const h = makeHarness({ crm_product: [{ id: 'p1' }] });
    const noProduct: Rec = { quantity: 2 };
    await hook.handler(makeCtx({ event: 'beforeInsert', input: noProduct, api: h.api }));
    expect(noProduct.list_price).toBeUndefined();

    const pricelessProduct: Rec = { crm_product: 'p1' };
    await hook.handler(makeCtx({ event: 'beforeInsert', input: pricelessProduct, api: h.api }));
    expect(pricelessProduct.list_price).toBeUndefined();
  });
});

// ──────────────────────────────────────────────────────────── account ──

describe('account_protection', () => {
  const hook = hookNamed(accountHooks, 'account_protection');

  it.each(['example.com', 'ftp://example.com', 'www.example.com'])(
    'rejects the malformed website %s', async (website) => {
      await expect(
        hook.handler(makeCtx({ event: 'beforeInsert', input: { website }, user: USER })),
      ).rejects.toThrow(/must start with http/);
    },
  );

  it.each(['http://example.com', 'https://example.com', 'HTTPS://EXAMPLE.COM'])(
    'accepts the valid website %s', async (website) => {
      await expect(
        hook.handler(makeCtx({ event: 'beforeInsert', input: { website }, user: USER })),
      ).resolves.toBeUndefined();
    },
  );

  it('rejects negative annual_revenue but allows zero', async () => {
    await expect(
      hook.handler(makeCtx({ event: 'beforeInsert', input: { annual_revenue: -1 }, user: USER })),
    ).rejects.toThrow(/greater than or equal to 0/);
    await expect(
      hook.handler(makeCtx({ event: 'beforeInsert', input: { annual_revenue: 0 }, user: USER })),
    ).resolves.toBeUndefined();
  });

  it('stamps last_activity_date when a USER changes owner or type', async () => {
    for (const input of [{ owner_id: 'rep2' }, { type: 'customer' }] as Rec[]) {
      await hook.handler(makeCtx({
        event: 'beforeUpdate', input, previous: { owner_id: 'rep1', type: 'prospect' }, user: USER,
      }));
      expect(input.last_activity_date).toBe(today());
    }
  });

  it('does NOT stamp last_activity_date on a system write', async () => {
    // demo_bootstrap claims ownerless seeded accounts as a system write every
    // 10 minutes; stamping those flattened every seeded activity date to today
    // and emptied the churn report buckets.
    const input: Rec = { owner_id: 'rep2' };
    await hook.handler(makeCtx({
      event: 'beforeUpdate', input, previous: { owner_id: null }, user: SYSTEM,
    }));
    expect(input.last_activity_date).toBeUndefined();
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
   */
  const refuseDelete = (openStages: string[]) => {
    const h = makeHarness({
      crm_opportunity: [
        ...openStages.map((stage, i) => ({ id: `o${i + 1}`, crm_account: 'acc1', stage })),
        { id: 'closed', crm_account: 'acc1', stage: 'closed_won' },  // closed — ignored
        { id: 'elsewhere', crm_account: 'other', stage: 'proposal' }, // other account
      ],
    });
    return hook.handler(makeCtx({
      event: 'beforeDelete',
      previous: { id: 'acc1', type: 'customer' },
      user: USER,
      api: h.api,
    }));
  };

  it('refuses to delete a customer account with ONE open opportunity (singular agreement)', async () => {
    await expect(refuseDelete(['proposal'])).rejects.toThrow(
      'Cannot delete customer account: 1 open opportunity still references it. Close or reassign it first.',
    );
  });

  it('refuses to delete a customer account with SEVERAL open opportunities (plural agreement)', async () => {
    await expect(refuseDelete(['proposal', 'negotiation'])).rejects.toThrow(
      'Cannot delete customer account: 2 open opportunities still reference it. Close or reassign them first.',
    );
  });

  it('never mixes the two branches — no plural verb on 1, no singular verb on 2', async () => {
    // The defect was a stitched sentence, so guard the halves that were wrong
    // rather than only the halves that were right.
    const one = await refuseDelete(['proposal']).catch((e: Error) => e.message);
    expect(one).not.toMatch(/opportunity still reference /);   // plural verb on a singular noun
    expect(one).not.toMatch(/reassign them/);                  // plural pronoun on one record

    const two = await refuseDelete(['proposal', 'negotiation']).catch((e: Error) => e.message);
    expect(two).not.toMatch(/opportunities still references/); // singular verb on a plural noun
    expect(two).not.toMatch(/reassign it first/);              // singular pronoun on two records
  });

  it('allows deleting a customer account whose opportunities are all closed', async () => {
    const h = makeHarness({
      crm_opportunity: [
        { id: 'o1', crm_account: 'acc1', stage: 'closed_won' },
        { id: 'o2', crm_account: 'acc1', stage: 'closed_lost' },
      ],
    });
    await expect(
      hook.handler(makeCtx({
        event: 'beforeDelete', previous: { id: 'acc1', type: 'customer' }, user: USER, api: h.api,
      })),
    ).resolves.toBeUndefined();
  });

  it('only protects customer accounts, not prospects', async () => {
    const h = makeHarness({
      crm_opportunity: [{ id: 'o1', crm_account: 'acc1', stage: 'proposal' }],
    });
    await expect(
      hook.handler(makeCtx({
        event: 'beforeDelete', previous: { id: 'acc1', type: 'prospect' }, user: USER, api: h.api,
      })),
    ).resolves.toBeUndefined();
  });

  // ─── billing_country projection (#621) ───────────────────────────────
  //
  // The territory sharing rules filter on `billing_country`, and this hook is
  // its only writer. If the projection stops running, both rules still SEED
  // (the column exists) but match nothing — the same silent territory outage
  // #621 was filed for, one layer down. So the behaviour is pinned per shape.

  it.each([
    ['a country code',            { country: 'US' },                    'US'],
    ['lower case',                { country: 'de' },                    'DE'],
    ['surrounding whitespace',    { country: '  fr  ' },                'FR'],
    ['a full address',            { street: '1 Main', city: 'Austin', country: 'US' }, 'US'],
  ] as [string, Rec, string][])(
    'projects %s onto billing_country on insert', async (_label, billing_address, expected) => {
      const input: Rec = { name: 'Acme', billing_address };
      await hook.handler(makeCtx({ event: 'beforeInsert', input, user: USER }));
      expect(input.billing_country).toBe(expected);
    },
  );

  it.each([
    ['a null address',        null],
    ['an address with no country', { city: 'Austin' }],
    ['a blank country',       { country: '   ' }],
    ['a non-string country',  { country: 42 }],
    ['a non-object value',    'Austin, TX'],
  ] as [string, unknown][])(
    'projects %s onto null rather than throwing', async (_label, billing_address) => {
      // A `before*` hook that throws rejects the whole write, so every shape an
      // address column can hold must map to a value instead.
      const input: Rec = { name: 'Acme', billing_address };
      await expect(
        hook.handler(makeCtx({ event: 'beforeInsert', input, user: USER })),
      ).resolves.toBeUndefined();
      expect(input.billing_country).toBeNull();
    },
  );

  it('leaves billing_country alone when the write does not carry the address', async () => {
    // The regression that would silently empty both territories: recomputing
    // unconditionally would blank the column on every unrelated edit.
    const input: Rec = { phone: '+1-512-555-0100' };
    await hook.handler(makeCtx({
      event: 'beforeUpdate',
      input,
      previous: { billing_address: { country: 'US' }, billing_country: 'US' },
      user: USER,
    }));
    expect('billing_country' in input).toBe(false);
  });

  it('clears billing_country when the address itself is cleared', async () => {
    const input: Rec = { billing_address: null };
    await hook.handler(makeCtx({
      event: 'beforeUpdate',
      input,
      previous: { billing_address: { country: 'US' }, billing_country: 'US' },
      user: USER,
    }));
    expect(input.billing_country).toBeNull();
  });

  it('projects on a SYSTEM write too — seeds and imports must land in a territory', async () => {
    // Unlike `last_activity_date`, this projection is not user-gated: a seeded
    // or imported account with a billing country belongs to its territory
    // however it was written.
    const input: Rec = { name: 'Globex', billing_address: { country: 'DE' } };
    await hook.handler(makeCtx({ event: 'beforeInsert', input, user: SYSTEM }));
    expect(input.billing_country).toBe('DE');
  });
});

// ──────────────────────────────────────────────────────────── contact ──

describe('contact_integrity', () => {
  const hook = hookNamed(contactHooks, 'contact_integrity');

  it('lowercases the email before storing it', async () => {
    const h = makeHarness({ crm_contact: [] });
    const input: Rec = { email: 'Ada@Example.COM' };
    await hook.handler(makeCtx({ event: 'beforeInsert', input, user: USER, api: h.api }));
    expect(input.email).toBe('ada@example.com');
  });

  it('rejects a duplicate email GLOBALLY, not just within one account', async () => {
    // A per-account lookup let a cross-account duplicate sail past the friendly
    // check and explode on the DB's global unique index mid-conversion.
    const h = makeHarness({
      crm_contact: [{ id: 'c1', email: 'ada@example.com', crm_account: 'accA' }],
    });
    await expect(
      hook.handler(makeCtx({
        event: 'beforeInsert',
        input: { email: 'ADA@example.com', crm_account: 'accB' },
        user: USER,
        api: h.api,
      })),
    ).rejects.toThrow(/already exists/);
  });

  it('does not flag a contact as its own duplicate on update', async () => {
    const h = makeHarness({ crm_contact: [{ id: 'c1', email: 'ada@example.com' }] });
    await expect(
      hook.handler(makeCtx({
        event: 'beforeUpdate',
        input: { email: 'ada@example.com' },
        previous: { id: 'c1', email: 'ada@example.com' },
        user: USER,
        api: h.api,
      })),
    ).resolves.toBeUndefined();
  });

  it('refuses to delete a contact referenced by open work', async () => {
    const h = makeHarness({
      crm_opportunity: [{ id: 'o1', primary_contact: 'c1', stage: 'proposal' }],
      crm_quote: [{ id: 'q1', crm_contact: 'c1', status: 'draft' }],
      crm_contract: [{ id: 'k1', crm_contact: 'c1', status: 'activated' }],
    });
    await expect(
      hook.handler(makeCtx({
        event: 'beforeDelete', previous: { id: 'c1' }, user: USER, api: h.api,
      })),
    ).rejects.toThrow(/still referenced by 1 open opportunity\(ies\), 1 active quote\(s\), 1 active contract\(s\)/);
  });

  /**
   * #693: this guard also runs as a CASCADE child of an account delete
   * (`crm_contact.crm_account` is master-detail / cascade), and the hook cannot
   * tell the two apart. "Cannot delete contact" therefore told an account
   * deleter they had asked to delete a contact. The refusal now names the
   * contact and both consequences, which is true in either context.
   */
  it('names the contact it refuses, and says the account delete is blocked too', async () => {
    const h = makeHarness({
      crm_opportunity: [{ id: 'o1', primary_contact: 'c1', stage: 'proposal' }],
    });
    const err = await hook
      .handler(makeCtx({
        event: 'beforeDelete',
        previous: { id: 'c1', first_name: 'Ada', last_name: 'Lovelace' },
        user: USER,
        api: h.api,
      }))
      .then(() => null, (e: Error) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err!.message).toContain('Contact Ada Lovelace (c1)');
    expect(err!.message).toContain('neither can its account');
    // The old wording claimed an operation the caller may not have performed.
    expect(err!.message).not.toContain('Cannot delete contact');
  });

  it('falls back to the bare id when the contact carries no name', async () => {
    const h = makeHarness({
      crm_contract: [{ id: 'k1', crm_contact: 'c1', status: 'activated' }],
    });
    await expect(
      hook.handler(makeCtx({
        event: 'beforeDelete', previous: { id: 'c1' }, user: USER, api: h.api,
      })),
    ).rejects.toThrow(/^Contact c1 is still referenced by/);
  });

  it('allows deleting a contact whose references are all settled', async () => {
    const h = makeHarness({
      crm_opportunity: [{ id: 'o1', primary_contact: 'c1', stage: 'closed_lost' }],
      crm_quote: [{ id: 'q1', crm_contact: 'c1', status: 'rejected' }],
      crm_contract: [{ id: 'k1', crm_contact: 'c1', status: 'expired' }],
    });
    await expect(
      hook.handler(makeCtx({
        event: 'beforeDelete', previous: { id: 'c1' }, user: USER, api: h.api,
      })),
    ).resolves.toBeUndefined();
  });
});

// ──────────────────────────────────────────────────────────── product ──

describe('product_catalog', () => {
  const hook = hookNamed(productHooks, 'product_catalog');

  it('rejects a list_price below cost, allows equal', async () => {
    await expect(
      hook.handler(makeCtx({ event: 'beforeInsert', input: { list_price: 5, cost: 10 } })),
    ).rejects.toThrow(/must be greater than or equal to Cost/);
    await expect(
      hook.handler(makeCtx({ event: 'beforeInsert', input: { list_price: 10, cost: 10 } })),
    ).resolves.toBeUndefined();
  });

  it('compares against the PREVIOUS cost when the update only changes price', async () => {
    await expect(
      hook.handler(makeCtx({
        event: 'beforeUpdate', input: { list_price: 5 }, previous: { cost: 10 },
      })),
    ).rejects.toThrow(/greater than or equal to Cost/);
  });

  it('normalizes sku to uppercase', async () => {
    const input: Rec = { sku: 'crm-pro-01' };
    await hook.handler(makeCtx({ event: 'beforeInsert', input }));
    expect(input.sku).toBe('CRM-PRO-01');
  });

  it('refuses to delete a product referenced by any line item, historical included', async () => {
    const h = makeHarness({
      crm_opportunity_line_item: [{ id: 'l1', crm_product: 'p1' }],
      crm_quote_line_item: [{ id: 'l2', crm_product: 'p1' }, { id: 'l3', crm_product: 'p1' }],
    });
    await expect(
      hook.handler(makeCtx({
        event: 'beforeDelete', previous: { id: 'p1' }, api: h.api,
      })),
    ).rejects.toThrow(/referenced by 1 opportunity\(ies\) and 2 quote\(s\)/);
  });

  it('allows deleting an unreferenced product', async () => {
    const h = makeHarness({ crm_opportunity_line_item: [], crm_quote_line_item: [] });
    await expect(
      hook.handler(makeCtx({ event: 'beforeDelete', previous: { id: 'p1' }, api: h.api })),
    ).resolves.toBeUndefined();
  });
});
