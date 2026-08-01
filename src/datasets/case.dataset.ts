// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { defineDataset } from '@objectstack/spec/ui';

/**
 * Case analytics dataset (ADR-0021) — the semantic source of truth for the
 * Service dashboard's case counts, resolution time and SLA compliance.
 */
export const CaseDataset = defineDataset({
  name: 'case_metrics',
  label: 'Case Metrics',
  description: 'Semantic layer for support-case counts, resolution time and SLA',
  object: 'crm_case',

  dimensions: [
    { name: 'status', label: 'Status', field: 'status', type: 'string' },
    { name: 'priority', label: 'Priority', field: 'priority', type: 'string' },
    { name: 'origin', label: 'Origin', field: 'origin', type: 'string' },
    { name: 'type', label: 'Type', field: 'type', type: 'string' },
    { name: 'created_date', label: 'Created', field: 'created_date', type: 'date', dateGranularity: 'day' },
  ],

  measures: [
    { name: 'case_count', label: 'Cases', aggregate: 'count' },
    { name: 'avg_resolution', label: 'Avg Resolution (h)', aggregate: 'avg', field: 'resolution_time_hours', format: '0.0' },
    { name: 'avg_sla_violated', label: 'SLA Violation Rate', aggregate: 'avg', field: 'is_sla_violated', format: '0.0%' },
  ],
});
