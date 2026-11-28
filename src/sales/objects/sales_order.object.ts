// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { ObjectSchema, Field } from '@objectstack/spec/data';
import { P, cel } from '@objectstack/spec';

/**
 * Sales Order (REQ-0010, hotcrm#2555).
 *
 * What the customer bought this time: the spine of a deal, where the contract
 * is optional (`docs/architecture/sales-order-plan.md`). The header mirrors the
 * quote's (`src/revenue/objects/quote.object.ts`) so a later step can copy an
 * accepted quote onto it field for field (B2), plus what only an order has: an
 * optional framework contract, the customer's PO number, an external reference
 * for an ERP import, and how far it has shipped.
 *
 * It lives in the app package, beside the contract, for the reason the
 * contract moved here (`module-split-plan.md` item 11): the quote module will
 * write to it and Order to Cash will cite it, and modules do not depend on each
 * other. Fields those modules add (the source quote, invoiced and received)
 * arrive as their extensions and leave with them.
 *
 * ⛔ No currency field: multi-currency is deferred (REQ-0012). Amounts are in
 * the tenant currency, as on the quote.
 *
 * The behaviour lives in `sales_order.hook.ts`: the header totals follow the
 * lines, and the lines and the header amount of an order past Draft cannot
 * change (#2826).
 */
/**
 * The three amounts the framework-contract quota rule compares (hotcrm#2807),
 * in CEL, each a double and 0 when unset.
 *
 *   - `NOW`: this order's total after the write.
 *   - `BEFORE`: this order's total before the write, when it was already
 *     linked to the same contract; 0 on a create or a newly linked order.
 *     Whether the write raises the order's share is judged against it.
 *   - `BEFORE_COUNTED`: the part of `BEFORE` the contract's Order Amount
 *     already holds — `BEFORE` when the order was confirmed or completed,
 *     else 0 (hotcrm#2806).
 *   - `ORDERED`: the contract's Order Amount (confirmed and completed orders)
 *     as stored before this write (the roll-up is recomputed after it), so
 *     the amount with this order is `ORDERED - BEFORE_COUNTED + NOW`.
 *
 * `record.crm_contract.id` names the contract through the reference: a
 * predicate that reads through a reference may not also read it as a value.
 */
const QUOTA_NOW = 'has(record.total_price) && record.total_price != null ? double(record.total_price) : 0.0';
const QUOTA_LINKED_BEFORE = 'previous != null && has(previous.crm_contract) && previous.crm_contract == record.crm_contract.id';
const QUOTA_BEFORE =
  `${QUOTA_LINKED_BEFORE} && has(previous.total_price) && previous.total_price != null ? double(previous.total_price) : 0.0`;
const QUOTA_COUNTED_NOW = 'has(record.status) && (record.status == "confirmed" || record.status == "completed")';
const QUOTA_COUNTED_BEFORE = 'previous != null && has(previous.status) && (previous.status == "confirmed" || previous.status == "completed")';
const QUOTA_BEFORE_COUNTED =
  `${QUOTA_LINKED_BEFORE} && ${QUOTA_COUNTED_BEFORE} && has(previous.total_price) && previous.total_price != null`
  + ' ? double(previous.total_price) : 0.0';
const QUOTA_ORDERED =
  'has(record.crm_contract.order_amount) && record.crm_contract.order_amount != null'
  + ' ? double(record.crm_contract.order_amount) : 0.0';
const QUOTA_CEILING =
  'has(record.crm_contract.contract_value) && record.crm_contract.contract_value != null'
  + ' ? double(record.crm_contract.contract_value) : 0.0';
/**
 * The order takes a framework contract over its value: the contract is a
 * framework contract, this write adds to what the order counts against it (a
 * newly linked order, a higher total, or an order confirmed under it), and the
 * contract's ordered amount with this order then totals more than the
 * contract value. A write that leaves the order's share as it was, or lowers
 * it, is never judged, so an order already over is not frozen (AGENTS.md
 * rule 7) and lowering it is always allowed.
 *
 * The contract's Order Amount counts confirmed and completed orders only
 * (hotcrm#2806, the maintainer's ruling of 2026-11-27), so the projection is
 * `ORDERED - BEFORE_COUNTED + NOW`: this order's total is added whatever its
 * status, so a Draft that would take the contract over still warns, and what
 * it already counted (only when it was confirmed or completed under the same
 * contract) is taken out first. A Cancelled order adds nothing and is never
 * judged.
 */
const QUOTA_EXCEEDED = {
  // Composed from the strings above: `P` quotes an interpolated string as a CEL
  // string literal, so a predicate built from parts is spelled as the
  // expression object it compiles to (the shape `_option-labels.ts` builds).
  dialect: 'cel' as const,
  source: `has(record.crm_contract.contract_form) && record.crm_contract.contract_form == "framework"
  && !(has(record.status) && record.status == "cancelled")
  && ((${QUOTA_NOW}) > (${QUOTA_BEFORE}) || ((${QUOTA_COUNTED_NOW}) && !(${QUOTA_COUNTED_BEFORE}) && (${QUOTA_LINKED_BEFORE})))
  && (${QUOTA_ORDERED}) - (${QUOTA_BEFORE_COUNTED}) + (${QUOTA_NOW}) > (${QUOTA_CEILING})`,
};

export const SalesOrder = ObjectSchema.create({
  name: 'crm_sales_order',
  label: 'Order',
  pluralLabel: 'Orders',
  icon: 'shopping-cart',
  description: 'What a customer ordered, its lines and totals, and how far it has shipped',

  // ADR-0090 D1/D7: OWD is an authored decision. Master-detail child of
  // crm_account, like the quote and the contract: whoever reaches the account
  // reaches its orders, and the lines derive one level further.
  sharingModel: 'controlled_by_parent',
  // The record title is the name, as on the quote (#2369 row 10); the number
  // leads the highlight strip and is searchable.
  nameField: 'name',
  searchableFields: ['name', 'order_number', 'customer_po_number'],
  highlightFields: ['order_number', 'crm_account', 'status', 'total_price', 'order_date', 'fulfillment_status'],

  fieldGroups: [
    { key: 'basic',    label: 'Order Information', icon: 'info' },
    { key: 'pricing',  label: 'Pricing',           icon: 'dollar-sign' },
    { key: 'delivery', label: 'Delivery',          icon: 'truck' },
    { key: 'address',  label: 'Addresses',         icon: 'map-pin', collapse: 'collapsed' },
    { key: 'system',   label: 'System',            icon: 'database', collapse: 'collapsed' },
  ],

  fields: {
    // Platform ownership anchor — canonical note in `account.object.ts` (#548).
    owner_id: Field.lookup('sys_user', {
      label: 'Order Owner',
      group: 'basic',
      system: true,
      readonly: false,
      trackHistory: true,
    }),

    order_number: Field.autonumber({
      label: 'Order Number',
      group: 'basic',
      format: 'SO-{0000}',
    }),

    name: Field.text({
      label: 'Order Name',
      group: 'basic',
      required: true,
      storage: { notNull: true },
      searchable: true,
      maxLength: 255,
    }),

    // The master the OWD derives from. The panel on the account page lists
    // these columns (#944 mechanism).
    crm_account: Field.masterDetail('crm_account', {
      label: 'Account',
      group: 'basic',
      required: true,
      storage: { notNull: true },
      deleteBehavior: 'cascade',
      relatedListColumns: ['order_number', 'name', 'status', 'order_date', 'total_price'],
    }),

    crm_contact: Field.lookup('crm_contact', {
      label: 'Contact',
      group: 'basic',
      dependsOn: ['crm_account'],
      relatedListColumns: ['order_number', 'name', 'crm_account', 'status', 'total_price'],
    }),

    crm_opportunity: Field.lookup('crm_opportunity', {
      label: 'Opportunity',
      group: 'basic',
      dependsOn: ['crm_account'],
      relatedListColumns: ['order_number', 'name', 'status', 'order_date', 'total_price'],
    }),

    status: Field.select({
      label: 'Status',
      group: 'basic',
      // `kind`: the record path draws Completed as the order's successful end
      // and Cancelled as its unsuccessful one (#2366 row 10).
      options: [
        { label: 'Draft', value: 'draft', color: '#999999', default: true, kind: 'open' },
        { label: 'Confirmed', value: 'confirmed', color: '#4169E1', kind: 'open' },
        { label: 'Completed', value: 'completed', color: '#00AA00', kind: 'won' },
        { label: 'Cancelled', value: 'cancelled', color: '#666666', kind: 'lost' },
      ],
      required: true,
      storage: { notNull: true },
      trackHistory: true,
    }),

    order_date: Field.date({
      label: 'Order Date',
      group: 'basic',
      // With the year, as the quote's dates (#2370 row 9).
      format: 'short',
      required: true,
      storage: { notNull: true },
      // A runtime default the form reads as the server's to fill (#2060 item 7).
      defaultValue: cel`today()`,
    }),

    // An order placed under a framework contract. Optional: most orders have
    // none (the plan's premise). `set_null` keeps the order when its contract
    // is deleted. The panel on the contract page lists these columns.
    crm_contract: Field.lookup('crm_contract', {
      label: 'Contract',
      group: 'basic',
      dependsOn: ['crm_account'],
      relatedListColumns: ['order_number', 'name', 'status', 'order_date', 'total_price'],
    }),

    customer_po_number: Field.text({
      label: 'Customer PO Number',
      group: 'basic',
      maxLength: 120,
      description: "The number on the customer's own purchase order, as they will quote it.",
    }),

    description: Field.markdown({
      label: 'Description',
      group: 'basic',
    }),

    // ─── Pricing: the quote header's figures and one formula ────────────
    // `discount_amount` / `total_price` are derived and `readonly` (#2110 on
    // the quote); their one writer is `sales_order_workflow`, in the write that
    // changes an input. `subtotal` is the lines' sum (`sales_order_total_rollup`);
    // on an order with no lines it is the rep's own number, so it is not
    // `readonly`. A person's Subtotal on an order WITH lines that differs from
    // their sum is refused by `sales_order_workflow` (#2826), and Subtotal,
    // Discount %, Tax and Shipping lock once the order leaves Draft, there too.
    // Not `readonlyWhen`: on 18.6.0 that strips system writes as well, and
    // whether an order has lines is not a field of the order.
    subtotal: Field.currency({
      label: 'Subtotal',
      group: 'pricing',
      description: 'The sum of the order\'s lines. Typed only on an order with no lines. Locked once the order is confirmed, as are the discount, tax and shipping.',
    }),

    discount: Field.percent({
      label: 'Discount %',
      group: 'pricing',
      scale: 2,
      min: 0,
      max: 100,
    }),

    discount_amount: Field.currency({
      label: 'Discount Amount',
      group: 'pricing',
      readonly: true,
    }),

    tax: Field.currency({
      label: 'Tax',
      group: 'pricing',
    }),

    shipping_handling: Field.currency({
      label: 'Shipping & Handling',
      group: 'pricing',
    }),

    total_price: Field.currency({
      label: 'Total Price',
      group: 'pricing',
      readonly: true,
    }),

    payment_terms: Field.select({
      label: 'Payment Terms',
      group: 'pricing',
      // The list shared with Quote and Contract (#490) —
      // `src/sales/picklists/payment_terms.picklist.ts`.
      picklist: 'payment_terms',
    }),

    // ─── Delivery: typed or imported, read by people ────────────────────
    // Nothing in HotCRM acts on these two (the card: "for reading only"):
    // there is no stock, no delivery note and no per-line shipped quantity.
    fulfillment_status: Field.select({
      label: 'Fulfillment Status',
      group: 'delivery',
      options: [
        { label: 'Not Shipped', value: 'not_shipped', color: '#999999', default: true },
        { label: 'Partially Shipped', value: 'partially_shipped', color: '#FFA500' },
        { label: 'Shipped', value: 'shipped', color: '#00AA00' },
      ],
    }),

    shipped_date: Field.date({
      label: 'Shipped Date',
      group: 'delivery',
      format: 'short',
    }),

    billing_address: Field.address({
      label: 'Billing Address',
      group: 'address',
    }),

    shipping_address: Field.address({
      label: 'Shipping Address',
      group: 'address',
    }),

    // The order's key in another system (an ERP, a shop), the match key a
    // later import updates on — the pattern of `crm_invoice.erp_ref`. Nullable
    // and unique: most orders have none, and no two share one.
    external_ref: Field.text({
      label: 'External Reference',
      group: 'system',
      maxLength: 120,
      unique: true,
      description: "The order's number in another system. An import naming the same reference updates this order.",
    }),
  },

  indexes: [
    { fields: ['crm_account'] },
    { fields: ['crm_contract'] },
    { fields: ['crm_opportunity'] },
    { fields: ['owner_id'] },
    { fields: ['status'] },
    { fields: ['order_date'] },
  ],

  enable: {
    apiEnabled: true,
    apiMethods: ['get', 'list', 'create', 'update', 'delete'],
    // The customer's PO and delivery paperwork attach here; see the canonical
    // capability note in `src/sales/objects/index.ts`.
    files: true,
  },

  // Predicates below are TOTAL: every `record.x` read is `has()`-guarded
  // (AGENTS.md; test/object-validation-predicates.test.ts).
  validations: [
    {
      name: 'shipped_after_order',
      type: 'script',
      severity: 'error',
      message: 'Shipped Date cannot be before Order Date',
      condition: P`has(record.shipped_date) && record.shipped_date != null && has(record.order_date) && record.order_date != null && record.shipped_date < record.order_date`,
    },
    {
      // An order carries only a contract of its own account (#2728). The
      // contract's `dependsOn: ['crm_account']` filters the form's picker and
      // the import's lookup, but an API write was accepted with another
      // account's contract, and the Order to Cash rows on that order then
      // could not be saved against it (the row stamp refuses `apart`).
      //
      // The rule reads the contract's account one hop through the reference,
      // which a `validations[]` condition does since 18.x (objectql
      // `resolveTraversalScope`). A reference read through must hold an id,
      // so the read sits in `then` behind a `when` that the contract is set:
      // an order without a contract is not checked. An invariant (AGENTS.md
      // rule 7): an order already saved with another account's contract is
      // refused on its next edit until its contract or account is corrected.
      //
      // The message is fixed text: 18.6.0 interpolates no record values into
      // a rule's message, so it names the fields, not the two accounts.
      name: 'contract_same_account',
      type: 'conditional',
      severity: 'error',
      message: "The contract must belong to this order's Account.",
      when: P`has(record.crm_contract) && record.crm_contract != null`,
      then: {
        // `cross_field` so the refusal is attached to Contract, the field to
        // correct, rather than to the record as a whole.
        name: 'contract_same_account_check',
        type: 'cross_field',
        fields: ['crm_contract', 'crm_account'],
        severity: 'error',
        message:
          "This contract belongs to another account. An order can only carry a contract of its own Account: choose one of this account's contracts, or clear Contract.",
        condition: P`has(record.crm_account) && record.crm_account != null && record.crm_contract.crm_account != record.crm_account`,
      },
    },
    {
      // A framework contract's quota (hotcrm#2807, maintainer ruling
      // 2026-11-26: 「超额默认警告，管理员可以改成拦截」). An order linked to a
      // framework contract, or a linked order whose total goes up, that takes
      // the contract's Order Amount over its Contract Value WARNS: the save
      // goes through and the console shows the message as a warning (the
      // write answer's `warnings`). The amounts are `QUOTA_EXCEEDED` above.
      //
      // ⚠️ A line's save that raises the order's total reaches this rule
      // through `sales_order_total_rollup`'s own write to the order, which has
      // no person waiting on its answer, so that warning is not shown; the
      // contract's Remaining Quota below zero is the sign that stays.
      //
      // The ruling's second half, an administrator's switch to BLOCK, is not
      // here: on 18.6.0 an installation cannot switch a packaged validation
      // rule on or off (a managed object is sealed, ADR-0131 D6), and an
      // app-made setting would re-invent the platform's (AGENTS.md Scope). It
      // waits on the maintainer's decision recorded on hotcrm#2807.
      //
      // `conditional` because the check reads through the contract, and a
      // read through an empty reference cannot be evaluated: `when` skips an
      // order with no contract.
      name: 'framework_quota_exceeded',
      type: 'conditional',
      severity: 'warning',
      message: "This order takes its framework contract over the Contract Value.",
      when: P`has(record.crm_contract) && record.crm_contract != null`,
      then: {
        name: 'framework_quota_exceeded_check',
        type: 'cross_field',
        fields: ['crm_contract', 'total_price'],
        severity: 'warning',
        message:
          "With this order, the orders under the framework contract total more than its Contract Value. The order is saved; the contract's Remaining Quota shows how far over it is.",
        condition: QUOTA_EXCEEDED,
      },
    },
    {
      // The order's path. `error`, like the contract's (#2192): Completed and
      // Cancelled are final, and Confirmed goes back to Draft to change its
      // lines (`sales_order_workflow`). A create carries no transition, so an
      // import lands in any state.
      name: 'sales_order_status_progression',
      type: 'state_machine',
      severity: 'error',
      message:
        'This status change is not allowed. An order moves Draft → Confirmed → Completed; Confirmed can go back to Draft, and Draft or Confirmed can be Cancelled. Completed and Cancelled are final.',
      field: 'status',
      // Protocol 19 asks for an entry contract (`state-machine-no-initial-states`). Every state is listed: a
      // record (an import or an integration included) may still be created in any of them, as on 18.6.
      // Narrowing this to the first state is a product decision of its own, not part of the upgrade.
      initialStates: ['draft', 'confirmed', 'completed', 'cancelled'],
      transitions: {
        draft: ['confirmed', 'cancelled'],
        confirmed: ['draft', 'completed', 'cancelled'],
        completed: [],
        cancelled: [],
      },
    },
  ],
});
