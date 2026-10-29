// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { ObjectSchema, Field } from '@objectstack/spec/data';
import { F, P, cel } from '@objectstack/spec';
import { QUOTE_DISCOUNT_CEILING } from '../../sales/objects/_thresholds';

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

  // ADR-0090 D1/D7: OWD is an authored decision. Master-detail child of
  // crm_account — a quote is reachable by whoever can reach its account, and
  // its line items derive one level further (#549, ruling 2026-08-31).
  sharingModel: 'controlled_by_parent',
  // ADR-0079: render-only `titleFormat` retired in favor of `nameField`,
  // which names a real field. The former template composed two local fields, so
  // a stored `display_title` field reproduces it for the record title.
  nameField: 'display_title',
  // Explicit search targets (ADR-0061): the real columns the lookup picker
  // and global search match. Until #2230 they were required, because the
  // title was a formula with no column for `$search` to default to. The
  // title is stored now; these stay because they name what is searched.
  searchableFields: ['name', 'quote_number'],
  highlightFields: ['quote_number', 'name', 'crm_account', 'status', 'total_price'],

  fieldGroups: [
    { key: 'basic',     label: 'Quote Information', icon: 'info' },
    { key: 'pricing',   label: 'Pricing',           icon: 'dollar-sign' },
    { key: 'terms',     label: 'Terms & Validity',  icon: 'calendar' },
    { key: 'address',   label: 'Addresses',         icon: 'map-pin', collapse: 'collapsed' },
    { key: 'system',    label: 'System',            icon: 'database', collapse: 'collapsed' },
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
    // Stored, not a formula (#2230, objectstack#24981 ruling A): the engine
    // computes the expression on every insert and every update by id and
    // stores the result, so an import matches a lookup cell against this title
    // and sort and search read a real column. `readonly` keeps it off the
    // forms; a value a client sends never stands. Rows stored before #2230
    // are titled by `scripts/backfill-record-titles.ts`.
    display_title: Field.text({
      readonly: true,
      label: 'Display Title',
      group: 'basic',
      expression: F`record.quote_number + " - " + record.name`,
    }),

    // Relationships — the master the OWD derives from (authored, not positional).
    crm_account: Field.masterDetail('crm_account', {
      label: 'Account',
      group: 'basic',
      required: true,
      storage: { notNull: true },
      deleteBehavior: 'cascade',
    }),
    
    crm_contact: Field.lookup('crm_contact', {
      label: 'Contact',
      group: 'basic',
      // A TRANSITION GATE, not an invariant (#1017, narrowed by #2161; AGENTS.md
      // Metadata semantics rule 7). Optional at draft time. Required on the
      // write that takes the quote INTO `presented` or `accepted`, and on every
      // write while it is `presented`. Once the quote is accepted, the
      // requirement has done its job and the link may be cleared.
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
      // WHY THE ACCEPTED HALF STOPS AT THE ACCEPTING WRITE (#2161, the
      // maintainer's ruling A of 2026-10-19). The contract is drafted from
      // that one write (`quote_accepted_contract_draft` reads the contact off
      // it), so that is the write that needs a recipient. After it the quote is
      // settled and frozen, and #720 (maintainer, 2026-08-11) holds: "A frozen
      // record must not make the people it references undeletable." The engine
      // frees a deleted contact by writing `{ crm_contact: null }` on every
      // quote that names it (`set_null`), and while this rule also covered an
      // ALREADY-accepted quote it refused that write: measured on
      // 18.0.0-next.3, `DELETE /data/crm_contact/<id>` answered 400 "Contact is
      // required", so the person stayed undeletable, and so did the account
      // above them. Reading `previous` keeps the requirement on the write that
      // turns a quote accepted and lifts it from every write after, so both
      // rulings hold: no contract is drafted without a recipient (#1017), and
      // the person who signed can still be erased (#720). The accepted quote
      // stays, with its contact cleared — the trade #720 accepted for a closed
      // deal's `primary_contact`. `contact_integrity` (contact.hook.ts) no
      // longer counts an accepted quote for the same reason.
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
      // ⚠️ Every read is guarded (#630), and the guards are load-bearing — the
      // same trap documented at `lead.object.ts`'s duplicate lookups. A bare
      // `record.status == "presented"` aborts with `No such key` on any merged
      // record that simply omits the column, and since 17.0.0-rc.2 the engine's
      // answer to a predicate that fails to evaluate is to REJECT the write
      // ("requiredWhen for 'crm_contact' failed to evaluate … — write
      // rejected"; before rc.2 it was skipped in silence), so an unguarded
      // read would refuse every write to such a row. `previous` is null on an
      // insert, so `previous == null` decides an insert (a quote born accepted
      // still needs its contact) before `previous.status` is read, and
      // `has(previous.status)` covers a prior row stored without it. (Measured
      // on 18.0.0-next.5: `has()` on a null `previous` also answers false, so
      // the two overlap on an insert. The explicit `previous == null` is kept:
      // it is the spelling the engine's own unevaluable-`previous` diagnostic
      // asks for, and it does not lean on that answer.)
      //
      // @objectstack 12: string[] `referenceFilters` is dead (not read by the
      // picker); `dependsOn` is the live cascading form — scopes contacts to the
      // quote's `crm_account` (ADR-0049).
      dependsOn: ['crm_account'],
      requiredWhen: P`has(record.status) && (record.status == "presented" || (record.status == "accepted" && (previous == null || !has(previous.status) || previous.status != "accepted")))`,
      description:
        'Required on the save that moves the quote to Presented or Accepted — the drafted contract takes its Primary Contact from here.',
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
      // `kind` (#2366 row 10): the record path draws Accepted as the quote's
      // successful end and Rejected / Expired as its unsuccessful ends, not as
      // later steps after Accepted. `test/status-option-kinds.test.ts`.
      //
      // The three settled options are offered on an EXISTING quote only
      // (#2366 row 3): `record.id` is absent on the New form, so a new quote
      // starts at Draft, In Review or Presented. The predicate is total and
      // true for every stored row, so it never refuses a write to one; the
      // refusal of a user's create at a settled status is `quote_workflow`'s
      // (`quote.hook.ts`), which names the quote and says what to do instead
      // — this option rule's own refusal is the platform's fixed "option is
      // not available". Pinned in `test/quote-settled-actions.test.ts`.
      options: [
        { label: 'Draft', value: 'draft', color: '#999999', default: true, kind: 'open' },
        { label: 'In Review', value: 'in_review', color: '#FFA500', kind: 'open' },
        { label: 'Presented', value: 'presented', color: '#4169E1', kind: 'open' },
        { label: 'Accepted', value: 'accepted', color: '#00AA00', kind: 'won', visibleWhen: P`has(record.created_at)` },
        { label: 'Rejected', value: 'rejected', color: '#FF0000', kind: 'lost', visibleWhen: P`has(record.created_at)` },
        { label: 'Expired', value: 'expired', color: '#666666', kind: 'lost', visibleWhen: P`has(record.created_at)` },
      ],
      required: true,
      storage: { notNull: true },
      trackHistory: true,
    }),
    
    // Dates
    quote_date: Field.date({
      label: 'Quote Date',
      group: 'terms',
      // Dated with the year, never "Yesterday" (#2370 row 9): a quote's dates
      // bound a commitment, and the console's default style read them
      // relative within a week and dropped the year for this year's dates.
      // `short` reads "Sep 14, '26" (docs/developers/number-formats.md).
      format: 'short',
      required: true,
      storage: { notNull: true },
      defaultValue: cel`today()`,
    }),
    
    // A quote is valid for 30 days from its quote date unless the rep sets
    // another date (#2060 item 7, B-11). Declared here rather than stamped by
    // `quote_workflow`, which did it until this change: measured on
    // 18.0.0-next.3, the console's New Quote form refused "Please check the
    // highlighted fields: Expiration Date" and sent nothing, because the form
    // cannot see a hook's default, while a REST insert stored quote_date + 30.
    // A runtime `defaultValue` is the one default the form reads as the
    // server's to fill ("Set automatically when saved.", no required mark on
    // create), and the engine applies it on every insert door, an import with
    // automations off and the dry-run preview included. `required` stays: an
    // update may still not clear the date.
    //
    // ⚠️ `record.quote_date` is in scope because `quote_date` is declared
    // ABOVE this field: the engine applies defaults in declaration order, so
    // a quote that names no date already holds today's here.
    // `test/form-required-server-defaults.test.ts` pins both.
    expiration_date: Field.date({
      label: 'Expiration Date',
      group: 'terms',
      format: 'short', // with the year, as `quote_date` above
      required: true,
      storage: { notNull: true },
      defaultValue: cel`addDays(record.quote_date, 30)`,
    }),
    
    // Pricing
    // `discount_amount` / `total_price` are DERIVED, so they are `readonly`
    // (#2110). Their one writer is `quote_workflow` (`quote.hook.ts`), which
    // derives both inside the write that changes an input: a create carrying a
    // `subtotal`, or an update of an unsettled quote carrying `subtotal`,
    // `discount`, `tax` or `shipping_handling`. The other writers reach the two
    // figures only through it: `quote_total_rollup` (`quote_line_item.hook.ts`)
    // writes `subtotal` alone, and `quote_generation` writes `subtotal` and
    // `discount` at create.
    //
    // Why `readonly` does not freeze them (measured on 18.0.0-next.3,
    // `test/hooks-runtime.test.ts`): for a non-system caller the engine holds a
    // read-only key the CALLER sent back from the before-hooks and drops it
    // after them, on update and (since 17.4.0) on create, but it never drops a
    // key a before-hook wrote. So a person's typed figure is ignored (200, and
    // the column keeps the derived figure) while the derivation lands. A system
    // write (a seed, an import) is not stripped at all. `subtotal` stays
    // editable: on a quote with no line items it is the rep's own number.
    subtotal: Field.currency({
      label: 'Subtotal',
      group: 'pricing',
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
    
    // Terms
    payment_terms: Field.select({
      label: 'Payment Terms',
      group: 'terms',
      // The list shared with Contract (#490) —
      // `src/sales/picklists/payment_terms.picklist.ts`.
      picklist: 'payment_terms',
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
  
  // A settled quote (Accepted, Rejected, Expired) offers no Edit (#2366 row 2).
  // `quote_workflow` (`quote.hook.ts`) refuses a user's edit of one, so the
  // button only led to a form that was refused at save. The guard is the
  // hook's; this is the courtesy half. What a settled quote still takes —
  // Internal Notes, and a Rejected quote's move back to Draft — stays open to
  // the API, and the move is the `revise_quote` action
  // (`src/revenue/actions/quote.actions.ts`). The predicate is total: an
  // absent status (the page's first render) offers Edit, as before. The same
  // predicate gates New on the quote's line items, in
  // `quote_line_item.object.ts`. Pinned in `test/quote-settled-actions.test.ts`.
  userActions: {
    edit: {
      visibleWhen: P`!(has(record.status) && (record.status == "accepted" || record.status == "rejected" || record.status == "expired"))`,
    },
  },

  // Enable advanced features
  // API surface. History → Field.trackHistory (ADR-0052).
  enable: {
    apiEnabled: true,
    apiMethods: ['get', 'list', 'create', 'update', 'delete'],
    // #602 — the generated quote PDF and the customer's countersigned copy.
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
      // The path in business words, by the status labels (#2371 row 7). It
      // read "Invalid quote status transition", naming neither the move nor
      // the moves allowed. A state-machine message takes no holes on 18.2.0,
      // so it cannot name THIS move's two statuses; the response's
      // `constraint` carries `from` / `to`, and the console shows only this
      // sentence. So it states the whole graph below, as
      // `contract_status_progression` does. Each locale pack restates it with
      // its own option labels, held to them by `test/refusal-labels.test.ts`.
      message:
        "This status change is off the quote's usual path: Draft → In Review → Presented → Accepted. In Review can also go back to Draft or be Rejected, Presented can be Rejected, and a Rejected quote returns to Draft. Draft, In Review or Presented can become Expired. Accepted and Expired are final.",
      field: 'status',
      transitions: {
        // `→ expired` is legal from every UNSETTLED state: the quote_expiration
        // flow sweeps on `expiration_date` alone and expires drafts that were
        // never sent as readily as presented ones.
        draft: ['in_review', 'expired'],
        in_review: ['draft', 'presented', 'rejected', 'expired'],
        presented: ['accepted', 'rejected', 'expired'],
        // `accepted` and `expired` are terminal, and not only by convention —
        // `quote_workflow` in quote.hook.ts freezes both, allowing edits
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
  // scheduled status flips and notifications live in `src/*/flows/*.flow.ts`.
});
