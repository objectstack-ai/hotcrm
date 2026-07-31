import { F, cel } from '@objectstack/spec';
// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { ObjectSchema, Field } from '@objectstack/spec/data';
import { INDUSTRY_OPTIONS } from './_picklists';

export const Account = ObjectSchema.create({
  name: 'crm_account',
  label: 'Account',
  pluralLabel: 'Accounts',
  icon: 'building',
  description: 'Companies and organizations doing business with us',

  // ADR-0090 D1/D7: OWD is an authored decision. Owner + sharing rules (team/territory grants below).
  sharingModel: 'private',
  // ADR-0079: render-only `titleFormat` retired in favor of `nameField`,
  // which names a real field. The former template composed two local fields, so
  // a `display_title` formula field reproduces it for the record title.
  nameField: 'display_title',
  // Explicit search targets (ADR-0061). REQUIRED because nameField is a
  // FORMULA (display_title/full_name): without this, $search auto-defaults to
  // the formula field, which isn't a real column, so the lookup picker + global
  // search silently return zero. These are real, indexed columns.
  searchableFields: ['name', 'account_number'],
  highlightFields: ['account_number', 'name', 'type', 'owner'],

  // Field groups organize the form layout. Array order == display order.
  // Each field below opts in via `group: '<key>'`.
  fieldGroups: [
    { key: 'basic',        label: 'Basic Information',  icon: 'building' },
    { key: 'financials',   label: 'Financials',         icon: 'dollar-sign' },
    { key: 'contact_info', label: 'Contact Information', icon: 'phone' },
    { key: 'ownership',    label: 'Ownership & Status', icon: 'users' },
    { key: 'branding',     label: 'Branding',           icon: 'palette', defaultExpanded: false },
    { key: 'system',       label: 'System',             icon: 'settings', defaultExpanded: false },
  ],

  fields: {
    // AutoNumber field - Unique account identifier
    account_number: Field.autonumber({
      label: 'Account Number',
      format: 'ACC-{000000}',
      group: 'basic',
    }),

    // Basic Information
    name: Field.text({
      label: 'Account Name',
      required: true,
      storage: { notNull: true },
      searchable: true,
      maxLength: 255,
      group: 'basic',
    }),

    // ADR-0079 record title (was titleFormat '{account_number} - {name}').
    display_title: Field.formula({
      label: 'Display Title',
      expression: F`record.account_number + " - " + record.name`,
      group: 'basic',
    }),

    // Select fields with custom options
    type: Field.select({
      label: 'Account Type',
      group: 'basic',
      options: [
        { label: 'Prospect', value: 'prospect', color: '#FFA500', default: true },
        { label: 'Customer', value: 'customer', color: '#00AA00' },
        { label: 'Partner', value: 'partner', color: '#0000FF' },
        { label: 'Former Customer', value: 'former', color: '#999999' },
      ]
    }),

    industry: Field.select({
      label: 'Industry',
      group: 'basic',
      // Canonical set shared with Lead (#490): lead_conversion copies
      // `leadRecord.industry` onto the account it creates, so this must
      // accept every Lead value.
      options: [...INDUSTRY_OPTIONS],
    }),

    description: Field.markdown({
      label: 'Description',
      group: 'basic',
    }),

    // Number fields
    annual_revenue: Field.currency({
      label: 'Annual Revenue',
      scale: 2,
      min: 0,
      group: 'financials',
      trackHistory: true,
    }),

    number_of_employees: Field.number({
      label: 'Employees',
      min: 0,
      group: 'financials',
    }),

    // Contact Information
    phone: Field.text({
      label: 'Phone',
      format: 'phone',
      group: 'contact_info',
    }),

    website: Field.url({
      label: 'Website',
      group: 'contact_info',
    }),

    // Structured Address field (new field type)
    billing_address: Field.address({
      label: 'Billing Address',
      group: 'contact_info',
    }),

    // Office Location (new field type)
    office_location: Field.location({
      label: 'Office Location',
      group: 'contact_info',
    }),

    // Relationship fields
    owner: Field.lookup('sys_user', {
      defaultValue: cel`os.user.id`,
      label: 'Account Owner',
      group: 'ownership',
      trackHistory: true,
    }),

    parent_account: Field.lookup('crm_account', {
      label: 'Parent Account',
      description: 'Parent company in hierarchy',
      group: 'ownership',
    }),

    // Boolean field
    is_active: Field.boolean({
      label: 'Active',
      defaultValue: true,
      group: 'ownership',
      trackHistory: true,
    }),

    // Brand color (new field type)
    brand_color: Field.color({
      label: 'Brand Color',
      group: 'branding',
    }),

    // Company logo (uploaded image)
    logo: Field.image({
      label: 'Company Logo',
      group: 'branding',
    }),

    // Date field
    last_activity_date: Field.date({
      label: 'Last Activity Date',
      readonly: true,
      group: 'system',
    }),

    // ─── Customer Success / Account Health ────────────────────────────
    tier: Field.select({
      label: 'Customer Tier',
      group: 'ownership',
      options: [
        { label: 'Strategic',  value: 'strategic',  color: '#7C3AED' },
        { label: 'Enterprise', value: 'enterprise', color: '#4169E1' },
        { label: 'Mid-Market', value: 'mid_market', color: '#00AA00' },
        { label: 'SMB',        value: 'smb',        color: '#FFA500', default: true },
      ],
    }),

    segment: Field.select({
      label: 'Segment',
      group: 'ownership',
      options: [
        { label: 'Net New',    value: 'net_new' },
        { label: 'Growth',     value: 'growth' },
        { label: 'At Risk',    value: 'at_risk' },
        { label: 'Stable',     value: 'stable' },
      ],
    }),

    health_score: Field.select({
      label: 'Health Score',
      group: 'ownership',
      description: 'CSM-maintained health indicator',
      options: [
        { label: 'Healthy',    value: 'healthy',    color: '#00AA00' },
        { label: 'Watching',   value: 'watching',   color: '#FFA500' },
        { label: 'At Risk',    value: 'at_risk',    color: '#FF4500' },
        { label: 'Churning',   value: 'churning',   color: '#FF0000' },
      ],
    }),

    renewal_owner: Field.lookup('sys_user', {
      label: 'Renewal Owner (CSM)',
      group: 'ownership',
    }),

    next_renewal_date: Field.date({
      label: 'Next Renewal Date',
      group: 'ownership',
    }),
  },
  
  // Database indexes for performance
  indexes: [
    // Account name is the external id / upsert key (see src/data) and must be
    // unique. In 7.6 uniqueness is expressed as a unique index — the standalone
    // `type: 'unique'` validation rule was removed (ADR-0032 validation union).
    { fields: ['name'], unique: true },
    { fields: ['owner'] },
    { fields: ['type', 'is_active'] },
  ],
  
  // API surface. Other object-level `enable.*` flags (trackHistory, files,
  // feeds, activities, trash, mru, searchable) were removed in @objectstack 12
  // — they were dead no-ops (ADR-0049 liveness). Field history now lives on
  // individual `Field.trackHistory` (ADR-0052); global search uses
  // `searchableFields`/per-field `searchable`.
  enable: {
    apiEnabled: true,       // Expose via REST/GraphQL
    apiMethods: ['get', 'list', 'create', 'update', 'delete'], // Whitelist allowed API operations
  },
  
  // Validation Rules
  // This object declares none. Two entries used to live here:
  //
  // - `account_name_unique` (type: 'unique') was removed in 7.6 — uniqueness
  //   now lives on the `name` index above (unique: true).
  // - `revenue_positive` was removed in #514 (item 7) as a duplicate. It
  //   restated a check `account.hook.ts` already performs on beforeInsert /
  //   beforeUpdate, and the two disagreed in wording: the validation said
  //   "Annual Revenue must be positive" while the hook said "greater than or
  //   equal to 0". Both compared `< 0`, so the hook's wording was the accurate
  //   one and zero has always been allowed. The hook is now the single
  //   enforcement point, and it is the tested one — see
  //   `test/hooks-runtime-sales.test.ts`, which executes the handler, whereas
  //   the declaration was never evaluated by any test.

  // Workflow Rules
  // NOTE: object `workflows[]` were removed in @objectstack 7.7. Field-updates
  // moved to this object's *.hook.ts; scheduled status-flips & notifications
  // moved to src/flows/*.flow.ts (see flows/index.ts).
});
