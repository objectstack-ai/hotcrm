// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { defineView } from '@objectstack/spec/ui';

/**
 * Event Views (#592)
 *
 *   • grid     — every interaction, most recent first
 *   • calendar — the schedule, start → end (the platform view type the issue asks for)
 *   • timeline — the same rows laid out per rep
 *   • mine     — my calendar
 *   • upcoming — what is booked but has not happened yet
 *   • held     — what actually happened, the interaction history
 *
 * # Why no "past events" filter on a date
 *
 * The list-view data path resolves ONLY the user tokens (`{current_user_id}`);
 * date macros ship to the server as literal strings, and because
 * `'2026-…' < '{…'` is lexicographically true, a `start_datetime < {today}`
 * filter matches the FUTURE rows instead of the past ones — inverted, not
 * merely empty (the same trap `overdue_tasks` documents). So the past/future
 * split is expressed with `status`, which is authored and does not decay, and
 * the ordering does the rest.
 */
export const EventViews = defineView({
  list: {
    type: 'grid',
    name: 'all_events',
    label: 'All Events',
    data: { provider: 'object', object: 'crm_event' },
    columns: [
      { field: 'subject', width: 280, sortable: true, link: true },
      { field: 'type', width: 120, sortable: true },
      { field: 'status', width: 120, sortable: true },
      { field: 'start_datetime', width: 180, sortable: true },
      { field: 'duration_minutes', width: 120, align: 'right' },
      { field: 'location', width: 180 },
      { field: 'owner_id', width: 150 },
    ],
    sort: [{ field: 'start_datetime', order: 'desc' }],
    rowColor: {
      // Mirrors the option colors on crm_event.status.
      field: 'status',
      colors: { planned: '#4169E1', held: '#16a34a', cancelled: '#94a3b8', no_show: '#f97316' },
    },
    selection: { type: 'multiple' },
    pagination: { pageSize: 50 },
    appearance: {
      showDescription: true,
      allowedVisualizations: ['grid', 'calendar', 'timeline', 'kanban'],
    },
  },

  listViews: {
    /** The calendar the issue asks for — start → end, coloured by kind. */
    event_calendar: {
      name: 'event_calendar',
      type: 'calendar',
      label: 'Event Calendar',
      data: { provider: 'object', object: 'crm_event' },
      columns: ['subject', 'type', 'owner_id'],
      calendar: {
        startDateField: 'start_datetime',
        endDateField: 'end_datetime',
        titleField: 'subject',
        colorField: 'type',
      },
    },

    /** Who is booked when — one lane per rep. */
    event_timeline: {
      name: 'event_timeline',
      type: 'timeline',
      label: 'Team Schedule',
      data: { provider: 'object', object: 'crm_event' },
      columns: ['subject', 'status'],
      timeline: {
        startDateField: 'start_datetime',
        endDateField: 'end_datetime',
        titleField: 'subject',
        groupByField: 'owner_id',
        colorField: 'type',
        scale: 'day',
      },
    },

    my_events: {
      name: 'my_events',
      type: 'calendar',
      label: 'My Calendar',
      data: { provider: 'object', object: 'crm_event' },
      columns: ['subject', 'type', 'location'],
      // `{current_user_id}` is the one token the list-view data path really
      // interpolates (see crm.app.ts's "My Work" note).
      filter: [{ field: 'owner_id', operator: 'equals', value: '{current_user_id}' }],
      calendar: {
        startDateField: 'start_datetime',
        endDateField: 'end_datetime',
        titleField: 'subject',
        colorField: 'type',
      },
    },

    /** Booked, not yet held — soonest first. */
    upcoming_events: {
      name: 'upcoming_events',
      type: 'grid',
      label: '📅 Upcoming · Soonest First',
      data: { provider: 'object', object: 'crm_event' },
      columns: ['subject', 'type', 'start_datetime', 'location', 'related_to_type', 'owner_id'],
      filter: [{ field: 'status', operator: 'equals', value: 'planned' }],
      sort: [{ field: 'start_datetime', order: 'asc' }],
    },

    /** What actually happened — the interaction history the CRM could not show. */
    held_events: {
      name: 'held_events',
      type: 'grid',
      label: '✅ Interaction History',
      data: { provider: 'object', object: 'crm_event' },
      columns: ['subject', 'type', 'start_datetime', 'duration_minutes', 'related_to_type', 'owner_id'],
      filter: [{ field: 'status', operator: 'equals', value: 'held' }],
      sort: [{ field: 'start_datetime', order: 'desc' }],
    },
  },

  form: {
    type: 'simple',
    sections: [
      {
        name: 'event',
        label: 'Event',
        columns: 2,
        fields: [
          { field: 'subject', required: true, colSpan: 2 },
          { field: 'type', required: true },
          { field: 'status', required: true },
          'owner_id',
          'location',
          { field: 'description', colSpan: 2 },
        ],
      },
      {
        name: 'schedule',
        label: 'Schedule',
        columns: 2,
        fields: [
          { field: 'start_datetime', required: true },
          'end_datetime',
          'all_day',
          'duration_minutes',
        ],
      },
      {
        name: 'related_records',
        label: 'Related Records',
        collapsible: true,
        columns: 2,
        fields: [
          'related_to_account',
          'related_to_contact',
          'related_to_opportunity',
          'related_to_lead',
          'related_to_case',
        ],
      },
      {
        name: 'outcome',
        label: 'Outcome',
        collapsible: true,
        collapsed: true,
        columns: 1,
        fields: ['outcome_notes'],
      },
    ],
  },
});
