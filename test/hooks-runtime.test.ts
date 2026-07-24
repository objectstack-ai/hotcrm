// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import oppLineItemHooks from '../src/objects/opportunity_line_item.hook';
import quoteLineItemHooks from '../src/objects/quote_line_item.hook';
import leadHooks from '../src/objects/lead.hook';

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

/** A tiny ctx.api backed by in-memory arrays, matching the HookApi surface. */
function makeApi(store: Record<string, Rec[]>) {
  const calls: Array<{ op: string; object: string; args: any }> = [];
  const match = (row: Rec, where: Rec = {}) =>
    Object.entries(where).every(([k, v]) => row[k] === v);
  const api = {
    calls,
    object(name: string) {
      const rows = store[name] ?? (store[name] = []);
      return {
        async find(q: { filter?: Rec; where?: Rec } = {}) {
          return rows.filter((r) => match(r, q.filter ?? q.where ?? {}));
        },
        async findOne(q: { filter?: Rec; where?: Rec } = {}) {
          return rows.find((r) => match(r, q.filter ?? q.where ?? {})) ?? null;
        },
        async count(q: { filter?: Rec; where?: Rec } = {}) {
          return rows.filter((r) => match(r, q.filter ?? q.where ?? {})).length;
        },
        async update(id: string, doc: Rec) {
          calls.push({ op: 'update', object: name, args: { id, doc } });
          const row = rows.find((r) => r.id === id);
          if (row) Object.assign(row, doc);
          return row;
        },
        async insert(doc: Rec) {
          calls.push({ op: 'insert', object: name, args: doc });
          rows.push(doc);
          return doc;
        },
      };
    },
  };
  return api;
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
        { id: 'x1', owner: 'repA', is_converted: false },
        { id: 'x2', owner: 'repA', is_converted: false }, // repA has 2 open
        { id: 'x3', owner: 'repB', is_converted: false }, // repB has 1 open
      ],
    };
    const input: Rec = { company: 'NewCo' }; // no owner
    await assign.handler({ event: 'beforeInsert', input, api: makeApi(store) } as any);
    expect(input.owner).toBe('repB'); // least-loaded
  });

  it('is a no-op when there is no rep pool (never blocks intake)', async () => {
    const store: Record<string, Rec[]> = { sys_user_position: [], crm_lead: [] };
    const input: Rec = { company: 'NewCo' };
    await assign.handler({ event: 'beforeInsert', input, api: makeApi(store) } as any);
    expect(input.owner).toBeUndefined();
  });

  it('respects an explicit owner', async () => {
    const store: Record<string, Rec[]> = {
      sys_user_position: [{ position: 'sales_rep', user_id: 'repA' }],
    };
    const input: Rec = { company: 'NewCo', owner: 'someone' };
    await assign.handler({ event: 'beforeInsert', input, api: makeApi(store) } as any);
    expect(input.owner).toBe('someone');
  });
});
