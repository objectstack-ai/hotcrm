// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ObjectQL } from '@objectstack/objectql';
import { InMemoryDriver } from '@objectstack/driver-memory';
import stack from '../objectstack.config';

/**
 * Deleting an itemised opportunity or quote must work (#727).
 *
 * ### The bug this file exists to keep dead
 *
 * Both line-item objects hang off their parent through a REQUIRED lookup that
 * declared no `deleteBehavior`. Declaring nothing is not "no opinion": the spec
 * resolves the field to its default `set_null` (measured on 17.0.0-rc.3 — the
 * resolved field literally reads `"deleteBehavior":"set_null"` with nothing in
 * source), and `cascadeDeleteRelations` escalates a `set_null` default on a
 * required lookup to `restrict`, because a NOT NULL column cannot be cleared.
 *
 * So every opportunity or quote that had been itemised — which is the normal
 * state of a deal once a rep configures products on it — refused to delete:
 *
 *     DELETE /api/v1/data/crm_opportunity/<id>
 *     → 409 DELETE_RESTRICTED "Cannot delete crm_opportunity (<id>): 1 dependent
 *       crm_opportunity_line_item record(s) reference it via crm_opportunity
 *       (crm_opportunity is required, so it cannot be cleared). Delete or
 *       reassign them first, or set deleteBehavior:'cascade' on
 *       crm_opportunity_line_item.crm_opportunity."
 *
 * `crm_quote` -> `crm_quote_line_item` was the same sentence with the nouns
 * swapped. Two things are wrong with that: the caller has to tear the deal down
 * by hand line by line before the parent will go, and the refusal hands an API
 * consumer an internal authoring instruction about a metadata key they cannot
 * reach.
 *
 * ### The fix, and why cascade rather than a nicer refusal
 *
 * `deleteBehavior: 'cascade'` on the two parent lookups. A line item is
 * subordinate by construction and both objects already say so: their own
 * headers state a line "has no meaning apart from its deal", and the rollup
 * hooks derive `crm_opportunity.amount` and the quote's subtotal/total FROM the
 * line set — the parent's headline number is a function of the children, not
 * the other way round. A surviving line whose parent is gone denotes nothing and
 * would keep a deleted deal's revenue alive in every line-level report.
 *
 * ### Why this is NOT the campaign/event answer
 *
 * #696 and #711 deliberately left `crm_campaign_member.crm_campaign` and
 * `crm_event_attendee.crm_event` on the restricting default: a campaign's member
 * list and a meeting's attendee list are those records' historical evidence, so
 * they are refused loudly rather than shredded. A price line carries no such
 * standalone value. The distinction is pinned in both directions — here, and by
 * the two sibling `*-cascade.test.ts` files — so a copy-paste in either
 * direction fails.
 */

type AnyRec = Record<string, any>;

const objects: AnyRec[] = (stack as any).objects ?? [];
const byName = (n: string) => objects.find((o) => o.name === n) as AnyRec;

const OPP_LINE_ITEM = byName('crm_opportunity_line_item');
const QUOTE_LINE_ITEM = byName('crm_quote_line_item');

// ───────────────────────────────────────────────── the declaration ──

describe('the line-item objects declare cascade on their parent lookup', () => {
  /**
   * A structural pin, deliberately kept next to the end-to-end run below: the
   * hazard is a MISSING key, and a missing key is invisible in review because
   * the spec quietly fills in `set_null`. Asserting the RESOLVED value catches
   * both a deletion of the declaration and a future spec default flip.
   */
  it.each([
    ['crm_opportunity_line_item', () => OPP_LINE_ITEM, 'crm_opportunity'],
    ['crm_quote_line_item', () => QUOTE_LINE_ITEM, 'crm_quote'],
  ])('%s.%s cascades from its parent', (_object, schema, field) => {
    const f = schema().fields[field as string];
    // `master_detail`, not `lookup`, since the 17.3.0 upgrade. Both objects
    // declare `sharingModel: 'controlled_by_parent'`, and 17.3.0's new
    // `security-controlled-by-parent-ambiguous-relation` author-time rule
    // refuses an object whose master is decided by FIELD DECLARATION ORDER —
    // which is what two REQUIRED lookups (the parent and `crm_product`) were.
    // The parent was promoted into the required-master_detail tier so the
    // master is authored rather than positional; `crm_product` stays a
    // required lookup and is no longer a candidate. The cascade contract
    // asserted below is unchanged.
    expect(f.type).toBe('master_detail');
    expect(f.required).toBe(true);
    expect(f.deleteBehavior).toBe('cascade');
  });

  /**
   * The scope boundary, and the reason this fix is two fields and not "every
   * lookup on a line item". `crm_product` stays on the default, which the same
   * escalation turns into `restrict`: retiring a catalog product must never
   * shred the priced history of the deals that sold it. `product.hook.ts` says
   * the same thing in its own `beforeDelete` ("Set is_active=false to retire
   * instead"), and the engine-level answer below proves the restrict survives
   * independently of that hook.
   */
  it.each([
    ['crm_opportunity_line_item', () => OPP_LINE_ITEM],
    ['crm_quote_line_item', () => QUOTE_LINE_ITEM],
  ])('%s leaves the product lookup on the restricting default', (_object, schema) => {
    const f = schema().fields.crm_product;
    expect(f.required).toBe(true);
    expect(f.deleteBehavior).toBe('set_null');
  });
});

// ─────────────────────────────────────────── on the real engine ──

/**
 * End-to-end over a real ObjectQL — the only place the interaction is visible.
 * `cascadeDeleteRelations` is engine behaviour driven by metadata; no
 * metadata-only assertion can show that a delete now succeeds, and no hook
 * harness runs the referential pass at all.
 *
 * Objects only, no hooks — same as the two sibling cascade files. The rollup
 * hooks are `async: true` / `onError: 'log'` by design and can neither block nor
 * unblock a delete, so leaving them out measures the referential pass itself
 * rather than a hook's opinion of it.
 */
describe('deleting an itemised parent', () => {
  let ql: AnyRec;
  let api: AnyRec;

  beforeEach(async () => {
    ql = (await ObjectQL.create({
      datasources: { default: new InMemoryDriver({ persistence: false }) },
      objects: {
        crm_opportunity_line_item: OPP_LINE_ITEM,
        crm_quote_line_item: QUOTE_LINE_ITEM,
        crm_opportunity: byName('crm_opportunity'),
        crm_quote: byName('crm_quote'),
        crm_account: byName('crm_account'),
        crm_product: byName('crm_product'),
      } as never,
    })) as never;
    api = ql.createContext({ isSystem: true });
  });
  afterEach(async () => {
    await ql?.close();
  });

  let seq = 0;
  const uniq = () => `${++seq}`;

  const newAccount = () =>
    api.object('crm_account').insert({
      name: `ACME ${uniq()}`,
      type: 'customer',
      industry: 'technology',
    });

  const newProduct = async () => {
    const n = uniq();
    return api.object('crm_product').insert({
      name: `Widget ${n}`,
      sku: `WIDGET-${n}`,
      list_price: 100,
    });
  };

  const newOpportunity = async (name = 'Repro Opp') => {
    const account = await newAccount();
    return api.object('crm_opportunity').insert({
      name: `${name} ${uniq()}`,
      crm_account: account.id,
      amount: 1000,
      stage: 'prospecting',
      close_date: '2026-12-31',
    });
  };

  const newQuote = async (name = 'Q') => {
    const account = await newAccount();
    return api.object('crm_quote').insert({
      name: `${name}-${uniq()}`,
      crm_account: account.id,
      status: 'draft',
      quote_date: '2026-01-01',
      expiration_date: '2026-02-01',
    });
  };

  const oppLines = () => api.object('crm_opportunity_line_item').find({ where: {} });
  const quoteLines = () => api.object('crm_quote_line_item').find({ where: {} });

  it('deletes an opportunity carrying several product lines, and takes the lines with it', async () => {
    const opportunity = await newOpportunity();
    const product = await newProduct();
    for (const quantity of [1, 3]) {
      await api.object('crm_opportunity_line_item').insert({
        crm_opportunity: opportunity.id,
        crm_product: product.id,
        quantity,
        unit_price: 50,
      });
    }
    expect(await oppLines()).toHaveLength(2);

    // The assertion that WAS the bug: this used to reject with
    // "…1 dependent crm_opportunity_line_item record(s) reference it…".
    await expect(
      api.object('crm_opportunity').delete({ where: { id: opportunity.id } }),
    ).resolves.not.toThrow();

    expect(
      await api.object('crm_opportunity').find({ where: { id: opportunity.id } }),
    ).toHaveLength(0);
    expect(await oppLines()).toHaveLength(0);
  });

  it('deletes an itemised quote the same way', async () => {
    const quote = await newQuote();
    const product = await newProduct();
    await api.object('crm_quote_line_item').insert({
      crm_quote: quote.id,
      crm_product: product.id,
      quantity: 2,
      unit_price: 75,
    });

    await expect(
      api.object('crm_quote').delete({ where: { id: quote.id } }),
    ).resolves.not.toThrow();

    expect(await api.object('crm_quote').find({ where: { id: quote.id } })).toHaveLength(0);
    expect(await quoteLines()).toHaveLength(0);
  });

  /**
   * The cascade is keyed on the parent ID, not on the object. A cascade that
   * keyed off the object would empty the whole table on any deal's delete —
   * silent, total data loss that every assertion above would still pass.
   */
  it('leaves every line that belongs to another deal alone', async () => {
    const doomed = await newOpportunity('Doomed');
    const bystander = await newOpportunity('Bystander');
    const product = await newProduct();

    await api.object('crm_opportunity_line_item').insert({
      crm_opportunity: doomed.id, crm_product: product.id, quantity: 1, unit_price: 50,
    });
    const keep = await api.object('crm_opportunity_line_item').insert({
      crm_opportunity: bystander.id, crm_product: product.id, quantity: 4, unit_price: 25,
    });
    // A quote line naming the same product must survive an OPPORTUNITY delete —
    // the two line-item objects are separate cascade paths.
    const quote = await newQuote();
    const keepQuoteLine = await api.object('crm_quote_line_item').insert({
      crm_quote: quote.id, crm_product: product.id, quantity: 1, unit_price: 90,
    });

    await api.object('crm_opportunity').delete({ where: { id: doomed.id } });

    expect((await oppLines()).map((r: AnyRec) => r.id)).toEqual([keep.id]);
    expect((await quoteLines()).map((r: AnyRec) => r.id)).toEqual([keepQuoteLine.id]);
    expect(
      await api.object('crm_opportunity').find({ where: { id: bystander.id } }),
    ).toHaveLength(1);
  });

  it('still deletes a deal that was never itemised (nothing regressed for the plain case)', async () => {
    const opportunity = await newOpportunity('Bare');
    await expect(
      api.object('crm_opportunity').delete({ where: { id: opportunity.id } }),
    ).resolves.not.toThrow();
    expect(
      await api.object('crm_opportunity').find({ where: { id: opportunity.id } }),
    ).toHaveLength(0);
  });

  /**
   * The scope boundary, end-to-end. The product lookup was NOT touched, so the
   * engine still refuses to delete a product any line prices — and the refusal
   * names the real obstacle. This is the assertion that fails if someone later
   * "finishes the job" by cascading every lookup on these objects.
   */
  it('still refuses to delete a product that priced lines reference, naming the obstacle', async () => {
    const opportunity = await newOpportunity('Priced');
    const product = await newProduct();
    const line = await api.object('crm_opportunity_line_item').insert({
      crm_opportunity: opportunity.id, crm_product: product.id, quantity: 1, unit_price: 50,
    });

    await expect(
      api.object('crm_product').delete({ where: { id: product.id } }),
      // rc.6 rewording: display labels, not API names (see the sibling
      // assertion in test/event-attendee-cascade.test.ts). Still asserts the
      // message names the dependent object and the blocking field.
    ).rejects.toThrow(
      /still referenced by \d+ Opportunity Line Item record\(s\) through .Product./i,
    );
    expect(await api.object('crm_product').find({ where: { id: product.id } })).toHaveLength(1);
    expect(await oppLines()).toHaveLength(1);

    // And the line is still reachable the ordinary way — nothing was half-deleted.
    expect((await oppLines())[0].id).toBe(line.id);
  });
});
