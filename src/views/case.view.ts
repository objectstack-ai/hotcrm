// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { defineView } from '@objectstack/spec/ui';

/**
 * Case (Service) Views
 *
 *   • grid     — support queue with SLA columns
 *   • kanban   — case workflow grouped by status
 *   • timeline — chronological case stream
 *   • calendar — SLA due-date calendar
 */
export const CaseViews = defineView({
  list: {
    type: 'grid',
    name: 'all_cases',
    label: 'All Cases',
    data: { provider: 'object', object: 'crm_case' },
    columns: [
      { field: 'case_number', width: 130, sortable: true, link: true, pinned: 'left' },
      { field: 'subject', width: 280, sortable: true },
      { field: 'crm_account', width: 180 },
      { field: 'crm_contact', width: 160 },
      { field: 'priority', width: 110, sortable: true },
      { field: 'status', width: 130, sortable: true },
      { field: 'origin', width: 120 },
      { field: 'sla_due_date', width: 160, sortable: true },
      { field: 'is_sla_violated', width: 110, align: 'center' },
      { field: 'is_escalated', width: 110, align: 'center' },
      { field: 'owner', width: 150 },
    ],
    // Sort on the materialised ordinal, not the select itself: `priority desc`
    // compares raw strings and lands medium > low > high > critical, burying
    // every critical case at the bottom of the queue.
    sort: [
      { field: 'priority_rank', order: 'desc' },
      { field: 'sla_due_date', order: 'asc' },
    ],
    rowColor: {
      field: 'priority',
      colors: { critical: '#dc2626', high: '#f97316', medium: '#eab308', low: '#94a3b8' },
    },
    selection: { type: 'multiple' },
    pagination: { pageSize: 50 },
    appearance: {
      showDescription: true,
      allowedVisualizations: ['grid', 'kanban', 'calendar', 'timeline'],
    },
    tabs: [
      { name: 'all', label: 'All', view: 'all_cases', isDefault: true, pinned: true },
      { name: 'workflow', label: 'Workflow', icon: 'columns-3', view: 'case_workflow' },
      { name: 'sla', label: 'SLA', icon: 'calendar', view: 'sla_calendar' },
      { name: 'timeline', label: 'Timeline', icon: 'git-commit-horizontal', view: 'case_timeline' },
      { name: 'escalated', label: 'Escalated', icon: 'triangle-alert', view: 'escalated_cases' },
      { name: 'at_risk', label: 'SLA at Risk', icon: 'clock-alert', view: 'sla_at_risk' },
      { name: 'mine', label: 'My Cases', icon: 'user', view: 'my_open_cases' },
    ],
    // Escalate straight from the queue: escalate_case's own `locations:
    // ['list_item']` auto-injects the row-menu item. Do not repeat it here as
    // a string — the legacy rowActions path dispatches the string as an
    // action TYPE, yielding a duplicate, dead entry (objectui#2960).
    rowActions: ['edit'],
  },

  listViews: {
    /** Service workflow board */
    case_workflow: {
      name: 'case_workflow',
      type: 'kanban',
      label: 'Service Workflow',
      data: { provider: 'object', object: 'crm_case' },
      columns: ['case_number', 'subject', 'priority', 'sla_due_date'],
      kanban: {
        groupByField: 'status',
        columns: ['case_number', 'subject', 'crm_account', 'priority', 'owner'],
      },
      filter: [{ field: 'is_closed', operator: 'equals', value: false }],
      navigation: { mode: 'drawer', width: '640px' },
    },

    /** SLA calendar */
    sla_calendar: {
      name: 'sla_calendar',
      type: 'calendar',
      label: 'SLA Calendar',
      data: { provider: 'object', object: 'crm_case' },
      columns: ['case_number', 'subject', 'priority'],
      calendar: {
        startDateField: 'sla_due_date',
        titleField: 'subject',
        colorField: 'priority',
      },
    },

    /** Chronological case stream */
    case_timeline: {
      name: 'case_timeline',
      type: 'timeline',
      label: 'Case Timeline',
      data: { provider: 'object', object: 'crm_case' },
      columns: ['case_number', 'subject'],
      timeline: {
        startDateField: 'created_date',
        endDateField: 'closed_date',
        titleField: 'subject',
        groupByField: 'owner',
        colorField: 'status',
        scale: 'day',
      },
    },

    /**
     * The agent's personal queue. This is a LIST view on purpose: the list
     * data path resolves `{current_user_id}` (proven by my_leads /
     * my_open_tasks), while the dashboard/analytics path resolves no user
     * token at all — which is why service_dashboard has no "my" widget
     * (see the note there and the proven record in crm.app.ts).
     */
    my_open_cases: {
      name: 'my_open_cases',
      type: 'grid',
      label: 'My Open Cases',
      data: { provider: 'object', object: 'crm_case' },
      columns: ['case_number', 'subject', 'crm_account', 'priority', 'status', 'sla_due_date'],
      filter: [
        { field: 'owner', operator: 'equals', value: '{current_user_id}' },
        { field: 'is_closed', operator: 'equals', value: false },
      ],
      sort: [
        { field: 'priority_rank', order: 'desc' },
        { field: 'sla_due_date', order: 'asc' },
      ],
    },

    escalated_cases: {
      name: 'escalated_cases',
      type: 'grid',
      label: 'Escalated Cases',
      data: { provider: 'object', object: 'crm_case' },
      columns: ['case_number', 'subject', 'crm_account', 'priority', 'sla_due_date', 'owner'],
      filter: [{ field: 'is_escalated', operator: 'equals', value: true }],
      sort: [{ field: 'priority_rank', order: 'desc' }],
    },

    /** SLA-at-risk: open, high/urgent priority cases needing attention */
    sla_at_risk: {
      name: 'sla_at_risk',
      type: 'grid',
      label: '⏰ SLA at Risk',
      data: { provider: 'object', object: 'crm_case' },
      columns: ['case_number', 'subject', 'crm_account', 'priority', 'sla_due_date', 'owner'],
      // Operator-only filter — sort by SLA due date ascending so the soonest
      // surface first. (The view runtime does not interpolate `{NOW() + 4h}`.)
      filter: [
        { field: 'is_closed', operator: 'equals', value: false },
        { field: 'priority', operator: 'in', value: ['high', 'critical'] },
      ],
      sort: [{ field: 'sla_due_date', order: 'asc' }],
    },
  },

  form: {
    type: 'tabbed',
    data: { provider: 'object', object: 'crm_case' },
    sections: [
      {
        label: 'Case',
        columns: 2,
        fields: [
          'case_number',
          { field: 'subject', required: true, colSpan: 2 },
          { field: 'crm_account', required: true },
          'crm_contact',
          { field: 'status', required: true },
          'priority',
          'origin',
          'owner',
          // Required on the object with no default — a form without it could
          // never save a new case.
          { field: 'description', required: true, colSpan: 2 },
        ],
      },
      {
        label: 'SLA',
        columns: 2,
        fields: [
          'created_date',
          'first_response_date',
          'sla_due_date',
          'resolution_time_hours',
          'is_sla_violated',
          'is_escalated',
          'escalation_reason',
          'parent_case',
        ],
      },
      {
        label: 'Resolution',
        columns: 1,
        fields: ['resolution', 'internal_notes', 'customer_rating', 'customer_feedback', 'customer_signature', 'closed_date', 'is_closed'],
      },
    ],
  },

  /**
   * Additional named form views.
   *
   * `web_to_case` is a PUBLIC / ANONYMOUS support form (Salesforce
   * Web-to-Case equivalent). Hosted at `/forms/support` and embeddable in
   * a help center. Guests can ONLY submit — the `guest_portal` profile
   * denies read/edit/delete on `crm_case`. Internal fields (status, origin,
   * priority defaults, owner, SLA) are stamped by `case.hook.ts` after a
   * guest submission.
   */
  formViews: {
    web_to_case: {
      type: 'simple',
      data: { provider: 'object', object: 'crm_case' },
      sections: [
        {
          label: 'How can we help?',
          columns: 1,
          fields: [
            {
              field: 'subject',
              required: true,
              placeholder: 'Short summary of the issue',
            },
            {
              field: 'description',
              required: true,
              placeholder: 'Steps to reproduce, error messages, screenshots...',
            },
            {
              field: 'type',
              helpText: 'Pick the option that best matches your issue.',
            },
            {
              field: 'priority',
              helpText: 'Critical issues should also be reported via phone.',
            },
          ],
        },
      ],
      sharing: {
        enabled: true,
        allowAnonymous: true,
        publicLink: '/forms/support',
      },
    },
  },
});
