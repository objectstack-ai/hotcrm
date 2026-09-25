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
  searchableFields: ['name', 'account_number', 'registration_number'],
  highlightFields: ['account_number', 'name', 'type', 'owner_id'],

  // Field groups organize the form layout. Array order == display order.
  // Each field below opts in via `group: '<key>'`.
  fieldGroups: [
    { key: 'basic',        label: 'Basic Information',  icon: 'building' },
    { key: 'financials',   label: 'Financials',         icon: 'dollar-sign' },
    // REQ-0003 acceptance 3: the business-profile fields render as their own
    // group with NO `record:details` section authored anywhere — the derived
    // layout ladder's rung 1 (AGENTS.md: escape hatches are for extreme cases).
    { key: 'business_profile', label: 'Business Profile', icon: 'briefcase' },
    { key: 'contact_info', label: 'Contact Information', icon: 'phone' },
    { key: 'ownership',    label: 'Ownership & Status', icon: 'users' },
    { key: 'branding',     label: 'Branding',           icon: 'palette', collapse: 'collapsed' },
    { key: 'system',       label: 'System',             icon: 'settings', collapse: 'collapsed' },
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

    /**
     * The counterparty's registered identity in a government registry.
     *
     * ⛔ NOT named after one country's registry, and that is the whole design
     * constraint (REQ-0003 *Disposition & rationale*). The requirement arrived
     * as 社会信用代码 because the customer registers in China; a Japanese install
     * writes 法人番号 here, a German one a Handelsregisternummer, a US one an
     * EIN. A `unified_social_credit_code` field would carry one country's
     * registry in its NAME, where no install can rename it — so the core field
     * is generic and the registry it came from is the install's own knowledge.
     *
     * ⚠️ Distinct from `account_number` above, which is OUR sequence
     * (`Field.autonumber`, `ACC-{000000}`) and already spent as half the record
     * title. That is an identifier we issue; this is one we were given, and
     * invoicing, credit checks and entity resolution key on the latter.
     *
     * `searchable` + the `searchableFields` entry above is REQ-0003 acceptance
     * 1 — the value is findable from global search and the lookup picker. It is
     * indexed below for that read path.
     *
     * ⛔ NOT `unique: true`. Refusing a save because two rows carry the same
     * registered identity is a data-quality POLICY, and this repo has already
     * chosen the soft shape for that question once — the hard unique on
     * `crm_lead.email` was removed because refusing a repeat is worse than
     * recording it. The same reasoning `name_normalized` records: a match key,
     * not a policy. Deduplication is a review affordance this app does not have.
     */
    registration_number: Field.text({
      label: 'Registration Number',
      description:
        "The counterparty's registered identity as issued by its own government registry — whichever registry that is. Not the Account Number, which we issue.",
      searchable: true,
      maxLength: 64,
      group: 'basic',
    }),

    /**
     * What this account may be used for commercially — the category that GATES
     * capability rather than merely classifying (REQ-0003, the record's most
     * valuable primitive: *some counterparties are payable but not sellable*).
     *
     * ## Why a field BESIDE `type`, and not four more options on it
     *
     * REQ-0003 leaves this open ("either new options on `type` or a field
     * beside it, decided when built"). It is a separate field because `type`
     * is a RELATIONSHIP-STAGE axis — prospect → customer → former, plus
     * partner — and it already has two readers that would be broken by a value
     * meaning "may not be sold to": `account.hook.ts` promotes on it, and
     * `opportunity.hook.ts` flips a won deal's account to `customer`. An
     * `agency` option on `type` would therefore be overwritten into `customer`
     * by the first won deal booked against it, silently un-restricting the
     * account. The two axes are independent — an agency can be a prospect, a
     * customer or a former customer — so they are two fields.
     *
     * ## Generic values only
     *
     * REQ-0003 rules the customer's own vocabulary (招标代理公司 …) **C**:
     * overlay configuration, ⛔ never committed into core. Core ships the
     * capability distinction itself; an install maps its market's categories
     * onto these two values.
     *
     * ## What reads it: `opportunity.hook.ts` `beforeInsert`
     *
     * REQ-0003 is explicit that "a category no rule reads is prose, and the
     * rule is the point", so this field ships WITH its reader. The reader is a
     * hook, and which construct carries the gate is a maintainer ruling
     * (2026-09-16), quoted verbatim and kept untranslated:
     *
     *   「闸门走 `opportunity.hook.ts` 的 `beforeInsert`，用 hook 的 `ctx.api` 读客户类别。
     *    REQ-0003 第 128 行的 `validations[]` 与该记录自己的验收第 2 条冲突，以验收为准。」
     *
     * ⛔ Do NOT restate the gate as the `validations[]` entry REQ-0003 line
     * 128 names. TWO independent measurements say it cannot be that, and both
     * are recorded here because each alone would be talked past:
     *
     *   1. **It would brick history.** A validation is evaluated against
     *      `{...previous, ...data}` on EVERY write, so "already linked to a
     *      restricted account" and "linking now" are the same state and every
     *      later edit to every historical opportunity would be refused — the
     *      exact thing REQ-0003 acceptance 2 forbids ("opportunities that
     *      already point at it keep working and keep being editable").
     *      `lead.hook.ts` carries the same finding for its own gate.
     *   2. **It cannot read the account at all.** A predicate is evaluated by
     *      `checkPredicate(rule, merged, previous)` over plain data objects —
     *      the opportunity's OWN stored columns. `record.crm_account.type`
     *      does not traverse the lookup (measured: `runtime: No such key:
     *      type`), and `os.lookup(...)` has no overload because `buildScope()`
     *      in `@objectstack/formula` composes `os` from only `ctx.user` /
     *      `ctx.org` / `ctx.env` and never binds `ctx.api` (measured:
     *      `runtime: found no matching overload for 'dyn.lookup(string,
     *      dyn)'`; filed upstream as objectstack#18318). An unevaluable
     *      predicate REJECTS THE WRITE, so authoring it literally refuses
     *      every opportunity write, insert and update alike.
     *
     * ⚠️ The hook's `ctx.api` is a DIFFERENT surface from the formula
     * `EvalContext.api` that measurement 2 is about, and the two are routinely
     * confused. The hook one is live and used ~20 times across
     * `src/sales/objects/*.hook.ts`; its shape is `./_hook-api.ts`, pinned
     * against a real engine by `test/hook-query-predicate.test.ts` and
     * `test/hook-write-shape.test.ts`. objectstack#18318 does not block this
     * field.
     *
     * ⛔ Do NOT "fix" anything here by denormalising this value onto
     * `crm_opportunity`: a copy needs a writer and goes stale the moment an
     * account is reclassified, and anything able to write the copy is able to
     * simply refuse.
     */
    commercial_capability: Field.select({
      label: 'Commercial Capability',
      group: 'basic',
      description:
        'Whether new business may be opened against this account. Settlement Only accounts stay fully usable for billing and payment, but no new opportunity may be linked to them.',
      defaultValue: 'full',
      options: [
        { label: 'Full', value: 'full', color: '#00AA00', default: true },
        { label: 'Settlement Only', value: 'settlement_only', color: '#FFA500' },
      ],
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

    // ─── Business profile (REQ-0003 step 3) ────────────────────────────
    //
    // Generic B2B sales intelligence, not IT-services vocabulary: who holds the
    // account today, how much there is to win this year, and how they pay.
    //
    // ⚠️ `annual_revenue` above answers none of these — it is the account's OWN
    // turnover, what the counterparty earns, whereas the budget below is what
    // it will SPEND with vendors. Reusing one for the other is the mistake this
    // group exists to prevent.
    //
    // ⚠️ `pnpm validate` reports all three as "carrier-only — declared but
    // nothing in this stack reads or displays it", and that reading is EXPECTED
    // here rather than a defect to tidy away. The liveness diagnostic counts
    // view columns, form sections, page bindings, flow nodes, formulas, hooks
    // and actions as sites; it does NOT count `fieldGroups` membership, which
    // is precisely the DERIVED layout REQ-0003 acceptance 3 asks for ("render
    // as their own group … without any `record:details` section being
    // authored"). These are data-entry fields a person fills in and a person
    // reads off the derived form. ⛔ Do NOT answer the warning by authoring a
    // `record:details` section — that is the escape hatch AGENTS.md reserves
    // for a named customer demand, and it would trade acceptance 3 for a
    // quieter log. No guard reads this warning.

    incumbent_vendor: Field.text({
      label: 'Incumbent Vendor',
      description: 'The supplier currently holding this account for the spend we are chasing.',
      maxLength: 255,
      group: 'business_profile',
    }),

    annual_purchasing_budget: Field.currency({
      label: 'Annual Purchasing Budget',
      description: "What this account expects to SPEND with vendors this year — not its own revenue.",
      scale: 2,
      min: 0,
      group: 'business_profile',
    }),

    // Payment terms as a select, not free text: it is read by a person sizing
    // cash-flow risk, and a picklist keeps that domain knowable. The values are
    // the net-terms ladder every B2B install shares; a customer whose contracts
    // use a different ladder overlays its own.
    payment_cycle: Field.select({
      label: 'Payment Cycle',
      group: 'business_profile',
      options: [
        { label: 'Prepaid', value: 'prepaid' },
        { label: 'Net 30', value: 'net_30' },
        { label: 'Net 60', value: 'net_60' },
        { label: 'Net 90', value: 'net_90' },
      ],
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

    /**
     * Where this account stands in its sign-off (REQ-0003 step 5 / acceptance 4).
     *
     * The shape `crm_opportunity.approval_status` already uses: `readonly` so
     * only the platform's own approval write reaches it, and a FIELD-level
     * `defaultValue` — option-level `default: true` only preselects in a UI
     * form, so an API or flow insert would land `null` and never match the
     * flow's entry condition.
     *
     * ⛔ NOT a second boolean beside `is_active`, which REQ-0003 rules out by
     * name. `is_active` answers "is this account live at all"; this answers
     * "has the record been signed off", and collapsing them would make
     * deactivating an account indistinguishable from rejecting one.
     *
     * ⚠️ Ships `pending`, so a NEW account enters the approval inbox on
     * creation — REQ-0003 acceptance 4 in as many words ("A newly created
     * account sits in a pending state"). An install that wants no account
     * sign-off changes this one default to `approved`; from then on the flow's
     * start condition is false for every record and the gate is off, switchable
     * and inert. That is the same off-switch `crm_lead.conversion_approval_
     * status` records, and ⛔ NOT the flow's `status`, for the reasons measured
     * in `lead-conversion-approval.flow.ts`.
     *
     * ⛔ There is deliberately no `not_required` value. On the lead the gate
     * ships OFF and needs a fourth value to say so; here acceptance 4 ships it
     * ON, and `approved` already spells "nothing to decide".
     */
    approval_status: Field.select({
      label: 'Approval Status',
      group: 'ownership',
      readonly: true,
      trackHistory: true,
      defaultValue: 'pending',
      options: [
        { label: 'Pending', value: 'pending', color: '#FFA500', default: true },
        { label: 'Approved', value: 'approved', color: '#00AA00' },
        { label: 'Rejected', value: 'rejected', color: '#FF0000' },
      ],
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
    // ⛔ `crm_campaign_member.added_date` was cited here as a twin and is NOT
    // one — it was ruled `readonly: true` in #1667 precisely because its
    // writers are INSERTs, which the strip never reaches. THIS field is an
    // UPDATE through a hook's `ctx.api`, which is the one shape that cannot be
    // `readonly`. Note the rule
    // is about the CONTEXT, not about hooks or flows as such — a hook stamping
    // its own `ctx.input.data` survives, and a flow survives when its `runAs`
    // is `'system'` (measured: `test/readonly-write-semantics.test.ts`, #1429;
    // `crm_case.is_sla_violated` is cited elsewhere as a twin of this field
    // and is NOT one — its writer is a system flow). This field stays out of
    // every form section instead, which is the protection that actually
    // holds. `test/activity-recency.test.ts` proves
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
    // `searchableFields` carries `registration_number`, and the note at the top
    // of this file records why those must be real, indexed columns.
    { fields: ['registration_number'] },
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
