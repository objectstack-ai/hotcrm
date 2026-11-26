// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { ObjectSchema, Field } from '@objectstack/spec/data';
import { P, F } from '@objectstack/spec';

/**
 * How far ahead, in days, the daily `contract_renewal` sweep looks for
 * contracts entering their notice window, and therefore the largest
 * `renewal_notice_days` it can honour.
 *
 * One number with two consumers: this field's `max`, and the sweep's
 * `end_date` pre-filter (`src/sales/flows/contract-renewal.flow.ts`). A notice
 * window longer than the pre-filter is accepted and then silently truncated:
 * the reminder fires at the pre-filter edge instead (#2534). So the field
 * refuses what the sweep cannot honour, and both read this constant.
 * `test/contract-renewal-lookahead.test.ts` reads both back out of the shipped
 * metadata and fails if they drift apart.
 *
 * A field bound checks the value being written, so a contract stored above it
 * before the bound existed keeps saving other edits, and the sweep still
 * reminds it at this many days out.
 */
export const RENEWAL_LOOKAHEAD_DAYS = 120;

/**
 * Contract Object
 * Represents legal contracts with customers
 */
export const Contract = ObjectSchema.create({
  name: 'crm_contract',
  label: 'Contract',
  pluralLabel: 'Contracts',
  icon: 'file-pen-line',
  description: 'Legal contracts and agreements',

  // ADR-0090 D1/D7: OWD is an authored decision. Master-detail child of
  // crm_account — a contract IS account data: reachable by whoever can reach
  // the account, editable by whoever can edit it (#549, ruling 2026-08-31).
  sharingModel: 'controlled_by_parent',
  // The record title is the contract's name (hotcrm#2746), as on the quote and
  // the order: approvals, notifications, lookup chips and the account's
  // Contracts tab show it, so two contracts of one customer read apart. Until
  // then the title was the autonumber `contract_number` (the retired
  // `titleFormat` '{contract_number} - {crm_account.name}' minus its dot-walk),
  // and every one of those places showed a bare CTR- number.
  nameField: 'name',
  // Explicit search targets (ADR-0061): the picker and global search match
  // the number as well as the name. A name may repeat; the number never does.
  searchableFields: ['name', 'contract_number'],
  // `contract_number` leads the strip, so it stands beside the name wherever
  // the name alone is the title: the record header, and the lookup picker,
  // which shows the strip's first field under each candidate's name and as
  // the column after it (measured on 18.6.0; the quote does the same).
  highlightFields: ['contract_number', 'crm_account', 'status', 'start_date', 'end_date'],

  fieldGroups: [
    { key: 'basic',     label: 'Contract Information', icon: 'info' },
    { key: 'parties',   label: 'Parties',              icon: 'users' },
    { key: 'terms',     label: 'Terms & Dates',        icon: 'calendar' },
    { key: 'value',     label: 'Contract Value',       icon: 'dollar-sign' },
    { key: 'status',    label: 'Status & Approval',    icon: 'check-circle' },
    { key: 'renewal',   label: 'Renewal',              icon: 'refresh-ccw', collapse: 'collapsed' },
    // The last Change on an activated contract (hotcrm#2804): its reason and
    // its signed amendment. Every earlier one is in the field history.
    { key: 'change',    label: 'Last Change',          icon: 'file-diff', collapse: 'collapsed' },
  ],

  fields: {
    // Platform ownership anchor — canonical note in `account.object.ts` (#548).
    owner_id: Field.lookup('sys_user', {
      label: 'Contract Owner',
      group: 'parties',
      system: true,
      readonly: false,
      trackHistory: true,
    }),

    // AutoNumber field
    contract_number: Field.autonumber({
      label: 'Contract Number',
      group: 'basic',
      format: 'CTR-{0000}',
    }),

    // The contract's name, what people call it ("Annual Service 2027",
    // "Phase 2 Implementation"): the record title (`nameField`, above).
    // Drafted contracts take their source's name (`../flows/_contract-draft.ts`).
    //
    // `required` WITHOUT `storage: { notNull: true }`, unlike the other
    // required fields here, and on purpose (AGENTS.md Metadata semantics rule
    // 11). `required` is the write contract: a new contract, and any write
    // that clears the name, is refused (ADR-0113). The column constraint is
    // what an installed database cannot take: contracts saved before this
    // field have no name, and on 18.6.0 adding a NOT NULL column to the
    // existing table fails the contract's whole schema sync (measured on
    // SQLite, hotcrm#2746: "Cannot add a NOT NULL column with default value
    // NULL"), leaving contracts unwritable. Nullable, the column is added, an
    // old contract still saves an edit that does not touch its name, and
    // `scripts/backfill-contract-names.ts` names the old rows.
    name: Field.text({
      label: 'Contract Name',
      group: 'basic',
      required: true,
      searchable: true,
      maxLength: 255,
    }),
    
    // The contract's FORM (hotcrm#2804, maintainer ruling 2026-11-26): what
    // the contract is FOR, which decides where its value comes from. Distinct
    // from `contract_type` below, which says what is agreed (subscription,
    // service, NDA …) and stays as it is.
    //
    //   - `order`: drafted from one order by Draft Contract
    //     (`../flows/sales-order-draft-contract.flow.ts`), which names that
    //     order in `crm_sales_order`. Its value IS the order's amount: while
    //     the contract is a draft it follows the order, and it is never typed.
    //   - `framework`: created by hand, may carry many orders, its value typed
    //     by hand. The default for a contract a person creates.
    //   - `other`: carries no amount (an NDA, say); the value is not required.
    //
    // A person chooses between Framework and Other while the contract is a
    // draft. Order is not offered (the option shows only on a contract that
    // already is one), and `contract_form_and_change` (`./contract.hook.ts`)
    // refuses a person who writes it, or who moves an order contract to
    // another form. `readonlyWhen` makes the field read-only on the form once
    // either holds. A contract saved before this field existed takes its
    // form by the backfill rule the next time it is written (the hook), and
    // `scripts/backfill-contract-form.ts` writes each one once.
    //
    // `required` WITHOUT `storage: { notNull: true }`, as `name` above and for
    // the same reason (AGENTS.md Metadata semantics rule 11): contracts saved
    // before this field have none, and a NOT NULL column cannot be added to
    // the installed table.
    contract_form: Field.select({
      label: 'Contract Form',
      group: 'basic',
      required: true,
      options: [
        {
          label: 'Order Contract', value: 'order',
          visibleWhen: P`has(record.contract_form) && record.contract_form == "order"`,
        },
        { label: 'Framework Contract', value: 'framework', default: true },
        { label: 'Other', value: 'other' },
      ],
      readonlyWhen: P`(has(record.contract_form) && record.contract_form == "order") || (has(record.status) && record.status != "draft")`,
      description: 'Order Contract: drafted from an order, its value is the order amount. Framework Contract: its value is typed, and it may carry many orders. Other: no amount, such as an NDA.',
    }),

    // The order an order contract was drafted from (hotcrm#2804). Written by
    // Draft Contract's elevated insert and, for a contract that predates the
    // field, by the backfill rule in `contract.hook.ts`; `readonly`, so no
    // person sets it. An order still names its contract in its own
    // `crm_contract`; this is the other direction, for the contract alone.
    crm_sales_order: Field.lookup('crm_sales_order', {
      label: 'Source Order',
      group: 'basic',
      readonly: true,
      description: 'The order this contract was drafted from.',
    }),

    // Relationships — the master the OWD derives from. Authored as
    // master-detail so the master is not decided by declaration order against
    // the required `crm_contact` lookup below (objectstack#14747).
    crm_account: Field.masterDetail('crm_account', {
      label: 'Account',
      group: 'parties',
      required: true,
      storage: { notNull: true },
      deleteBehavior: 'cascade',
      // The account's Contracts tab: the name and the number side by side.
      relatedListColumns: ['name', 'contract_number', 'status', 'start_date', 'end_date', 'contract_value'],
    }),
    
    crm_contact: Field.lookup('crm_contact', {
      label: 'Primary Contact',
      group: 'parties',
      required: true,
      storage: { notNull: true },
      // @objectstack 12: string[] `referenceFilters` is dead (not read by the
      // picker); `dependsOn` is the live cascading-lookup form — scopes contacts
      // to the contract's `crm_account` (ADR-0049).
      dependsOn: ['crm_account'],
      relatedListColumns: ['name', 'contract_number', 'crm_account', 'status', 'end_date'],
    }),

    crm_opportunity: Field.lookup('crm_opportunity', {
      label: 'Related Opportunity',
      group: 'parties',
      // Scope opportunities to the contract's account (was dead referenceFilters).
      dependsOn: ['crm_account'],
      relatedListColumns: ['name', 'contract_number', 'status', 'start_date', 'end_date', 'contract_value'],
    }),
    

    // Status
    status: Field.select({
      label: 'Status',
      group: 'status',
      // Lifecycle `kind` (#2375): Activated is the contract's successful end,
      // and Expired and Terminated are its unsuccessful ones, so the record
      // path draws each from this declaration instead of guessing from the
      // value's spelling.
      options: [
        { label: 'Draft', value: 'draft', color: '#999999', kind: 'open', default: true },
        { label: 'In Approval', value: 'in_approval', color: '#FFA500', kind: 'open' },
        { label: 'Activated', value: 'activated', color: '#00AA00', kind: 'won' },
        { label: 'Expired', value: 'expired', color: '#FF0000', kind: 'lost' },
        { label: 'Terminated', value: 'terminated', color: '#666666', kind: 'lost' },
      ],
      required: true,
      storage: { notNull: true },
      trackHistory: true,
    }),
    
    // Contract Terms
    contract_term_months: Field.number({
      label: 'Contract Term (Months)',
      group: 'terms',
      required: true,
      storage: { notNull: true },
      min: 1,
    }),
    
    // Dated with the year, never "Yesterday" (#2317): the term's two dates are
    // printed on the contract document (`contract_print_page`), and the
    // console's default style reads a date within a week as a relative word
    // (measured on 18.3.0: a printed contract started "Yesterday"). `short`
    // reads "Sep 14, '26", as the quote's dates do (#2370 row 9,
    // docs/developers/number-formats.md).
    //
    // The term's dates, the value and the payment terms keep their history
    // (hotcrm#2804): the record's History shows each change before and after,
    // who made it and when. On an activated contract the end date, the value
    // and the payment terms change only through Change
    // (`../actions/contract.actions.ts`): `readonlyWhen` holds them read-only
    // on the form and drops a direct write from any caller, and
    // `contract_form_and_change` refuses a person's direct write by name and
    // writes the values a Change carries. The start date is not one of the
    // three: the ruling names the end date.
    start_date: Field.date({
      label: 'Start Date',
      group: 'terms',
      format: 'short',
      required: true,
      storage: { notNull: true },
      trackHistory: true,
    }),
    
    end_date: Field.date({
      label: 'End Date',
      group: 'terms',
      format: 'short',
      required: true,
      storage: { notNull: true },
      trackHistory: true,
      readonlyWhen: P`has(record.status) && record.status == "activated"`,
    }),
    
    // Financial
    //
    // An order contract's value is its order's amount (hotcrm#2804): never
    // typed, so read-only on the form whatever the status, and written by
    // `contract_form_and_change` from `order_amount` while the contract is a
    // draft, and by a Change's "Update from Order" once it is activated.
    //
    // An Other contract carries no amount, and nobody has to type one: the
    // value defaults to 0, the backfill rule's "no amount". It stays
    // `required` + NOT NULL rather than `requiredWhen` (Other exempt): the
    // platform refuses `requiredWhen` beside `storage.notNull` (ADR-0113),
    // and the installed column is NOT NULL.
    contract_value: Field.currency({ 
      label: 'Contract Value',
      group: 'value',
      min: 0,
      required: true,
      defaultValue: 0,
      storage: { notNull: true },
      trackHistory: true,
      readonlyWhen: P`(has(record.contract_form) && record.contract_form == "order") || (has(record.status) && record.status == "activated")`,
    }),

    // The amounts of the orders placed under this contract (hotcrm#2804):
    // `total_price`, the order's tax-inclusive total (subtotal less discount,
    // plus tax and shipping; `sales_order.hook.ts`). On an order contract
    // that is its one order. The platform keeps it, rewriting it whenever an
    // order under the contract changes, and that rewrite is what lets a
    // draft order contract follow its order (`contract_form_and_change`).
    // Shown on an order contract only: a framework contract's quota is sub 4
    // of hotcrm#2803, not this field.
    order_amount: Field.summary({
      label: 'Order Amount',
      group: 'value',
      scale: 2,
      readonly: true,
      visibleWhen: P`has(record.contract_form) && record.contract_form == "order"`,
      description: "The order's total, tax included.",
      summaryOperations: {
        object: 'crm_sales_order',
        field: 'total_price',
        function: 'sum',
        relationshipField: 'crm_contract',
      },
    }),

    // The sign the ruling asks for (hotcrm#2804): an order contract whose
    // value no longer equals its order's amount — the order changed after the
    // contract was activated, or the contract predates the rule (item 7: such
    // contracts are listed, not corrected). A sign, never a block (AGENTS.md
    // rule 8). Empty, not "No", when the two agree or on another form, so the
    // record page folds it away.
    order_amount_differs: Field.formula({
      label: 'Differs from the Order Amount',
      group: 'value',
      returnType: 'boolean',
      // Judged only once the order amount is known: a contract that predates
      // the field holds NULL there until the roll-up is materialised.
      expression: F`has(record.contract_form) && record.contract_form == "order"
        && has(record.order_amount) && record.order_amount != null
        && double(record.order_amount)
          != (has(record.contract_value) && record.contract_value != null ? double(record.contract_value) : 0.0)
        ? true : null`,
      description: "The contract value no longer equals the order's amount. Change, with Update from Order, takes the order's amount.",
    }),
    
    billing_frequency: Field.select({
      label: 'Billing Frequency',
      group: 'value',
      options: [
        { label: 'Monthly', value: 'monthly', default: true },
        { label: 'Quarterly', value: 'quarterly' },
        { label: 'Annually', value: 'annually' },
        { label: 'One-time', value: 'one_time' },
      ]
    }),
    
    payment_terms: Field.select({
      label: 'Payment Terms',
      group: 'value',
      // The list shared with Quote: an accepted quote's terms (incl.
      // due_on_receipt) must survive the copy onto the contract. That copy is
      // `quote_accepted_contract_draft` (src/sales/flows/_contract-draft.ts, for
      // that flow and the order's Draft Contract, hotcrm#2558). The
      // list's `net_30` option default applies only when the quote itself
      // carried no term, which is the intended fall-through, not a gap.
      picklist: 'payment_terms',
      // Changed only through Change once activated (hotcrm#2804; see the
      // dates above).
      trackHistory: true,
      readonlyWhen: P`has(record.status) && record.status == "activated"`,
    }),
    
    // Renewal
    auto_renewal: Field.boolean({
      label: 'Auto Renewal',
      group: 'renewal',
      defaultValue: false,
    }),
    
    renewal_notice_days: Field.number({
      label: 'Renewal Notice (Days)',
      group: 'renewal',
      min: 0,
      // The sweep's look-ahead: a longer window would fire late (#2534).
      max: RENEWAL_LOOKAHEAD_DAYS,
      defaultValue: 30,
    }),
    
    // Legal
    contract_type: Field.select({
      label: 'Contract Type',
      group: 'basic',
      options: [
        { label: 'Subscription', value: 'subscription' },
        { label: 'Service Agreement', value: 'service' },
        { label: 'License', value: 'license' },
        { label: 'Partnership', value: 'partnership' },
        { label: 'NDA', value: 'nda' },
        { label: 'MSA', value: 'msa' },
      ]
    }),
    
    signed_date: Field.date({
      label: 'Signed Date',
      group: 'status',
    }),
    
    signed_by: Field.text({
      label: 'Signed By',
      group: 'status',
      maxLength: 255,
    }),

    // The countersigned copy the customer sends back (REQ-0008 phase 3,
    // #2317): Print Contract (`print_contract`) files the document that goes
    // out; this is what comes back, uploaded by the rep. Writing it fills
    // `signed_date` when that is empty (`contract_signed_copy_date`,
    // `contract.hook.ts`).
    //
    // A TRANSITION GATE, not an invariant (AGENTS.md Metadata semantics rule
    // 7): Activated requires it. The engine refuses the write that takes a
    // contract INTO `activated` without a signed copy, an insert born
    // activated without one, and a write that clears it from an activated
    // contract — each against this field, by its label. A contract that was
    // already activated without one when this rule shipped keeps saving
    // unrelated edits, and leaves `activated` for `expired` or `terminated`
    // as before: the engine exempts a row that was already outside the
    // requirement, and neither end state is inside it.
    //
    // The read is guarded (#630): `has(record.status)` first.
    signed_copy: Field.file({
      label: 'Signed Copy',
      group: 'status',
      requiredWhen: P`has(record.status) && record.status == "activated"`,
      description: 'The contract as the customer signed it. Required to activate the contract; uploading it fills Signed Date when that is empty.',
    }),
    
    document_url: Field.url({
      label: 'Contract Document',
      group: 'basic',
    }),
    
    // Terms & Conditions
    special_terms: Field.markdown({
      label: 'Special Terms',
      group: 'terms',
    }),
    
    description: Field.markdown({
      label: 'Description',
      group: 'basic',
    }),

    /**
     * Which automation drafted this contract, as a stable key (#2535).
     *
     * `quote_acceptance` is stamped by every drafted contract — the flow
     * `quote_accepted_contract_draft` and the order's Draft Contract, both
     * built by `src/sales/flows/_contract-draft.ts` (hotcrm#2558) — and
     * `contract_drafted_notice`
     * (`src/sales/flows/contract-drafted-notice.flow.ts`) fires on it. The
     * provenance sentence in `description` is TEXT, written in the
     * organization's language, so it cannot be the mark: a notice that matched
     * its English opening fell silent in every other language.
     *
     * It names the automation, never the quote: a drafted contract is a
     * starting point and is deliberately not tied to its quote (#1129 ruling
     * B; the lookup #1253 described was not staged). A contract a person
     * creates carries none. `readonly` + `hidden` — the drafting flow writes as
     * `system`, which the readonly strip exempts, and the key stays out of
     * forms and pickers (the pairing `crm_account.name_normalized` uses).
     */
    automation_key: Field.text({
      label: 'Automation Key',
      group: 'status',
      description: 'Which automation drafted this contract. Written by that automation; never edit.',
      readonly: true,
      hidden: true,
      maxLength: 100,
    }),
    
    // ─── Change (hotcrm#2804) ─────────────────────────────────────────────
    // An activated contract changes its value, end date and payment terms
    // only through Change (`../actions/contract.actions.ts`), with a reason
    // and the signed amendment. The status stays Activated, so renewal and
    // expiry go on as before; no change order is created, the order is not
    // changed and the payment plan is not re-planned.
    //
    // The reason and the amendment are what Change records: the last one
    // here, every one in the field history with who and when. Neither is on
    // the edit form (`../views/contract.view.ts`); a write that carries them
    // IS a change, and `contract_form_and_change` holds it to the rules.
    change_reason: Field.textarea({
      label: 'Change Reason',
      group: 'change',
      maxLength: 2000,
      trackHistory: true,
      description: 'Why the contract was last changed. Written by Change.',
    }),

    change_amendment: Field.file({
      label: 'Signed Amendment',
      group: 'change',
      trackHistory: true,
      description: 'The amendment the customer signed for the last change. Written by Change.',
    }),

    // What one Change asks for: the dialog's inputs, which the hook moves
    // onto the three locked fields and then clears, in the same write.
    // `readonlyWhen` drops a CALLER's write to a locked field, so a Change
    // cannot write them itself; a value the hook derives is not a caller's
    // write and is kept (the platform's sanctioned path for a conditionally
    // locked field). `hidden`: they hold nothing between Changes.
    change_new_value: Field.currency({
      label: 'New Contract Value',
      group: 'change',
      min: 0,
      hidden: true,
      description: 'Leave empty to keep the contract value.',
    }),

    change_new_end_date: Field.date({
      label: 'New End Date',
      group: 'change',
      format: 'short',
      hidden: true,
      description: 'Leave empty to keep the end date.',
    }),

    change_new_payment_terms: Field.select({
      label: 'New Payment Terms',
      group: 'change',
      picklist: 'payment_terms',
      hidden: true,
      description: 'Leave empty to keep the payment terms.',
    }),

    change_from_order: Field.boolean({
      label: 'Update from Order',
      group: 'change',
      defaultValue: false,
      hidden: true,
      description: "Take the order's current amount as the contract value.",
    }),

    // Billing Address
    billing_address: Field.address({
      label: 'Billing Address',
      group: 'value',
    }),
  },
  
  // Database indexes
  indexes: [
    { fields: ['crm_account'] },
    { fields: ['status'] },
    { fields: ['start_date'] },
    { fields: ['end_date'] },
    { fields: ['owner_id'] },
  ],
  
  // Enable advanced features
  // API surface. History → Field.trackHistory (ADR-0052).
  enable: {
    apiEnabled: true,
    apiMethods: ['get', 'list', 'create', 'update', 'delete'],
    // #602 — the executed contract itself. `document_url` remains the pointer
    // to an external DMS copy; this is where the file actually lives.
    // See the canonical capability note in `src/sales/objects/index.ts`.
    files: true,
  },
  
  // Validation Rules
  //
  // Predicates below are TOTAL: every `record.x` read is `has()`-guarded, so the
  // rule returns a verdict even when the merged record has no such key. See
  // AGENTS.md "Validation predicates must be TOTAL" and
  // test/object-validation-predicates.test.ts, which fails the build otherwise.
  validations: [
    {
      name: 'end_after_start',
      type: 'script',
      severity: 'error',
      message: 'End Date must be after Start Date',
      condition: P`has(record.end_date) && record.end_date != null && has(record.start_date) && record.start_date != null && record.end_date <= record.start_date`,
    },
    // NOTE: the `valid_contract_term` warning (months-between term check) was
    // dropped in the 9.8.0 upgrade — its CEL predicate used `monthsBetween()`,
    // which 9.8.0's aligned CEL stdlib (ADR-0032) no longer provides. It was a
    // non-blocking warning; the hard end-date>start-date rule above remains.
    {
      // #575 B4. Like `crm_quote`, this object shipped a lifecycle vocabulary
      // with no transition constraint and no status guard in `contract.hook.ts`
      // — so `draft → activated` was a legal move, activating an agreement that
      // never passed approval. Activation is the consequential edge here:
      // `contract_signed_date_stamp` stamps `signed_date`, `contract_on_activation`
      // promotes the account to `customer`, and the renewal flow starts counting from it.
      //
      // `error`, unlike the lead / opportunity / case / quote machines (#2192).
      // CON-002 (`docs/feature-inventory.md`) makes both end states final, and
      // at `warning` an expired contract re-activated, an activated one went
      // back to draft and a draft activated without approval, each saving with
      // 200 and feeding the account promotion and the billing hand-off. The
      // quote holds its end states with the `quote_workflow` freeze; this rule
      // is the contract's only hold. It judges a write that CHANGES `status`
      // and nothing else: an edit that leaves the status as stored, and a
      // create (no `initialStates`, so seeds and imports land in any state),
      // pass untouched, so no stored row is frozen by it.
      name: 'contract_status_progression',
      type: 'state_machine',
      severity: 'error',
      message:
        'This status change is not allowed. A contract moves Draft → In Approval → Activated → Expired; In Approval can go back to Draft, and Draft, In Approval or Activated can be Terminated. Expired and Terminated are final: a renewal is a new contract.',
      field: 'status',
      transitions: {
        draft: ['in_approval', 'terminated'],
        // Approval either lands (`activated`) or sends the paperwork back.
        in_approval: ['draft', 'activated', 'terminated'],
        // `→ expired` is the contract_expiration flow, whose own sweep filter
        // is `status: 'activated'` — nothing else ages out.
        activated: ['expired', 'terminated'],
        // Both ends are terminal: a renewal is a NEW contract (the
        // contract_renewal flow files a task, it does not revive the old row).
        expired: [],
        terminated: [],
      },
    },
  ],
  
  // Workflow Rules
  // ⚠️ No `workflows[]` here, and none is possible: object `workflows[]` were
  // removed from the platform. Field updates live in this object's `*.hook.ts`;
  // scheduled status flips and notifications live in `src/*/flows/*.flow.ts`.
});
