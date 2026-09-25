// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ObjectQL, bindHooksToEngine } from '@objectstack/objectql';
import { InMemoryDriver } from '@objectstack/driver-memory';
import stack from '../objectstack.config';
import { extractSandboxBody, makeSandboxEngine, runHookBody } from './helpers/action-sandbox';

/**
 * `line_number` HAS A WRITER (#1828 — ruling: batch #163 item 2, letter 1).
 *
 * Both line-item objects declare `line_number: Field.number({ readonly: true })`
 * and, until this card, nothing wrote it: since objectql 17.4.0 a static
 * readonly column is stripped from a NON-SYSTEM caller's INSERT, so every line a
 * rep created carried a null ordinal — while `LINE_ITEM_FIELDS`
 * (`src/sales/flows/_billing-endpoint.ts`) ships the key to the billing system
 * on every won deal. The seed fixture's `1..n` per parent
 * (`test/seed-consistency.test.ts`) was the only evidence of an ordinal, and it
 * pinned the FIXTURE. This file is the same pin on the runtime.
 *
 * Measured on a real `ObjectQL` over the SHIPPED field definitions and the
 * SHIPPED hooks, because the one fact everything rests on is an engine rule, not
 * a hook rule: a payload key a `beforeInsert` / `beforeUpdate` hook WROTE is
 * exempt from the readonly strip (`hookWrittenKeys` in `stripReadonlyFields`),
 * while the same key supplied by a user is dropped. The control at the bottom
 * shows the strip is live on this exact schema — without it "the hook's stamp
 * survived" would prove nothing.
 */

type AnyRec = Record<string, any>;

const objects: AnyRec[] = (stack as AnyRec).objects ?? [];
const hooks: AnyRec[] = (stack as AnyRec).hooks ?? [];
const byName = (n: string) => objects.find((o) => o.name === n) as AnyRec;

/** The two line-item objects mirror each other; every case runs on both. */
const PAIRS = [
  { object: 'crm_opportunity_line_item', parentKey: 'crm_opportunity', hook: 'opportunity_line_item_line_number' },
  { object: 'crm_quote_line_item', parentKey: 'crm_quote', hook: 'quote_line_item_line_number' },
] as const;

/** A rep: a real user id, and NOT system — the context the readonly strip bites on. */
const rep = { userId: 'rep_1' };
/** The seed loader's shape: system, no user. */
const seed = { isSystem: true };

let ql: AnyRec;

/**
 * Boot on the shipped schemas. Only the numbering hooks are bound: the price
 * fill and the async rollups are other hooks' behaviour, and a line here carries
 * its own price so none of them is needed to make the insert legal.
 */
async function boot(withNumbering: boolean) {
  ql = (await ObjectQL.create({
    datasources: { default: new InMemoryDriver({ persistence: false }) },
    objects: {
      crm_opportunity_line_item: byName('crm_opportunity_line_item'),
      crm_quote_line_item: byName('crm_quote_line_item'),
    } as never,
  })) as never;
  if (withNumbering) {
    bindHooksToEngine(
      ql as never,
      hooks.filter((h) => PAIRS.some((p) => p.hook === h.name)) as never,
    );
  }
}

afterEach(async () => {
  await ql?.close();
});

const line = (parentKey: string, parentId: string, extra: AnyRec = {}): AnyRec => ({
  [parentKey]: parentId, crm_product: 'prod_1', quantity: 1, unit_price: 100, ...extra,
});

const ordinals = async (object: string, parentKey: string, parentId: string): Promise<number[]> => {
  const rows: AnyRec[] = await ql.find(object, { where: { [parentKey]: parentId }, context: seed });
  return rows.map((r) => r.line_number ?? null).sort((a, b) => a - b);
};

describe.each(PAIRS)('$object — the assigner', ({ object, parentKey, hook }) => {
  beforeEach(() => boot(true));

  it('is shipped: registered, elevated, and bound to insert and update', () => {
    const h = hooks.find((x) => x.name === hook) as AnyRec;
    expect(h?.object).toBe(object);
    expect(h?.events).toEqual(['beforeInsert', 'beforeUpdate']);
    expect(h?.runAs).toBe('system');
    // The ruling keeps the column platform-assigned.
    expect(byName(object).fields.line_number.readonly).toBe(true);
  });

  it('numbers a rep\'s inserts 1..n under each parent, independently per parent', async () => {
    for (let i = 0; i < 3; i++) await ql.insert(object, line(parentKey, 'p1'), { context: rep });
    await ql.insert(object, line(parentKey, 'p2'), { context: rep });
    expect(await ordinals(object, parentKey, 'p1')).toEqual([1, 2, 3]);
    expect(await ordinals(object, parentKey, 'p2')).toEqual([1]);
  });

  it('ignores an ordinal the rep supplies — it is platform-assigned', async () => {
    await ql.insert(object, line(parentKey, 'p1'), { context: rep });
    const row = await ql.insert(object, line(parentKey, 'p1', { line_number: 99 }), { context: rep });
    const stored = await ql.findOne(object, { where: { id: row.id }, context: seed });
    expect(stored.line_number).toBe(2);
  });

  it('continues from the highest ordinal, so a deleted line never hands its number out twice', async () => {
    const rows = [];
    for (let i = 0; i < 3; i++) rows.push(await ql.insert(object, line(parentKey, 'p1'), { context: rep }));
    await ql.delete(object, { where: { id: rows[1].id }, context: seed });
    await ql.insert(object, line(parentKey, 'p1'), { context: rep });
    expect(await ordinals(object, parentKey, 'p1')).toEqual([1, 3, 4]);
  });

  it('numbers a batch insert distinctly — every row\'s beforeInsert runs before any row is stored', async () => {
    await ql.insert(object, [line(parentKey, 'p1'), line(parentKey, 'p1'), line(parentKey, 'p1')], { context: rep });
    expect(await ordinals(object, parentKey, 'p1')).toEqual([1, 2, 3]);
  });

  it('keeps the ordinal a no-user system insert supplies (the seed fixture)', async () => {
    await ql.insert(object, line(parentKey, 'p1', { line_number: 7 }), { context: seed });
    expect(await ordinals(object, parentKey, 'p1')).toEqual([7]);
  });

  it('never renumbers an existing ordinal on update, whatever the payload says', async () => {
    const row = await ql.insert(object, line(parentKey, 'p1'), { context: rep });
    await ql.update(object, { id: row.id, line_number: 42, quantity: 2 }, { where: { id: row.id }, context: rep });
    const stored = await ql.findOne(object, { where: { id: row.id }, context: seed });
    expect(stored.line_number).toBe(1);
    expect(stored.quantity).toBe(2);
  });
});

describe.each(PAIRS)('$object — rows that predate the assigner (the back-fill path)', ({ object, parentKey }) => {
  it('a touch in creation order numbers each null row after the parent\'s highest ordinal', async () => {
    // Rows created before this card: no hook, a rep's insert → null ordinal.
    await boot(false);
    const legacy = [];
    for (let i = 0; i < 3; i++) legacy.push(await ql.insert(object, line(parentKey, 'p1'), { context: rep }));
    const other = await ql.insert(object, line(parentKey, 'p2'), { context: rep });
    expect(await ordinals(object, parentKey, 'p1')).toEqual([null, null, null]);

    // Same store, the hook now bound — what `scripts/backfill-line-number.ts`
    // does over REST: one single-row update per null row, parent by parent, in
    // creation order, as a non-system caller.
    bindHooksToEngine(ql as never, hooks.filter((h) => h.object === object && /_line_number$/.test(h.name)) as never);
    for (const r of [...legacy, other]) {
      await ql.update(object, { id: r.id, line_number: null }, { where: { id: r.id }, context: rep });
    }
    const p1: AnyRec[] = await ql.find(object, { where: { [parentKey]: 'p1' }, context: seed });
    expect(legacy.map((r) => p1.find((x) => x.id === r.id)?.line_number)).toEqual([1, 2, 3]);
    expect(await ordinals(object, parentKey, 'p2')).toEqual([1]);

    // Idempotent: a second pass finds every row numbered and changes nothing.
    for (const r of legacy) {
      await ql.update(object, { id: r.id, line_number: null }, { where: { id: r.id }, context: rep });
    }
    expect(await ordinals(object, parentKey, 'p1')).toEqual([1, 2, 3]);
  });
});

describe.each(PAIRS)('$object — CONTROL: the readonly strip is live on this schema', ({ object, parentKey }) => {
  it('without the assigner a rep\'s supplied ordinal is dropped and the row stores none', async () => {
    // The pre-#1828 state, and the reason the assigner has to be a hook: had
    // this landed 99, "the hook's stamp survived" above would measure nothing.
    await boot(false);
    const row = await ql.insert(object, line(parentKey, 'p1', { line_number: 99 }), { context: rep });
    const stored = await ql.findOne(object, { where: { id: row.id }, context: seed });
    expect(stored.line_number ?? null).toBeNull();
  });
});

describe.each(PAIRS)('$object — the assigner ships body-only', ({ object, parentKey, hook }) => {
  const shipped = () => hooks.find((x) => x.name === hook) as AnyRec;

  it('lowers with no free identifiers — the parent key is read from ctx.object', () => {
    expect(() => extractSandboxBody(shipped().handler, `hook '${hook}'`)).not.toThrow();
  });

  it('stamps max + 1 in the VM', async () => {
    const engine = makeSandboxEngine({
      [object]: [{ id: 'a', [parentKey]: 'p1', line_number: 1 }, { id: 'b', [parentKey]: 'p1', line_number: 4 }],
    });
    const { input } = await runHookBody(shipped(), {
      event: 'beforeInsert', input: { [parentKey]: 'p1' }, user: { id: 'rep_1' } as never, engine,
    });
    expect(input.line_number).toBe(5);
  });
});
