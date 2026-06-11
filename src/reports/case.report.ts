// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { ReportInput } from '@objectstack/spec/ui';

export const CasesByStatusPriorityReport: ReportInput = {
  name: 'cases_by_status_priority',
  label: 'Cases by Status and Priority',
  description: 'Summary of cases by status and priority',
  dataset: 'case_metrics', rows: ['status', 'priority'], values: ['avg_resolution'],
  type: 'summary',
  chart: { type: 'bar', title: 'Cases by Status', showLegend: true, xAxis: 'status', yAxis: 'case_number' }
};

export const SlaPerformanceReport: ReportInput = {
  name: 'sla_performance',
  label: 'SLA Performance Report',
  description: 'Analysis of SLA compliance',
  dataset: 'case_metrics', rows: ['priority'], values: ['case_count', 'case_count', 'avg_resolution'],
  type: 'summary',
  runtimeFilter: { is_closed: true },
  chart: { type: 'column', title: 'SLA Violations by Priority', showLegend: false, xAxis: 'priority', yAxis: 'is_sla_violated' }
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
  dataset: 'case_metrics', rows: ['priority', 'created_date'], values: ['case_count'],
  type: 'matrix',
};
