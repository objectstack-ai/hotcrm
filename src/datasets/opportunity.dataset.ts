// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { defineDataset } from '@objectstack/spec/ui';

/**
 * Opportunity analytics dataset (ADR-0021).
 *
 * The single semantic source of truth for pipeline metrics across the Sales,
 * CRM and Executive dashboards. Widgets bind to this dataset and select
 * measures BY NAME (`total_amount`, `avg_amount`, `opp_count`) so "pipeline
 * revenue" means the same thing everywhere.
 */
export const OpportunityDataset = defineDataset({
  name: 'opportunity_metrics',
  label: 'Opportunity Metrics',
  description: 'Semantic layer for sales-pipeline counts and amounts',
  object: 'crm_opportunity',

  // Include the account relationship so dimensions can traverse it (the join is
  // derived from the `crm_account` lookup — no hand-written ON clause).
  include: ['crm_account'],

  dimensions: [
    { name: 'stage', label: 'Stage', field: 'stage', type: 'string' },
    { name: 'lead_source', label: 'Lead Source', field: 'lead_source', type: 'string' },
    { name: 'forecast_category', label: 'Forecast Category', field: 'forecast_category', type: 'string' },
    { name: 'type', label: 'Deal Type', field: 'type', type: 'string' },
    { name: 'owner', label: 'Owner', field: 'owner', type: 'lookup' },
    // NOTE: no `dateGranularity` here — a bucketed date dimension routes the
    // query through the platform's ObjectQL aggregate bridge, which drops the
    // caller's ExecutionContext and fail-closes the read scope (id =
    // '__deny_all__') on @objectstack 16.1, returning zero rows. Trend widgets
    // group by the raw date until that is fixed upstream.
    { name: 'close_date', label: 'Close Date', field: 'close_date', type: 'date' },
    // Cross-object dimension: account industry via the crm_account relationship.
    { name: 'account_industry', label: 'Account Industry', field: 'crm_account.industry', type: 'string' },
  ],

  measures: [
    { name: 'opp_count', label: 'Opportunities', aggregate: 'count' },
    { name: 'total_amount', label: 'Total Amount', aggregate: 'sum', field: 'amount', format: '0,0' },
    { name: 'avg_amount', label: 'Avg Deal Size', aggregate: 'avg', field: 'amount', format: '0,0' },
    { name: 'avg_probability', label: 'Avg Probability', aggregate: 'avg', field: 'probability', format: '0%' },
  ],
});
