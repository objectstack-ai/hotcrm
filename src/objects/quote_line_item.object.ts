// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { ObjectSchema, Field } from '@objectstack/spec/data';
import { F, P } from '@objectstack/spec';
import { QUOTE_DISCOUNT_CEILING } from './_thresholds';

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

  // OWD is an authored decision (ADR-0090 D1/D7). Record access DERIVES from
  // the quote (ADR-0055).
  //
  // ⚠️ Reads ARE filtered to lines whose `crm_quote` the caller can read, and
  // "can read" resolves through the same paths a direct read of the quote takes
  // — owner scope and `sys_record_share` grants included, NOT the master's
  // row-level security policies alone. A rep who owns one quote reads that
  // quote's lines and no others. The parent-write gate derives the same way: a
  // line whose quote the caller cannot edit is refused with a
  // `PermissionDeniedError` naming the master.
  //
  // `test/parent-derived-reach.test.ts` pins those semantics with positive
  // controls, so a regression is caught in either direction — it was written to
  // go red the day the platform widens them: with the derivation consulting
  // master RLS policies only, under a SYSTEM context, and no policy authored on
  // `crm_quote`, the master set is EVERY quote and a line item is readable —
  // and writable — by every holder of object-level read on this object. The
  // relation resolver accepts a REQUIRED LOOKUP as the parent, so no
  // master-detail conversion is needed.
  //
  // ⛔ Not `private`: with no owner field on this object that resolves to the
  // platform's auto-stamped `owner_id` — the row's inserter — so lines cloned
  // onto a quote by the `quote_generation` flow are invisible to the rep who
  // owns the quote.
  sharingModel: 'controlled_by_parent',

  // Per-field history is opt-in via `Field.trackHistory` (ADR-0052), set on
  // quantity/unit_price/discount below. Master-detail children still inherit
  // the master's sharing automatically.

  highlightFields: ['crm_product', 'quantity', 'unit_price', 'total_price'],

  // The same two-group split as `crm_opportunity_line_item` (#1453), derived
  // from the eleven fields declared here: every factor `total_price` multiplies
  // is `pricing`, everything that says WHICH line this is is `basic`.
  //
  // `tax_rate` and `subtotal` are pricing, not a section of their own — the
  // parent `crm_quote` keeps subtotal / discount / discount_amount / tax /
  // shipping_handling / total_price in one `pricing` group, and `crm_product`
  // keeps `tax_rate` there too. A separate tax section would be this repo's
  // only one.
  //
  // ⚠️ Neither group may be a subset of the highlight strip — see the twin
  // object for the hoisting rule this satisfies.
  fieldGroups: [
    { key: 'basic',   label: 'Line Item', icon: 'package' },
    { key: 'pricing', label: 'Pricing',   icon: 'dollar-sign' },
  ],

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
      group: 'basic',
      required: true,
      storage: { notNull: true },
      deleteBehavior: 'cascade',
    }),

    // Left on the restricting default on purpose — see the twin object: a
    // product's catalog entry must not take priced quote history with it.
    crm_product: Field.lookup('crm_product', {
      label: 'Product',
      group: 'basic',
      required: true,
      storage: { notNull: true },
    }),

    description: Field.text({
      label: 'Description',
      group: 'basic',
      maxLength: 500,
    }),

    quantity: Field.number({
      label: 'Quantity',
      group: 'pricing',
      required: true,
      storage: { notNull: true },
      scale: 2,
      min: 0,
      defaultValue: 1,
      trackHistory: true,
    }),

    list_price: Field.currency({
      label: 'List Price',
      group: 'pricing',
      readonly: true,
    }),

    unit_price: Field.currency({
      label: 'Sales Price',
      group: 'pricing',
      required: true,
      storage: { notNull: true },
      trackHistory: true,
    }),

    discount: Field.percent({
      label: 'Discount %',
      group: 'pricing',
      scale: 2,
      min: 0,
      max: 100,
      defaultValue: 0,
      trackHistory: true,
    }),

    subtotal: Field.formula({
      label: 'Subtotal',
      group: 'pricing',
      expression: F`record.quantity * record.unit_price * (1 - record.discount / 100)`,
    }),

    tax_rate: Field.percent({
      label: 'Tax Rate %',
      group: 'pricing',
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
      group: 'pricing',
      expression: F`record.quantity * record.unit_price * (1 - record.discount / 100) * (1 + record.tax_rate / 100)`,
    }),

    line_number: Field.number({
      label: 'Line #',
      group: 'basic',
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
    {
      // #1086. The other half of #599's ceiling, and the reason that card's own
      // acceptance criterion — "a quote with a 90% line discount cannot reach
      // `presented`" — was not met by the quote-level rule alone.
      //
      // ### The walk-around this closes
      //
      // A quote's total has TWO independent discount multipliers, and
      // `quote_total_rollup` composes them:
      //
      //   subtotal        = Σ line (quantity × unit_price × (1 − LINE discount/100))
      //   discount_amount = subtotal × QUOTE discount%
      //
      // #599 put a ceiling on the second one only. So a quote at
      // `discount: 0` — which clears `discount_within_ceiling` on `crm_quote`
      // outright — with every line at `discount: 90` prices 90% below list, and
      // nothing objected: this object's only discount constraint was the
      // field's own `max: 100`, the arithmetic domain of a percentage. An
      // invariant with a documented walk-around is worse than no invariant,
      // because a reader (human or AI) cites the rule as the guarantee.
      //
      // ### Same constant, same instrument, deliberately
      //
      // The number is `QUOTE_DISCOUNT_CEILING` — imported, never retyped, so the
      // two ceilings are one policy and cannot drift into two. The instrument is
      // a `type: 'script'` validation for the reason #599 measured on the quote
      // (and this card re-measured on this object, in
      // `test/quote-discount-ceiling.test.ts`): a field-level `max` validates
      // only the value being WRITTEN, so a line stored above the ceiling before
      // the rule existed keeps accepting edits forever, while a script
      // validation is evaluated against the MERGED record on every write and is
      // therefore a true invariant. `max: 100` stays on the field as the domain
      // of a percentage; the policy line lives here.
      //
      // ### What this rule does NOT decide
      //
      // 60% per line AND 60% on the quote still compounds to ~84% EFFECTIVE.
      // Whether the ceiling should be read against the effective discount is a
      // business-policy question with no answer in this codebase, and it is
      // open as #1109 — deliberately not guessed here. A per-line ceiling is
      // correct under either answer: it is the whole policy if the answer is
      // per-line, and a component of it if the answer is effective.
      name: 'discount_within_ceiling',
      type: 'script',
      severity: 'error',
      // Names the LINE, because the quote carries a same-named rule with its
      // own message: on a refused save the rep must be able to tell which of
      // the two numbers the platform is objecting to.
      message: `Line discount cannot exceed ${QUOTE_DISCOUNT_CEILING}%`,
      condition: P`has(record.discount) && record.discount != null && record.discount > ${QUOTE_DISCOUNT_CEILING}`,
    },
  ],
});
