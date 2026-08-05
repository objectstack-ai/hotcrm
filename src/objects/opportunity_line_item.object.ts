// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { ObjectSchema, Field } from '@objectstack/spec/data';
import { F, P } from '@objectstack/spec';

/**
 * Opportunity Line Item
 *
 * Individual product/service entry on an Opportunity. Together, all line items
 * roll up to the Opportunity amount. Required for any realistic sales process
 * where the deal value comes from a configured set of products rather than
 * a single typed-in total.
 */
export const OpportunityLineItem = ObjectSchema.create({
  name: 'crm_opportunity_line_item',
  label: 'Opportunity Line Item',
  pluralLabel: 'Opportunity Line Items',
  icon: 'package',
  description: 'A single product line on an Opportunity',

  // ADR-0090 D1/D7: OWD is an authored decision. A line item has no meaning
  // apart from its deal, so its record access DERIVES from the opportunity
  // (ADR-0055): reads are filtered to line items whose `crm_opportunity` the
  // caller can read, and any write requires edit access to that opportunity.
  // ADR-0055's relation resolver accepts a REQUIRED LOOKUP as the parent, so
  // this works without converting the relationship to master-detail.
  //
  // It was `private` before (#488), which was the wrong baseline twice over:
  // this object has no owner field of its own, so "private" fell back to the
  // platform's auto-stamped `owner_id` (whoever inserted the row) — the rep who
  // owns the deal could not see a line the quote-generation flow or their
  // manager added to it.
  sharingModel: 'controlled_by_parent',

  // @objectstack 12: the dead object-level `enable.trackHistory` flag was
  // removed (ADR-0049) — per-field history is opt-in via `Field.trackHistory`
  // (ADR-0052), set on quantity/unit_price/discount below. Master-detail
  // children still inherit the master's sharing automatically.

  highlightFields: ['crm_product', 'quantity', 'unit_price', 'total_price'],

  fields: {
    crm_opportunity: Field.lookup('crm_opportunity', {
      label: 'Opportunity',
      required: true,
      storage: { notNull: true },
    }),

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
      description: "Auto-populated from the product's List Price.",
    }),

    unit_price: Field.currency({
      label: 'Sales Price',
      required: true,
      storage: { notNull: true },
      description: 'Negotiated unit price (may differ from list price)',
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

    total_price: Field.formula({
      label: 'Total',
      expression: F`record.quantity * record.unit_price * (1 - record.discount / 100)`,
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
      // Both guards are load-bearing, not defensive noise. `has(...)` answers
      // "is the key present at all": on update the predicate sees
      // `{...previous, ...data}`, and a driver that stores only written columns
      // returns no key, which aborts the whole predicate and silently skips the
      // rule (#630). `!= null` answers "does it hold a value": strict CEL
      // ABORTS on `null < 0` instead of evaluating it false, so the unguarded
      // form left this rule inert on a blank price — it never fired at all,
      // which is the opposite of what a validation is for. The `null` hazard is
      // written up at `account.object.ts:244-245`; the same-named rule in
      // `quote_line_item.object.ts` has carried that guard all along.
      condition: P`has(record.unit_price) && record.unit_price != null && record.unit_price < 0`,
    },
  ],
});
