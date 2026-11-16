// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { defineView } from '@objectstack/spec/ui';

/**
 * Project Budget views (hotcrm#2547, PSA phase 2c).
 *
 *   • All Budget Versions — every version the reader may see, by project and
 *     version number.
 *   • Baselines — the one approved version per project that the Approved
 *     Budget is summed from.
 *   • Open Versions — versions being planned or decided: Draft, In Approval
 *     and Rejected.
 *
 * A project's own versions are on its record page, as a related list the
 * master-detail field gives.
 */
export const ProjectBudgetViews = defineView({
  list: {
    type: 'grid',
    name: 'all_project_budgets',
    label: 'All Budget Versions',
    userActions: { editInline: true },
    data: { provider: 'object', object: 'crm_project_budget' },
    columns: [
      { field: 'name', width: 260, link: true, pinned: 'left' },
      { field: 'crm_project', width: 240 },
      { field: 'version', width: 90, align: 'right' },
      { field: 'status', width: 130 },
      { field: 'is_baseline', width: 100, align: 'center' },
      { field: 'total_cost', width: 140, align: 'right' },
      { field: 'labor_hours', width: 120, align: 'right' },
      { field: 'reason', width: 260 },
    ],
    sort: [{ field: 'crm_project', order: 'asc' }, { field: 'version', order: 'desc' }],
    pagination: { pageSize: 50 },
  },

  listViews: {
    baseline_budgets: {
      name: 'baseline_budgets',
      type: 'grid',
      label: 'Baselines',
      userActions: { editInline: true },
      data: { provider: 'object', object: 'crm_project_budget' },
      columns: ['name', 'crm_project', 'version', 'total_cost', 'labor_cost', 'labor_hours'],
      filter: [{ field: 'is_baseline', operator: 'equals', value: true }],
      sort: [{ field: 'crm_project', order: 'asc' }],
    },
    open_budgets: {
      name: 'open_budgets',
      type: 'grid',
      label: 'Open Versions',
      userActions: { editInline: true },
      data: { provider: 'object', object: 'crm_project_budget' },
      columns: ['name', 'crm_project', 'version', 'status', 'total_cost', 'reason'],
      filter: [{ field: 'status', operator: 'in', value: ['draft', 'in_approval', 'rejected'] }],
      sort: [{ field: 'crm_project', order: 'asc' }],
    },
  },
});

/**
 * Budget Line views (hotcrm#2547). Lines are planned on their version's
 * record page, in the grid the master-detail field gives; this list reads
 * them across versions.
 */
export const ProjectBudgetLineViews = defineView({
  list: {
    type: 'grid',
    name: 'all_project_budget_lines',
    label: 'All Budget Lines',
    userActions: { editInline: true },
    data: { provider: 'object', object: 'crm_project_budget_line' },
    columns: [
      { field: 'description', width: 240, link: true, pinned: 'left' },
      { field: 'crm_project_budget', width: 260 },
      { field: 'category', width: 160 },
      { field: 'period', width: 120 },
      { field: 'rate_card', width: 200 },
      { field: 'hours', width: 100, align: 'right' },
      { field: 'quantity', width: 100, align: 'right' },
      { field: 'unit_cost', width: 120, align: 'right' },
      { field: 'amount', width: 130, align: 'right' },
    ],
    sort: [{ field: 'crm_project_budget', order: 'asc' }, { field: 'period', order: 'asc' }],
    pagination: { pageSize: 50 },
  },
});
