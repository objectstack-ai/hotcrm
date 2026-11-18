// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { defineDataset } from '@objectstack/spec/ui';

/** Lead analytics dataset (ADR-0021). */
export const LeadDataset = defineDataset({
  name: 'lead_metrics',
  label: 'Lead Metrics',
  description: 'Semantic layer for lead counts',
  object: 'crm_lead',
  dimensions: [
    { name: 'status', label: 'Status', synonyms: ['lead status', '线索状态'], field: 'status', type: 'string' },
    { name: 'lead_source', label: 'Source', synonyms: ['lead origin', 'channel', '线索来源'], field: 'lead_source', type: 'string' },
    { name: 'created_at', label: 'Created', synonyms: ['created date', 'date created', '创建时间'], field: 'created_at', type: 'date' },
    { name: 'last_contacted_date', label: 'Last Contacted', synonyms: ['last contact', 'last touched', '最近联系'], field: 'last_contacted_date', type: 'date', dateGranularity: 'month' },
  ],
  measures: [{ name: 'lead_count', label: 'Leads', synonyms: ['number of leads', 'prospects', '线索数'], aggregate: 'count' }],
});
