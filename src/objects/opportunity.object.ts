import { F, P, cel } from '@objectstack/spec';
// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Opportunity = ObjectSchema.create({
  name: 'crm_opportunity',
  label: 'Opportunity',
  pluralLabel: 'Opportunities',
  icon: 'dollar-sign',
  description: 'Sales opportunities and deals in the pipeline',
  // ADR-0079: render-only `titleFormat` retired in favor of `nameField`.
  // `stage` is a select — the formula references its stored value directly
  // (no label resolution), matching ADR-0079 guidance.
  nameField: 'display_title',
  highlightFields: ['name', 'crm_account', 'amount', 'stage', 'owner'],

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
    // Basic Information
    name: Field.text({
      label: 'Opportunity Name',
      required: true,
      searchable: true,
      group: 'basic',
    }),

    // ADR-0079 record title (was titleFormat '{name} - {stage}').
    // `stage` is referenced by its stored select value.
    display_title: Field.formula({
      label: 'Display Title',
      expression: F`record.name + " - " + record.stage`,
      group: 'basic',
    }),

    // Relationships
    crm_account: Field.lookup('crm_account', {
      label: 'Account',
      required: true,
      group: 'basic',
    }),

    primary_contact: Field.lookup('crm_contact', {
      label: 'Primary Contact',
      referenceFilters: ['crm_account = {opportunity.crm_account}'],  // Filter contacts by account
      group: 'basic',
    }),

    owner: Field.lookup('user', {

      defaultValue: cel`os.user.id`,
      label: 'Opportunity Owner',
      group: 'basic',
    }),

    // Financial Information
    amount: Field.currency({
      label: 'Amount',
      required: true,
      scale: 2,
      min: 0,
      group: 'financials',
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
      group: 'sales_process',
      // ADR-0052 §5b.1 — the platform auto-renders each stage change on the
      // activity timeline as "Stage: Proposal → Negotiation" (no hook code).
      trackHistory: true,
      options: [
        { label: 'Prospecting', value: 'prospecting', color: '#808080', default: true },
        { label: 'Qualification', value: 'qualification', color: '#FFA500' },
        { label: 'Needs Analysis', value: 'needs_analysis', color: '#FFD700' },
        { label: 'Proposal', value: 'proposal', color: '#4169E1' },
        { label: 'Negotiation', value: 'negotiation', color: '#9370DB' },
        { label: 'Closed Won', value: 'closed_won', color: '#00AA00' },
        { label: 'Closed Lost', value: 'closed_lost', color: '#FF0000' },
      ]
    }),

    probability: Field.percent({
      label: 'Probability (%)',
      min: 0,
      max: 100,
      defaultValue: 10,
      group: 'sales_process',
    }),

    // Important Dates
    close_date: Field.date({
      label: 'Close Date',
      required: true,
      group: 'sales_process',
    }),

    created_date: Field.datetime({
      label: 'Created Date',
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
      options: [
        { label: 'Web', value: 'web' },
        { label: 'Referral', value: 'referral' },
        { label: 'Event', value: 'event' },
        { label: 'Partner', value: 'partner' },
        { label: 'Advertisement', value: 'advertisement' },
        { label: 'Cold Call', value: 'cold_call' },
      ]
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
    days_in_stage: Field.number({
      label: 'Days in Current Stage',
      readonly: true,
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

    // Approval workflow tracking
    approval_status: Field.select({
      label: 'Approval Status',
      group: 'sales_process',
      readonly: true,
      options: [
        { label: 'Not Required', value: 'not_required', default: true },
        { label: 'Pending', value: 'pending', color: '#FFA500' },
        { label: 'Approved', value: 'approved', color: '#00AA00' },
        { label: 'Rejected', value: 'rejected', color: '#FF0000' },
      ],
    }),

    approved_date: Field.datetime({
      label: 'Approved Date',
      readonly: true,
      group: 'sales_process',
    }),

    // Win / Loss analysis — required when stage moves to closed_*
    win_reason: Field.select({
      label: 'Win Reason',
      group: 'classification',
      options: [
        { label: 'Better Product', value: 'better_product' },
        { label: 'Better Price', value: 'better_price' },
        { label: 'Existing Relationship', value: 'relationship' },
        { label: 'Better Support', value: 'better_support' },
        { label: 'Best Fit / Features', value: 'best_fit' },
        { label: 'Other', value: 'other' },
      ],
    }),

    loss_reason: Field.select({
      label: 'Loss Reason',
      group: 'classification',
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
      group: 'classification',
    }),
  },
  
  // Database indexes for performance
  indexes: [
    { fields: ['name'] },
    { fields: ['crm_account'] },
    { fields: ['owner'] },
    { fields: ['stage'] },
    { fields: ['close_date'] },
  ],
  
  // Enable advanced features
  enable: {
    trackHistory: true,    // Critical for tracking stage changes
    searchable: true,
    apiEnabled: true,
    apiMethods: ['get', 'list', 'create', 'update', 'delete', 'aggregate', 'search'], // Whitelist allowed API operations
    files: true,           // Attach proposals, contracts
    feeds: true,           // Team collaboration (Chatter-like)
    activities: true,      // Enable tasks and events tracking
    trash: true,
    mru: true,             // Track Most Recently Used
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
  validations: [
    {
      name: 'close_date_future',
      type: 'script',
      severity: 'warning',
      message: 'Close date should not be in the past unless opportunity is closed',
      condition: P`record.close_date < today() && record.stage != "closed_won" && record.stage != "closed_lost"`,
    },
    {
      name: 'amount_positive',
      type: 'script',
      severity: 'error',
      message: 'Amount must be greater than zero',
      condition: P`record.amount <= 0`,
    },
    {
      // Migrated from the removed top-level `stateMachines` key (OpportunityStateMachine).
      name: 'opportunity_stage_progression',
      type: 'state_machine',
      severity: 'warning',
      message: 'Invalid opportunity stage transition',
      field: 'stage',
      transitions: {
        prospecting: ['qualification', 'closed_lost'],
        qualification: ['needs_analysis', 'closed_lost'],
        needs_analysis: ['proposal', 'closed_lost'],
        proposal: ['negotiation', 'closed_lost'],
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