// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ObjectQL, bindHooksToEngine } from '@objectstack/objectql';
import { InMemoryDriver } from '@objectstack/driver-memory';
import stack from '../objectstack.config';
import { products } from '../src/data/catalog.seed';
import { type AnyRec, objects, pages, walk } from './helpers/metadata-fixtures';

/**
 * The opportunity Products panel offers a route to add a line item (#1731).
 *
 * ### What was wrong
 *
 * `crm_opportunity_line_item` was declared live on every surface but one.
 * Three profiles granted `allowCreate`; `content/docs/sales/opportunities.mdx`
 * described the deal amount rolling up from line items;
 * `billing-handoff.flow.ts`'s `load_line_items` READ them on every won deal.
 * Nothing in the app could create one — no action, no list view, no navigation
 * entry, no seed, no flow write. So the read path returned the empty set for
 * every deal in the product, and a rep who wanted to itemise a deal could only
 * type the Amount by hand.
 *
 * That is the shape ADR-0049 enforce-or-remove exists to eliminate: a declared
 * capability that is either reachable or retired. The maintainer ruled reachable
 * (decision batch #79, 2026-09-08), by the route the spec already offers —
 * `RecordRelatedListProps.add`, zero platform change.
 *
 * ### Why a picker ALONE is sufficient — the measurement this file exists for
 *
 * The ruling made this conditional, and the condition is not obvious from the
 * page. `add` creates a link row carrying EXACTLY two authored keys:
 *
 *     { [relationshipField]: <opportunityId>, [linkField]: <pickedProductId> }
 *
 * On this object that leaves `quantity` and `unit_price` unset, and both are
 * `required` + `storage.notNull`. A picker that produced a row the engine
 * refuses — or worse, a row with no quantity and no price, which prices the
 * deal at nothing — would mean "A needs more than a picker". It does not, and
 * the reason is machinery that predates this list:
 *
 *   `quantity`    the field's own `defaultValue: 1`
 *   `unit_price`  `_line-item-price-fill.ts` (`beforeInsert`) stamps
 *                 `list_price` from the chosen product and defaults the
 *                 negotiated `unit_price` to it
 *   `discount`    the field's own `defaultValue: 0`
 *   `total_price` the formula over the three above
 *
 * Every one of those is a load-bearing assumption about code this card did not
 * write, which is why the end-to-end block below measures the real insert on a
 * real engine rather than asserting the page's shape and calling it done. The
 * ABLATION is the other half: unbind the price-fill hook and the same insert is
 * rejected as "Sales Price is required". Without it, a future change that
 * silently made `unit_price` optional would leave this suite green while the
 * picker started writing priceless lines into the billing hand-off.
 */

const byName = (n: string) => objects.find((o) => o.name === n) as AnyRec;
const LINE_ITEM = byName('crm_opportunity_line_item');
const PRODUCT = byName('crm_product');

const oppDetailPage = pages.find((p) => p.name === 'opportunity_detail_page') as AnyRec;
const relatedLists = [...walk(oppDetailPage)].filter((n) => n.type === 'record:related_list');
const oppProducts = relatedLists.find((n) => n.id === 'opp_products') as AnyRec;

// ─────────────────────────────────────────────── the authored route ──

describe('the Products related list authors an add picker', () => {
  it('is still the panel this suite thinks it is', () => {
    // A rename that unhooked the assertions below from the real list would
    // otherwise leave them passing against `undefined`.
    expect(oppProducts).toBeDefined();
    expect(oppProducts.properties.objectName).toBe('crm_opportunity_line_item');
    expect(oppProducts.properties.relationshipField).toBe('crm_opportunity');
  });

  it('offers Add, sourced from the product catalog and linked through crm_product', () => {
    const add = oppProducts.properties.add;
    expect(add).toBeDefined();
    expect(add.picker.object).toBe('crm_product');
    // The junction case: the picked id lands on the child's OWN product lookup.
    // Omitting `linkField` would mean a 1:m re-parent instead — it would set the
    // picked PRODUCT's `crm_opportunity`, a field `crm_product` does not have.
    expect(add.linkField).toBe('crm_product');
  });

  it('links and labels through fields that exist, with the spec defaults left alone', () => {
    const add = oppProducts.properties.add;
    // `linkField` must be a real field on the CHILD, and the one that points at
    // the picked object. The RESOLVED field spells its target `reference` —
    // `reference_to` is the authoring-side word AGENTS.md uses, and reading it
    // here would assert `undefined` against `undefined` forever.
    expect(LINE_ITEM.fields[add.linkField].type).toBe('lookup');
    expect(LINE_ITEM.fields[add.linkField].reference).toBe('crm_product');
    // `valueField` defaults to `id`, which is what a lookup stores, and
    // `labelField` defaults to the picked object's title field. Both are
    // deliberately unauthored, so the picker keeps ONE source of truth for a
    // product's display title — pinned here because restating either as a
    // literal is the tempting "clarification" that would fork it.
    expect(add.picker.valueField).toBeUndefined();
    expect(add.picker.labelField).toBeUndefined();
    expect(PRODUCT.nameField).toBe('display_title');
    // That title is a FORMULA, so the picker's own search reaches it only
    // through explicit `searchableFields`. The product object already declares
    // them; dropping them would make the picker search return zero.
    expect(PRODUCT.searchableFields).toContain('name');
  });

  it('offers active products only, and that narrowing does not empty the catalog', () => {
    const [rule, ...rest] = oppProducts.properties.add.picker.filter as AnyRec[];
    expect(rest).toHaveLength(0);
    // The structured, schema-honoured rule shape — `{ field, operator, value }`
    // with `operator` from the closed vocabulary. The AST array form and `op:`
    // are rejected by `objectstack build` and render the list unfiltered.
    expect(rule).toEqual({ field: 'is_active', operator: 'equals', value: true });
    expect(PRODUCT.fields.is_active).toBeDefined();
    // A filter that hid the whole catalog would be a button that opens an empty
    // dialog — the same unreachability this card closed, one level in.
    const seeded = (products as AnyRec).records as AnyRec[];
    expect(seeded.length).toBeGreaterThan(0);
    expect(seeded.filter((p) => p.is_active !== false)).toHaveLength(seeded.length);
  });

  it('keeps the product catalog priced, which is what makes the price fill total', () => {
    // `_line-item-price-fill.ts` can only default `unit_price` when the chosen
    // product HAS a `list_price`. It always does: the field is required and
    // NOT NULL, so a product with no price cannot be created at all. Relax this
    // and the picker gains a path that produces an insert the engine refuses.
    expect(PRODUCT.fields.list_price.required).toBe(true);
    expect(PRODUCT.fields.list_price.storage?.notNull).toBe(true);
  });
});

// ──────────────────────────────────────────── on the real engine ──

/**
 * End-to-end, because no metadata assertion can show what the engine and the
 * hooks together make of a two-key insert. The insert below is written to be
 * EXACTLY what `add` writes — if a field appears in it that the picker does not
 * author, the measurement stops being about the picker.
 */
describe('the row a picker-shaped insert actually produces', () => {
  let ql: AnyRec;

  const boot = async (withHooks: boolean) => {
    ql = (await ObjectQL.create({
      datasources: { default: new InMemoryDriver({ persistence: false }) },
      objects: {
        crm_opportunity_line_item: LINE_ITEM,
        crm_opportunity: byName('crm_opportunity'),
        crm_account: byName('crm_account'),
        crm_product: PRODUCT,
      } as never,
    })) as never;
    if (withHooks) {
      const hooks: AnyRec[] = (stack as never as AnyRec).hooks ?? [];
      bindHooksToEngine(
        ql as never,
        hooks.filter((h) => h.object === 'crm_opportunity_line_item') as never,
      );
    }
    const api = ql.createContext({ isSystem: true });
    const account = await api.object('crm_account').insert({
      name: 'Northwind', type: 'customer', industry: 'technology',
    });
    const product = await api.object('crm_product').insert({
      name: 'Platform Subscription', sku: 'OS-PLAT-ENT', list_price: 250,
    });
    const opportunity = await api.object('crm_opportunity').insert({
      name: 'Northwind — Platform Rollout', crm_account: account.id,
      amount: 1000, stage: 'prospecting', close_date: '2026-12-31',
    });
    return { api, product, opportunity };
  };

  afterEach(async () => {
    await ql?.close();
  });

  it('is a complete, priced line item — quantity, price and total all present', async () => {
    const { api, product, opportunity } = await boot(true);

    const row = await api.object('crm_opportunity_line_item').insert({
      crm_opportunity: opportunity.id,
      crm_product: product.id,
    });

    // Read back rather than trusting the insert's return value: the question is
    // what a later reader — `load_line_items`, the rollup, the list itself —
    // finds on the row, not what the write echoed.
    const stored = await api.object('crm_opportunity_line_item').findOne({
      where: { id: row.id },
    });
    expect(stored).toMatchObject({
      crm_opportunity: opportunity.id,
      crm_product: product.id,
      quantity: 1,        // field defaultValue
      list_price: 250,    // price-fill, from the product
      unit_price: 250,    // price-fill, defaulted to list on insert
      discount: 0,        // field defaultValue
      total_price: 250,   // 1 × 250 × (1 − 0/100)
    });
  });

  it('lands where the billing hand-off reads — the consumer that had no producer', async () => {
    const { api, product, opportunity } = await boot(true);
    await api.object('crm_opportunity_line_item').insert({
      crm_opportunity: opportunity.id,
      crm_product: product.id,
    });

    // `billing-handoff.flow.ts`'s `load_line_items` filters on exactly this.
    const forDeal = await api.object('crm_opportunity_line_item').find({
      where: { crm_opportunity: opportunity.id },
    });
    expect(forDeal).toHaveLength(1);
    expect(forDeal[0].total_price).toBe(250);
  });

  it('ABLATION: without the price-fill hook the same insert is refused', async () => {
    // The negative control. `unit_price` is `required` + NOT NULL and the picker
    // authors no price, so the ONLY reason the assertions above can pass is the
    // `beforeInsert` hook. Unbind it and the insert must fail — otherwise those
    // assertions would keep passing on a day the hook stopped running.
    const { api, product, opportunity } = await boot(false);

    await expect(
      api.object('crm_opportunity_line_item').insert({
        crm_opportunity: opportunity.id,
        crm_product: product.id,
      }),
    ).rejects.toThrow(/Sales Price is required/);
  });
});
