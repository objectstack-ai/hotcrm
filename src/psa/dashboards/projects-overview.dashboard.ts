// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { Dashboard } from '@objectstack/spec/ui';

/** The statuses whose projects are spending: approved work under way or done. */
const DELIVERING = ['active', 'on_hold', 'completed'];

/**
 * Projects Overview (#2316 phase 1c).
 *
 * Budget, cost, margin and hours across the delivery portfolio. It binds only
 * Project Delivery's own datasets, `project_financials` and `time_utilization`,
 * and lives in the module beside them: a dataset is read only inside the
 * reader's dependency closure (measured on 18.4.0) (phase-0 reading P4), and the
 * dashboard leaves with the module when a tenant disables it.
 *
 * The money tiles cover the projects that are spending (Active, On Hold,
 * Completed); a Draft or In Approval project has a budget but no cost yet, and
 * would only dilute Budget Used. The hours tiles count approved timesheets
 * only, the hours that are cost: the filter reads the entry's timesheet
 * (`crm_timesheet.status`, served across the include from 18.5.0), and a week
 * is the week the hours were worked.
 *
 * No date picker: a project spans months, and windowing projects by a date
 * would cut a running project out of its own figures. Hours by week are
 * bounded by their own axis.
 */
export const ProjectsOverviewDashboard: Dashboard = {
  name: 'projects_overview',
  label: 'Projects Overview',
  description: 'Budget, cost, margin and approved hours across the delivery portfolio',

  columns: 12,
  gap: 4,
  refreshIntervalSeconds: 300,

  header: {
    showTitle: true,
    showDescription: true,
  },

  widgets: [
    // ─── Row 1: the portfolio in four figures ────────────────────────────
    {
      id: 'delivering_projects',
      title: 'Projects Delivering',
      description: 'Active, On Hold and Completed projects',
      type: 'metric',
      filter: { status: { $in: DELIVERING } },
      colorVariant: 'blue',
      dataset: 'project_financials', values: ['project_count'],
      layout: { x: 0, y: 0, w: 3, h: 1 },
    },
    {
      id: 'delivering_budget',
      title: 'Approved Budget',
      description: 'Approved budgets of the projects delivering',
      type: 'metric',
      filter: { status: { $in: DELIVERING } },
      colorVariant: 'default',
      dataset: 'project_financials', values: ['approved_budget_sum'],
      layout: { x: 3, y: 0, w: 3, h: 1 },
    },
    {
      id: 'delivering_cost',
      title: 'Actual Cost',
      description: 'Approved labor and expenses of the projects delivering',
      type: 'metric',
      filter: { status: { $in: DELIVERING } },
      colorVariant: 'orange',
      dataset: 'project_financials', values: ['actual_cost_sum'],
      layout: { x: 6, y: 0, w: 3, h: 1 },
    },
    {
      id: 'delivering_budget_used',
      title: 'Budget Used',
      description: 'Actual cost over approved budget, across the projects delivering',
      type: 'metric',
      filter: { status: { $in: DELIVERING } },
      colorVariant: 'purple',
      dataset: 'project_financials', values: ['budget_used'],
      layout: { x: 9, y: 0, w: 3, h: 1 },
    },

    // ─── Row 2: where the money goes ─────────────────────────────────────
    {
      id: 'budget_vs_cost',
      title: 'Budget and Cost by Project',
      description: 'Approved budget beside actual cost, per project delivering',
      type: 'bar',
      filter: { status: { $in: DELIVERING } },
      colorVariant: 'blue',
      dataset: 'project_financials', dimensions: ['project'], values: ['approved_budget_sum', 'actual_cost_sum'],
      layout: { x: 0, y: 1, w: 8, h: 4 },
      chartConfig: {
        showLegend: true,
        showDataLabels: false,
        colors: ['#94A3B8', '#0D9488'],
      },
    },
    {
      id: 'budget_status_mix',
      title: 'Projects by Budget Status',
      description: 'On Track, Warning (from 80 %) and Exceeded (from 100 %), projects with a budget',
      type: 'donut',
      filter: { status: { $in: DELIVERING }, budget_status: { $in: ['on_track', 'warning', 'exceeded'] } },
      colorVariant: 'default',
      dataset: 'project_financials', dimensions: ['budget_status'], values: ['project_count'],
      layout: { x: 8, y: 1, w: 4, h: 4 },
    },

    // ─── Row 3: margin ───────────────────────────────────────────────────
    {
      id: 'project_margin',
      title: 'Margin by Project',
      description: 'Planned revenue, actual cost, gross margin and budget used, per project delivering',
      type: 'table',
      filter: { status: { $in: DELIVERING } },
      colorVariant: 'default',
      dataset: 'project_financials', dimensions: ['project'], values: ['planned_revenue_sum', 'actual_cost_sum', 'gross_margin_sum', 'budget_used'],
      layout: { x: 0, y: 5, w: 8, h: 4 },
      options: {
        sortBy: 'gross_margin_sum',
        sortOrder: 'asc',
        limit: 20,
      },
    },
    {
      id: 'projects_by_status',
      title: 'Projects by Status',
      description: 'Every project, from Draft to Closed',
      type: 'donut',
      colorVariant: 'default',
      dataset: 'project_financials', dimensions: ['status'], values: ['project_count'],
      layout: { x: 8, y: 5, w: 4, h: 4 },
    },

    // ─── Row 4: approved hours ───────────────────────────────────────────
    {
      id: 'hours_by_week',
      title: 'Approved Hours by Week',
      description: 'Hours on approved timesheets, and the billable part of them',
      type: 'line',
      filter: { 'crm_timesheet.status': 'approved' },
      colorVariant: 'blue',
      dataset: 'time_utilization', dimensions: ['period_week'], values: ['total_hours', 'billable_hours'],
      layout: { x: 0, y: 9, w: 8, h: 4 },
      chartConfig: {
        showLegend: true,
        colors: ['#94A3B8', '#0D9488'],
      },
    },
    {
      id: 'billable_share_by_person',
      title: 'Billable Share by Person',
      description: 'Approved hours per person and the share billed to customers',
      type: 'table',
      filter: { 'crm_timesheet.status': 'approved' },
      colorVariant: 'default',
      dataset: 'time_utilization', dimensions: ['person'], values: ['total_hours', 'billable_hours', 'utilization'],
      layout: { x: 8, y: 9, w: 4, h: 4 },
      options: {
        sortBy: 'total_hours',
        sortOrder: 'desc',
        limit: 20,
      },
    },
  ],
};
