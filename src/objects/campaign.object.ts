// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { ObjectSchema, Field } from '@objectstack/spec/data';
import { F, P, cel } from '@objectstack/spec';

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
  // keys mirror the sections the campaign form already uses (Overview /
  // Schedule & Budget / Performance) so the two surfaces agree.
  fieldGroups: [
    { key: 'basic',      label: 'Campaign Information', icon: 'megaphone' },
    { key: 'schedule',   label: 'Schedule',             icon: 'calendar' },
    { key: 'budget',     label: 'Budget & ROI',         icon: 'dollar-sign' },
    { key: 'metrics',    label: 'Performance',          icon: 'bar-chart' },
    { key: 'assignment', label: 'Ownership',            icon: 'user' },
    { key: 'assets',     label: 'Campaign Assets',      icon: 'link', defaultExpanded: false },
  ],

  fields: {
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
    
    // NOT `readonly` (here and on the num_* snapshot fields below): the
    // campaign_snapshot_metrics hook writes these through the data API, and
    // 16.x drops writes to readonly fields (#2948) — same reason num_sent was
    // already opened up. With readonly on, the completion snapshot silently
    // persisted nothing but num_sent.
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
    
    // NOT `readonly`: the campaign_snapshot_metrics hook writes this rollup
    // (16.x drops readonly writes, #2948). Definition: total members enrolled.
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
    
    // Relationships
    parent_campaign: Field.lookup('crm_campaign', {
      group: 'basic',
      label: 'Parent Campaign',
      description: 'Parent campaign in hierarchy',
    }),
    
    owner: Field.lookup('sys_user', {
      group: 'assignment',
      defaultValue: cel`os.user.id`,
      label: 'Campaign Owner',
      trackHistory: true,
    }),
    
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
    { fields: ['owner'] },
  ],
  
  // Enable advanced features
  // Dead object-level enable.* flags removed in @objectstack 12 (ADR-0049);
  // only the live API surface remains. History → Field.trackHistory (ADR-0052).
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
  // NOTE: object `workflows[]` were removed in @objectstack 7.7. Field-updates
  // moved to this object's *.hook.ts; scheduled status-flips & notifications
  // moved to src/flows/*.flow.ts (see flows/index.ts).
});
