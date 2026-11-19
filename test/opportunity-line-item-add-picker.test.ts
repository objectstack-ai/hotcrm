// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ObjectQL, bindHooksToEngine } from '@objectstack/objectql';
import { SqliteWasmDriver } from '@objectstack/driver-sqlite-wasm';
import stack, { type AnyRec, walk } from './helpers/composed-stack';
import { products } from '../src/revenue/data/catalog.seed';
import { registerStackPicklists } from './helpers/stack-picklists';

/**
 * The organization every write here carries: since 18.1.0 the driver creates
 * the tenant column `NOT NULL`, so a write that names none is refused at the
 * database (objectstack#24940).
 */
const ORG = 'org_1';

const objects: AnyRec[] = (stack as AnyRec).objects ?? [];
const pages: AnyRec[] = (stack as AnyRec).pages ?? [];

/**
 * An opportunity offers a route to add a line item (#1731; the route moved to
 * the deal's line table in #2382, see the block below).
 *
 * ### What was wrong
 *
 * `crm_opportunity_line_item` was declared live on every surface but one.
 * Three profiles granted `allowCreate`; `content/docs/(product)/sales/opportunities.mdx`
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
 * `storage.notNull` (`quantity` is also `required`; `unit_price` stopped being
 * `required` in #2060 item 7, because the hook below is its producer). A
 * picker that produced a row the engine
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
 * refused by the `unit_price` NOT NULL column. Without it, a future change that
 * silently dropped that column constraint would leave this suite green while
 * the picker started writing priceless lines into the billing hand-off.
 */

const byName = (n: string) => objects.find((o) => o.name === n) as AnyRec;
const LINE_ITEM = byName('crm_opportunity_line_item');
const PRODUCT = byName('crm_product');

const oppDetailPage = pages.find((p) => p.name === 'opportunity_detail_page') as AnyRec;

// ─────────────────────────────────────────────── the declared route ──

/**
 * Since #2382 the route is the deal's line TABLE, not an authored picker.
 *
 * The authored deal page and its Products card (`add.picker` over active
 * products, `linkField: 'crm_product'`) retired to the synthesized default
 * page. The default page draws the deal's lines as a body table because the
 * line's `crm_opportunity` link says `relatedList: 'primary'`, and its New
 * opens the line form pre-linked to the deal, where the product is chosen in
 * the `crm_product` lookup. That lookup's `lookupFilters` is what keeps a
 * retired product off a new line (measured on 18.6.0: without it the form's
 * picker offered a product whose Active was off). The insert the form makes
 * carries the same two keys the picker made, plus the defaults it shows, so
 * the engine block below still measures the row it produces.
 */
describe('the deal\'s line table adds a line through the product lookup', () => {
  it('authors no line list on the page: the body table is derived', () => {
    expect(oppDetailPage?.kind).toBe('slotted');
    expect([...walk(oppDetailPage)].filter((n) => n.type === 'record:related_list')).toEqual([]);
  });

  it('draws the lines as a body table, with the columns the retired Products card named', () => {
    const link = LINE_ITEM.fields.crm_opportunity;
    expect(link.type).toBe('master_detail');
    expect(link.reference).toBe('crm_opportunity');
    expect(link.relatedList).toBe('primary');
    expect(link.relatedListColumns).toEqual(['crm_product', 'quantity', 'unit_price', 'total_price']);
  });

  it('links and labels the product through fields that exist', () => {
    // The product lands on the line's OWN product lookup. The RESOLVED field
    // spells its target `reference` — `reference_to` is the authoring-side
    // word AGENTS.md uses, and reading it here would assert `undefined`
    // against `undefined` forever.
    expect(LINE_ITEM.fields.crm_product.type).toBe('lookup');
    expect(LINE_ITEM.fields.crm_product.reference).toBe('crm_product');
    // The picker labels each product by its title field, and its search
    // reaches the code too through explicit `searchableFields`; the code shows
    // under each row because it leads `highlightFields`.
    expect(PRODUCT.nameField).toBe('name');
    expect(PRODUCT.searchableFields).toEqual(expect.arrayContaining(['name', 'product_code']));
    expect(PRODUCT.highlightFields?.[0]).toBe('product_code');
  });

  it('offers active products only, and that narrowing does not empty the catalog', () => {
    const [rule, ...rest] = LINE_ITEM.fields.crm_product.lookupFilters as AnyRec[];
    expect(rest).toHaveLength(0);
    // The structured, picker-honoured shape — `{ field, operator, value }` with
    // `operator` from the lookup filter's closed vocabulary (`eq`, not the
    // related list's `equals`).
    expect(rule).toEqual({ field: 'is_active', operator: 'eq', value: true });
    expect(PRODUCT.fields.is_active).toBeDefined();
    // A filter that hid the whole catalog would be a picker that opens empty.
    const seeded = (products as AnyRec).records as AnyRec[];
    expect(seeded.length).toBeGreaterThan(0);
    expect(seeded.filter((p) => p.is_active !== false)).toHaveLength(seeded.length);
  });

  it('keeps the product catalog priced, which is what makes the price fill total', () => {
    // `_line-item-price-fill.ts` can only default `unit_price` when the chosen
    // product HAS a `list_price`. It always does: the field is required and
    // NOT NULL, so a product with no price cannot be created at all.
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
      datasources: { default: new SqliteWasmDriver({ filename: ':memory:' }) },
      objects: {
        crm_opportunity_line_item: LINE_ITEM,
        crm_opportunity: byName('crm_opportunity'),
        crm_account: byName('crm_account'),
        crm_product: PRODUCT,
      } as never,
    })) as never;
    registerStackPicklists(ql);
    await ql.syncSchemas();
    if (withHooks) {
      const hooks: AnyRec[] = (stack as never as AnyRec).hooks ?? [];
      bindHooksToEngine(
        ql as never,
        hooks.filter((h) => h.object === 'crm_opportunity_line_item') as never,
      );
    }
    const api = ql.createContext({ isSystem: true, tenantId: ORG });
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
    // The negative control. `unit_price` is a NOT NULL column and the picker
    // authors no price, so the ONLY reason the assertions above can pass is the
    // `beforeInsert` hook. Unbind it and the insert must fail — otherwise those
    // assertions would keep passing on a day the hook stopped running.
    //
    // The refusal is the COLUMN's: since #2060 item 7 the field is not
    // `required`, so no engine check runs first. Since @objectstack 18.2.0
    // (objectstack#26026) the column's NOT NULL refusal reaches every door as
    // the record validator's ValidationError naming the field, not the
    // driver's SQLite text, so it is asserted by envelope and field.
    const { api, product, opportunity } = await boot(false);

    await expect(
      api.object('crm_opportunity_line_item').insert({
        crm_opportunity: opportunity.id,
        crm_product: product.id,
      }),
    ).rejects.toMatchObject({
      code: 'VALIDATION_FAILED',
      fields: expect.arrayContaining([expect.objectContaining({ field: 'unit_price' })]),
    });
    expect(await api.object('crm_opportunity_line_item').find({ where: { crm_opportunity: opportunity.id } })).toHaveLength(0);
  });
});
