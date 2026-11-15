// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { defineDataset } from '@objectstack/spec/ui';

/**
 * Project financials (#2316 phase 1c, ADR-0021).
 *
 * Budget, revenue and cost per project, for the Projects Overview dashboard.
 * It lives with `crm_project` in the module (AGENTS.md layout rule 3), and the
 * dashboard that reads it lives here too: from objectstack 18.4.0 a dataset is
 * read only inside the reader package's dependency closure (phase-0 reading
 * P4), so nothing on the app's Executive dashboard binds it.
 *
 * Every measure sums a STORED column. Actual cost, margin and Budget Used % are
 * formulas on the project, and a dataset refuses `sum` over a formula field, so
 * they are rebuilt here from the stored halves with `derived`, which keeps the
 * same arithmetic as the record: actual cost = labor + expenses, margin =
 * planned revenue - actual cost, used = actual cost / approved budget. A
 * derived ratio summed over many projects is the portfolio's figure, not an
 * average of each project's percentage.
 */
export const ProjectFinancialsDataset = defineDataset({
  name: 'project_financials',
  label: 'Project Financials',
  description: 'Approved budget, planned revenue, cost and margin per project',
  object: 'crm_project',

  dimensions: [
    { name: 'project', label: 'Project', field: 'name', type: 'string' },
    { name: 'status', label: 'Status', field: 'status', type: 'string' },
    { name: 'kind', label: 'Kind', field: 'kind', type: 'string' },
    { name: 'billing_type', label: 'Billing Type', field: 'billing_type', type: 'string' },
    { name: 'budget_status', label: 'Budget Status', field: 'budget_status', type: 'string' },
    { name: 'project_manager', label: 'Project Manager', field: 'project_manager', type: 'lookup' },
    { name: 'planned_start', label: 'Planned Start', field: 'planned_start', type: 'date', dateGranularity: 'month' },
  ],

  measures: [
    { name: 'project_count', label: 'Projects', aggregate: 'count' },
    { name: 'approved_budget_sum', label: 'Approved Budget', aggregate: 'sum', field: 'approved_budget', format: '0,0' },
    { name: 'planned_revenue_sum', label: 'Planned Revenue', aggregate: 'sum', field: 'planned_revenue', format: '0,0' },
    { name: 'labor_cost_sum', label: 'Labor Cost', aggregate: 'sum', field: 'actual_labor_cost', format: '0,0' },
    { name: 'expense_cost_sum', label: 'Expense Cost', aggregate: 'sum', field: 'actual_expense_cost', format: '0,0' },
    { name: 'actual_cost_sum', label: 'Actual Cost', derived: { op: 'sum', of: ['labor_cost_sum', 'expense_cost_sum'] }, format: '0,0' },
    { name: 'gross_margin_sum', label: 'Gross Margin', derived: { op: 'difference', of: ['planned_revenue_sum', 'actual_cost_sum'] }, format: '0,0' },
    { name: 'budget_used', label: 'Budget Used', derived: { op: 'ratio', of: ['actual_cost_sum', 'approved_budget_sum'] }, format: '0%' },
    { name: 'billable_labor_sum', label: 'Billable Labor', aggregate: 'sum', field: 'billable_labor_amount', format: '0,0' },
    { name: 'billable_expense_sum', label: 'Billable Expenses', aggregate: 'sum', field: 'billable_expense_amount', format: '0,0' },
    { name: 'approved_to_bill_sum', label: 'Approved to Bill', derived: { op: 'sum', of: ['billable_labor_sum', 'billable_expense_sum'] }, format: '0,0' },
  ],
});
