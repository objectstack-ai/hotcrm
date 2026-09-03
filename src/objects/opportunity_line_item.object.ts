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
  // (ADR-0055), and as of 17.0.0-rc.4 that derivation means what it says.
  //
  // ⚠️ Reads ARE filtered to line items whose `crm_opportunity` the caller can
  // read, and master accessibility resolves through the same paths a direct
  // read of the opportunity takes — ownership and `sys_record_share` grants
  // included, NOT the master's row-level security policies alone. So a rep
  // reads the lines of the deals in their own book plus anything shared to
  // them, and the private-deal RLS filter carried by the `sales_manager` and
  // `marketing_user` sets narrows on top of that rather than being the only
  // thing that narrows. The parent-write gate derives the same way: a line
  // whose opportunity the caller cannot edit is refused.
  //
  // `test/parent-derived-reach.test.ts` pins the narrow semantics and was
  // written to go red the day the platform widens them: with the master set
  // resolved from RLS policies alone, any caller without the private-deal
  // policy — `sales_rep` included — reaches EVERY opportunity's lines.
  // ADR-0055's relation resolver accepts a REQUIRED LOOKUP as the parent, so
  // this works without converting the relationship to master-detail.
  //
  // ⛔ Not `private`: this object has no owner of its own, so `private` falls
  // back to the platform's auto-stamped `owner_id` (whoever inserted the row) —
  // and the rep who owns the deal then cannot see a line the quote-generation
  // flow or their manager added to it.
  sharingModel: 'controlled_by_parent',

  // Per-field history is opt-in via `Field.trackHistory` (ADR-0052), set on
  // quantity/unit_price/discount below. Master-detail children still inherit
  // the master's sharing automatically.

  highlightFields: ['crm_product', 'quantity', 'unit_price', 'total_price'],

  // Two groups, derived from the nine fields this object actually declares
  // rather than copied off a neighbour (#1453). The split is the one the
  // arithmetic already makes: everything `total_price` multiplies together is
  // `pricing`, everything that says WHICH line this is is `basic`.
  //
  // `quantity` is a pricing field here, not an identity one — it is a factor in
  // `total_price`, and separating it from the price it multiplies would put the
  // two halves of one product on two sections. `crm_quote_line_item` takes the
  // same split over its eleven fields, and the parents agree: `crm_quote` and
  // `crm_product` both keep every money field — tax included — in `pricing`,
  // and both keep `description` in `basic`.
  //
  // ⚠️ Neither group may be a subset of the highlight strip: a synthesized
  // detail page hoists the title plus the first four `highlightFields` out of
  // the body, so an all-hoisted group renders on forms and nowhere else
  // (`field-group-shadowed`; `test/field-groups-coverage.test.ts` pins it).
  // `basic` keeps crm_opportunity/description/line_number and `pricing` keeps
  // list_price/discount outside that strip, so both survive the hoist.
  fieldGroups: [
    { key: 'basic',   label: 'Line Item', icon: 'package' },
    { key: 'pricing', label: 'Pricing',   icon: 'dollar-sign' },
  ],

  fields: {
    // The parent link, and the ONE field on this object that decides whether the
    // deal it belongs to can be deleted at all (#727).
    //
    // Declaring nothing here does not mean "no opinion": `Field.lookup` resolves
    // `deleteBehavior` to the spec default `set_null`, and the engine's
    // `cascadeDeleteRelations` escalates a `set_null` default on a REQUIRED
    // lookup to `restrict` — a NOT NULL column cannot be cleared. So the silent
    // default made every itemised opportunity undeletable, with a message that
    // told the API caller to `set deleteBehavior:'cascade'` on this very field:
    //
    //     DELETE /api/v1/data/crm_opportunity/<id>
    //     → 409 DELETE_RESTRICTED "…1 dependent crm_opportunity_line_item
    //       record(s) reference it via crm_opportunity…"
    //
    // `cascade` is the semantics this object already claims twice over: the
    // header comment says a line has no meaning apart from its deal, and
    // `opportunity_line_item.hook.ts` derives `crm_opportunity.amount` FROM the
    // line set. A record whose parent is gone denotes nothing and would keep a
    // dead deal's revenue in the line-level reports.
    //
    // This is deliberately NOT the campaign/event answer (#696, #711 kept
    // `crm_campaign_member.crm_campaign` and `crm_event_attendee.crm_event` on
    // the restricting default): a member list is a campaign's historical record
    // and survives on its own terms. A price line does not.
    crm_opportunity: Field.lookup('crm_opportunity', {
      label: 'Opportunity',
      group: 'basic',
      required: true,
      storage: { notNull: true },
      deleteBehavior: 'cascade',
    }),

    // Deliberately left on the default, which the same escalation turns into
    // `restrict`: deleting a catalog product must NOT shred the priced history
    // of deals that sold it. `product.hook.ts`'s own `beforeDelete` says the
    // same thing in words ("Set is_active=false to retire instead").
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
      description: "Auto-populated from the product's List Price.",
    }),

    unit_price: Field.currency({
      label: 'Sales Price',
      group: 'pricing',
      required: true,
      storage: { notNull: true },
      description: 'Negotiated unit price (may differ from list price)',
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

    total_price: Field.formula({
      label: 'Total',
      group: 'pricing',
      expression: F`record.quantity * record.unit_price * (1 - record.discount / 100)`,
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
