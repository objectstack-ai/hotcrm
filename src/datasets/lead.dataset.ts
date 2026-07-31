// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { defineDataset } from '@objectstack/spec/ui';

/** Lead analytics dataset (ADR-0021). */
export const LeadDataset = defineDataset({
  name: 'lead_metrics',
  label: 'Lead Metrics',
  description: 'Semantic layer for lead counts',
  object: 'crm_lead',
  dimensions: [
    { name: 'status', label: 'Status', field: 'status', type: 'string' },
    { name: 'lead_source', label: 'Source', field: 'lead_source', type: 'string' },
    { name: 'created_at', label: 'Created', field: 'created_at', type: 'date' },
    // No `dateGranularity` (intended: month, for lead_inflow_by_month_source)
    // — see the note on opportunity_metrics.close_date for why it cannot be
    // declared on 16.x. `crm_lead.last_contacted_date` is a `Field.datetime()`,
    // so it is blocked by BOTH gaps described there.
    { name: 'last_contacted_date', label: 'Last Contacted', field: 'last_contacted_date', type: 'date' },
  ],
  measures: [{ name: 'lead_count', label: 'Leads', aggregate: 'count' }],
});
