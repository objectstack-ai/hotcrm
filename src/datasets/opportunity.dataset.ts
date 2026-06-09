// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { defineDataset } from '@objectstack/spec/ui';

/**
 * Opportunity analytics dataset (ADR-0021).
 *
 * The single semantic source of truth for pipeline metrics across the Sales,
 * CRM and Executive dashboards. Widgets bind to this dataset and select
 * measures BY NAME (`total_amount`, `avg_amount`, `opp_count`) so "pipeline
 * revenue" means the same thing everywhere. Single-object dataset (no joins).
 */
export const OpportunityDataset = defineDataset({
  name: 'opportunity_metrics',
  label: 'Opportunity Metrics',
  description: 'Semantic layer for sales-pipeline counts and amounts',
  object: 'crm_opportunity',

  dimensions: [
    { name: 'stage', label: 'Stage', field: 'stage', type: 'string' },
    { name: 'lead_source', label: 'Lead Source', field: 'lead_source', type: 'string' },
    { name: 'forecast_category', label: 'Forecast Category', field: 'forecast_category', type: 'string' },
    { name: 'type', label: 'Deal Type', field: 'type', type: 'string' },
    { name: 'owner', label: 'Owner', field: 'owner', type: 'lookup' },
    { name: 'close_date', label: 'Close Date', field: 'close_date', type: 'date' },
  ],

  measures: [
    { name: 'opp_count', label: 'Opportunities', aggregate: 'count' },
    { name: 'total_amount', label: 'Total Amount', aggregate: 'sum', field: 'amount', format: '$0,0' },
    { name: 'avg_amount', label: 'Avg Deal Size', aggregate: 'avg', field: 'amount', format: '$0,0' },
  ],
});
