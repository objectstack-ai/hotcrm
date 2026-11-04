// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { defineView } from '@objectstack/spec/ui';

/**
 * Event Views (#592)
 *
 *   • grid     — every interaction, most recent first
 *   • calendar — the schedule, start → end (the platform view type the issue asks for)
 *   • timeline — the same rows laid out per rep
 *   • mine     — my calendar
 *   • upcoming — what is booked and has not started yet
 *   • held     — what actually happened, the interaction history
 *
 * # Upcoming is a date cut, not only a status
 *
 * `upcoming_events` is `status = planned` AND `start_datetime >= {now}` (#2393).
 * `status` alone is not enough: nothing flips a booking to `held` when its time
 * passes, so a meeting nobody logged stays `planned` for ever, and the seeded
 * bookings (1-7 days after install) had all gone stale a week in. The home
 * page's Upcoming Events card reads this view, so every user saw last month's
 * meetings under that title.
 *
 * What stood here said a date filter could not be written: that the list read
 * path resolved only `{current_user_id}`, so `{today}` would ship as a literal
 * and compare lexicographically, inverted. That was a 16.x reading. The ObjectQL
 * read path has run `resolveFilterTokens()` since 17.0.0-rc.0, and `{now}` is
 * in the vocabulary (`task.view.ts` and `opportunity.view.ts` carry the same
 * correction for `{today}` / `{14_days_ago}`). On 18.3.0 `{now}` reaches the
 * driver as the current instant in ISO form, measured against a real engine in
 * `test/upcoming-events-view.test.ts`.
 *
 * `{now}`, not `{today}`: the field is a datetime, and a meeting that started
 * at 09:00 is no longer upcoming at 15:00 the same day. An event in progress
 * drops off the list at its start time; the calendar views still show it.
 * `held_events` stays a status cut: what happened is authored, and a past
 * booking nobody marked held is not history either.
 */
export const EventViews = defineView({
  list: {
    type: 'grid',
    name: 'all_events',
    label: 'All Events',
    userActions: { editInline: true },
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
    selection: { type: 'multiple' },
    pagination: { pageSize: 50 },
    appearance: {
      showDescription: true,
      allowedVisualizations: ['grid', 'calendar', 'timeline', 'kanban'],
    },
    // Binds the 'calendar' entry above: the same span the dedicated
    // `event_calendar` view shows. `start_datetime` is required + notNull;
    // `end_datetime` is optional, so an event without one stays a single point
    // in time rather than borrowing a neighbour's end.
    calendar: {
      startDateField: 'start_datetime',
      endDateField: 'end_datetime',
      titleField: 'subject',
      colorField: 'type',
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

    /** Booked and not started yet — soonest first. */
    upcoming_events: {
      name: 'upcoming_events',
      type: 'grid',
      label: '📅 Upcoming · Soonest First',
      userActions: { editInline: true },
      data: { provider: 'object', object: 'crm_event' },
      columns: ['subject', 'type', 'start_datetime', 'location', 'related_to_type', 'owner_id'],
      // Both halves are needed: see "Upcoming is a date cut" at the top of
      // this file. Canonical operator spelling (`VIEW_FILTER_OPERATORS`).
      filter: [
        { field: 'status', operator: 'equals', value: 'planned' },
        { field: 'start_datetime', operator: 'greater_than_or_equal', value: '{now}' },
      ],
      sort: [{ field: 'start_datetime', order: 'asc' }],
    },

    /** What actually happened — the interaction history the CRM could not show. */
    held_events: {
      name: 'held_events',
      type: 'grid',
      label: '✅ Interaction History',
      userActions: { editInline: true },
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
          { field: 'subject', required: true, span: 'full' },
          { field: 'type', required: true },
          { field: 'status', required: true },
          'owner_id',
          'location',
          { field: 'description', span: 'full' },
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
