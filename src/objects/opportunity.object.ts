import { F, P } from '@objectstack/spec';
// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { ObjectSchema, Field } from '@objectstack/spec/data';
import { LEAD_SOURCE_OPTIONS, OPPORTUNITY_STAGE_OPTIONS } from './_picklists';

export const Opportunity = ObjectSchema.create({
  name: 'crm_opportunity',
  label: 'Opportunity',
  pluralLabel: 'Opportunities',
  icon: 'dollar-sign',
  description: 'Sales opportunities and deals in the pipeline',

  // ADR-0090 D1/D7: OWD is an authored decision. Owner + high-value management sharing rule.
  sharingModel: 'private',
  // ADR-0079: render-only `titleFormat` retired in favor of `nameField`.
  // The original template was '{name} - {stage}'. A render-time template could
  // resolve `stage` to its translated label; a FORMULA cannot — it sees the
  // stored select VALUE — so the migrated `display_title` titled every deal
  // "Enterprise Deal - closed_won" in lookups, related lists and search, in
  // every locale (#461, same defect as Contact `full_name`). The formula
  // language has no option-label lookup, so the title is now the plain `name`
  // column; `stage` still leads the highlight strip below, translated.
  nameField: 'name',
  // Explicit search targets (ADR-0061). `name` is a real indexed column, so
  // $search resolves on its own here; the list is kept explicit to pin the
  // intent (other objects whose nameField IS a formula rely on it).
  searchableFields: ['name'],
  highlightFields: ['name', 'crm_account', 'amount', 'stage', 'owner_id'],

  fieldGroups: [
    { key: 'basic',       label: 'Basic Information',   icon: 'dollar-sign' },
    { key: 'financials',  label: 'Financials',          icon: 'trending-up' },
    { key: 'sales_process', label: 'Sales Process',     icon: 'target' },
    { key: 'classification', label: 'Classification',   icon: 'tag' },
    { key: 'competition', label: 'Competition & Campaigns', icon: 'flag', defaultExpanded: false },
    { key: 'notes',       label: 'Notes & Next Steps',  icon: 'file-text' },
    { key: 'crm_forecast',    label: 'Forecast & Metrics',  icon: 'bar-chart', defaultExpanded: false },
  ],

  fields: {
    // Platform ownership anchor — canonical note in `account.object.ts` (#548).
    owner_id: Field.lookup('sys_user', {
      label: 'Opportunity Owner',
      group: 'basic',
      system: true,
      readonly: false,
      trackHistory: true,
    }),

    // Basic Information
    name: Field.text({
      label: 'Opportunity Name',
      required: true,
      storage: { notNull: true },
      searchable: true,
      group: 'basic',
    }),

    // (No `display_title` formula — see `nameField` above: composing the title
    // from `stage` leaked the raw select value into every rendered title.)

    // Relationships
    crm_account: Field.lookup('crm_account', {
      label: 'Account',
      required: true,
      storage: { notNull: true },
      group: 'basic',
    }),

    primary_contact: Field.lookup('crm_contact', {
      label: 'Primary Contact',
      // @objectstack 12: string[] `referenceFilters` is dead (not read by the
      // picker); `dependsOn` is the live cascading form — scopes contacts to the
      // opportunity's `crm_account` (ADR-0049).
      dependsOn: ['crm_account'],
      group: 'basic',
    }),


    // Financial Information
    amount: Field.currency({
      label: 'Amount',
      required: true,
      storage: { notNull: true },
      scale: 2,
      min: 0,
      group: 'financials',
      trackHistory: true,
    }),

    expected_revenue: Field.currency({
      label: 'Expected Revenue',
      scale: 2,
      readonly: true,  // Calculated field
      group: 'financials',
    }),

    // Sales Process
    stage: Field.select({
      label: 'Stage',
      required: true,
      storage: { notNull: true },
      group: 'sales_process',
      // ADR-0052 §5b.1 — the platform auto-renders each stage change on the
      // activity timeline as "Stage: Proposal → Negotiation" (no hook code).
      trackHistory: true,
      // Canonical set (#490) — the mass_update_stage action renders the same
      // list; see _picklists.ts.
      options: [...OPPORTUNITY_STAGE_OPTIONS],
    }),

    // Derived from `stage`, never authored (#1035).
    //
    // `opportunity_lifecycle` assigns `STAGE_PROBABILITY[stage]` on EVERY
    // write it sees — insert, a stage change, an update that touches neither
    // (the stage is then read off `previous`), and system writes too. Measured
    // on 17.0.0-rc.4: there is no write path on which a caller-supplied value
    // survives. So an editable widget over this column can only ever collect a
    // number the save discards: a rep set 40 % on the create form, the record
    // landed at `probability: 10` (prospecting) with
    // `expected_revenue = amount × 10 %`, and nothing said so.
    //
    // `readonly` is what closes that. It is the field-level contract the
    // renderer reads to draw a value instead of an input, and on the UPDATE
    // path the engine enforces it server-side as well: measured on rc.4, a
    // non-system `update` carrying `probability` has the key dropped before
    // the write and reports `{ fields: ['probability'], reason: 'readonly' }`
    // through `onFieldsDropped`. On INSERT that strip does NOT fire on this
    // version — a caller-supplied readonly value is admitted (measured with
    // `stage_entry_date`, which the hook leaves alone when the caller supplies
    // one) — so on the create path it is the hook's unconditional sync, not
    // the engine, that makes the stored value the stage's. Either way no write
    // path stores a caller's number; the two just get there differently, and
    // this comment says which rather than assuming the symmetry the spec's
    // `readonly` description promises.
    //
    // Hook-written keys are never "caller-supplied", so the sync still lands.
    // Same disposition as `expected_revenue` above and
    // `crm_account.billing_country`: derived value, shown on the form,
    // read-only, explained in its `description`.
    //
    // No `defaultValue` for the same reason it has no widget. A literal `10`
    // here is a second copy of `STAGE_PROBABILITY.prospecting` that a stage
    // re-tuning would leave behind, and on the create form it rendered a
    // "10 %" that was wrong the moment the rep picked any other stage. The
    // column is blank until the hook fills it, like `expected_revenue`.
    probability: Field.percent({
      label: 'Probability (%)',
      description:
        'Set automatically from the Stage (Prospecting 10% … Closed Won 100%) — move the stage to change it.',
      min: 0,
      max: 100,
      readonly: true,
      group: 'sales_process',
    }),

    // Important Dates
    close_date: Field.date({
      label: 'Close Date',
      required: true,
      storage: { notNull: true },
      group: 'sales_process',
      trackHistory: true,
    }),

    // NO `created_date` here: the platform already injects `created_at` on
    // every object, and this duplicate had no writer at all — not the seed
    // data, not a hook, not a flow — so it was permanently null while
    // `created_at` carried the real value (#575 B2). Surfaces that need the
    // creation instant read `created_at` (see the deal_timeline view).
    //
    // Stage-age clock (#489). This is the STORED half of the pair: a real,
    // indexed date column, so it is what automation and views may filter and
    // sort on. `days_in_stage` below is a formula derived from it.
    // `opportunity_lifecycle` stamps it on insert and re-stamps it on every
    // stage change; readonly because nothing but that hook should move it
    // (before-hook writes survive readonly stripping — only caller-supplied
    // keys are dropped).
    stage_entry_date: Field.date({
      label: 'Stage Entry Date',
      description: 'Date this opportunity entered its current stage.',
      readonly: true,
      group: 'sales_process',
    }),

    // Additional Classification
    type: Field.select({
      label: 'Opportunity Type',
      group: 'classification',
      options: [
        { label: 'New Business', value: 'new_business' },
        { label: 'Existing Customer - Upgrade', value: 'existing_upgrade' },
        { label: 'Existing Customer - Renewal', value: 'existing_renewal' },
        { label: 'Existing Customer - Expansion', value: 'existing_expansion' },
      ]
    }),

    lead_source: Field.select({
      label: 'Lead Source',
      group: 'classification',
      // Canonical set shared with Lead + Contact (#490): lead_conversion
      // copies `leadRecord.lead_source` onto the opportunity it creates, so
      // this must accept every Lead value.
      options: [...LEAD_SOURCE_OPTIONS],
    }),

    // Competitor Analysis
    competitors: Field.select({
      label: 'Competitors',
      multiple: true,
      group: 'competition',
      options: [
        { label: 'Competitor A', value: 'competitor_a' },
        { label: 'Competitor B', value: 'competitor_b' },
        { label: 'Competitor C', value: 'competitor_c' },
      ]
    }),

    // Campaign tracking
    crm_campaign: Field.lookup('crm_campaign', {
      label: 'Campaign',
      description: 'Marketing campaign that generated this opportunity',
      group: 'competition',
    }),

    // Sales cycle metrics
    //
    // FORMULA, not a stored counter (#489). As a plain number column nothing
    // ever raised it: the hook reset it to 0 on a stage change and no sweep or
    // hook anywhere incremented it, so `days_in_stage > 14` matched only the
    // rows the seed hardcoded — the `opportunity_stagnation` flow never fired
    // on real data. Deriving it from `stage_entry_date` is correct on every
    // read and costs no nightly full-table pass.
    //
    // The trade-off: formulas are evaluated AFTER the query (the engine's
    // `applyFormulaPlan` walks the returned rows), so this is not a real
    // column and CANNOT appear in a filter or a sort. Anything that needs to
    // *select* stalled deals predicates on `stage_entry_date` instead — see
    // `opportunity-stagnation.flow.ts` and the `stale_opportunities` view.
    //
    // `has()` + null guard: `daysBetween(null, …)` faults and the whole field
    // silently evaluates to null, so an unstamped row is spelled out as null
    // rather than arriving there by accident.
    days_in_stage: Field.formula({
      label: 'Days in Current Stage',
      expression: F`has(record.stage_entry_date) && record.stage_entry_date != null ? daysBetween(record.stage_entry_date, today()) : null`,
      returnType: 'number',
      group: 'crm_forecast',
    }),

    // Additional information
    description: Field.markdown({
      label: 'Description',
      group: 'notes',
    }),

    next_step: Field.textarea({
      label: 'Next Steps',
      group: 'notes',
    }),

    // Flags
    is_private: Field.boolean({
      label: 'Private',
      defaultValue: false,
      group: 'crm_forecast',
    }),

    forecast_category: Field.select({
      label: 'Forecast Category',
      group: 'crm_forecast',
      options: [
        { label: 'Pipeline', value: 'pipeline' },
        { label: 'Best Case', value: 'best_case' },
        { label: 'Commit', value: 'commit' },
        { label: 'Omitted', value: 'omitted' },
        { label: 'Closed', value: 'closed' },
      ]
    }),

    // Approval workflow tracking.
    // NOT `readonly`: the opportunity_approval flow writes pending/approved/
    // rejected here, and since 16.x readonly writes are dropped (#2948).
    // `defaultValue` at field level: option-level `default: true` only
    // preselects in UI forms — API/flow inserts land null without it, and a
    // null approval_status never matches the flow's entry condition.
    approval_status: Field.select({
      label: 'Approval Status',
      group: 'sales_process',
      defaultValue: 'not_required',
      options: [
        { label: 'Not Required', value: 'not_required', default: true },
        { label: 'Pending', value: 'pending', color: '#FFA500' },
        { label: 'Approved', value: 'approved', color: '#00AA00' },
        { label: 'Rejected', value: 'rejected', color: '#FF0000' },
      ],
    }),

    approved_date: Field.datetime({
      label: 'Approved Date',
      group: 'sales_process',
    }),

    // ─── Win / Loss analysis ────────────────────────────────────────────
    //
    // The reason is captured AT CLOSE, and that is enforced, not requested
    // (#593). This comment used to read "required when stage moves to
    // closed_*" while nothing anywhere required anything: both fields were
    // optional, so every seeded and user-closed deal landed with them empty
    // and the win/loss widgets below had nothing to draw.
    //
    // `requiredWhen`, not a script validation, for the same reason
    // `crm_lead.duplicate_of_lead` uses it (ADR-0113): "this field must hold a
    // value when the record looks like X" is exactly a conditional write
    // contract, the engine evaluates it on insert AND update inside
    // `evaluateValidationRules`, and it reports against the FIELD — so the form
    // marks the empty picklist instead of showing a record-level banner. It is
    // ALSO the only shape the freeze below leaves usable: once a deal is
    // closed, `opportunity.hook.ts` refuses every user edit outside the
    // narrative fields, so a reason not captured in the closing write can never
    // be added afterwards. Close time is the only chance.
    //
    // MEASURED, not assumed (the "declared ≠ enforced" family this repo keeps
    // finding — #621 / #633 / #650 / #651): both predicates reject the write
    // through a real ObjectQL over a real driver, on insert and on update, and
    // the record stays at its previous stage. `crm_case`'s
    // `resolution_required_for_closed` was re-measured the same way first and
    // is genuinely blocking today. See `test/win-loss-capture.test.ts`.
    //
    // ⚠️ `has(...)` is load-bearing. A bare `record.stage == "closed_lost"`
    // aborts with `No such key` on any merged record that simply omits the
    // column, and the engine's answer to a predicate that cannot evaluate is to
    // SKIP it ("requiredWhen for 'loss_reason' failed to evaluate — skipped"),
    // which would make this read as enforced while requiring nothing at all.
    win_reason: Field.select({
      label: 'Win Reason',
      description: 'Why this deal was won. Required to close an opportunity as Won.',
      group: 'classification',
      requiredWhen: P`has(record.stage) && record.stage == "closed_won"`,
      options: [
        { label: 'Better Product', value: 'better_product' },
        { label: 'Better Price', value: 'better_price' },
        { label: 'Existing Relationship', value: 'relationship' },
        { label: 'Better Support', value: 'better_support' },
        { label: 'Best Fit / Features', value: 'best_fit' },
        // Written by the machine, not chosen by a rep: `quote_on_accepted`
        // (quote.hook.ts) wins the deal the moment a customer accepts the
        // quote, and no human is in that write to attribute it. Naming the
        // automated path is this repo's existing idiom for exactly that split
        // (`crm_lead.duplicate_status` = machine `suspected` vs human
        // `confirmed`) and it keeps the rule exception-free: every closed_won
        // row carries a reason, and an analyst can still tell a CPQ close from
        // a rep's attribution instead of reading a fabricated "Better Product".
        { label: 'Quote Accepted', value: 'quote_accepted' },
        { label: 'Other', value: 'other' },
      ],
    }),

    loss_reason: Field.select({
      label: 'Loss Reason',
      description: 'Why this deal was lost. Required to close an opportunity as Lost.',
      group: 'classification',
      requiredWhen: P`has(record.stage) && record.stage == "closed_lost"`,
      options: [
        { label: 'Price Too High', value: 'price' },
        { label: 'Lost to Competitor', value: 'competitor' },
        { label: 'No Budget', value: 'no_budget' },
        { label: 'No Decision', value: 'no_decision' },
        { label: 'Bad Timing', value: 'timing' },
        { label: 'Missing Features', value: 'features' },
        { label: 'Other', value: 'other' },
      ],
    }),

    loss_details: Field.textarea({
      label: 'Loss/Win Details',
      description: 'Free-text context behind the win or loss reason.',
      group: 'classification',
    }),
  },
  
  // Database indexes for performance
  indexes: [
    { fields: ['name'] },
    { fields: ['crm_account'] },
    { fields: ['owner_id'] },
    { fields: ['stage'] },
    { fields: ['close_date'] },
    // The stagnation sweep filters on this every morning.
    { fields: ['stage_entry_date'] },
  ],
  
  // Enable advanced features
  // Dead enable.* flags (trash/mru) removed in @objectstack 12 (ADR-0049).
  // Stage/amount history is tracked per-field via Field.trackHistory. Ownership
  // is NOT: since #548 it lives on the platform's injected `owner_id`, which
  // carries no `trackHistory` flag — a transfer is recorded in the compliance
  // audit log (`sys_audit_log`, unconditional) rather than on the activity feed.
  // (ADR-0052).
  enable: {
    apiEnabled: true,
    apiMethods: ['get', 'list', 'create', 'update', 'delete'], // Whitelist allowed API operations
    // #602 — proposals, redlines and signed orders belong on the deal.
    // See the canonical capability note in `src/objects/index.ts`.
    files: true,
  },

  // ADR-0052 §5b.2 — declarative milestone activity. When `stage` enters these
  // values the platform emits a semantic timeline entry (no hook code). Combined
  // with the field-level `trackHistory` above (stage-change rows), this fully
  // replaces the former hand-coded `opportunityActivityHook`.
  activityMilestones: [
    { field: 'stage', value: 'closed_won', summary: 'Deal won — {name}', type: 'completed' },
    { field: 'stage', value: 'closed_lost', summary: 'Deal lost — {name}', type: 'completed' },
  ],

  // Removed: list_views and form_views belong in UI configuration, not object definition
  
  // Lifecycle transitions are enforced via a `state_machine` validation rule
  // (see validations[] below). 7.7 removed the top-level `stateMachines` key.

  // Validation Rules
  //
  // Predicates below are TOTAL: every `record.x` read is `has()`-guarded, so the
  // rule returns a verdict even when the merged record has no such key. See
  // AGENTS.md "Validation predicates must be TOTAL" and
  // test/object-validation-predicates.test.ts, which fails the build otherwise.
  validations: [
    {
      name: 'close_date_future',
      type: 'script',
      severity: 'warning',
      message: 'Close date should not be in the past unless opportunity is closed',
      // An absent `stage` key means "no stage recorded", which is not a closed
      // stage — hence `!has(record.stage) || (…)` rather than a leading
      // `has(record.stage) &&`, which would suppress the warning instead.
      condition: P`has(record.close_date) && record.close_date != null && record.close_date < today() && (!has(record.stage) || (record.stage != "closed_won" && record.stage != "closed_lost"))`,
    },
    {
      name: 'amount_positive',
      type: 'script',
      severity: 'error',
      message: 'Amount must be greater than zero',
      condition: P`has(record.amount) && record.amount != null && record.amount <= 0`,
    },
    {
      // Migrated from the removed top-level `stateMachines` key (OpportunityStateMachine).
      name: 'opportunity_stage_progression',
      type: 'state_machine',
      severity: 'warning',
      message: 'Invalid opportunity stage transition',
      field: 'stage',
      transitions: {
        // `→ proposal` is legal from every pre-proposal stage: the
        // quote_generation flow fast-forwards the deal to `proposal` when a
        // quote is generated, which can happen at any open stage.
        prospecting: ['qualification', 'proposal', 'closed_lost'],
        qualification: ['needs_analysis', 'proposal', 'closed_lost'],
        needs_analysis: ['proposal', 'closed_lost'],
        // `proposal → closed_won` is legal: the quote_on_accepted hook closes
        // the linked deal directly from the CPQ path (quote_generation parks
        // the opportunity at `proposal`; an accepted quote wins it without a
        // separate negotiation step).
        proposal: ['negotiation', 'closed_won', 'closed_lost'],
        negotiation: ['closed_won', 'closed_lost'],
        closed_won: [],
        closed_lost: [],
      },
    },
  ],
  
  // Workflow Rules
  //
  // NOTE: `probability` and `expected_revenue` are NOT computed here. They are
  // derived imperatively in `opportunity.hook.ts` (single source of truth =
  // stage → STAGE_PROBABILITY). Keeping the math in one place avoids drift
  // between a declarative CASE() table and the hook's lookup table.
  // `forecast_category` remains a declarative workflow below since the hook
  // does not own it.
  // NOTE: object `workflows[]` were removed in @objectstack 7.7. Field-updates
  // moved to this object's *.hook.ts; scheduled status-flips & notifications
  // moved to src/flows/*.flow.ts (see flows/index.ts).
});
