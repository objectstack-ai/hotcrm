// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Report } from '@objectstack/spec/ui';

export const CasesByStatusPriorityReport: Report = {
  name: 'cases_by_status_priority',
  label: 'Cases by Status and Priority',
  description: 'Summary of cases by status and priority',
  // The chart counts cases, so `case_count` must be selected alongside the
  // resolution time — and the yAxis must name that MEASURE ('case_number'
  // was a raw-field name that exists in no dataset, so the axis was empty).
  dataset: 'case_metrics', rows: ['status', 'priority'], values: ['case_count', 'avg_resolution'],
  type: 'summary',
  chart: { type: 'bar', title: 'Cases by Status', showLegend: true, xAxis: 'status', yAxis: 'case_count' }
};

export const SlaPerformanceReport: Report = {
  name: 'sla_performance',
  label: 'SLA Performance Report',
  description: 'Analysis of SLA compliance',
  // 'avg_sla_violated' (not a duplicated 'case_count') — the table showed two
  // identical Cases columns and no violation measure; the chart's yAxis must
  // name a dataset MEASURE, not a raw field ('is_sla_violated' leaked the
  // column name onto the axis).
  dataset: 'case_metrics', rows: ['priority'], values: ['case_count', 'avg_sla_violated', 'avg_resolution'],
  type: 'summary',
  runtimeFilter: { is_closed: true },
  chart: { type: 'column', title: 'SLA Violations by Priority', showLegend: false, xAxis: 'priority', yAxis: 'avg_sla_violated' }
};

/**
 * Daily case inflow by priority — matrix over `created_at`. Support managers
 * use this to spot priority spikes (e.g. a P1 burst on Tuesday) and staff
 * accordingly.
 *
 * `case_metrics.created_at` declares the day bucket, so records created at
 * different times on the same day aggregate into one column.
 *
 * No `runtimeFilter` (#1992). The column used to be `created_date`, which
 * nothing wrote on a real case, so this report carried
 * `{ created_date: { $ne: null } }` against a headerless '—' column and every
 * case created through the UI or REST fell out of it. `created_at` is the
 * platform's own creation stamp, written on every insert, so there is no
 * empty bucket to exclude and every case opened is counted.
 */
export const CasesOpenedByDayPriorityReport: Report = {
  name: 'cases_opened_by_day_priority',
  label: 'Cases Opened by Priority × Day',
  description: 'Daily case inflow split by priority',
  dataset: 'case_metrics', rows: ['priority'], columns: ['created_at'], values: ['case_count'],
  type: 'matrix',
};
