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
    {
      name: 'project',
      label: 'Project',
      description: 'The project, by its name.',
      synonyms: ['project name', 'engagement', '项目'],
      field: 'name',
      type: 'string',
    },
    {
      name: 'status',
      label: 'Status',
      description: 'Where the project stands, from Draft and In Approval through Active and On Hold to Completed, Closed, Rejected or Cancelled.',
      synonyms: ['project status', '项目状态'],
      field: 'status',
      type: 'string',
    },
    {
      name: 'kind',
      label: 'Kind',
      description: 'Whether the project is presales, customer delivery or internal work.',
      synonyms: ['project kind', 'project type', '项目类别'],
      field: 'kind',
      type: 'string',
    },
    {
      name: 'billing_type',
      label: 'Billing Type',
      description: 'How the customer pays for the work: fixed fee, time and materials, retainer or not billable.',
      synonyms: ['billing model', 'contract type', '计费方式'],
      field: 'billing_type',
      type: 'string',
    },
    {
      name: 'budget_status',
      label: 'Budget Status',
      description: 'How much of its approved budget the project has spent: On Track below 80 %, Warning from 80 %, Exceeded from 100 %.',
      synonyms: ['budget approval', '预算状态'],
      field: 'budget_status',
      type: 'string',
    },
    {
      name: 'project_manager',
      label: 'Project Manager',
      description: 'The person staffed on the project as its project manager.',
      synonyms: ['PM', 'manager', '项目经理'],
      field: 'project_manager',
      type: 'lookup',
    },
    {
      name: 'planned_start',
      label: 'Planned Start',
      description: 'The month the project is planned to start; projects with no planned start form their own group.',
      synonyms: ['start date', 'kickoff', '计划开始'],
      field: 'planned_start',
      type: 'date',
      dateGranularity: 'month',
    },
  ],

  measures: [
    {
      name: 'project_count',
      label: 'Projects',
      description: 'How many projects there are, in every status, drafts, rejected and cancelled ones included.',
      synonyms: ['number of projects', '项目数'],
      aggregate: 'count',
    },
    {
      name: 'approved_budget_sum',
      label: 'Approved Budget',
      description: 'The sum of each project approved budget, the total of its baseline budget version; a project not yet approved adds nothing.',
      synonyms: ['budget', 'approved budget total', '批准预算'],
      aggregate: 'sum',
      field: 'approved_budget',
      format: '0,0',
    },
    {
      name: 'planned_revenue_sum',
      label: 'Planned Revenue',
      description: 'The sum of Planned Revenue, what the customers pay for the projects; it is a plan, not invoiced or won-deal revenue.',
      synonyms: ['expected revenue', 'revenue plan', '计划收入'],
      aggregate: 'sum',
      field: 'planned_revenue',
      format: '0,0',
    },
    {
      name: 'labor_cost_sum',
      label: 'Labor Cost',
      description: 'The cost of the time on approved timesheets; draft, submitted and rejected time is not included.',
      synonyms: ['staff cost', 'people cost', '人工成本'],
      aggregate: 'sum',
      field: 'actual_labor_cost',
      format: '0,0',
    },
    {
      name: 'expense_cost_sum',
      label: 'Expense Cost',
      description: 'The amount of the approved expenses booked to the projects; unapproved expenses are not included.',
      synonyms: ['expenses', 'travel and expense cost', '费用成本'],
      aggregate: 'sum',
      field: 'actual_expense_cost',
      format: '0,0',
    },
    {
      name: 'actual_cost_sum',
      label: 'Actual Cost',
      description: 'Labor Cost plus Expense Cost: approved cost only, as the project record shows it.',
      synonyms: ['total cost', 'cost to date', '实际成本'],
      derived: { op: 'sum', of: ['labor_cost_sum', 'expense_cost_sum'] },
      format: '0,0',
    },
    {
      name: 'gross_margin_sum',
      label: 'Gross Margin',
      description: 'Planned Revenue minus Actual Cost, a plan-against-actual margin; it is not invoiced profit, and unapproved cost is not deducted.',
      synonyms: ['margin', 'profit', '毛利'],
      derived: { op: 'difference', of: ['planned_revenue_sum', 'actual_cost_sum'] },
      format: '0,0',
    },
    {
      name: 'budget_used',
      label: 'Budget Used',
      description: 'Actual Cost divided by Approved Budget, summed before dividing, so it is the portfolio figure rather than an average of project percentages.',
      synonyms: ['budget burn', 'budget consumed', '预算使用率'],
      derived: { op: 'ratio', of: ['actual_cost_sum', 'approved_budget_sum'] },
      format: '0%',
    },
    {
      name: 'billable_labor_sum',
      label: 'Billable Labor',
      description: 'The billable amount of the time on approved timesheets; draft, submitted and rejected time is not included.',
      synonyms: ['billable time amount', '可计费人工'],
      aggregate: 'sum',
      field: 'billable_labor_amount',
      format: '0,0',
    },
    {
      name: 'billable_expense_sum',
      label: 'Billable Expenses',
      description: 'The amount of the approved expenses marked billable to the customer; non-billable and unapproved expenses are not included.',
      synonyms: ['rebillable expenses', '可计费费用'],
      aggregate: 'sum',
      field: 'billable_expense_amount',
      format: '0,0',
    },
    {
      name: 'approved_to_bill_sum',
      label: 'Approved to Bill',
      description: 'Billable Labor plus Billable Expenses: approved billable work and expenses; the invoices themselves are raised in Order to Cash.',
      synonyms: ['ready to invoice', 'unbilled', '待开票金额'],
      derived: { op: 'sum', of: ['billable_labor_sum', 'billable_expense_sum'] },
      format: '0,0',
    },
  ],
});
