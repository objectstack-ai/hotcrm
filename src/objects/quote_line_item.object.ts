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
  // quote (ADR-0055): reads are filtered to lines whose `crm_quote` the caller
  // can read, and a write requires edit access to that quote. The relation
  // resolver accepts a REQUIRED LOOKUP as the parent, so no master-detail
  // conversion is needed.
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
    crm_quote: Field.lookup('crm_quote', {
      label: 'Quote',
      required: true,
    }),

    crm_product: Field.lookup('crm_product', {
      label: 'Product',
      required: true,
    }),

    description: Field.text({
      label: 'Description',
      maxLength: 500,
    }),

    quantity: Field.number({
      label: 'Quantity',
      required: true,
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

  validations: [
    {
      name: 'unit_price_positive',
      type: 'script',
      severity: 'error',
      message: 'Sales price cannot be negative',
      condition: P`record.unit_price != null && record.unit_price < 0`,
    },
  ],
});
