// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { defineDataset } from '@objectstack/spec/ui';

/**
 * Event analytics dataset (ADR-0021) — the semantic layer #592 needed.
 *
 * Before this, the app had NO activity metric of any kind: calls per rep,
 * meetings booked and activity per deal were all unanswerable, because the
 * only trace of an interaction was a `sys_activity` row with the interesting
 * part inside a JSON string. `crm_event` is a real object, so it gets a real
 * cube.
 *
 * `related_to_type` is a dimension and the `related_to_*` lookups are not:
 * grouping by a lookup id yields a column per raw id, which reads as noise on
 * a chart. "Which deals are starved of activity" is answered by filtering to
 * `related_to_type = crm_opportunity` and counting, not by grouping on the id.
 *
 * `start_datetime` declares `dateGranularity: 'week'`: every widget built on
 * it asks "how much activity per week", and on @objectstack 17 a bucketed
 * dimension is honoured (see `test/dataset-granularity.test.ts` for the 16.x
 * history and why the buckets could not be declared before).
 */
export const EventDataset = defineDataset({
  name: 'event_metrics',
  label: 'Activity Metrics',
  description: 'Semantic layer for meetings, calls and interaction recency',
  object: 'crm_event',
  dimensions: [
    { name: 'type', label: 'Activity Type', field: 'type', type: 'string' },
    { name: 'status', label: 'Status', field: 'status', type: 'string' },
    // `owner` is the SEMANTIC name every widget/report selects by; the column
    // behind it is the platform ownership anchor `owner_id` (#548).
    { name: 'owner', label: 'Owner', field: 'owner_id', type: 'string' },
    { name: 'related_to_type', label: 'Related To', field: 'related_to_type', type: 'string' },
    {
      name: 'start_datetime',
      label: 'Activity Week',
      field: 'start_datetime',
      type: 'date',
      dateGranularity: 'week',
    },
  ],
  measures: [
    { name: 'event_count', label: 'Activities', aggregate: 'count' },
    {
      name: 'total_minutes',
      label: 'Minutes',
      aggregate: 'sum',
      field: 'duration_minutes',
      format: '0,0',
    },
    {
      name: 'avg_minutes',
      label: 'Avg Duration',
      aggregate: 'avg',
      field: 'duration_minutes',
      format: '0,0',
    },
  ],
});
