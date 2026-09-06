// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { ObjectSchema, Field } from '@objectstack/spec/data';
import { F, P } from '@objectstack/spec';

/**
 * Campaign Object
 * Represents marketing campaigns
 */
export const Campaign = ObjectSchema.create({
  name: 'crm_campaign',
  label: 'Campaign',
  pluralLabel: 'Campaigns',
  icon: 'megaphone',
  description: 'Marketing campaigns and initiatives',

  // ADR-0090 D1/D7: OWD is an authored decision. Campaign catalog is org-visible; only owners edit.
  sharingModel: 'public_read',
  // ADR-0079: render-only `titleFormat` retired in favor of `nameField`,
  // which names a real field. The former template composed two local fields, so
  // a `display_title` formula field reproduces it for the record title.
  nameField: 'display_title',
  // Explicit search targets (ADR-0061). REQUIRED because nameField is a
  // FORMULA (display_title/full_name): without this, $search auto-defaults to
  // the formula field, which isn't a real column, so the lookup picker + global
  // search silently return zero. These are real, indexed columns.
  searchableFields: ['name', 'campaign_code'],
  highlightFields: ['campaign_code', 'name', 'type', 'status', 'start_date'],

  // Every other business object with a detail page groups its fields; campaign
  // was one of the two that did not, so its detail page fell back to one flat
  // 30-field grid with the ROI formulas sitting next to the campaign name. The
  // labels mirror the sections the campaign form uses (Campaign Information /
  // Schedule / Budget & ROI / Performance) so the two surfaces agree — the
  // form's old three-section shape buried the two manual-entry cost fields in a
  // combined "Schedule & Budget" row and was split to match this one (#597).
  fieldGroups: [
    { key: 'basic',      label: 'Campaign Information', icon: 'megaphone' },
    { key: 'schedule',   label: 'Schedule',             icon: 'calendar' },
    { key: 'budget',     label: 'Budget & ROI',         icon: 'dollar-sign' },
    { key: 'metrics',    label: 'Performance',          icon: 'bar-chart' },
    { key: 'assignment', label: 'Ownership',            icon: 'user' },
    { key: 'assets',     label: 'Campaign Assets',      icon: 'link', defaultExpanded: false },
  ],

  fields: {
    // Platform ownership anchor — canonical note in `account.object.ts` (#548).
    owner_id: Field.lookup('sys_user', {
      label: 'Campaign Owner',
      group: 'assignment',
      system: true,
      readonly: false,
      trackHistory: true,
    }),

    // AutoNumber field
    campaign_code: Field.autonumber({
      group: 'basic',
      label: 'Campaign Code',
      format: 'CPG-{0000}',
    }),
    
    // Basic Information
    name: Field.text({
      group: 'basic',
      label: 'Campaign Name',
      required: true,
      storage: { notNull: true },
      searchable: true,
      maxLength: 255,
    }),

    // ADR-0079 record title (was titleFormat '{campaign_code} - {name}').
    display_title: Field.formula({
      group: 'basic',
      label: 'Display Title',
      expression: F`record.campaign_code + " - " + record.name`,
    }),

    description: Field.markdown({
      group: 'basic',
      label: 'Description',
    }),
    
    // Type & Channel
    type: Field.select({
      group: 'basic',
      label: 'Campaign Type',
      options: [
        { label: 'Email', value: 'email', default: true },
        { label: 'Webinar', value: 'webinar' },
        { label: 'Trade Show', value: 'trade_show' },
        { label: 'Conference', value: 'conference' },
        { label: 'Direct Mail', value: 'direct_mail' },
        { label: 'Social Media', value: 'social_media' },
        { label: 'Content Marketing', value: 'content' },
        { label: 'Partner Marketing', value: 'partner' },
      ]
    }),
    
    channel: Field.select({
      group: 'basic',
      label: 'Primary Channel',
      options: [
        { label: 'Digital', value: 'digital' },
        { label: 'Social', value: 'social' },
        { label: 'Email', value: 'email' },
        { label: 'Events', value: 'events' },
        { label: 'Partner', value: 'partner' },
      ]
    }),
    
    // Status
    status: Field.select({
      group: 'basic',
      label: 'Status',
      options: [
        { label: 'Planning', value: 'planning', color: '#999999', default: true },
        { label: 'In Progress', value: 'in_progress', color: '#FFA500' },
        { label: 'Completed', value: 'completed', color: '#00AA00' },
        { label: 'Aborted', value: 'aborted', color: '#FF0000' },
      ],
      required: true,
      storage: { notNull: true },
      trackHistory: true,
    }),
    
    // Dates
    start_date: Field.date({
      group: 'schedule',
      label: 'Start Date',
      required: true,
      storage: { notNull: true },
    }),
    
    end_date: Field.date({
      group: 'schedule',
      label: 'End Date',
      required: true,
      storage: { notNull: true },
    }),
    
    // Budget & ROI
    budgeted_cost: Field.currency({ 
      group: 'budget',
      label: 'Budgeted Cost',
      scale: 2,
      min: 0,
    }),
    
    actual_cost: Field.currency({ 
      group: 'budget',
      label: 'Actual Cost',
      scale: 2,
      min: 0,
    }),
    
    expected_revenue: Field.currency({ 
      group: 'budget',
      label: 'Expected Revenue',
      scale: 2,
      min: 0,
    }),
    
    // ⛔ NOT `readonly` (here and on the num_* snapshot fields below), and the
    // reason holds on the pinned engine rather than on the retired 16.x claim
    // this note used to carry. The metric block — `CAMPAIGN_METRIC_FIELDS` in
    // `campaign.hook.ts` — is written by FOUR refresh hooks, not by the
    // long-retired `campaign_snapshot_metrics`: `campaign_metrics_refresh`,
    // `campaign_attribution_refresh`, `campaign_lead_conversion_refresh` and
    // `campaign_member_metrics_refresh`. Every one of them writes
    // `api.object('crm_campaign').update(...)`, and none declares `Hook.runAs`,
    // which defaults to `'inherit'` — so `ctx.api` is a `ScopedContext` over the
    // ACTING USER's context, and the keys are CALLER-supplied to a
    // non-`isSystem` UPDATE, exactly what `stripReadonlyFields` deletes. Their
    // least-privileged trigger is an ordinary user edit — a rep moving a
    // campaign's status, saving an opportunity, enrolling a member — so
    // `readonly` here would freeze the whole block at its seeded values.
    // Measured in `test/activity-recency.test.ts`, which runs this same
    // `ctx.api` shape through the real engine under a plain user context.
    actual_revenue: Field.currency({ 
      group: 'budget',
      label: 'Actual Revenue',
      scale: 2,
      min: 0,
    }),
    
    // Metrics
    target_size: Field.number({
      group: 'metrics',
      label: 'Target Size',
      description: 'Target number of leads/contacts',
      min: 0,
    }),
    
    // NOT `readonly`: written by the same four refresh hooks, and for the same
    // reason — see the note on `actual_revenue` above.
    // Definition: total members enrolled.
    num_sent: Field.number({
      group: 'metrics',
      label: 'Number Sent',
      min: 0,
    }),
    
    num_responses: Field.number({
      group: 'metrics',
      label: 'Number of Responses',
      min: 0,
    }),
    
    num_leads: Field.number({
      group: 'metrics',
      label: 'Number of Leads',
      min: 0,
    }),
    
    num_converted_leads: Field.number({
      group: 'metrics',
      label: 'Converted Leads',
      min: 0,
    }),
    
    num_opportunities: Field.number({
      group: 'metrics',
      label: 'Opportunities Created',
      min: 0,
    }),
    
    num_won_opportunities: Field.number({
      group: 'metrics',
      label: 'Won Opportunities',
      min: 0,
    }),
    
    // Calculated Metrics (Formula Fields)
    response_rate: Field.formula({
      group: 'metrics',
      label: 'Response Rate %',
      expression: F`coalesce(record.num_sent, 0) > 0 ? (coalesce(record.num_responses, 0) * 100.0) / record.num_sent : 0.0`,
      scale: 2,
    }),
    
    roi: Field.formula({
      group: 'budget',
      label: 'ROI %',
      expression: F`coalesce(record.actual_cost, 0) > 0 ? ((coalesce(record.actual_revenue, 0) - record.actual_cost) * 100.0) / record.actual_cost : 0.0`,
      scale: 2,
    }),
    
    // No `parent_campaign`. Campaign hierarchy was declared and never used: no
    // page, doc or report mentioned it, and the honest consumer for it — a
    // rolled-up ROI — cannot be one declaration. `roi` here is a formula over
    // this campaign's OWN `actual_cost` / `actual_revenue`, so a hierarchy ROI
    // would put a second, differently-scoped ROI on the same record and leave
    // every reader to guess which one they were looking at.
    
    // Campaign Assets
    landing_page_url: Field.url({
      group: 'assets',
      label: 'Landing Page',
    }),
    
    is_active: Field.boolean({
      group: 'assets',
      label: 'Active',
      defaultValue: true,
    }),
  },
  
  // Database indexes
  indexes: [
    { fields: ['name'] },
    { fields: ['type'] },
    { fields: ['status'] },
    { fields: ['start_date'] },
    { fields: ['owner_id'] },
  ],
  
  // Enable advanced features
  // API surface. History → Field.trackHistory (ADR-0052).
  enable: {
    apiEnabled: true,
    apiMethods: ['get', 'list', 'create', 'update', 'delete'],
  },
  
  // Validation Rules
  //
  // Predicates below are TOTAL: every `record.x` read is `has()`-guarded, so the
  // rule returns a verdict even when the merged record has no such key. See
  // AGENTS.md "Validation predicates must be TOTAL" and
  // test/object-validation-predicates.test.ts, which fails the build otherwise.
  validations: [
    {
      name: 'end_after_start',
      type: 'script',
      severity: 'error',
      message: 'End Date must be after Start Date',
      // `<=`, not `<`: the message promises "after", so a campaign that ends
      // the day it starts is a violation. Matches `crm_contract`'s twin rule
      // and `crm_forecast.period_end_after_start` (#514 item 12).
      condition: P`has(record.end_date) && record.end_date != null && has(record.start_date) && record.start_date != null && record.end_date <= record.start_date`,
    },
    {
      name: 'actual_cost_within_budget',
      type: 'script',
      severity: 'warning',
      message: 'Actual Cost exceeds Budgeted Cost',
      condition: P`has(record.actual_cost) && record.actual_cost != null && has(record.budgeted_cost) && record.budgeted_cost != null && record.actual_cost > record.budgeted_cost`,
    },
  ],
  
  // Workflow Rules
  // ⚠️ No `workflows[]` here, and none is possible: object `workflows[]` were
  // removed from the platform. Field updates live in this object's `*.hook.ts`;
  // scheduled status flips and notifications live in `src/flows/*.flow.ts`.
});
