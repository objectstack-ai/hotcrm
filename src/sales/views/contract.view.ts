// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { defineView } from '@objectstack/spec/ui';

/**
 * Contract Views
 *
 *   • grid     — contract register with renewal info
 *   • calendar — start/end dates
 *   • gantt    — contract terms timeline
 *   • timeline — chronological contract stream
 */
export const ContractViews = defineView({
  list: {
    type: 'grid',
    name: 'all_contracts',
    label: 'All Contracts',
    userActions: { editInline: true },
    data: { provider: 'object', object: 'crm_contract' },
    columns: [
      { field: 'contract_number', width: 150, link: true, pinned: 'left' },
      { field: 'crm_account', width: 200 },
      { field: 'crm_opportunity', width: 200 },
      { field: 'status', width: 130, sortable: true },
      { field: 'contract_value', width: 140, align: 'right', summary: 'sum' },
      { field: 'contract_term_months', width: 130, align: 'right' },
      { field: 'start_date', width: 130, sortable: true },
      { field: 'end_date', width: 130, sortable: true },
      { field: 'auto_renewal', width: 110, align: 'center' },
      { field: 'owner_id', width: 150 },
    ],
    sort: [{ field: 'end_date', order: 'asc' }],
    pagination: { pageSize: 25 },
    selection: { type: 'multiple' },
    appearance: {
      allowedVisualizations: ['grid', 'calendar', 'gantt', 'timeline'],
    },
    // Binds the 'calendar' entry above: renewal dates, same as the dedicated
    // `renewal_calendar` view and the field this list sorts by. A contract
    // calendar answers "what renews when" — the start -> end term SPAN is
    // already carried by `contract_gantt` and `contract_timeline`, which is
    // why `end_date` is the start of the event here rather than an end.
    calendar: {
      startDateField: 'end_date',
      titleField: 'contract_number',
      colorField: 'status',
    },
  },

  listViews: {
    /** Renewal calendar (highlights upcoming end dates) */
    renewal_calendar: {
      name: 'renewal_calendar',
      type: 'calendar',
      label: 'Renewal Calendar',
      data: { provider: 'object', object: 'crm_contract' },
      columns: ['contract_number', 'crm_account', 'status'],
      calendar: {
        startDateField: 'end_date',
        titleField: 'contract_number',
        colorField: 'status',
      },
    },

    /** Contract terms gantt */
    contract_gantt: {
      name: 'contract_gantt',
      type: 'gantt',
      label: 'Contract Terms',
      data: { provider: 'object', object: 'crm_contract' },
      columns: ['contract_number', 'crm_account', 'contract_value'],
      gantt: {
        startDateField: 'start_date',
        endDateField: 'end_date',
        titleField: 'contract_number',
        // Opens at Quarter (#2367 row 4): a contract term runs a year or
        // more, so the Day default showed one week of one bar.
        viewMode: 'quarter',
      },
    },

    /** Chronological timeline */
    contract_timeline: {
      name: 'contract_timeline',
      type: 'timeline',
      label: 'Contract Timeline',
      data: { provider: 'object', object: 'crm_contract' },
      columns: ['contract_number', 'crm_account'],
      timeline: {
        startDateField: 'start_date',
        endDateField: 'end_date',
        titleField: 'contract_number',
        groupByField: 'crm_account',
        colorField: 'status',
        scale: 'quarter',
      },
    },
  },
});
