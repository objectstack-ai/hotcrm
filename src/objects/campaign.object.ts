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
  highlightFields: ['campaign_code', 'name', 'type', 'status', 'start_date'],
  
  fields: {
    // AutoNumber field
    campaign_code: Field.autonumber({
      label: 'Campaign Code',
      format: 'CPG-{0000}',
    }),
    
    // Basic Information
    name: Field.text({
      label: 'Campaign Name',
      required: true,
      searchable: true,
      maxLength: 255,
    }),

    // ADR-0079 record title (was titleFormat '{campaign_code} - {name}').
    display_title: Field.formula({
      label: 'Display Title',
      expression: F`record.campaign_code + " - " + record.name`,
    }),

    description: Field.markdown({
      label: 'Description',
    }),
    
    // Type & Channel
    type: Field.select({
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
      label: 'Status',
      options: [
        { label: 'Planning', value: 'planning', color: '#999999', default: true },
        { label: 'In Progress', value: 'in_progress', color: '#FFA500' },
        { label: 'Completed', value: 'completed', color: '#00AA00' },
        { label: 'Aborted', value: 'aborted', color: '#FF0000' },
      ],
      required: true,
      trackHistory: true,
    }),
    
    // Dates
    start_date: Field.date({
      label: 'Start Date',
      required: true,
    }),
    
    end_date: Field.date({
      label: 'End Date',
      required: true,
    }),
    
    // Budget & ROI
    budgeted_cost: Field.currency({ 
      label: 'Budgeted Cost',
      scale: 2,
      min: 0,
    }),
    
    actual_cost: Field.currency({ 
      label: 'Actual Cost',
      scale: 2,
      min: 0,
    }),
    
    expected_revenue: Field.currency({ 
      label: 'Expected Revenue',
      scale: 2,
      min: 0,
    }),
    
    actual_revenue: Field.currency({ 
      label: 'Actual Revenue',
      scale: 2,
      min: 0,
      readonly: true,
    }),
    
    // Metrics
    target_size: Field.number({
      label: 'Target Size',
      description: 'Target number of leads/contacts',
      min: 0,
    }),
    
    // NOT `readonly`: the campaign_enrollment flow writes this rollup
    // (16.x drops readonly writes, #2948).
    num_sent: Field.number({
      label: 'Number Sent',
      min: 0,
    }),
    
    num_responses: Field.number({
      label: 'Number of Responses',
      min: 0,
      readonly: true,
    }),
    
    num_leads: Field.number({
      label: 'Number of Leads',
      min: 0,
      readonly: true,
    }),
    
    num_converted_leads: Field.number({
      label: 'Converted Leads',
      min: 0,
      readonly: true,
    }),
    
    num_opportunities: Field.number({
      label: 'Opportunities Created',
      min: 0,
      readonly: true,
    }),
    
    num_won_opportunities: Field.number({
      label: 'Won Opportunities',
      min: 0,
      readonly: true,
    }),
    
    // Calculated Metrics (Formula Fields)
    response_rate: Field.formula({
      label: 'Response Rate %',
      expression: F`coalesce(record.num_sent, 0) > 0 ? (coalesce(record.num_responses, 0) * 100.0) / record.num_sent : 0.0`,
      scale: 2,
    }),
    
    roi: Field.formula({
      label: 'ROI %',
      expression: F`coalesce(record.actual_cost, 0) > 0 ? ((coalesce(record.actual_revenue, 0) - record.actual_cost) * 100.0) / record.actual_cost : 0.0`,
      scale: 2,
    }),
    
    // Relationships
    parent_campaign: Field.lookup('crm_campaign', {
      label: 'Parent Campaign',
      description: 'Parent campaign in hierarchy',
    }),
    
    owner: Field.lookup('sys_user', {

      defaultValue: cel`os.user.id`,
      label: 'Campaign Owner',
      trackHistory: true,
    }),
    
    // Campaign Assets
    landing_page_url: Field.url({
      label: 'Landing Page',
    }),
    
    is_active: Field.boolean({
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
    apiMethods: ['get', 'list', 'create', 'update', 'delete', 'search', 'export'],
  },
  
  // Validation Rules
  validations: [
    {
      name: 'end_after_start',
      type: 'script',
      severity: 'error',
      message: 'End Date must be after Start Date',
      condition: P`record.end_date < record.start_date`,
    },
    {
      name: 'actual_cost_within_budget',
      type: 'script',
      severity: 'warning',
      message: 'Actual Cost exceeds Budgeted Cost',
      condition: P`record.actual_cost > record.budgeted_cost`,
    },
  ],
  
  // Workflow Rules
  // NOTE: object `workflows[]` were removed in @objectstack 7.7. Field-updates
  // moved to this object's *.hook.ts; scheduled status-flips & notifications
  // moved to src/flows/*.flow.ts (see flows/index.ts).
});
