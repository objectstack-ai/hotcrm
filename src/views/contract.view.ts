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
    tabs: [
      { name: 'all', label: 'All', view: 'all_contracts', isDefault: true, pinned: true },
      { name: 'renewals', label: 'Renewals', icon: 'calendar', view: 'renewal_calendar' },
      { name: 'terms', label: 'Terms', icon: 'gantt-chart', view: 'contract_gantt' },
      { name: 'timeline', label: 'Timeline', icon: 'git-commit-horizontal', view: 'contract_timeline' },
    ],
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

  form: {
    type: 'tabbed',
    sections: [
      {
        name: 'parties',
        label: 'Parties',
        columns: 2,
        fields: ['contract_number', 'crm_account', 'crm_contact', 'crm_opportunity', 'owner_id', 'status'],
      },
      {
        // Named `contract_terms`, not `terms` — `terms` is already a distinct
        // fieldGroup key on `crm_contract` ("Terms & Dates"), and reusing it
        // here would make this section's translated heading follow that
        // group's wording instead of its own "Terms".
        name: 'contract_terms',
        label: 'Terms',
        columns: 2,
        fields: [
          'contract_term_months',
          'start_date',
          'end_date',
          'contract_value',
          'billing_frequency',
          'payment_terms',
          'auto_renewal',
          'renewal_notice_days',
        ],
      },
      {
        name: 'signing_and_documents',
        label: 'Signing & Documents',
        columns: 2,
        fields: ['signed_date', 'signed_by', 'document_url'],
      },
      {
        name: 'notes',
        label: 'Notes',
        columns: 1,
        fields: ['special_terms', 'billing_address'],
      },
    ],
  },
});
