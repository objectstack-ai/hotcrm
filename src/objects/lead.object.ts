// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { ObjectSchema, Field } from '@objectstack/spec/data';
import { F, P } from '@objectstack/spec';
import {
  SALUTATION_OPTIONS,
  INDUSTRY_OPTIONS,
  LEAD_SOURCE_OPTIONS,
  DUPLICATE_OF_TYPE_OPTIONS,
} from './_picklists';

export const Lead = ObjectSchema.create({
  name: 'crm_lead',
  label: 'Lead',
  pluralLabel: 'Leads',
  icon: 'user-plus',
  description: 'Potential customers not yet qualified',

  // ADR-0090 D1/D7: OWD is an authored decision. Owner-worked queue.
  sharingModel: 'private',
  
  fieldGroups: [
    { key: 'identity',     label: 'Identity',           icon: 'user-plus' },
    { key: 'company_info', label: 'Company Information', icon: 'building' },
    { key: 'contact_info', label: 'Contact Information', icon: 'phone' },
    { key: 'qualification', label: 'Qualification',     icon: 'star' },
    { key: 'assignment',   label: 'Assignment',         icon: 'user' },
    { key: 'address',      label: 'Address',            icon: 'map-pin', defaultExpanded: false },
    { key: 'additional',   label: 'Additional Info',    icon: 'info', defaultExpanded: false },
    { key: 'preferences',  label: 'Communication Preferences', icon: 'bell-off', defaultExpanded: false },
    { key: 'conversion',   label: 'Conversion',         icon: 'check-circle', defaultExpanded: false },
    { key: 'duplicates',   label: 'Duplicate Management', icon: 'copy', defaultExpanded: false },
  ],

  fields: {
    // Platform ownership anchor — canonical note in `account.object.ts` (#548).
    owner_id: Field.lookup('sys_user', {
      label: 'Lead Owner',
      group: 'assignment',
      system: true,
      readonly: false,
      trackHistory: true,
    }),

    // Personal Information
    salutation: Field.select({
      label: 'Salutation',
      group: 'identity',
      // Canonical set shared with Contact (#490) — see _picklists.ts.
      options: [...SALUTATION_OPTIONS],
    }),

    first_name: Field.text({
      label: 'First Name',
      required: true,
      storage: { notNull: true },
      searchable: true,
      group: 'identity',
    }),

    last_name: Field.text({
      label: 'Last Name',
      required: true,
      storage: { notNull: true },
      searchable: true,
      group: 'identity',
    }),

    // ⚠️ `salutation` is a picklist, so a formula sees the raw VALUE (`ms`,
    // `dr`), not the label — including it renders names as "ms Emily Davis" in
    // lists and details. Dropped here and from `display_title` below, matching
    // Contact.
    full_name: Field.formula({
      label: 'Full Name',
      expression: F`joinNonEmpty([record.first_name, record.last_name], ' ')`,
      group: 'identity',
    }),

    // ADR-0079 record title (was titleFormat '{full_name} - {company}').
    // Composed from the same source fields as `full_name` (not formula-on-formula)
    // plus `company`, so the title resolves from real stored values.
    display_title: Field.formula({
      label: 'Display Title',
      expression: F`joinNonEmpty([record.first_name, record.last_name], ' ') + " - " + record.company`,
      group: 'identity',
    }),

    // Company Information
    company: Field.text({
      label: 'Company',
      required: true,
      storage: { notNull: true },
      searchable: true,
      group: 'company_info',
    }),

    /**
     * Case- and whitespace-folded copy of `company` — the value lead conversion
     * compares against `crm_account.name_normalized`.
     *
     * ### Why the LEAD needs one too
     *
     * ⚠️ A normalized column on `crm_account` alone fixes nothing: the
     * conversion flow would then compare a raw company string against a folded
     * account name, and `"ACME  Corp"` still would not match `acme corp`. Both
     * sides have to be canonical, and the flow can canonicalize neither —
     * `service-automation`'s `resolveToken` accepts exactly one function form
     * (`NOW()` / `TODAY()`), so `{LOWER(x)}`, `{TRIM(x)}` and
     * `{x.toLowerCase()}` all resolve to `undefined`. See the field comment on
     * `crm_account.name_normalized` for the full measurement.
     *
     * `company` itself is NOT folded in place: it is the display value, it is
     * copied verbatim onto the account the conversion creates, and lower-casing
     * it would ship `acme corp` as a customer-visible account name. That is the
     * one way this differs from `email`, which has no meaningful case and so is
     * canonicalized in place.
     *
     * Derived, never authored: `lead_duplicate_check` recomputes it on every
     * write that carries `company`. Not indexed — nothing filters on it; it is
     * read off the lead record the flow already fetched.
     */
    company_normalized: Field.text({
      label: 'Company (Normalized)',
      description:
        'Match key for lead conversion: Company lower-cased, trimmed, with internal whitespace collapsed. Maintained by the lead_duplicate_check hook — never edit directly.',
      readonly: true,
      hidden: true,
      maxLength: 255,
      group: 'company_info',
    }),

    title: Field.text({
      label: 'Job Title',
      group: 'company_info',
    }),

    industry: Field.select({
      label: 'Industry',
      group: 'company_info',
      // Canonical set shared with Account (#490): lead_conversion copies this
      // value onto the created Account, so both objects MUST agree.
      options: [...INDUSTRY_OPTIONS],
    }),

    // ⚠️ NOT `unique`. A hard uniqueness constraint on a lead's email says a
    // person may enquire once, ever, and the database enforces it by REJECTING
    // the second enquiry — turning an ordinary follow-up into a 500 on the
    // public form. Real funnels re-capture the same address routinely.
    // Duplicates are a fact to be RECORDED, not an error: `lead_duplicate_check`
    // in lead.hook.ts links the new lead to the record it repeats (see the
    // `duplicates` field group below). The plain index below is what keeps the
    // column indexed in the constraint's absence — the intake dedupe lookup, the
    // `crm_lead_import` upsert key and the conversion flow all read leads by
    // email on every write.
    email: Field.email({
      label: 'Email',
      required: true,
      storage: { notNull: true },
      group: 'contact_info',
    }),

    phone: Field.text({
      label: 'Phone',
      format: 'phone',
      group: 'contact_info',
    }),

    mobile: Field.text({
      label: 'Mobile',
      format: 'phone',
      group: 'contact_info',
    }),

    website: Field.url({
      label: 'Website',
      group: 'contact_info',
    }),

    // Lead Qualification
    status: Field.select({
      label: 'Lead Status',
      required: true,
      storage: { notNull: true },
      group: 'qualification',
      trackHistory: true,
      // Field-level default: option-level `default: true` only preselects in
      // UI forms after first paint; the quick-create dialog and API inserts
      // need a real defaultValue (see approval_status for the same lesson).
      defaultValue: 'new',
      options: [
        { label: 'New', value: 'new', color: '#808080', default: true },
        { label: 'Contacted', value: 'contacted', color: '#FFA500' },
        { label: 'Qualified', value: 'qualified', color: '#4169E1' },
        { label: 'Unqualified', value: 'unqualified', color: '#FF0000' },
        { label: 'Converted', value: 'converted', color: '#00AA00' },
      ]
    }),

    rating: Field.rating(5, {
      label: 'Lead Score',
      description: 'Lead quality score (1-5 stars)',
      group: 'qualification',
    }),

    lead_source: Field.select({
      label: 'Lead Source',
      group: 'qualification',
      // Canonical set shared with Contact + Opportunity (#490): lead_conversion
      // copies this value onto the created Opportunity, so all three MUST agree.
      options: [...LEAD_SOURCE_OPTIONS],
    }),

    // Assignment

    // Conversion tracking.
    // ⛔ NOT `readonly`: the platform drops writes to readonly fields outright,
    // including the `lead_conversion` flow's `mark_converted` update.
    // Edit-protection is the `beforeUpdate` guard in `lead.hook.ts`, which
    // rejects any USER edit to a converted lead outside a small allow-list —
    // and it is the ONLY guard, deliberately: a script validation beside it
    // never fires, because the hook's throw always wins the race.
    is_converted: Field.boolean({
      label: 'Converted',
      defaultValue: false,
      group: 'conversion',
      trackHistory: true,
    }),

    converted_account: Field.lookup('crm_account', {
      label: 'Converted Account',
      group: 'conversion',
    }),

    converted_contact: Field.lookup('crm_contact', {
      label: 'Converted Contact',
      group: 'conversion',
    }),

    converted_opportunity: Field.lookup('crm_opportunity', {
      label: 'Converted Opportunity',
      group: 'conversion',
    }),

    converted_date: Field.datetime({
      label: 'Converted Date',
      group: 'conversion',
    }),

    // Address (using new address field type)
    address: Field.address({
      label: 'Address',
      group: 'address',
    }),

    // Additional Info
    annual_revenue: Field.currency({
      label: 'Annual Revenue',
      scale: 2,
      group: 'additional',
    }),

    number_of_employees: Field.number({
      label: 'Number of Employees',
      group: 'additional',
    }),

    description: Field.markdown({
      label: 'Description',
      group: 'additional',
    }),

    // Custom notes with rich text formatting
    notes: Field.richtext({
      label: 'Notes',
      description: 'Working notes on this lead — supports formatting.',
      group: 'additional',
    }),

    // Flags
    do_not_call: Field.boolean({
      label: 'Do Not Call',
      defaultValue: false,
      group: 'preferences',
    }),

    email_opt_out: Field.boolean({
      label: 'Email Opt Out',
      defaultValue: false,
      group: 'preferences',
    }),

    // Follow-up & disqualification tracking
    next_followup_date: Field.date({
      label: 'Next Follow-up Date',
      group: 'qualification',
    }),

    // NOT `readonly` (#592) — see the long note on
    // `crm_account.last_activity_date`. The activity bubble writes this from
    // another object's hook, and a readonly field is stripped from any
    // non-system write whose caller supplied the key (#2948), so every bubble
    // into this column was silently discarded.
    last_contacted_date: Field.datetime({
      label: 'Last Contacted',
      group: 'qualification',
    }),

    disqualification_reason: Field.select({
      label: 'Disqualification Reason',
      group: 'qualification',
      description: 'Required when status is Unqualified',
      options: [
        { label: 'Not a Fit',         value: 'not_a_fit' },
        { label: 'No Budget',         value: 'no_budget' },
        { label: 'Wrong Persona',     value: 'wrong_persona' },
        { label: 'Unreachable',       value: 'unreachable' },
        { label: 'Duplicate',         value: 'duplicate' },
        { label: 'Competitor',        value: 'competitor' },
        { label: 'Other',             value: 'other' },
      ],
    }),

    // ── Duplicate management ───────────────────────────────────────────
    //
    // `disqualification_reason: 'duplicate'` is only meaningful if the record
    // says WHAT it duplicates — otherwise the "duplicate" bar on the
    // disqualification breakdown points at nothing you can open.
    //
    // ⚠️ The surviving record can live on either object — a still-open lead, or
    // a contact the prospect already became — and `Field.lookup` takes exactly
    // one target (`Field.lookup(['crm_lead','crm_contact'])` is rejected at
    // schema parse: "reference: expected string, received array"). So the link
    // is the same TYPE-DISCRIMINATOR shape `crm_task.related_to_*` already uses:
    // one select naming the object, one lookup per object, and the pairing
    // enforced declaratively.
    //
    // The vocabulary is TWO sets, declared and split in `_picklists.ts`: the two
    // object names an author may pick, plus `erased` — a tombstone the form does
    // not offer and only `lead_duplicate_check` ever writes.
    //
    // The tombstone is what lets an erasure COMPLETE against a lead a human
    // confirmed as a duplicate, without relaxing one rule, so read it as a
    // constraint rather than as a spare value: `requiredWhen` below pairs only
    // `crm_lead` / `crm_contact`, so a tombstoned type never fires either
    // pairing and never demands a pointer to a record that is gone; and
    // `duplicate_disqualification_requires_survivor` asks for a NON-BLANK type
    // plus `duplicate_status == "confirmed"`, both of which a tombstoned lead
    // still satisfies — so the verdict a reviewer recorded survives the erasure
    // instead of being deleted as a side effect of someone else's GDPR request.
    // instead of being deleted as a side effect of someone else's GDPR request.
    duplicate_of_type: Field.select({
      label: 'Duplicate Of',
      group: 'duplicates',
      description: 'Which object holds the surviving record this lead repeats.',
      options: [...DUPLICATE_OF_TYPE_OPTIONS],
    }),

    // ⚠️ The type↔lookup pairing is `requiredWhen`, not a script validation:
    // "the lookup named by the type must be populated" is exactly a conditional
    // write contract, the engine evaluates it on insert and update, and it
    // reports against the FIELD, so the form marks the empty lookup instead of
    // showing a record-level error. (`crm_task` states the same intent as a
    // warning-severity script rule because it predates `requiredWhen`,
    // ADR-0113.)
    //
    // ⚠️ `has(...)` is load-bearing, not decoration. A bare
    // `record.duplicate_of_type == "crm_lead"` aborts with `No such key` on any
    // record whose merged shape omits the column, and the engine's response to a
    // predicate that fails to evaluate is to SKIP it ("requiredWhen for
    // 'duplicate_of_lead' failed to evaluate — skipped"). The rule would then
    // read as enforced and require nothing at all.
    //
    // ⚠️ Both lookups take the spec default `deleteBehavior: 'set_null'`, and
    // that is deliberate: a lead is a first-class record that happens to carry a
    // flag, so `cascade` would destroy the lead because the record it was
    // compared against was deleted. What keeps the pairing honest under a
    // `set_null` clear is the retirement block in `lead_duplicate_check`
    // (`lead.hook.ts`, job 1c): when a write leaves the named lookup blank it
    // drops `duplicate_of_type` and `duplicate_status` in the same write, so the
    // pair is never left half-stated and this rule never has to be loosened to
    // tolerate one. Read that note before changing either predicate.
    duplicate_of_lead: Field.lookup('crm_lead', {
      label: 'Duplicate Of Lead',
      group: 'duplicates',
      requiredWhen: P`has(record.duplicate_of_type) && record.duplicate_of_type == "crm_lead"`,
    }),

    duplicate_of_contact: Field.lookup('crm_contact', {
      label: 'Duplicate Of Contact',
      group: 'duplicates',
      requiredWhen: P`has(record.duplicate_of_type) && record.duplicate_of_type == "crm_contact"`,
    }),

    // Machine suspicion and human verdict are ONE field with two values, not two
    // parallel sets of link fields: the intake hook writes `suspected` and only
    // ever when this is blank (lead.hook.ts), so a human's `confirmed` survives
    // every later write, and both states stay queryable off one column.
    duplicate_status: Field.select({
      label: 'Duplicate Status',
      group: 'duplicates',
      trackHistory: true,
      description:
        'Suspected = flagged automatically at intake. Confirmed = a human verified the match.',
      options: [
        { label: 'Suspected', value: 'suspected', color: '#FFA500' },
        { label: 'Confirmed', value: 'confirmed', color: '#FF0000' },
      ],
    }),
  },

  // Lifecycle transitions are enforced via a `state_machine` validation rule
  // (see validations[] below). ⚠️ There is no top-level `stateMachines` key on
  // the platform — status state machines are expressed in the validation union.

  // Database indexes for performance
  //
  // ⚠️ `email` is indexed but NOT unique, and the index must stay explicit: it
  // used to exist only as a side effect of a field-level `unique: true`, so
  // dropping that constraint would otherwise have dropped the index with it and
  // left three read paths — the `lead_duplicate_check` intake lookup, the
  // `crm_lead_import` upsert key and the conversion flow — scanning the table
  // on every write.
  //
  // ⛔ Do NOT add `unique: true` back here: a single-column unique index makes
  // the platform-wide constraint win over the per-tenant composite
  // (framework#3991), so two organizations could not work the same address
  // independently. Uniqueness is not the rule this object wants at all.
  indexes: [
    { fields: ['owner_id'] },
    { fields: ['status'] },
    { fields: ['company'] },
    { fields: ['email'] },
  ],
  
  // API surface. History → Field.trackHistory (ADR-0052).
  enable: {
    apiEnabled: true,
  },
  
  // ADR-0079 record title — the `display_title` formula field defined above.
  nameField: 'display_title',
  // Explicit search targets (ADR-0061). REQUIRED because nameField is a
  // FORMULA (display_title/full_name): without this, $search auto-defaults to
  // the formula field, which isn't a real column, so the lookup picker + global
  // search silently return zero. These are real, indexed columns.
  searchableFields: ['first_name', 'last_name', 'company', 'email'],
  highlightFields: ['full_name', 'company', 'email', 'status', 'owner_id'],
  
  // Removed: list_views and form_views belong in UI configuration, not object definition
  
  // Predicates below are TOTAL: every `record.x` read is `has()`-guarded, so the
  // rule returns a verdict even when the merged record has no such key. See
  // AGENTS.md "Validation predicates must be TOTAL" and
  // test/object-validation-predicates.test.ts, which fails the build otherwise.
  validations: [
    {
      name: 'email_required',
      type: 'script',
      severity: 'error',
      message: 'Email is required',
      condition: P`!has(record.email) || isBlank(record.email)`,
    },
    {
      // The field description promises "Required when status is Unqualified";
      // this is what enforces it. A lead in `unqualified` with no recorded
      // reason loses the one datum a disqualification review needs. Same shape
      // as `crm_case.escalation_reason_required`.
      name: 'disqualification_reason_required',
      type: 'script',
      severity: 'error',
      message: 'Disqualification reason is required when a lead is Unqualified',
      condition: P`has(record.status) && record.status == "unqualified" && (!has(record.disqualification_reason) || isBlank(record.disqualification_reason))`,
    },
    {
      // "Disqualified as a duplicate" has to name the survivor.
      //
      // Same shape as `disqualification_reason_required` directly above — a
      // declarative condition evaluated by the engine on insert and update, with
      // no hook involved. The two clauses are the two things the field-level
      // `requiredWhen` on the lookups cannot say:
      //
      //   1. `duplicate_of_type` must be chosen, which is what makes exactly one
      //      of the two `requiredWhen` predicates fire and demand its lookup.
      //   2. `duplicate_status` must be `confirmed` SPECIFICALLY. `requiredWhen`
      //      asks whether a field is populated, not what it holds — and a lead
      //      closed on the machine's `suspected` guess is precisely the outcome
      //      this rule exists to prevent. A human has to look and agree.
      //
      // ⚠️ Every field reference is wrapped in `has(...)`, and that is what makes
      // this an enforced rule rather than a decorative one. The engine evaluates
      // a validation against `{...previous, ...data}` and fills absent fields
      // with null on INSERT — but not on UPDATE, where `previous` is whatever
      // the driver returned, and a driver that stores only the columns a row was
      // written with hands back a record with no `duplicate_status` key at all.
      // Strict CEL then aborts the whole predicate with `No such key`, and a
      // predicate that fails to evaluate is SKIPPED, not failed:
      //
      //     WARN Validation rule '…' predicate failed to evaluate (…) — skipped
      //
      // The unguarded first draft of this rule let a lead be closed as a
      // duplicate with no survivor named, silently, on the in-memory driver —
      // the driver the whole test suite runs on.
      name: 'duplicate_disqualification_requires_survivor',
      type: 'script',
      severity: 'error',
      message:
        'Disqualifying a lead as Duplicate requires naming the surviving record and setting Duplicate Status to Confirmed',
      condition: P`has(record.disqualification_reason) && record.disqualification_reason == "duplicate" && !(has(record.duplicate_of_type) && !isBlank(record.duplicate_of_type) && has(record.duplicate_status) && record.duplicate_status == "confirmed")`,
    },
    {
      name: 'lead_status_progression',
      type: 'state_machine',
      severity: 'warning',
      message: 'Invalid lead status transition',
      field: 'status',
      // Conversion (→ converted) is allowed from any worked-open status so the
      // Convert action's widened visibility (new/contacted/qualified) never trips
      // a spurious "invalid transition" warning when the flow stamps
      // status:'converted'.
      transitions: {
        new: ['contacted', 'qualified', 'unqualified', 'converted'],
        contacted: ['qualified', 'unqualified', 'converted'],
        qualified: ['converted', 'unqualified'],
        unqualified: ['new'],
        converted: [],
      },
    },
  ],
  
  // ⚠️ No `workflows[]` here, and none is possible: object `workflows[]` were
  // removed from the platform. Field updates live in this object's `*.hook.ts`;
  // scheduled status flips and notifications live in `src/flows/*.flow.ts`.
});
