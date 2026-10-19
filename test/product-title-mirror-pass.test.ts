// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { hookNamed, type AnyRec } from './helpers/composed-stack';

/**
 * `product_title_mirror` does a bounded share of a product's lines per
 * invocation, and hands the rest on (#2168).
 *
 * Measured on staging after the 5.0.0 → 5.1.0 upgrade: the hosted sandbox
 * ends a hook body at a 30 s wall-clock ceiling, and the mirror, writing one
 * line at a time, stopped after about ten. A product with 21 lines kept 12 of
 * them untitled, and `onError: 'log'` swallowed the stop. Local engines have
 * no such ceiling, so the bound is pinned here on the handler itself, against
 * an in-memory store: one pass writes at most five lines, re-sends the
 * product's own name to start the next pass, and stops (with one logged
 * error) when a pass cannot show progress in the data.
 */

type Line = { id: string; crm_product: string; product_title: string | null };

const TITLE = 'PRD-0005 - AI Agent Seat (Annual)';

function store(opts: { opportunityLines: number; quoteLines?: number; refuse?: Set<string>; writesStick?: boolean }) {
  const rows: Record<string, Line[]> = {
    crm_opportunity_line_item: Array.from({ length: opts.opportunityLines }, (_, i) => ({ id: `ol${i}`, crm_product: 'p1', product_title: null })),
    crm_quote_line_item: Array.from({ length: opts.quoteLines ?? 0 }, (_, i) => ({ id: `ql${i}`, crm_product: 'p1', product_title: null })),
  };
  const calls = { lineWrites: 0, productTouches: 0 };
  let onTouch: (() => Promise<void>) | undefined;
  const api = {
    object: (name: string) => ({
      findOne: async () => ({ id: 'p1', name: 'AI Agent Seat (Annual)', display_title: TITLE }),
      find: async (q: AnyRec) => (rows[name] ?? []).filter((r) => r.crm_product === q.where.crm_product).map((r) => ({ ...r })),
      count: async () => 0,
      insert: async () => ({}),
      delete: async () => ({}),
      update: async (doc: AnyRec) => {
        if (name === 'crm_product') {
          calls.productTouches++;
          await onTouch?.();
          return {};
        }
        if (opts.refuse?.has(doc.id)) throw new Error(`line ${doc.id} refuses every write`);
        calls.lineWrites++;
        if (opts.writesStick !== false) rows[name]!.find((r) => r.id === doc.id)!.product_title = doc.product_title;
        return {};
      },
    }),
  };
  const titled = () => Object.values(rows).flat().filter((r) => r.product_title === TITLE).length;
  return { api, calls, titled, chain: (fn: () => Promise<void>) => { onTouch = fn; } };
}

const mirror = hookNamed('product_title_mirror');
const pass = (api: unknown) => mirror.handler({ event: 'afterUpdate', input: { id: 'p1', name: 'AI Agent Seat (Annual)' }, previous: { id: 'p1' }, api });

describe('product_title_mirror: one pass, a bounded share of the lines (#2168)', () => {
  it('writes at most five lines, then re-sends the product name to hand the rest on', async () => {
    const s = store({ opportunityLines: 12 });
    await pass(s.api);
    expect(s.calls.lineWrites).toBe(5);
    expect(s.titled()).toBe(5);
    expect(s.calls.productTouches).toBe(1);
  });

  it('the chain converges: 21 lines over both objects are all titled, in five passes', async () => {
    const s = store({ opportunityLines: 13, quoteLines: 8 });
    // The re-sent name fires `afterUpdate` again: a fresh invocation, a fresh budget.
    s.chain(() => pass(s.api));
    await pass(s.api);
    expect(s.titled()).toBe(21);
    expect(s.calls.lineWrites).toBe(21);
    expect(s.calls.productTouches).toBe(4);
  });

  it('a product with nothing stale writes nothing and hands nothing on', async () => {
    const s = store({ opportunityLines: 3 });
    s.chain(() => pass(s.api));
    await pass(s.api);
    const before = s.calls.lineWrites;
    await pass(s.api);
    expect(s.calls.lineWrites).toBe(before);
    expect(s.calls.productTouches).toBe(0);
  });

  it('a pass whose writes do not stick stops with one error instead of looping', async () => {
    const s = store({ opportunityLines: 12, writesStick: false });
    s.chain(() => pass(s.api));
    await expect(pass(s.api)).rejects.toThrow(/12 line\(s\) of .* still hold a stale product_title and this pass made no progress/);
    expect(s.calls.productTouches).toBe(0);
  });

  it('a refused line does not stop the others, and the pass names it', async () => {
    const s = store({ opportunityLines: 3, refuse: new Set(['ol1']) });
    await expect(pass(s.api)).rejects.toThrow(/1 line\(s\) of .* kept a stale product_title; the first refusal: crm_opportunity_line_item: line ol1 refuses every write/);
    expect(s.titled()).toBe(2);
    expect(s.calls.productTouches).toBe(0);
  });
});

describe('line_item_product_title_backfill: an untitled line, read, starts its product\'s re-stamp (#2168)', () => {
  const backfill = hookNamed('line_item_product_title_backfill');
  const touches = () => {
    const touched: string[] = [];
    const api = {
      object: (name: string) => ({
        findOne: async (q: AnyRec) => ({ id: q.where.id, name: `Product ${q.where.id}` }),
        find: async () => [],
        count: async () => 0,
        insert: async () => ({}),
        delete: async () => ({}),
        update: async (doc: AnyRec) => {
          if (name !== 'crm_product') throw new Error(`unexpected write to ${name}`);
          expect(doc.name).toBe(`Product ${doc.id}`);
          touched.push(doc.id);
          return {};
        },
      }),
    };
    return { api, touched };
  };
  const read = (api: unknown, result: unknown) => backfill.handler({ event: 'afterFind', object: 'crm_opportunity_line_item', result, api });

  it('re-sends the name of each product behind an untitled row, once per product', async () => {
    const t = touches();
    await read(t.api, [
      { id: 'l1', crm_product: 'p1', product_title: null },
      { id: 'l2', crm_product: 'p1', product_title: '' },
      { id: 'l3', crm_product: 'p2', product_title: null },
      { id: 'l4', crm_product: 'p3', product_title: 'PRD-3 - Titled' },
    ]);
    expect(t.touched).toEqual(['p1', 'p2']);
  });

  it('ignores a row whose projection left out product_title or crm_product — the shape of the app\'s own reads', async () => {
    const t = touches();
    await read(t.api, [
      { id: 'l1', product_title: null },
      { id: 'l2', crm_product: 'p1' },
      { quantity: 2, unit_price: 10, discount: 0 },
    ]);
    expect(t.touched).toEqual([]);
  });

  it('touches at most five products per read', async () => {
    const t = touches();
    await read(t.api, Array.from({ length: 8 }, (_, i) => ({ id: `l${i}`, crm_product: `p${i}`, product_title: null })));
    expect(t.touched).toEqual(['p0', 'p1', 'p2', 'p3', 'p4']);
  });

  it('reads a single-row result and an expanded product reference', async () => {
    const t = touches();
    await read(t.api, { id: 'l1', crm_product: { id: 'p9', name: 'Expanded' }, product_title: null });
    expect(t.touched).toEqual(['p9']);
  });
});
