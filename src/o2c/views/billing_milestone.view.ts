// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { defineView } from '@objectstack/spec/ui';

/**
 * Billing Milestone Views — the collection plan.
 *
 *   • grid — every plan step the reader can see, soonest first, with its
 *     planned, received and open figures (an invoice hangs on no plan step
 *     since the 2026-11-26 ruling, hotcrm#2806, so a step shows no Invoiced).
 *   • Overdue Payment Plans — the rep's view since the 2026-11-26 ruling
 *     (overdue is measured on the payment plan, not on invoices; it replaced
 *     Overdue Invoices): steps past their planned date with an amount still
 *     open. `{today}` resolves on the read path (measured for Overdue Invoices
 *     on 18.3.0, #2315). `open_amount` is a STORED column for this filter's
 *     sake (see the field): a formula cannot be filtered.
 *   • Planned This Month — the rep's view (plan *The data model*): steps
 *     planned for the current calendar month. `{current_month_start}` and
 *     `{next_month_start}` resolve on the read path (`resolveFilterTokens`),
 *     as `{today}` does for the task views — measured for this view on 18.3.0
 *     (#2315), so the plan's fallback (a daily flow stamping a flag) is not
 *     needed.
 *
 * No form is authored: the form and the record page derive from the object's
 * `fieldGroups` (AGENTS.md, escape hatches). An account's steps are listed on
 * its record page through the master-detail's `relatedListColumns`, a
 * contract's through its lookup's (hotcrm#2557), and an order's through its
 * own (hotcrm#2560).
 */
export const BillingMilestoneViews = defineView({
  list: {
    type: 'grid',
    name: 'all_billing_milestones',
    label: 'All Payment Plans',
    userActions: { editInline: true },
    data: { provider: 'object', object: 'crm_billing_milestone' },
    columns: [
      { field: 'name', width: 200, link: true, pinned: 'left' },
      { field: 'crm_account', width: 200 },
      { field: 'crm_sales_order', width: 200 },
      { field: 'crm_contract', width: 130 },
      { field: 'planned_date', width: 120, sortable: true },
      { field: 'planned_amount', width: 140, align: 'right', summary: 'sum' },
      { field: 'received_amount', width: 130, align: 'right', summary: 'sum' },
      { field: 'open_amount', width: 130, align: 'right' },
    ],
    sort: [{ field: 'planned_date', order: 'asc' }],
    pagination: { pageSize: 50 },
  },

  listViews: {
    /** This calendar month's planned collections. */
    planned_this_month: {
      name: 'planned_this_month',
      type: 'grid',
      label: 'Planned This Month',
      userActions: { editInline: true },
      data: { provider: 'object', object: 'crm_billing_milestone' },
      columns: ['name', 'crm_account', 'crm_sales_order', 'crm_contract', 'planned_date', 'planned_amount', 'received_amount', 'open_amount'],
      filter: [
        { field: 'planned_date', operator: 'greater_than_or_equal', value: '{current_month_start}' },
        { field: 'planned_date', operator: 'less_than', value: '{next_month_start}' },
      ],
      sort: [{ field: 'planned_date', order: 'asc' }],
    },

    /** Past the planned date with an amount still open — oldest first. */
    overdue_billing_milestones: {
      name: 'overdue_billing_milestones',
      type: 'grid',
      label: 'Overdue Payment Plans',
      userActions: { editInline: true },
      data: { provider: 'object', object: 'crm_billing_milestone' },
      columns: ['name', 'crm_account', 'crm_sales_order', 'crm_contract', 'planned_date', 'planned_amount', 'received_amount', 'open_amount'],
      filter: [
        { field: 'planned_date', operator: 'less_than', value: '{today}' },
        { field: 'open_amount', operator: 'greater_than', value: 0 },
      ],
      sort: [{ field: 'planned_date', order: 'asc' }],
    },
  },
});
