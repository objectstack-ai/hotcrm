// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { ObjectSchema, Field } from '@objectstack/spec/data';
import { F } from '@objectstack/spec';
import { INDUSTRY_OPTIONS } from './_picklists';
import { TERRITORY_OPTIONS } from './_territory';

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
  highlightFields: ['account_number', 'name', 'type', 'owner_id'],

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
    // ─── Ownership ─────────────────────────────────────────────────────
    //
    // `owner_id` is the PLATFORM ownership anchor, not an app invention: the
    // registry injects exactly this column into every user-owned object
    // (`applySystemFields`), and it is the one OWD, sharing rules, owner-scope
    // widening and the `is_private` row filter all read. ⛔ Never author a
    // SECOND `owner` lookup beside it — reassigning that moves the record in
    // every list and report and moves no access at all.
    //
    // ⚠️ Declared rather than left to injection, which the platform supports
    // explicitly ("author-declared fields with the same name always win over
    // injection, no overwrite"). Three things only a declaration buys:
    //   • `os validate` resolves it. An injected column is invisible to every
    //     author-time rule, so `highlightFields: ['owner_id']` is reported as
    //     "not a field on this object — silently skipped by every consumer",
    //     and a CEL predicate reading `record.owner_id` fails outright.
    //   • the per-object label and `group` survive (an injected field carries
    //     the generic label "Owner" and no group at all);
    //   • `trackHistory` survives, so a transfer still renders on the record
    //     timeline instead of only in the compliance audit log.
    // `system: true` keeps the injected marker the platform's own tooling
    // reads — notably the clone path, which strips system columns so a copy is
    // stamped to the cloner rather than inheriting the source's owner.
    //
    // No `defaultValue`: the security middleware stamps `owner_id` to the
    // acting user on any insert that leaves it empty, and denies one that names
    // another user without `allowTransfer` (#3004). That is stronger than a
    // field default, which evaluates to nothing on every user-less write.
    owner_id: Field.lookup('sys_user', {
      label: 'Account Owner',
      group: 'ownership',
      system: true,
      readonly: false,
      trackHistory: true,
    }),

    // AutoNumber field - Unique account identifier
    account_number: Field.autonumber({
      label: 'Account Number',
      format: 'ACC-{000000}',
      group: 'basic',
    }),

    // Basic Information
    //
    // ⚠️ `unique: true` is declared HERE, on the field, and deliberately NOT as
    // a `{ fields: ['name'], unique: true }` entry in `indexes[]` below. The
    // field-level form is tenant-scoped — it materializes as
    // `(organization_id, name)`, unique WITHIN an organization — while a
    // declared index is taken verbatim, i.e. platform-wide. The table form
    // means the SECOND organization to create an "Acme Corp" is rejected by the
    // database, and account name is also the seed data's external-id / upsert
    // key (`src/data/sales.seed.ts`), so it bites the first multi-tenant
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

    /**
     * Case- and whitespace-folded copy of `name` — the key lead conversion
     * matches accounts on.
     *
     * ### Why a stored column, and not any of the cheaper shapes
     *
     * ⚠️ Three cheaper fixes are all dead ends, and each is a live platform
     * constraint. `test/account-name-normalized-match.test.ts` re-measures every
     * one so this note cannot quietly go stale:
     *
     * - **A flow cannot normalize.** `service-automation`'s `resolveToken`
     *   understands exactly one function form, `/^(NOW|TODAY)\s*\(\s*\)…/`.
     *   `{LOWER(x)}`, `{TRIM(x)}` and `{x.toLowerCase()}` all resolve to
     *   `undefined` (every bare identifier is substituted before the expression
     *   is evaluated, so no string method is reachable), and an unwrapped
     *   `LOWER({x})` interpolates literally to `"LOWER(Acme Corp)"`.
     * - **A formula field cannot be the match key.** `driver-sql`'s
     *   `fieldHasColumn` returns false for `type: 'formula'`, so a computed
     *   value has no physical column and nothing can filter on it.
     * - **`$regex` is not an answer.** On `driver-sql` it does not run as a
     *   regex at all: it compiles to `LIKE '%value%'`, a SUBSTRING match, so
     *   `"Acme Corp"` also matches `"Not Acme Corp Ltd"`. It cannot collapse
     *   internal whitespace, the leading wildcard defeats the index, and on the
     *   in-memory driver it does compile user-controlled text into a `RegExp`.
     *
     * So the canonical form is established by the PRODUCER at write time — the
     * same doctrine `crm_lead.email` / `crm_contact.email` follow — and the
     * reader does a plain, indexed equality match. The other side of that
     * comparison is `crm_lead.company_normalized`, which exists for the same
     * reason: a flow can compare two stored columns, it cannot compute either.
     *
     * ### What it holds
     *
     * `name`, trimmed, lower-cased, with runs of internal whitespace collapsed
     * to one space. Nothing else — normalize-then-EXACT. Fuzzy matching
     * (punctuation folding, legal-suffix stripping, edit distance) is
     * deliberately out of scope; it turns a lookup into a ranking problem and
     * needs a human review affordance this app does not have.
     *
     * Derived, never authored: `account.hook.ts` recomputes it on every write
     * that carries `name`, and leaves it alone otherwise. `readonly` keeps
     * user/API writes off it (INSERT is exempt from the strip and UPDATE strips
     * only CALLER-supplied keys, so the hook's own write always survives);
     * `hidden` keeps a machine-owned column out of forms and pickers — the same
     * pairing `crm_forecast.seed_key` uses.
     */
    name_normalized: Field.text({
      label: 'Account Name (Normalized)',
      description:
        'Match key for lead conversion: Account Name lower-cased, trimmed, with internal whitespace collapsed. Maintained by the account_protection hook — never edit directly.',
      readonly: true,
      hidden: true,
      maxLength: 255,
      group: 'system',
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

    /**
     * Rolled-up annual revenue of this account's direct children.
     *
     * ⚠️ DIRECT children only, one level — the engine aggregates over the rows
     * whose `parent_account` is this account, not over a transitive closure. A
     * grandparent shows the sum of its own children, and the docs say so;
     * anything else needs a different (and much more expensive) primitive than
     * the one the platform ships.
     *
     * Self-referencing roll-ups are worth measuring rather than assuming,
     * because parent and child are the same object and the engine's summary
     * index is keyed by child object. `test/decorative-field-sweep.test.ts`
     * drives all four legs of the lifecycle (insert, raise, re-parent, delete)
     * so a platform regression cannot quietly turn this back into decoration.
     */
    child_account_revenue: Field.summary({
      label: 'Child Account Revenue',
      group: 'financials',
      scale: 2,
      summaryOperations: {
        object: 'crm_account',
        field: 'annual_revenue',
        function: 'sum',
        relationshipField: 'parent_account',
      },
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
     * Flat projection of `billing_address.country`.
     *
     * ### Why the flat column exists — the trap that catches every rule
     * ### authored against an `address`
     *
     * ⚠️ `billing_address` is an `address` field: the platform stores the whole
     * {street, city, state, postalCode, country, countryCode, formatted} value
     * in ONE column. A sharing rule's CEL condition is compiled to a
     * pushdown-able `FilterCondition` by `compileCelToFilter`, and that compiler
     * rejects every path reaching INSIDE such a value:
     *
     *     record.billing_address.country in ["US","CA","MX"]
     *       → unsupported: cross-object/nested field path
     *         "record.billing_address.country" is not pushdown-able
     *
     * `plugin-sharing` then refuses to seed the rule rather than degrade it to
     * match-all, so the rule is dropped on every boot and its recipients get
     * nothing at all. Measured: the blocker is the NESTED PATH, not the
     * `in [...]` operator — `in [...]`, `==`, `!=`, `<`, `>`, `&&`, `||`, `!`,
     * `startsWith()` and `== null` all compile fine against a FLAT field.
     * Rewriting the condition as a disjunction of `==` therefore does NOT help;
     * only a flat column does. `test/sharing-seeding.test.ts` measures that
     * matrix instead of assuming it.
     *
     * ### What it holds
     *
     * `billing_address.country`, trimmed, internal whitespace collapsed, and
     * upper-cased — nothing else. It is what was TYPED, so it is still free
     * text and still capable of holding `Deutschland`. Nothing matches against
     * it: `territory` below classifies it, and an unrecognised spelling lands in
     * a stated `other`. `countryCode` is deliberately not consulted; see the
     * note in `account.hook.ts` for why the ISO slot is not the input.
     *
     * Derived, never authored: `account.hook.ts` recomputes it on every write
     * that carries `billing_address`, and leaves it untouched otherwise.
     */
    billing_country: Field.text({
      label: 'Billing Country',
      description:
        'Derived from Billing Address — the country exactly as it was entered, trimmed and upper-cased. Territory is classified from it.',
      readonly: true,
      maxLength: 64,
      group: 'contact_info',
    }),

    /**
     * Territory — the declared value the territory sharing rules filter on.
     *
     * ### Why a select and not the country
     *
     * Matching free-text `billing_country` against a list of country codes
     * inside a CEL string means an account whose address reads `United States`
     * belongs to NO territory, silently — the metadata says territory sharing
     * works and for that account it does nothing, with no error anywhere. A
     * `select` makes the domain knowable: three values, declared, every one
     * reachable, and an account outside the staffed territories says `other`
     * rather than nothing.
     *
     * It also collapses four copies of the country list (two CEL strings and
     * six localised documentation tables) into one authored table in
     * `./_territory.ts`. Adding a country is a line there; the sharing rules,
     * this picklist and the docs all follow, and
     * `test/territory-single-source.test.ts` fails if any of them does not.
     *
     * ### Readonly, and always stated
     *
     * Derived by `account_protection` from `billing_address.country`, never
     * authored — correcting an account's territory means correcting its
     * address, which keeps ONE fact behind the classification. Every insert
     * states it (an account with no address at all is `other`), and an update
     * that does not carry the address leaves it alone.
     */
    territory: Field.select({
      label: 'Territory',
      description:
        'Derived from Billing Address — the sales territory this account belongs to. Accounts outside the staffed territories are Other.',
      readonly: true,
      options: [...TERRITORY_OPTIONS],
      group: 'contact_info',
    }),

    // Office Location (new field type)
    office_location: Field.location({
      label: 'Office Location',
      group: 'contact_info',
    }),

    // Relationship fields

    /**
     * The account hierarchy. `child_account_revenue` below is its one reader —
     * the platform computes roll-up summaries itself, so the honest consumer is
     * a single declaration rather than hand-written recompute hooks.
     */
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
    //
    // ⛔ NOT `readonly`, and it must not become readonly. This is the signal
    // `at_risk_accounts` and `customer_churn_signals` are built on, and it is
    // written by ONE path: another object's hook calling
    // `api.object('crm_account').update({ last_activity_date }, …)`.
    //
    // ⚠️ Platform constraint: `stripReadonlyFields` deletes a readonly key from
    // any payload whose CALLER supplied it, for every context that is not
    // `isSystem` — and a hook's `ctx.api` is a `ScopedContext` over the ACTING
    // USER's execution context, not a system one. So a readonly field a hook
    // writes is silently dropped: the engine logs `Field '…' is read-only —
    // ignoring incoming change` and the column stays null forever.
    //
    // Same reasoning, same shape as `crm_campaign_member.added_date` and
    // `crm_case.is_sla_violated`: a field a hook or flow must write cannot be
    // `readonly`. It stays out of every form section instead, which is the
    // protection that actually holds. `test/activity-recency.test.ts` proves
    // the write lands — and fails if the flag comes back.
    last_activity_date: Field.date({
      label: 'Last Activity Date',
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

    // ⛔ No account-level renewal model here, on purpose. Renewal is a
    // CONTRACT-level process with exactly one home — `crm_contract.end_date` +
    // `renewal_notice_days`, swept daily by `src/flows/contract-renewal.flow.ts`,
    // which books the task and notifies the CONTRACT owner; the user-facing
    // queue is that object's `renewal_calendar` view. A `renewal_owner` /
    // `next_renewal_date` pair here would be declared and inert, telling an
    // admin a renewal reaches the CSM they named when nothing would. If an
    // account-level renewal owner is ever wanted, it is a change to that flow
    // plus a real writer for the date — not a second pair of fields.
  },
  
  // Database indexes for performance
  //
  // ⚠️ No `{ fields: ['name'], unique: true }` here. Account-name uniqueness is
  // declared on the `name` field itself, which the framework builds as the
  // tenant composite `(organization_id, name)`. Declaring the single-column
  // index too makes the platform-wide constraint win and leaves the per-tenant
  // one unreachable (framework#3991 `unique/double-declaration`) — the same
  // trap `crm_contact`, `crm_lead` and `crm_product` document. Two
  // organizations must be able to each have their own "Acme Corp".
  indexes: [
    { fields: ['owner_id'] },
    { fields: ['type', 'is_active'] },
    // The territory sharing rules filter on this column, so it is read on every
    // account query a territory recipient makes. `billing_country` carries no
    // index of its own: nothing filters on it — it is displayed, and classified
    // into this column by the hook.
    { fields: ['territory'] },
    // Lead conversion filters on this column on every conversion — the column
    // exists to replace an unindexed `$regex` scan. Plain index, NOT
    // `unique: true`, deliberately:
    //
    // 1. Per-tenant uniqueness of account names is already declared on the
    //    `name` field. A unique `name_normalized` would SUBSUME it (equal names
    //    normalize equally) and force that constraint to be re-decided.
    // 2. This column is a MATCH key, not a policy. Rejecting a near-duplicate
    //    name outright is a separate data-quality decision, and this repo has
    //    already chosen the soft shape for that question once (the hard unique
    //    on `crm_lead.email` was removed because refusing a repeat enquiry is
    //    worse than recording it).
    // 3. ⚠️ Measured hazard: `create_index` FAILS on any deployment already
    //    holding `Acme Corp` and `ACME  Corp` separately, so a unique index
    //    could not be an upgrade step without a merge pass first. That hazard
    //    is bounded today ONLY because this repo's deployment shape is fresh
    //    installs — see docs/MAINTENANCE.md §3.3. The conclusion is conditional
    //    on that premise, not universal.
    //
    // Consequence, recorded rather than hidden: two accounts CAN still hold the
    // same normalized name if something outside the flow creates them, and
    // `get_record` has no `sort` option, so the conversion would reuse an
    // arbitrary one. Reusing one of N is still better than creating the N+1th.
    { fields: ['name_normalized'] },
  ],
  
  // API surface + capabilities. `files` and `feeds` are live and enforced (see
  // the canonical note in `src/objects/index.ts`). Field history lives on
  // individual `Field.trackHistory` (ADR-0052); global search uses
  // `searchableFields` / per-field `searchable`.
  enable: {
    apiEnabled: true,       // Expose via REST/GraphQL
    apiMethods: ['get', 'list', 'create', 'update', 'delete'], // Whitelist allowed API operations
    // Contracts, org charts and RFPs live on the account record. Opt-in (spec
    // default false); attach/download/delete authority is the parent record's
    // own, so this adds a surface, not a grant.
    files: true,
  },
  
  // ⚠️ No `workflows[]` here, and none is possible: object `workflows[]` were
  // removed from the platform. Field updates live in this object's `*.hook.ts`;
  // scheduled status flips and notifications live in `src/flows/*.flow.ts`.
});
