// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import oppLineItemHooks from '../src/objects/opportunity_line_item.hook';
import quoteLineItemHooks from '../src/objects/quote_line_item.hook';
import leadHooks from '../src/objects/lead.hook';
import opportunityHooks from '../src/objects/opportunity.hook';
import { makeHarness } from './helpers/hook-harness';

/**
 * Runtime hook tests — the REAL handler code, executed against a controllable
 * in-memory data layer.
 *
 * The metadata-contract tests (actions-flows-integrity) prove a hook is WIRED;
 * these prove it BEHAVES: the sum arithmetic, the skip-when-empty / skip-closed
 * guards, the least-loaded assignment pick, and the product price default all
 * run here with real inputs and asserted outputs. This is the layer `os build`
 * / `validate` can't reach, and it can't be flaky (no kernel, no server, no
 * timing) — it just invokes `hook.handler(ctx)` with a fake `ctx`.
 */

type Rec = Record<string, any>;

/**
 * A `ctx.api` over in-memory arrays.
 *
 * This used to be a SECOND, hand-rolled stand-in living in this file — one that
 * accepted `filter` as a synonym for `where` and `update(id, doc)` as a synonym
 * for the engine's `update(doc, options)`. Both spellings are rejected by the
 * kernel, so every assertion below was being made against an API that does not
 * exist: `opportunity_amount_rollup` was green here while throwing on every
 * invocation in production (#616).
 *
 * There is now exactly one stand-in — `test/helpers/hook-harness.ts` — and it
 * refuses what the kernel refuses. A fake that is more permissive than the real
 * thing cannot prove anything about the real thing.
 */
function makeApi(store: Record<string, Rec[]>) {
  const h = makeHarness(store);
  return { ...h.api, calls: h.calls };
}

const hookByName = (hooks: any, name: string) => {
  const list = Array.isArray(hooks) ? hooks : [hooks];
  const h = list.find((x) => x.name === name);
  if (!h) throw new Error(`hook ${name} not found`);
  return h;
};

describe('opportunity_amount_rollup', () => {
  const rollup = hookByName(oppLineItemHooks, 'opportunity_amount_rollup');

  it('sets amount to the sum of line extended prices (qty × price × (1−disc%))', async () => {
    const store: Record<string, Rec[]> = {
      crm_opportunity: [{ id: 'opp1', stage: 'qualification', amount: 500000 }],
      crm_opportunity_line_item: [
        { id: 'li1', crm_opportunity: 'opp1', quantity: 2, unit_price: 1000, discount: 0 },
        { id: 'li2', crm_opportunity: 'opp1', quantity: 1, unit_price: 500, discount: 10 }, // 450
      ],
    };
    const api = makeApi(store);
    await rollup.handler({ event: 'afterInsert', input: { crm_opportunity: 'opp1' }, api } as any);
    expect(store.crm_opportunity[0].amount).toBe(2450); // 2000 + 450
    expect(api.calls.some((c) => c.op === 'update' && c.object === 'crm_opportunity')).toBe(true);
  });

  it('leaves amount untouched when there are no line items (never zeros a manual deal)', async () => {
    const store: Record<string, Rec[]> = {
      crm_opportunity: [{ id: 'opp1', stage: 'qualification', amount: 500000 }],
      crm_opportunity_line_item: [],
    };
    const api = makeApi(store);
    await rollup.handler({ event: 'afterDelete', input: {}, previous: { crm_opportunity: 'opp1' }, api } as any);
    expect(store.crm_opportunity[0].amount).toBe(500000);
    expect(api.calls.length).toBe(0);
  });

  it('skips closed deals (a settled amount is never rewritten by a line edit)', async () => {
    const store: Record<string, Rec[]> = {
      crm_opportunity: [{ id: 'opp1', stage: 'closed_won', amount: 999 }],
      crm_opportunity_line_item: [{ id: 'li1', crm_opportunity: 'opp1', quantity: 5, unit_price: 100, discount: 0 }],
    };
    const api = makeApi(store);
    await rollup.handler({ event: 'afterUpdate', input: { crm_opportunity: 'opp1' }, api } as any);
    expect(store.crm_opportunity[0].amount).toBe(999); // unchanged
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
  const lifecycle = hookByName(opportunityHooks, 'opportunity_lifecycle');
  const today = () => new Date().toISOString().slice(0, 10);

  it('starts the clock on insert', async () => {
    const input: Rec = { name: 'New Deal', stage: 'prospecting', amount: 1000 };
    await lifecycle.handler({ event: 'beforeInsert', input } as any);
    expect(input.stage_entry_date).toBe(today());
  });

  it('does not overwrite a stage_entry_date the caller supplied', async () => {
    const input: Rec = { name: 'Backfilled', stage: 'proposal', amount: 1000, stage_entry_date: '2020-01-01' };
    await lifecycle.handler({ event: 'beforeInsert', input } as any);
    expect(input.stage_entry_date).toBe('2020-01-01');
  });

  it('restarts the clock when the stage changes', async () => {
    const input: Rec = { stage: 'negotiation' };
    const previous: Rec = { stage: 'proposal', stage_entry_date: '2020-01-01' };
    await lifecycle.handler({ event: 'beforeUpdate', input, previous } as any);
    expect(input.stage_entry_date).toBe(today());
  });

  it('leaves the clock alone when the stage does not change', async () => {
    const input: Rec = { amount: 250000 };
    const previous: Rec = { stage: 'proposal', stage_entry_date: '2020-01-01' };
    await lifecycle.handler({ event: 'beforeUpdate', input, previous } as any);
    expect(input.stage_entry_date).toBeUndefined();
  });

  it('never writes days_in_stage — it is a formula, not a stored counter', async () => {
    const insert: Rec = { name: 'D', stage: 'prospecting', amount: 1 };
    await lifecycle.handler({ event: 'beforeInsert', input: insert } as any);
    const update: Rec = { stage: 'closed_won' };
    await lifecycle.handler({
      event: 'beforeUpdate',
      input: update,
      previous: { stage: 'negotiation', stage_entry_date: '2020-01-01' },
    } as any);
    expect('days_in_stage' in insert).toBe(false);
    expect('days_in_stage' in update).toBe(false);
  });
});

describe('quote_total_rollup', () => {
  const rollup = hookByName(quoteLineItemHooks, 'quote_total_rollup');

  it('recomputes subtotal, quote-level discount_amount, and total (+tax +shipping)', async () => {
    const store: Record<string, Rec[]> = {
      crm_quote: [{ id: 'q1', status: 'draft', discount: 10, tax: 50, shipping_handling: 25 }],
      crm_quote_line_item: [
        { id: 'l1', crm_quote: 'q1', quantity: 4, unit_price: 100, discount: 0 }, // 400
        { id: 'l2', crm_quote: 'q1', quantity: 2, unit_price: 300, discount: 50 }, // 300
      ],
    };
    const api = makeApi(store);
    await rollup.handler({ event: 'afterInsert', input: { crm_quote: 'q1' }, api } as any);
    const q = store.crm_quote[0];
    expect(q.subtotal).toBe(700);           // 400 + 300
    expect(q.discount_amount).toBe(70);     // 700 × 10%
    expect(q.total_price).toBe(705);        // 700 − 70 + 50 + 25
  });

  it('skips accepted quotes', async () => {
    const store: Record<string, Rec[]> = {
      crm_quote: [{ id: 'q1', status: 'accepted', discount: 0, tax: 0, shipping_handling: 0, total_price: 111 }],
      crm_quote_line_item: [{ id: 'l1', crm_quote: 'q1', quantity: 9, unit_price: 100, discount: 0 }],
    };
    const api = makeApi(store);
    await rollup.handler({ event: 'afterUpdate', input: { crm_quote: 'q1' }, api } as any);
    expect(store.crm_quote[0].total_price).toBe(111);
  });
});

describe('line-item price fill', () => {
  const fill = hookByName(oppLineItemHooks, 'opportunity_line_item_price_fill');

  it('defaults list_price + unit_price from the product on insert', async () => {
    const store: Record<string, Rec[]> = { crm_product: [{ id: 'p1', list_price: 250 }] };
    const input: Rec = { crm_product: 'p1' }; // no unit_price entered
    await fill.handler({ event: 'beforeInsert', input, api: makeApi(store) } as any);
    expect(input.list_price).toBe(250);
    expect(input.unit_price).toBe(250);
  });

  it('never clobbers a negotiated unit_price on update (only re-syncs list_price)', async () => {
    const store: Record<string, Rec[]> = { crm_product: [{ id: 'p1', list_price: 250 }] };
    const input: Rec = { crm_product: 'p1', unit_price: 199 };
    await fill.handler({ event: 'beforeUpdate', input, api: makeApi(store) } as any);
    expect(input.list_price).toBe(250);
    expect(input.unit_price).toBe(199); // preserved
  });
});

describe('lead_auto_assign', () => {
  const assign = hookByName(leadHooks, 'lead_auto_assign');

  it('assigns an ownerless lead to the rep with the fewest open leads', async () => {
    const store: Record<string, Rec[]> = {
      sys_user_position: [
        { position: 'sales_rep', user_id: 'repA' },
        { position: 'sales_rep', user_id: 'repB' },
      ],
      crm_lead: [
        { id: 'x1', owner_id: 'repA', is_converted: false },
        { id: 'x2', owner_id: 'repA', is_converted: false }, // repA has 2 open
        { id: 'x3', owner_id: 'repB', is_converted: false }, // repB has 1 open
      ],
    };
    const input: Rec = { company: 'NewCo' }; // no owner
    await assign.handler({ event: 'beforeInsert', input, api: makeApi(store) } as any);
    expect(input.owner_id).toBe('repB'); // least-loaded
  });

  it('is a no-op when there is no rep pool (never blocks intake)', async () => {
    const store: Record<string, Rec[]> = { sys_user_position: [], crm_lead: [] };
    const input: Rec = { company: 'NewCo' };
    await assign.handler({ event: 'beforeInsert', input, api: makeApi(store) } as any);
    expect(input.owner_id).toBeUndefined();
  });

  it('respects an explicit owner', async () => {
    const store: Record<string, Rec[]> = {
      sys_user_position: [{ position: 'sales_rep', user_id: 'repA' }],
    };
    const input: Rec = { company: 'NewCo', owner_id: 'someone' };
    await assign.handler({ event: 'beforeInsert', input, api: makeApi(store) } as any);
    expect(input.owner_id).toBe('someone');
  });

  it('never throws when the rep-pool lookup is denied (anonymous Web-to-Lead)', async () => {
    // The public-form grant denies `find` on sys_user_position. The hook must
    // swallow that and leave the lead ownerless — NOT reject the insert.
    const api: any = {
      object() {
        return {
          async find() { throw new Error("Access denied: not 'find' on 'sys_user_position'"); },
          async count() { return 0; },
        };
      },
    };
    const input: Rec = { company: 'FromWebForm' };
    await expect(
      assign.handler({ event: 'beforeInsert', input, api } as any),
    ).resolves.toBeUndefined();
    expect(input.owner_id).toBeUndefined(); // ownerless, but the insert proceeds
  });
});
