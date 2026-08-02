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
    //
    // `unique: true` is declared HERE, on the field, and deliberately NOT as a
    // `{ fields: ['name'], unique: true }` entry in `indexes[]` below (#625).
    // Since framework #3696 the field-level form is tenant-scoped — it
    // materializes as `(organization_id, name)`, unique WITHIN an organization —
    // while a declared index is taken verbatim, i.e. platform-wide. The table
    // form is what this object used to carry, and it meant the SECOND
    // organization to create an "Acme Corp" was rejected by the database.
    // Account name is also the seed data's external-id / upsert key
    // (`src/data/sales.seed.ts`), so that bit the very first multi-tenant
    // install. The composite also indexes the column, so no separate
    // `{ fields: ['name'] }` entry is needed for the `searchableFields` /
    // seed-upsert read paths.
    name: Field.text({
      label: 'Account Name',
      required: true,
      storage: { notNull: true },
      searchable: true,
      unique: true,
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

    /**
     * Flat projection of `billing_address.country` — the column the territory
     * sharing rules filter on (#621).
     *
     * ### Why this field exists
     *
     * `billing_address` is an `address` field: the platform stores the whole
     * {street, city, state, postalCode, country, countryCode, formatted}
     * value in ONE column. A sharing rule's CEL condition is compiled to a
     * pushdown-able `FilterCondition` by `compileCelToFilter`, and that
     * compiler rejects every path that reaches INSIDE such a value:
     *
     *     record.billing_address.country in ["US","CA","MX"]
     *       → unsupported: cross-object/nested field path
     *         "record.billing_address.country" is not pushdown-able
     *
     * `plugin-sharing` then refuses to seed the rule rather than degrade it to
     * match-all, so both territory rules were dropped on every boot and
     * `na_sales_team` / `eu_sales_team` received nothing at all. Measured: the
     * blocker is the NESTED PATH, not the `in [...]` operator — `in [...]`,
     * `==`, `!=`, `<`, `>`, `&&`, `||`, `!`, `startsWith()` and `== null` all
     * compile fine against a FLAT field. Rewriting the condition as a
     * disjunction of `==` (issue #621 option A) would therefore NOT have
     * helped; only a flat column does. See `test/sharing-seeding.test.ts`,
     * which measures that matrix instead of assuming it.
     *
     * ### What it holds
     *
     * `billing_address.country`, trimmed and upper-cased — nothing else.
     * `countryCode` is deliberately NOT consulted: it carries ISO 3166-1
     * alpha-2, where the United Kingdom is `GB`, while the Europe rule is
     * authored against `UK`. Preferring the ISO slot would silently drop UK
     * accounts out of the EU territory, so this projection mirrors exactly the
     * one slot the rules have always named and changes no rule semantics.
     *
     * Derived, never authored: `account.hook.ts` recomputes it on every write
     * that carries `billing_address`, and leaves it untouched on every write
     * that does not.
     */
    billing_country: Field.text({
      label: 'Billing Country',
      description:
        'Derived from Billing Address — the country code territory sharing rules match on. Enter the country as a 2-letter code (US, DE, …) in the address.',
      readonly: true,
      maxLength: 64,
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

    // Company logo (uploaded image). `accept` / `maxSize` are server-enforced
    // from @objectstack 17 — see the note on `crm_product.image`.
    logo: Field.image({
      label: 'Company Logo',
      group: 'branding',
      accept: ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'],
      maxSize: 2 * 1024 * 1024,
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
  //
  // No `{ fields: ['name'], unique: true }` here (#625). Account-name
  // uniqueness is declared on the `name` field itself, which since framework
  // #3696 builds the tenant composite `(organization_id, name)`. Declaring the
  // single-column index too makes the platform-wide constraint win and leaves
  // the per-tenant one unreachable (framework#3991 `unique/double-declaration`)
  // — the same trap `crm_contact`, `crm_lead` and `crm_product` document. Two
  // organizations must be able to each have their own "Acme Corp".
  indexes: [
    { fields: ['owner'] },
    { fields: ['type', 'is_active'] },
    // The territory sharing rules filter on this column, so it is read on
    // every account query a territory recipient makes (#621).
    { fields: ['billing_country'] },
  ],
  
  // API surface + capabilities. `trash` / `mru` were removed in @objectstack 12
  // as dead no-ops (ADR-0049 liveness); `files` and `feeds` were NOT — both are
  // live and enforced in 17 (see the canonical note in `src/objects/index.ts`).
  // Field history lives on individual `Field.trackHistory` (ADR-0052); global
  // search uses `searchableFields`/per-field `searchable`.
  enable: {
    apiEnabled: true,       // Expose via REST/GraphQL
    apiMethods: ['get', 'list', 'create', 'update', 'delete'], // Whitelist allowed API operations
    // #602 — contracts, org charts and RFPs live on the account record.
    // Opt-in (spec default false); attach/download/delete authority is the
    // parent record's own, so this adds a surface, not a grant.
    files: true,
  },
  
  // Validation Rules
  // This object declares none. Two entries used to live here:
  //
  // - `account_name_unique` (type: 'unique') was removed in 7.6 — uniqueness
  //   now lives on the `name` field above (`unique: true`), which the driver
  //   materializes as the per-tenant `(organization_id, name)` index (#625).
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
