// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { ObjectSchema, Field } from '@objectstack/spec/data';
import { F, P, cel } from '@objectstack/spec';
import { PAYMENT_TERMS_OPTIONS } from './_picklists';
import { QUOTE_DISCOUNT_CEILING } from './_thresholds';

/**
 * Quote Object
 * Represents price quotes sent to customers
 */
export const Quote = ObjectSchema.create({
  name: 'crm_quote',
  label: 'Quote',
  pluralLabel: 'Quotes',
  icon: 'file-text',
  description: 'Price quotes for customers',

  // ADR-0090 D1/D7: OWD is an authored decision. Owner only.
  sharingModel: 'private',
  // ADR-0079: render-only `titleFormat` retired in favor of `nameField`,
  // which names a real field. The former template composed two local fields, so
  // a `display_title` formula field reproduces it for the record title.
  nameField: 'display_title',
  // Explicit search targets (ADR-0061). REQUIRED because nameField is a
  // FORMULA (display_title/full_name): without this, $search auto-defaults to
  // the formula field, which isn't a real column, so the lookup picker + global
  // search silently return zero. These are real, indexed columns.
  searchableFields: ['name', 'quote_number'],
  highlightFields: ['quote_number', 'name', 'crm_account', 'status', 'total_price'],

  fieldGroups: [
    { key: 'basic',     label: 'Quote Information', icon: 'info' },
    { key: 'pricing',   label: 'Pricing',           icon: 'dollar-sign' },
    { key: 'terms',     label: 'Terms & Validity',  icon: 'calendar' },
    { key: 'address',   label: 'Addresses',         icon: 'map-pin', defaultExpanded: false },
    { key: 'system',    label: 'System',            icon: 'database', defaultExpanded: false },
  ],

  fields: {
    // Platform ownership anchor — canonical note in `account.object.ts` (#548).
    owner_id: Field.lookup('sys_user', {
      label: 'Quote Owner',
      group: 'basic',
      system: true,
      readonly: false,
      trackHistory: true,
    }),

    // AutoNumber field
    quote_number: Field.autonumber({
      label: 'Quote Number',
      group: 'basic',
      format: 'QTE-{0000}',
    }),
    
    // Basic Information
    name: Field.text({
      label: 'Quote Name',
      group: 'basic',
      required: true,
      storage: { notNull: true },
      searchable: true,
      maxLength: 255,
    }),

    // ADR-0079 record title (was titleFormat '{quote_number} - {name}').
    display_title: Field.formula({
      label: 'Display Title',
      group: 'basic',
      expression: F`record.quote_number + " - " + record.name`,
    }),

    // Relationships
    crm_account: Field.lookup('crm_account', {
      label: 'Account',
      group: 'basic',
      required: true,
      storage: { notNull: true },
    }),
    
    crm_contact: Field.lookup('crm_contact', {
      label: 'Contact',
      group: 'basic',
      // Optional AT DRAFT TIME, required from `presented` on (#1017).
      //
      // quote_generation maps the opportunity's `primary_contact`, which is
      // itself optional — a flat `required: true` here meant contact-less
      // opportunities could never draft a quote at all. So the recipient is
      // nailed down by the time a quote is PRESENTED, not when it is drafted.
      // That sentence sat in this comment for the field's whole life with
      // nothing enforcing it: no rule stopped a contact-less quote reaching
      // `presented` or `accepted`, and the bill came due one object over.
      // `crm_contract.crm_contact` is `required` + `notNull`, so accepting such
      // a quote made `quote_on_accepted` fail to draft the contract — since
      // #714/#1013 that failure is honest and no longer swallows the close-won
      // leg, but the hook is `async` + `onError: 'log'`, so the accepting write
      // still answers 200 and the only evidence is a server log nobody reads.
      // `requiredWhen` moves the same refusal to the synchronous, someone-is-
      // watching moment: the rep is told on the write that turns the quote
      // outward, against the field, with the quote still editable.
      //
      // WHY EXACTLY `presented` + `accepted`, and not the other two terminal
      // states. Both of those are reachable WITHOUT the quote ever being sent
      // (see the `quote_status_progression` transitions below):
      //   • `expired` — the `quote_expiration` flow sweeps on `expiration_date`
      //     alone and expires never-sent drafts as readily as presented ones.
      //     Requiring a recipient there would make a nightly system write fail
      //     on exactly the quotes that have no recipient BECAUSE nobody sent
      //     them, and the sweep's `runAs: 'system'` would not exempt it — the
      //     gate applies on write, not on actor.
      //   • `rejected` — legal straight from `in_review`, i.e. a quote killed
      //     internally before anyone saw it. Demanding a contact to file that
      //     verdict asks for a recipient the quote never had.
      // Neither state passes anything on to a contract, so neither needs one.
      //
      // ⚠️ `has(record.status)` is load-bearing, not decoration — the same trap
      // documented at `lead.object.ts`'s duplicate lookups: a bare
      // `record.status == "presented"` aborts with `No such key` on any merged
      // record that simply omits the column, and the engine's answer to a
      // predicate that fails to evaluate is to SKIP it ("requiredWhen for
      // 'crm_contact' failed to evaluate — skipped"). The rule would then read
      // as enforced and require nothing at all.
      //
      // @objectstack 12: string[] `referenceFilters` is dead (not read by the
      // picker); `dependsOn` is the live cascading form — scopes contacts to the
      // quote's `crm_account` (ADR-0049).
      dependsOn: ['crm_account'],
      requiredWhen: P`has(record.status) && (record.status == "presented" || record.status == "accepted")`,
      description:
        'Required once the quote is Presented or Accepted — the drafted contract takes its Primary Contact from here.',
    }),

    crm_opportunity: Field.lookup('crm_opportunity', {
      label: 'Opportunity',
      group: 'basic',
      // Scope opportunities to the quote's account (was dead referenceFilters).
      dependsOn: ['crm_account'],
    }),


    // Status
    status: Field.select({
      label: 'Status',
      group: 'basic',
      options: [
        { label: 'Draft', value: 'draft', color: '#999999', default: true },
        { label: 'In Review', value: 'in_review', color: '#FFA500' },
        { label: 'Presented', value: 'presented', color: '#4169E1' },
        { label: 'Accepted', value: 'accepted', color: '#00AA00' },
        { label: 'Rejected', value: 'rejected', color: '#FF0000' },
        { label: 'Expired', value: 'expired', color: '#666666' },
      ],
      required: true,
      storage: { notNull: true },
      trackHistory: true,
    }),
    
    // Dates
    quote_date: Field.date({
      label: 'Quote Date',
      group: 'terms',
      required: true,
      storage: { notNull: true },
      defaultValue: cel`today()`,
    }),
    
    expiration_date: Field.date({
      label: 'Expiration Date',
      group: 'terms',
      required: true,
      storage: { notNull: true },
    }),
    
    // Pricing
    // subtotal/discount_amount/total_price are NOT `readonly`, and the writer
    // that decides it is the LINE-ITEM ROLLUP — not the flow this note used to
    // name. `quote_total_rollup` (`quote_line_item.hook.ts`) recomputes all
    // three on every line insert/update/delete through
    // `api.object('crm_quote').update(...)`: a cross-record write via `ctx.api`,
    // which is a `ScopedContext` over the ACTING USER's context. The keys are
    // therefore CALLER-supplied to a non-`isSystem` UPDATE, exactly what
    // `stripReadonlyFields` deletes — with `readonly` on, a quote's totals would
    // freeze at whatever the flow first seeded and never track its lines again.
    // ⚠️ `quote_generation` writes them too, but at CREATE time, and the strip
    // is an UPDATE-path rule — that write would survive `readonly` untouched.
    // The retired 16.x claim rested on that create-time write, which is how this
    // note reached a right conclusion from the wrong writer.
    // Measured in `test/readonly-write-semantics.test.ts` (insert is exempt) and
    // `test/activity-recency.test.ts` (the `ctx.api` strip, on the real engine).
    subtotal: Field.currency({ 
      label: 'Subtotal',
      group: 'pricing',
      scale: 2,
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
      scale: 2,
    }),
    
    tax: Field.currency({ 
      label: 'Tax',
      group: 'pricing',
      scale: 2,
    }),
    
    shipping_handling: Field.currency({ 
      label: 'Shipping & Handling',
      group: 'pricing',
      scale: 2,
    }),
    
    total_price: Field.currency({ 
      label: 'Total Price',
      group: 'pricing',
      scale: 2,
    }),
    
    // Terms
    payment_terms: Field.select({
      label: 'Payment Terms',
      group: 'terms',
      // Canonical set shared with Contract (#490) — see _picklists.ts.
      options: [...PAYMENT_TERMS_OPTIONS],
    }),
    
    shipping_terms: Field.text({
      label: 'Shipping Terms',
      group: 'terms',
      maxLength: 255,
    }),
    
    // Billing & Shipping Address
    billing_address: Field.address({
      label: 'Billing Address',
      group: 'address',
    }),

    shipping_address: Field.address({
      label: 'Shipping Address',
      group: 'address',
    }),
    
    // Notes
    description: Field.markdown({
      label: 'Description',
      group: 'basic',
    }),
    
    internal_notes: Field.textarea({
      label: 'Internal Notes',
      group: 'system',
    }),
  },
  
  // Database indexes
  indexes: [
    { fields: ['crm_account'] },
    { fields: ['crm_opportunity'] },
    { fields: ['owner_id'] },
    { fields: ['status'] },
    { fields: ['quote_date'] },
  ],
  
  // Enable advanced features
  // API surface. History → Field.trackHistory (ADR-0052).
  enable: {
    apiEnabled: true,
    apiMethods: ['get', 'list', 'create', 'update', 'delete'],
    // #602 — the generated quote PDF and the customer's countersigned copy.
    // See the canonical capability note in `src/objects/index.ts`.
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
      name: 'expiration_after_quote',
      type: 'script',
      severity: 'error',
      message: 'Expiration Date must be after Quote Date',
      condition: P`has(record.expiration_date) && record.expiration_date != null && has(record.quote_date) && record.quote_date != null && record.expiration_date <= record.quote_date`,
    },
    {
      // #599. The only discount constraint this object ever had was the field's
      // own `max: 100` — the arithmetic domain of a percentage — so a rep could
      // put 90% off a $99K deal on a quote and nothing anywhere objected: the
      // approval flow keys on the opportunity's AMOUNT, and $99K is under the
      // large-deal line. This is the policy ceiling that constraint never was.
      //
      // ⚠️ A predicate of `record.discount > 100` here would be DEAD: field-level
      // bounds are evaluated BEFORE object validations, so `discount: 150` is
      // already refused by `max: 100` with `code: 'max_value'` and the message
      // "Discount % must be ≤ 100", and the rule's own message is unreachable on
      // every input that could reach it.
      //
      // ### Why a script validation and not a lower `max` on the field
      //
      // This is an INVARIANT — "a quote's discount may never exceed the
      // ceiling" — not a transition condition, and #1069 is open on exactly
      // that distinction for `requiredWhen`. Both instruments were measured
      // against a row stored above the ceiling before the rule existed
      // (`test/quote-discount-ceiling.test.ts` runs the measurement):
      //
      //   Field.percent({ max: 60 })   legacy row, unrelated edit → ADMITTED
      //   this rule                    legacy row, unrelated edit → REFUSED
      //
      // A field bound checks the value being WRITTEN; a script validation is
      // evaluated against the MERGED record on every write. So `max` carries
      // the same silent legacy hole #1069 describes, in a second instrument,
      // and the rule does not. The cost of the invariant, stated rather than
      // hidden: an over-ceiling row is frozen to everything except the repair —
      // bringing the discount back under the ceiling is admitted, and is an
      // ordinary edit. HotCRM ships no such row (deepest seeded discount: 20%).
      //
      // `max: 100` stays on the field as the domain of a percentage. The policy
      // number lives in `_thresholds.ts`, interpolated into both the predicate
      // and the message so the two cannot disagree.
      name: 'discount_within_ceiling',
      type: 'script',
      severity: 'error',
      message: `Discount cannot exceed ${QUOTE_DISCOUNT_CEILING}%`,
      condition: P`has(record.discount) && record.discount != null && record.discount > ${QUOTE_DISCOUNT_CEILING}`,
    },
    {
      // #575 B4. `crm_quote` had a full lifecycle vocabulary and no transition
      // constraint whatsoever — nor a status guard in `quote.hook.ts` — so a
      // quote could go straight from `draft` to `accepted`, which in CPQ terms
      // is a signed number nobody reviewed or sent. `warning` severity matches
      // the lead / opportunity / case machines: it flags the jump on the record
      // without blocking a support-driven correction.
      name: 'quote_status_progression',
      type: 'state_machine',
      severity: 'warning',
      message: 'Invalid quote status transition',
      field: 'status',
      transitions: {
        // `→ expired` is legal from every UNSETTLED state: the quote_expiration
        // flow sweeps on `expiration_date` alone and expires drafts that were
        // never sent as readily as presented ones.
        draft: ['in_review', 'expired'],
        in_review: ['draft', 'presented', 'rejected', 'expired'],
        presented: ['accepted', 'rejected', 'expired'],
        // `accepted` and `expired` are terminal, and not only by convention —
        // `quote_pricing_guard` in quote.hook.ts freezes both, allowing edits
        // to `internal_notes` and nothing else.
        accepted: [],
        expired: [],
        // A rejected quote is not frozen: the rep revises the numbers and
        // re-issues, which starts again at `draft`.
        rejected: ['draft'],
      },
    },
  ],
  
  // Workflow Rules
  // ⚠️ No `workflows[]` here, and none is possible: object `workflows[]` were
  // removed from the platform. Field updates live in this object's `*.hook.ts`;
  // scheduled status flips and notifications live in `src/flows/*.flow.ts`.
});
