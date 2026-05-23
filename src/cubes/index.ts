// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Cube } from '@objectstack/spec/data';

/**
 * Analytic cubes powering the Executive Overview dashboard.
 *
 * Each cube's `sql` field is the underlying ObjectStack object name (the
 * ObjectQLStrategy uses `cube.sql.trim()` as the object to aggregate over).
 */

export const opportunityCube: Cube = {
  name: 'crm_opportunity',
  title: 'Opportunities',
  sql: 'crm_opportunity',
  public: true,
  measures: {
    count:  { name: 'count',  label: 'Count',           type: 'count', sql: '*' },
    amount: { name: 'amount', label: 'Total Amount',    type: 'sum',   sql: 'amount', format: 'currency' },
  },
  dimensions: {
    stage:               { name: 'stage',               label: 'Stage',          type: 'string', sql: 'stage' },
    close_date:          { name: 'close_date',          label: 'Close Date',     type: 'time',   sql: 'close_date',  granularities: ['day', 'week', 'month', 'quarter', 'year'] },
    'account_industry':  { name: 'account_industry',    label: 'Industry',       type: 'string', sql: 'account.industry' },
    owner:               { name: 'owner',               label: 'Owner',          type: 'string', sql: 'owner' },
  },
};

export const accountCube: Cube = {
  name: 'crm_account',
  title: 'Accounts',
  sql: 'crm_account',
  public: true,
  measures: {
    count: { name: 'count', label: 'Count', type: 'count', sql: '*' },
  },
  dimensions: {
    name:           { name: 'name',           label: 'Name',           type: 'string',  sql: 'name' },
    industry:       { name: 'industry',       label: 'Industry',       type: 'string',  sql: 'industry' },
    type:           { name: 'type',           label: 'Type',           type: 'string',  sql: 'type' },
    owner:          { name: 'owner',          label: 'Owner',          type: 'string',  sql: 'owner' },
    is_active:      { name: 'is_active',      label: 'Active',         type: 'boolean', sql: 'is_active' },
    annual_revenue: { name: 'annual_revenue', label: 'Annual Revenue', type: 'number',  sql: 'annual_revenue' },
    created_at:     { name: 'created_at',     label: 'Created Date',   type: 'time',    sql: 'created_at', granularities: ['day', 'week', 'month', 'quarter', 'year'] },
  },
};

export const contactCube: Cube = {
  name: 'crm_contact',
  title: 'Contacts',
  sql: 'crm_contact',
  public: true,
  measures: {
    count: { name: 'count', label: 'Count', type: 'count', sql: '*' },
  },
  dimensions: {},
};

export const leadCube: Cube = {
  name: 'crm_lead',
  title: 'Leads',
  sql: 'crm_lead',
  public: true,
  measures: {
    count: { name: 'count', label: 'Count', type: 'count', sql: '*' },
  },
  dimensions: {
    is_converted: { name: 'is_converted', label: 'Converted', type: 'boolean', sql: 'is_converted' },
  },
};

export const caseCube: Cube = {
  name: 'crm_case',
  title: 'Cases',
  sql: 'crm_case',
  public: true,
  measures: {
    count:                 { name: 'count',                 label: 'Count',                 type: 'count', sql: '*' },
    sla_violations:        { name: 'sla_violations',        label: 'SLA Violations',        type: 'count', sql: 'is_sla_violated', filters: [{ sql: 'is_sla_violated = true' }] },
    escalated:             { name: 'escalated',             label: 'Escalated',             type: 'count', sql: 'is_escalated',    filters: [{ sql: 'is_escalated = true' }] },
    avg_resolution_hours:  { name: 'avg_resolution_hours',  label: 'Avg Resolution (hrs)',  type: 'avg',   sql: 'resolution_time_hours' },
  },
  dimensions: {
    status:     { name: 'status',     label: 'Status',   type: 'string',  sql: 'status' },
    priority:   { name: 'priority',   label: 'Priority', type: 'string',  sql: 'priority' },
    origin:     { name: 'origin',     label: 'Origin',   type: 'string',  sql: 'origin' },
    type:       { name: 'type',       label: 'Type',     type: 'string',  sql: 'type' },
    owner:      { name: 'owner',      label: 'Owner',    type: 'string',  sql: 'owner' },
    is_closed:  { name: 'is_closed',  label: 'Closed',   type: 'boolean', sql: 'is_closed' },
    account:    { name: 'crm_account',    label: 'Account',  type: 'string',  sql: 'crm_account' },
    created_at: { name: 'created_at', label: 'Created',  type: 'time',    sql: 'created_at', granularities: ['day', 'week', 'month', 'quarter', 'year'] },
  },
};

export const campaignCube: Cube = {
  name: 'crm_campaign',
  title: 'Campaigns',
  sql: 'crm_campaign',
  public: true,
  measures: {
    count:            { name: 'count',            label: 'Count',            type: 'count', sql: '*' },
    budgeted_cost:    { name: 'budgeted_cost',    label: 'Budgeted Cost',    type: 'sum',   sql: 'budgeted_cost',    format: 'currency' },
    actual_cost:      { name: 'actual_cost',      label: 'Actual Cost',      type: 'sum',   sql: 'actual_cost',      format: 'currency' },
    actual_revenue:   { name: 'actual_revenue',   label: 'Actual Revenue',   type: 'sum',   sql: 'actual_revenue',   format: 'currency' },
    expected_revenue: { name: 'expected_revenue', label: 'Expected Revenue', type: 'sum',   sql: 'expected_revenue', format: 'currency' },
    num_leads:        { name: 'num_leads',        label: 'Leads',            type: 'sum',   sql: 'num_leads' },
    num_opportunities:{ name: 'num_opportunities',label: 'Opportunities',    type: 'sum',   sql: 'num_opportunities' },
    num_won:          { name: 'num_won',          label: 'Won Opps',         type: 'sum',   sql: 'num_won_opportunities' },
  },
  dimensions: {
    type:       { name: 'type',       label: 'Type',     type: 'string',  sql: 'type' },
    channel:    { name: 'channel',    label: 'Channel',  type: 'string',  sql: 'channel' },
    status:     { name: 'status',     label: 'Status',   type: 'string',  sql: 'status' },
    owner:      { name: 'owner',      label: 'Owner',    type: 'string',  sql: 'owner' },
    is_active:  { name: 'is_active',  label: 'Active',   type: 'boolean', sql: 'is_active' },
    start_date: { name: 'start_date', label: 'Start',    type: 'time',    sql: 'start_date', granularities: ['day', 'week', 'month', 'quarter', 'year'] },
  },
};

export const campaignMemberCube: Cube = {
  name: 'crm_campaign_member',
  title: 'Campaign Members',
  sql: 'crm_campaign_member',
  public: true,
  measures: {
    count: { name: 'count', label: 'Count', type: 'count', sql: '*' },
  },
  dimensions: {
    campaign:      { name: 'crm_campaign',      label: 'Campaign', type: 'string', sql: 'crm_campaign' },
    status:        { name: 'status',        label: 'Status',   type: 'string', sql: 'status' },
    response_date: { name: 'response_date', label: 'Responded',type: 'time',   sql: 'response_date', granularities: ['day', 'week', 'month'] },
  },
};
