// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { ObjectSchema, Field } from '@objectstack/spec/data';
import { F, P, cel } from '@objectstack/spec';
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
  ],

  fields: {
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
      searchable: true,
      group: 'identity',
    }),

    last_name: Field.text({
      label: 'Last Name',
      required: true,
      searchable: true,
      group: 'identity',
    }),

    full_name: Field.formula({
      label: 'Full Name',
      expression: F`joinNonEmpty([record.salutation, record.first_name, record.last_name], ' ')`,
      group: 'identity',
    }),

    // ADR-0079 record title (was titleFormat '{full_name} - {company}').
    // Composed from the same source fields as `full_name` (not formula-on-formula)
    // plus `company`, so the title resolves from real stored values.
    display_title: Field.formula({
      label: 'Display Title',
      expression: F`joinNonEmpty([record.salutation, record.first_name, record.last_name], ' ') + " - " + record.company`,
      group: 'identity',
    }),

    // Company Information
    company: Field.text({
      label: 'Company',
      required: true,
      searchable: true,
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
    email: Field.email({
      label: 'Email',
      required: true,
      unique: true,
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
    owner: Field.lookup('sys_user', {
      defaultValue: cel`os.user.id`,
      label: 'Lead Owner',
      group: 'assignment',
      trackHistory: true,
    }),

    // Conversion tracking.
    // NOT `readonly`: since 16.x the platform drops writes to readonly fields
    // outright (#2948), including the lead_conversion flow's mark_converted
    // update. Edit-protection comes from two places: the `cannot_edit_converted`
    // validation below (4 identity fields, recoverable error) and the broader
    // beforeUpdate guard in lead.hook.ts, which rejects ANY edit to a
    // converted lead.
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
      description: 'Rich text notes with formatting',
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

    last_contacted_date: Field.datetime({
      label: 'Last Contacted',
      readonly: true,
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
  },

  // Lifecycle transitions are enforced via a `state_machine` validation rule
  // (see validations[] below). 7.7 removed the top-level `stateMachines` key —
  // status state machines are now expressed in the validation union.

  // Database indexes for performance
  //
  // No `{ fields: ['email'], unique: true }` here: the field-level
  // `unique: true` already builds the tenant composite `(organization_id,
  // email)` since framework #3696. Declaring the single-column index too made
  // the platform-wide constraint win and left the per-tenant one unreachable
  // (framework#3991) — two organizations must be able to work the same lead
  // address independently.
  indexes: [
    { fields: ['owner'] },
    { fields: ['status'] },
    { fields: ['company'] },
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
  highlightFields: ['full_name', 'company', 'email', 'status', 'owner'],
  
  // Removed: list_views and form_views belong in UI configuration, not object definition
  
  validations: [
    {
      name: 'email_required',
      type: 'script',
      severity: 'error',
      message: 'Email is required',
      condition: P`isBlank(record.email)`,
    },
    {
      name: 'cannot_edit_converted',
      type: 'script',
      severity: 'error',
      message: 'Cannot edit a converted lead',
      condition: P`record.is_converted == true && (record.company != previous.company || record.email != previous.email || record.first_name != previous.first_name || record.last_name != previous.last_name)`,
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
