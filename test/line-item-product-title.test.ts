// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, vi } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { extractHookBody } from '@objectstack/cli/hook-body';
import stack, { hookNamed, type AnyRec } from './helpers/composed-stack';
import { REFUSAL_CODES } from '../src/sales/objects/_refusal';
import { hotcrmStack, signUpPerson, systemUpdate, runShippedHook, type Person } from './helpers/verify-stack';

/**
 * A line item is named after its product (#2086).
 *
 * The defect, measured on `main` 5224ed7 with 18.0.0-next.3: neither line
 * object declared a `nameField`, so the platform derived `description`. A line
 * added through the opportunity's Products picker writes no description. So
 * its rail entry was its raw id, and its record header read
 * `Opportunity Line Item <first 8 of the id>`.
 *
 * The fix is the stored mirror `skills/objectstack-data/SKILL.md` prescribes
 * for a related record's title ("mirror the value, always"). `product_title`
 * copies the product's `display_title`, and is `nameField` and search target
 * on both line objects. A formula could not do it on 18.0.0-next.3: it read
 * only this record's columns, and `record.crm_product.name` read null on every
 * row. Since 18.0.0-next.4 a formula reads one hop through a reference, but its
 * value is stored nowhere, so search cannot scan it (changeset
 * `24197-objectql-formula-one-hop`).
 *
 * Pinned here, on both objects: the declaration; the line-side writer (insert,
 * a product change, an untitled row's next update) on the in-process path and
 * on the SHIPPED lowered body; search by the product's name; and the rename
 * writer. On a closed deal or a settled quote, a rename and the backfill's
 * touch still re-stamp the title, and a rep's change to the line is still
 * refused (#2086 rulings 2 and A).
 */

const objects: AnyRec[] = (stack as AnyRec).objects ?? [];
const byName = (n: string) => objects.find((o) => o.name === n) as AnyRec;

const PAIRS = [
  { object: 'crm_opportunity_line_item', parentKey: 'crm_opportunity', hook: 'opportunity_line_item_product_title' },
  { object: 'crm_quote_line_item', parentKey: 'crm_quote', hook: 'quote_line_item_product_title' },
] as const;

describe('the declaration', () => {
  it.each(PAIRS)('$object is named by product_title, a stored, readonly text column it searches', ({ object }) => {
    const o = byName(object);
    expect(o.nameField).toBe('product_title');
    expect(o.fields.product_title).toMatchObject({ type: 'text', readonly: true, group: 'basic' });
    expect(o.searchableFields).toEqual(expect.arrayContaining(['product_title', 'description']));
  });

  it("crm_product's title is still display_title, the column both writers read by name (#2086 ruling 3)", () => {
    // Both writers read `fields: ['display_title']`. `ctx.title('crm_product')`
    // would follow this pointer, but the hook context under
    // `@objectstack/verify` has no `ctx.title` (objectstack-ai/objectstack#24289).
    // Until it does, this pin is the drift check: a new product title field
    // turns this red instead of leaving every line named by the old one.
    expect(byName('crm_product').nameField).toBe('display_title');
  });

  it.each(PAIRS)('$hook writes on insert and update, and ships body-only', ({ object, hook }) => {
    const h = hookNamed(hook);
    expect(h.object).toBe(object);
    expect(h.events).toEqual(['beforeInsert', 'beforeUpdate']);
    // After the line freezes (priority 90), so they judge the caller's own payload.
    expect(h.priority).toBeGreaterThan(90);
    expect(() => extractHookBody(h.handler, `hook '${hook}'`)).not.toThrow();
  });

  it('product_title_mirror follows a rename, elevated, and ships body-only', () => {
    const h = hookNamed('product_title_mirror');
    expect(h).toMatchObject({ object: 'crm_product', events: ['afterUpdate'], runAs: 'system', async: true, onError: 'log' });
    expect(() => extractHookBody(h.handler, "hook 'product_title_mirror'")).not.toThrow();
  });
});

type Rec = Record<string, any>;

let verify: VerifyStack;
let rep: Person;
let admin: string;
let k = 0;
beforeAll(async () => {
  verify = await hotcrmStack();
  admin = await verify.signIn();
  rep = await signUpPerson(verify, 'rep@line-item-product-title.test', {
    name: 'Title Rep', positions: ['sales_rep'], permissionSets: ['sales_rep'],
  });
}, 180_000);

const as = (p: Person | string) => ({ as: typeof p === 'string' ? p : p.token });
const stored = async (object: string, id: string): Promise<Rec> => (await verify.rows(object, { id }))[0]!;

/** A catalog product; its `display_title` is read back as the engine computes it. */
const newProduct = async (): Promise<Rec> => {
  const n = ++k;
  const [p] = await verify.seed('crm_product', [{ name: `Title Widget ${n}`, product_code: `TW-${n}`, is_active: true, list_price: 100 }]);
  return stored('crm_product', String(p!.id));
};

/** A rep's open deal and draft quote, the two parents a line can hang off. */
const parents = async (): Promise<Record<string, Rec>> => {
  const n = ++k;
  const [account] = await verify.seed('crm_account', [{ name: `Title Co ${n}`, owner_id: rep.id }]);
  const [contact] = await verify.seed('crm_contact', [{
    first_name: 'Tia', last_name: `Buyer ${n}`, email: `tia${n}@line-item-product-title.test`, crm_account: account!.id, owner_id: rep.id,
  }]);
  const [deal] = await verify.seed('crm_opportunity', [{
    name: `Title Deal ${n}`, amount: 1000, stage: 'negotiation', close_date: '2030-06-30', crm_account: account!.id, owner_id: rep.id,
  }]);
  const [quote] = await verify.seed('crm_quote', [{
    name: `Title Quote ${n}`, crm_account: account!.id, crm_contact: contact!.id, owner_id: rep.id,
    status: 'draft', quote_date: '2026-01-01', expiration_date: '2030-12-31', discount: 0, tax: 0, shipping_handling: 0,
  }]);
  return { crm_opportunity: deal!, crm_quote: quote! };
};

describe.each(PAIRS)('$object — the line-side writer', ({ object, parentKey, hook }) => {
  it("names a picker-added line by its product's title", async () => {
    const [product, parent] = [await newProduct(), (await parents())[parentKey]!];
    // Exactly the two keys the related list's Add picker writes.
    const line = await verify.hooks.run(object, 'insert', { [parentKey]: parent.id, crm_product: product.id }, as(rep));
    expect(product.display_title).toBe(`${product.product_code} - ${product.name}`);
    expect((await stored(object, line.id)).product_title).toBe(product.display_title);
  });

  it('follows a change of product', async () => {
    const [first, second, parent] = [await newProduct(), await newProduct(), (await parents())[parentKey]!];
    const line = await verify.hooks.run(object, 'insert', { [parentKey]: parent.id, crm_product: first.id, quantity: 1, unit_price: 100 }, as(rep));
    await verify.hooks.run(object, 'update', { id: line.id, crm_product: second.id }, as(rep));
    expect((await stored(object, line.id)).product_title).toBe(second.display_title);
  });

  it("titles a row that has none on that row's next update", async () => {
    const [product, parent] = [await newProduct(), (await parents())[parentKey]!];
    const line = await verify.hooks.run(object, 'insert', { [parentKey]: parent.id, crm_product: product.id, quantity: 1, unit_price: 100 }, as(rep));
    // A line older than the field: no title stored.
    await systemUpdate(verify, object, { id: line.id, product_title: null });
    expect((await stored(object, line.id)).product_title ?? null).toBeNull();
    await verify.hooks.run(object, 'update', { id: line.id, quantity: 2 }, as(rep));
    expect((await stored(object, line.id)).product_title).toBe(product.display_title);
  });

  it("keeps no title a user supplies — the field is readonly and the product's title wins", async () => {
    const [product, parent] = [await newProduct(), (await parents())[parentKey]!];
    const line = await verify.hooks.run(object, 'insert', {
      [parentKey]: parent.id, crm_product: product.id, quantity: 1, unit_price: 100, product_title: 'Hand-typed name',
    }, as(rep));
    expect((await stored(object, line.id)).product_title).toBe(product.display_title);
  });

  it('is found by searching for its product name', async () => {
    const [product, parent] = [await newProduct(), (await parents())[parentKey]!];
    const line = await verify.hooks.run(object, 'insert', { [parentKey]: parent.id, crm_product: product.id }, as(rep));
    const res = await verify.apiAs(admin, 'GET', `/data/${object}?$search=${encodeURIComponent(product.name)}`);
    expect(res.status).toBe(200);
    const ids = ((await res.json()) as Rec).records.map((r: Rec) => r.id);
    expect(ids).toContain(line.id);
  });

  it('stamps the same title on the SHIPPED path — the lowered body, in QuickJS', async () => {
    const [product, parent] = [await newProduct(), (await parents())[parentKey]!];
    const input = await runShippedHook(verify, hookNamed(hook), {
      event: 'beforeInsert', input: { [parentKey]: parent.id, crm_product: product.id }, as: rep.token,
    });
    expect(input.product_title).toBe(product.display_title);
  });

  it("follows the product's rename (product_title_mirror) on an open parent", async () => {
    const [product, parent] = [await newProduct(), (await parents())[parentKey]!];
    const line = await verify.hooks.run(object, 'insert', { [parentKey]: parent.id, crm_product: product.id }, as(rep));
    await verify.hooks.run('crm_product', 'update', { id: product.id, name: `${product.name} Plus` }, as(admin));
    const renamed = await stored('crm_product', product.id);
    expect(renamed.display_title).toBe(`${product.display_title} Plus`);
    // `product_title_mirror` is `async: true`, so its write is waited for.
    await vi.waitFor(async () => expect((await stored(object, line.id)).product_title).toBe(renamed.display_title), { timeout: 10_000, interval: 50 });
  });
});

describe('frozen parents: the title follows, every other change is refused (#2086 rulings 2 and A)', () => {
  const sentence = /so its line items can no longer be added, changed or removed/;
  const refusalOf = (p: Promise<unknown>): Promise<Rec | null> => p.then(() => null, (e: Rec) => e);
  const FROZEN = [
    { object: 'crm_opportunity_line_item', parentKey: 'crm_opportunity', settle: { stage: 'closed_won', win_reason: 'better_price' } },
    { object: 'crm_quote_line_item', parentKey: 'crm_quote', settle: { status: 'accepted' } },
  ] as const;

  /** A rep's line, written while the parent was open; the system then settles the parent. */
  const frozenLine = async (object: string, parentKey: string, settle: Rec): Promise<{ line: Rec; product: Rec }> => {
    const [product, parent] = [await newProduct(), (await parents())[parentKey]!];
    const line = await verify.hooks.run(object, 'insert', { [parentKey]: parent.id, crm_product: product.id }, as(rep));
    await systemUpdate(verify, parentKey, { id: parent.id, ...settle });
    return { line, product };
  };
  const titleOf = async (object: string, id: string) => (await stored(object, id)).product_title ?? null;

  it.each(FROZEN)("$object: a rename re-stamps a settled parent's line", async ({ object, parentKey, settle }) => {
    const { line, product } = await frozenLine(object, parentKey, settle);
    await verify.hooks.run('crm_product', 'update', { id: product.id, name: `${product.name} Plus` }, as(admin));
    const renamed = (await stored('crm_product', product.id)).display_title;
    expect(renamed).toBe(`${product.display_title} Plus`);
    await vi.waitFor(async () => expect(await titleOf(object, line.id)).toBe(renamed), { timeout: 10_000, interval: 50 });
  });

  it.each(FROZEN)("$object: the backfill's touch names a settled parent's untitled line", async ({ object, parentKey, settle }) => {
    const { line, product } = await frozenLine(object, parentKey, settle);
    // A line older than the field: no title stored.
    await systemUpdate(verify, object, { id: line.id, product_title: null });
    expect(await titleOf(object, line.id)).toBeNull();
    // `scripts/backfill-line-product-title.ts`'s own write: an admin re-sends the product's unchanged name.
    await verify.hooks.run('crm_product', 'update', { id: product.id, name: product.name }, as(admin));
    await vi.waitFor(async () => expect(await titleOf(object, line.id)).toBe(product.display_title), { timeout: 10_000, interval: 50 });
  });

  it.each(FROZEN)("$object: a rep's change to a settled parent's line is refused, and a typed title is ignored", async ({ object, parentKey, settle }) => {
    const { line, product } = await frozenLine(object, parentKey, settle);
    const err = await refusalOf(verify.hooks.run(object, 'update', { id: line.id, quantity: 9 }, as(rep)));
    expect(err, "a rep's change went through").toBeTruthy();
    expect([err!.code, err!.status]).toEqual([REFUSAL_CODES.locked.code, REFUSAL_CODES.locked.status]);
    expect(String(err!.message)).toMatch(sentence);
    expect((await stored(object, line.id)).quantity).toBe(1);
    // A rep's own title never lands, on a frozen line or any other: the engine
    // holds a readonly value the caller supplies back from the before-hooks,
    // so the write changes nothing and has nothing to refuse.
    await verify.hooks.run(object, 'update', { id: line.id, product_title: 'Renamed by hand' }, as(rep));
    expect(await titleOf(object, line.id)).toBe(product.display_title);
  });
});

describe('a product with many lines is finished pass after pass (#2168)', () => {
  it.each(PAIRS)('$object: one touch titles all 12 untitled lines of a product', async ({ object, parentKey }) => {
    const [product, parent] = [await newProduct(), (await parents())[parentKey]!];
    const ids: string[] = [];
    for (let i = 0; i < 12; i++) {
      ids.push(String((await verify.hooks.run(object, 'insert', { [parentKey]: parent.id, crm_product: product.id }, as(rep))).id));
    }
    // Lines older than the field: no title stored.
    for (const id of ids) await systemUpdate(verify, object, { id, product_title: null });
    // One unchanged-name write. The mirror writes five, re-sends the name, and the
    // next passes finish the rest through the engine's own `afterUpdate` dispatch.
    await verify.hooks.run('crm_product', 'update', { id: product.id, name: product.name }, as(admin));
    await vi.waitFor(async () => {
      const titled = (await Promise.all(ids.map((id) => stored(object, id)))).filter((r) => r.product_title === product.display_title);
      expect(titled).toHaveLength(12);
    }, { timeout: 30_000, interval: 100 });
  }, 45_000);

  it('the SHIPPED mirror body runs in QuickJS and titles the lines of its pass', async () => {
    const [product, parent] = [await newProduct(), (await parents()).crm_opportunity!];
    const line = await verify.hooks.run('crm_opportunity_line_item', 'insert', { crm_opportunity: parent.id, crm_product: product.id }, as(rep));
    await systemUpdate(verify, 'crm_opportunity_line_item', { id: line.id, product_title: null });
    await runShippedHook(verify, hookNamed('product_title_mirror'), {
      event: 'afterUpdate', input: { id: product.id, name: product.name }, previous: product, as: admin,
    });
    expect((await stored('crm_opportunity_line_item', line.id)).product_title).toBe(product.display_title);
  }, 30_000);
});

describe('a hosted environment titles its old lines on the first read (#2168)', () => {
  it.each(PAIRS)('$object: an API read of untitled lines starts their re-stamp', async ({ object, parentKey }) => {
    const [product, parent] = [await newProduct(), (await parents())[parentKey]!];
    const ids: string[] = [];
    for (let i = 0; i < 3; i++) {
      ids.push(String((await verify.hooks.run(object, 'insert', { [parentKey]: parent.id, crm_product: product.id }, as(rep))).id));
    }
    for (const id of ids) await systemUpdate(verify, object, { id, product_title: null });
    // The shape a record page or a list reads: the product reference and the name field.
    const res = await verify.apiAs(admin, 'POST', `/data/${object}/query`, {
      fields: ['id', 'crm_product', 'product_title'], where: { [parentKey]: parent.id }, top: 50,
    });
    expect(res.status).toBe(200);
    await vi.waitFor(async () => {
      const titled = (await Promise.all(ids.map((id) => stored(object, id)))).filter((r) => r.product_title === product.display_title);
      expect(titled).toHaveLength(3);
    }, { timeout: 20_000, interval: 100 });
  }, 30_000);

  it('a read that projects no product reference starts nothing', async () => {
    const [product, parent] = [await newProduct(), (await parents()).crm_opportunity!];
    const line = await verify.hooks.run('crm_opportunity_line_item', 'insert', { crm_opportunity: parent.id, crm_product: product.id }, as(rep));
    await systemUpdate(verify, 'crm_opportunity_line_item', { id: line.id, product_title: null });
    const res = await verify.apiAs(admin, 'POST', '/data/crm_opportunity_line_item/query', {
      fields: ['id', 'product_title'], where: { crm_opportunity: parent.id }, top: 50,
    });
    expect(res.status).toBe(200);
    await new Promise((r) => setTimeout(r, 1500));
    expect((await stored('crm_opportunity_line_item', line.id)).product_title ?? null).toBeNull();
  }, 30_000);

  it('the SHIPPED read trigger runs in QuickJS and starts the re-stamp', async () => {
    const [product, parent] = [await newProduct(), (await parents()).crm_opportunity!];
    const line = await verify.hooks.run('crm_opportunity_line_item', 'insert', { crm_opportunity: parent.id, crm_product: product.id }, as(rep));
    await systemUpdate(verify, 'crm_opportunity_line_item', { id: line.id, product_title: null });
    await runShippedHook(verify, hookNamed('line_item_product_title_backfill'), {
      event: 'afterFind', object: 'crm_opportunity_line_item', as: admin,
      result: [{ id: line.id, crm_product: product.id, product_title: null }] as unknown as Rec,
    });
    await vi.waitFor(async () => expect((await stored('crm_opportunity_line_item', line.id)).product_title).toBe(product.display_title), { timeout: 20_000, interval: 100 });
  }, 30_000);
});

describe('a product with no code is titled by its name, and so are its lines (#2168)', () => {
  /** A product older than the `product_code` autonumber: the column holds nothing. */
  const codelessProduct = async (): Promise<Rec> => {
    const product = await newProduct();
    await systemUpdate(verify, 'crm_product', { id: product.id, product_code: null });
    return stored('crm_product', product.id);
  };

  it("its display_title is its name, not nothing", async () => {
    const product = await codelessProduct();
    expect(product.product_code ?? null).toBeNull();
    expect(product.display_title).toBe(product.name);
  });

  it.each(PAIRS)('$object: a line of it is named by the product name, and an old untitled one is named on its first read', async ({ object, parentKey }) => {
    const [product, parent] = [await codelessProduct(), (await parents())[parentKey]!];
    const line = await verify.hooks.run(object, 'insert', { [parentKey]: parent.id, crm_product: product.id }, as(rep));
    expect((await stored(object, line.id)).product_title).toBe(product.name);
    await systemUpdate(verify, object, { id: line.id, product_title: null });
    const res = await verify.apiAs(admin, 'POST', `/data/${object}/query`, {
      fields: ['id', 'crm_product', 'product_title'], where: { [parentKey]: parent.id }, top: 50,
    });
    expect(res.status).toBe(200);
    await vi.waitFor(async () => expect((await stored(object, line.id)).product_title).toBe(product.name), { timeout: 20_000, interval: 100 });
  }, 30_000);
});
