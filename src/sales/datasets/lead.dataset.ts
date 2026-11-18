// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { defineDataset } from '@objectstack/spec/ui';

/** Lead analytics dataset (ADR-0021). */
export const LeadDataset = defineDataset({
  name: 'lead_metrics',
  label: 'Lead Metrics',
  description: 'Semantic layer for lead counts',
  object: 'crm_lead',
  dimensions: [
    {
      name: 'status',
      label: 'Status',
      description: 'Where the lead stands: New, Contacted, Qualified, Unqualified or Converted.',
      synonyms: ['lead status', '线索状态'],
      field: 'status',
      type: 'string',
    },
    {
      name: 'lead_source',
      label: 'Source',
      description: 'Where the lead came from, as recorded on the lead; leads with no source recorded form their own group.',
      synonyms: ['lead origin', 'channel', '线索来源'],
      field: 'lead_source',
      type: 'string',
    },
    {
      name: 'created_at',
      label: 'Created',
      description: 'The date the lead record was created in the CRM.',
      synonyms: ['created date', 'date created', '创建时间'],
      field: 'created_at',
      type: 'date',
    },
    {
      name: 'last_contacted_date',
      label: 'Last Contacted',
      description: 'The month the lead was last contacted; leads never contacted form their own group.',
      synonyms: ['last contact', 'last touched', '最近联系'],
      field: 'last_contacted_date',
      type: 'date',
      dateGranularity: 'month',
    },
  ],
  measures: [{
    name: 'lead_count',
    label: 'Leads',
    description: 'How many lead records there are, in every status, including converted and unqualified leads; group by Status to count open leads only.',
    synonyms: ['number of leads', 'prospects', '线索数'],
    aggregate: 'count',
  }],
});
