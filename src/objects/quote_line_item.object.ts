// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { ObjectSchema, Field } from '@objectstack/spec/data';
import { F, P } from '@objectstack/spec';

/**
 * Quote Line Item
 *
 * Individual line on a Quote. Quotes generated from an Opportunity typically
 * clone its OpportunityLineItems into QuoteLineItems so pricing can diverge
 * after the quote is sent without affecting the underlying opportunity.
 */
export const QuoteLineItem = ObjectSchema.create({
  name: 'crm_quote_line_item',
  label: 'Quote Line Item',
  pluralLabel: 'Quote Line Items',
  icon: 'package',
  description: 'A single product line on a Quote',

  // ADR-0090 D1/D7: OWD is an authored decision. Record access DERIVES from the
  // quote (ADR-0055), and as of 17.0.0-rc.4 that derivation means what it says.
  //
  // MEASURED on 17.0.0-rc.4 and pinned by `test/parent-derived-reach.test.ts`:
  // reads ARE filtered to lines whose `crm_quote` the caller can read, and "can
  // read" resolves through the same paths a direct read of the quote takes —
  // owner scope and `sys_record_share` grants included, not the master's
  // row-level security policies alone. A rep who owns one quote reads that
  // quote's lines and no others. The parent-write gate derives the same way: a
  // line whose quote the caller cannot edit is refused with a
  // `PermissionDeniedError` naming the master.
  //
  // Until 17.0.0-rc.3 this was the opposite, and this note said so (#694): the
  // derivation consulted master RLS policies only, under a SYSTEM context, so
  // with no policy authored on `crm_quote` the master set was EVERY quote and a
  // line item was readable — and writable — by every holder of object-level read
  // on this object. objectstack-ai/objectstack#5386 fixed that upstream and it
  // shipped in rc.4. The guard test named above was written to go red the day
  // the engine narrowed; it did, and it now pins the narrow semantics with
  // positive controls, so a regression is caught in either direction. The
  // relation resolver accepts a REQUIRED LOOKUP as the parent, so no
  // master-detail conversion is needed.
  //
  // It was `private` before (#488). With no owner field on this object that
  // resolved to the platform's auto-stamped `owner_id` — the row's inserter —
  // so lines cloned onto a quote by the `quote_generation` flow were invisible
  // to the rep who owns the quote.
  sharingModel: 'controlled_by_parent',

  // @objectstack 12: the dead object-level `enable.trackHistory` flag was
  // removed (ADR-0049) — per-field history is opt-in via `Field.trackHistory`
  // (ADR-0052), set on quantity/unit_price/discount below. Master-detail
  // children still inherit the master's sharing automatically.

  highlightFields: ['crm_product', 'quantity', 'unit_price', 'total_price'],

  fields: {
    // The parent link — same decision, same reasoning, as
    // `opportunity_line_item.crm_opportunity` (#727); read the long note there.
    // In short: declaring nothing resolves to the spec default `set_null`, which
    // the engine escalates to `restrict` on a REQUIRED lookup, so every quote
    // that had been itemised refused to delete with a 409 quoting this field.
    // A quote line is subordinate to its quote (`quote_line_item.hook.ts` rolls
    // the quote's subtotal/total UP from these rows), so it goes with it.
    crm_quote: Field.lookup('crm_quote', {
      label: 'Quote',
      required: true,
      storage: { notNull: true },
      deleteBehavior: 'cascade',
    }),

    // Left on the restricting default on purpose — see the twin object: a
    // product's catalog entry must not take priced quote history with it.
    crm_product: Field.lookup('crm_product', {
      label: 'Product',
      required: true,
      storage: { notNull: true },
    }),

    description: Field.text({
      label: 'Description',
      maxLength: 500,
    }),

    quantity: Field.number({
      label: 'Quantity',
      required: true,
      storage: { notNull: true },
      scale: 2,
      min: 0,
      defaultValue: 1,
      trackHistory: true,
    }),

    list_price: Field.currency({
      label: 'List Price',
      readonly: true,
    }),

    unit_price: Field.currency({
      label: 'Sales Price',
      required: true,
      storage: { notNull: true },
      trackHistory: true,
    }),

    discount: Field.percent({
      label: 'Discount %',
      scale: 2,
      min: 0,
      max: 100,
      defaultValue: 0,
      trackHistory: true,
    }),

    subtotal: Field.formula({
      label: 'Subtotal',
      expression: F`record.quantity * record.unit_price * (1 - record.discount / 100)`,
    }),

    tax_rate: Field.percent({
      label: 'Tax Rate %',
      scale: 2,
      min: 0,
      max: 100,
      defaultValue: 0,
    }),

    // Composed from the same STORED fields `subtotal` reads, not from
    // `subtotal` itself — a formula reading another formula depends on the
    // platform hydrating that field first, which is the hazard warned against
    // at `lead.object.ts:61-64`. The arithmetic is unchanged: this is
    // `subtotal`'s expression with the tax multiplier applied on top.
    total_price: Field.formula({
      label: 'Total',
      expression: F`record.quantity * record.unit_price * (1 - record.discount / 100) * (1 + record.tax_rate / 100)`,
    }),

    line_number: Field.number({
      label: 'Line #',
      scale: 0,
      readonly: true,
    }),
  },

  // Predicates below are TOTAL: every `record.x` read is `has()`-guarded, so the
  // rule returns a verdict even when the merged record has no such key. See
  // AGENTS.md "Validation predicates must be TOTAL" and
  // test/object-validation-predicates.test.ts, which fails the build otherwise.
  validations: [
    {
      name: 'unit_price_positive',
      type: 'script',
      severity: 'error',
      message: 'Sales price cannot be negative',
      condition: P`has(record.unit_price) && record.unit_price != null && record.unit_price < 0`,
    },
  ],
});
