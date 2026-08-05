// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { ObjectSchema, Field } from '@objectstack/spec/data';
import { F, P } from '@objectstack/spec';
import { SALUTATION_OPTIONS, INDUSTRY_OPTIONS, LEAD_SOURCE_OPTIONS } from './_picklists';

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

    // `salutation` is a picklist, so the formula sees the raw VALUE (`ms`, `dr`),
    // not the label — names rendered as "ms Emily Davis" in lists and details
    // (#461). Dropped here and from `display_title` below, matching Contact.
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
     * compares against `crm_account.name_normalized` (#626).
     *
     * ### Why the LEAD needs one too
     *
     * A normalized column on `crm_account` alone does not fix anything: the
     * conversion flow would then be comparing a raw company string against a
     * folded account name, and `"ACME  Corp"` still would not match
     * `acme corp`. Both sides of the comparison have to be canonical, and the
     * flow cannot canonicalize either one — measured on 17.0.0-rc.1,
     * `service-automation`'s `resolveToken` accepts exactly one function form
     * (`NOW()` / `TODAY()`), so `{LOWER(x)}`, `{TRIM(x)}` and
     * `{x.toLowerCase()}` all resolve to `undefined`. See the field comment on
     * `crm_account.name_normalized` for the full measurement, and
     * `test/account-name-normalized-match.test.ts`, which re-runs it.
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

    // Contact Information
    //
    // NOT `unique` (#598). A hard uniqueness constraint on a lead's email is a
    // statement that a person may enquire once, ever — and the database
    // enforced it by REJECTING the second enquiry. Real funnels re-capture the
    // same address routinely (a prospect who filled the web form in March comes
    // back in August), so the constraint turned an ordinary follow-up into a
    // 500 on the public form. Duplicates are now a fact to be RECORDED, not an
    // error: `lead_duplicate_check` in lead.hook.ts links the new lead to the
    // record it repeats (see the `duplicates` field group below).
    //
    // Because the field-level `unique: true` is what used to index this column,
    // the plain index below replaces it — the intake dedupe lookup, the
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
    // NOT `readonly`: since 16.x the platform drops writes to readonly fields
    // outright (#2948), including the lead_conversion flow's mark_converted
    // update. Edit-protection is the beforeUpdate guard in lead.hook.ts, which
    // rejects any USER edit to a converted lead outside a small allow-list.
    // A `cannot_edit_converted` validation used to sit beside it covering the
    // four identity fields, described as the friendlier recoverable half of a
    // two-layer design. It was dead configuration and was removed in #575 B1:
    // the hook's beforeUpdate throws first, so the validation never produced
    // the error it promised (measured on 16.1.0 — a `PATCH company` on a
    // converted lead returns the hook's message). Same shape as the
    // `revenue_positive` rule removed in #571.
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

    // ── Duplicate management (#598) ──────────────────────────────────────
    //
    // `disqualification_reason: 'duplicate'` shipped for a long time with
    // nothing behind it: a rep could close a lead as a duplicate and the record
    // never said WHAT it duplicated, so the "duplicate" bar on the
    // disqualification breakdown pointed at nothing you could open.
    //
    // The surviving record can live on either object — a still-open lead, or a
    // contact the prospect already became — and `Field.lookup` takes exactly one
    // target (`Field.lookup(['crm_lead','crm_contact'])` is rejected at schema
    // parse: "reference: expected string, received array"). So the link is the
    // same TYPE-DISCRIMINATOR shape `crm_task.related_to_*` already uses on this
    // repo: one select naming the object, one lookup per object, and the pairing
    // enforced declaratively. This is deliberately not a new pattern.
    duplicate_of_type: Field.select({
      label: 'Duplicate Of',
      group: 'duplicates',
      description: 'Which object holds the surviving record this lead repeats.',
      options: [
        { label: 'Lead',    value: 'crm_lead' },
        { label: 'Contact', value: 'crm_contact' },
      ],
    }),

    // The type↔lookup pairing is `requiredWhen`, not a script validation:
    // "the lookup named by the type must be populated" is exactly a conditional
    // write contract, the engine evaluates it on insert and update
    // (objectql `evaluateValidationRules`), and it reports against the FIELD, so
    // the form marks the empty lookup instead of showing a record-level error.
    // `crm_task` states the same intent as a warning-severity script rule
    // (`related_to_required`) because it predates `requiredWhen` (ADR-0113);
    // it is the same rule, declared where the platform can act on it.
    //
    // ⚠️ `has(...)` is load-bearing, not decoration — see the note on
    // `duplicate_disqualification_requires_survivor` below. A bare
    // `record.duplicate_of_type == "crm_lead"` aborts with `No such key` on any
    // record whose merged shape simply omits the column, and the engine's
    // response to a predicate that fails to evaluate is to SKIP it
    // ("requiredWhen for 'duplicate_of_lead' failed to evaluate — skipped").
    // The rule would then read as enforced and require nothing at all.
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
  // (see validations[] below). 7.7 removed the top-level `stateMachines` key —
  // status state machines are now expressed in the validation union.

  // Database indexes for performance
  //
  // `email` is indexed but NOT unique (#598). It used to be indexed only as a
  // side effect of the field-level `unique: true`, which built the tenant
  // composite `(organization_id, email)`; dropping the constraint would
  // otherwise have dropped the index with it and left three read paths — the
  // `lead_duplicate_check` intake lookup, the `crm_lead_import` upsert key and
  // the conversion flow — scanning the table on every write.
  //
  // Do NOT add `unique: true` back here either: a single-column unique index
  // makes the platform-wide constraint win over the per-tenant composite
  // (framework#3991), so two organizations could not work the same address
  // independently. Uniqueness is not the rule this object wants at all.
  indexes: [
    { fields: ['owner_id'] },
    { fields: ['status'] },
    { fields: ['company'] },
    { fields: ['email'] },
  ],
  
  // Dead object-level enable.* flags removed in @objectstack 12 (ADR-0049);
  // only the live API surface remains. History → Field.trackHistory (ADR-0052).
  enable: {
    apiEnabled: true,
  },
  
  // ADR-0079: render-only `titleFormat` retired in favor of `nameField`
  // (the `display_title` formula field defined above).
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
      // The field description has promised "Required when status is
      // Unqualified" since the field was added, and nothing enforced it — a
      // lead could sit in `unqualified` with no recorded reason, which is the
      // one datum a disqualification review needs. Same shape as
      // `crm_case.escalation_reason_required` (the repo's existing
      // "required when state is X" idiom).
      name: 'disqualification_reason_required',
      type: 'script',
      severity: 'error',
      message: 'Disqualification reason is required when a lead is Unqualified',
      condition: P`has(record.status) && record.status == "unqualified" && (!has(record.disqualification_reason) || isBlank(record.disqualification_reason))`,
    },
    {
      // "Disqualified as a duplicate" has to name the survivor (#598).
      //
      // Same shape as `disqualification_reason_required` directly above — a
      // declarative condition on the record, evaluated by the engine on insert
      // and update, with no hook involved. The two clauses are the two things
      // the field-level `requiredWhen` on the lookups cannot say:
      //
      //   1. `duplicate_of_type` must be chosen, which is what makes exactly one
      //      of the two `requiredWhen` predicates fire and demand its lookup.
      //   2. `duplicate_status` must be `confirmed` SPECIFICALLY. `requiredWhen`
      //      asks whether a field is populated, not what it holds — and a lead
      //      closed on the machine's `suspected` guess is precisely the outcome
      //      this rule exists to prevent. A human has to look and agree.
      //
      // Neither clause duplicates the `requiredWhen` predicates: those pair the
      // type with its lookup, this one requires the type in the first place.
      //
      // ⚠️ Every field reference is wrapped in `has(...)`, and that is what
      // makes this rule an enforced rule rather than a decorative one.
      //
      // The engine evaluates a validation against `{...previous, ...data}`. It
      // fills absent fields with null on INSERT — but not on UPDATE, where
      // `previous` is whatever the driver returned, and a driver that stores
      // only the columns a row was written with hands back a record with no
      // `duplicate_status` key at all. Strict CEL then aborts the whole
      // predicate with `No such key: duplicate_status`, and a predicate that
      // fails to evaluate is SKIPPED, not failed:
      //
      //     WARN Validation rule 'duplicate_disqualification_requires_survivor'
      //          predicate failed to evaluate (…) — skipped
      //
      // Measured, not theorised: the unguarded first draft of this rule let a
      // lead be closed as a duplicate with no survivor named, silently, on the
      // in-memory driver — which is the driver the whole test suite runs on.
      // `has()` makes the predicate TOTAL, so it returns a verdict for every
      // record shape instead of an error for some of them.
      name: 'duplicate_disqualification_requires_survivor',
      type: 'script',
      severity: 'error',
      message:
        'Disqualifying a lead as Duplicate requires naming the surviving record and setting Duplicate Status to Confirmed',
      condition: P`has(record.disqualification_reason) && record.disqualification_reason == "duplicate" && !(has(record.duplicate_of_type) && !isBlank(record.duplicate_of_type) && has(record.duplicate_status) && record.duplicate_status == "confirmed")`,
    },
    {
      // Migrated from the removed top-level `stateMachines` key (LeadStateMachine).
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
  
  // NOTE: object `workflows[]` were removed in @objectstack 7.7. Field-updates
  // moved to this object's *.hook.ts; scheduled status-flips & notifications
  // moved to src/flows/*.flow.ts (see flows/index.ts).
});
