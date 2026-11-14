// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { defineView } from '@objectstack/spec/ui';

/**
 * Billing Milestone Views — the collection plan.
 *
 *   • grid — every plan step the reader can see, soonest first, with its
 *     planned, invoiced, received and open figures.
 *   • Planned This Month — the rep's view (plan *The data model*): steps
 *     planned for the current calendar month. `{current_month_start}` and
 *     `{next_month_start}` resolve on the read path (`resolveFilterTokens`),
 *     as `{today}` does for the task views — measured for this view on 18.3.0
 *     (#2315), so the plan's fallback (a daily flow stamping a flag) is not
 *     needed.
 *
 * No form is authored: the form and the record page derive from the object's
 * `fieldGroups` (AGENTS.md, escape hatches). A contract's steps are listed on
 * its record page through the master-detail's `relatedListColumns`.
 */
export const BillingMilestoneViews = defineView({
  list: {
    type: 'grid',
    name: 'all_billing_milestones',
    label: 'All Billing Milestones',
    userActions: { editInline: true },
    data: { provider: 'object', object: 'crm_billing_milestone' },
    columns: [
      { field: 'name', width: 200, link: true, pinned: 'left' },
      { field: 'crm_contract', width: 130 },
      { field: 'crm_account', width: 200 },
      { field: 'planned_date', width: 120, sortable: true },
      { field: 'planned_amount', width: 140, align: 'right', summary: 'sum' },
      { field: 'invoiced_amount', width: 130, align: 'right', summary: 'sum' },
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
      columns: ['name', 'crm_contract', 'crm_account', 'planned_date', 'planned_amount', 'invoiced_amount', 'received_amount', 'open_amount'],
      filter: [
        { field: 'planned_date', operator: 'greater_than_or_equal', value: '{current_month_start}' },
        { field: 'planned_date', operator: 'less_than', value: '{next_month_start}' },
      ],
      sort: [{ field: 'planned_date', order: 'asc' }],
    },
  },
});
