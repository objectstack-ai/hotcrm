// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { ReportInput } from '@objectstack/spec/ui';

export const CasesByStatusPriorityReport: ReportInput = {
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

export const SlaPerformanceReport: ReportInput = {
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
 * Daily case inflow by priority — matrix with day-level bucketing. Support
 * managers use this to spot priority spikes (e.g. a P1 burst on Tuesday) and
 * staff accordingly. Exercises the finest `dateGranularity: 'day'` bucket and
 * its interaction with a small categorical axis.
 */
export const CasesOpenedByDayPriorityReport: ReportInput = {
  name: 'cases_opened_by_day_priority',
  label: 'Cases Opened by Priority × Day',
  description: 'Daily case inflow split by priority',
  dataset: 'case_metrics', rows: ['priority'], columns: ['created_date'], values: ['case_count'],
  type: 'matrix',
};
