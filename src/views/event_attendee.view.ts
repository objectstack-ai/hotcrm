// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { defineView } from '@objectstack/spec/ui';

/**
 * Event Attendee Views (#592)
 *
 * A junction object is normally edited inside its parent's related list, and
 * `crm_event_attendee` is no exception — but it still needs a grid and a form,
 * for the same reason `crm_campaign_member` has them: the related list renders
 * THIS view's columns, and the quick-create modal renders THIS form. Without
 * them the panel falls back to every column in declaration order and the
 * create modal offers the raw autonumber.
 *
 * It carries no `tabs` and no navigation entry: an attendee is never something
 * you go looking for on its own, you reach it through the meeting.
 */
export const EventAttendeeViews = defineView({
  list: {
    type: 'grid',
    name: 'all_event_attendees',
    label: 'Event Attendees',
    data: { provider: 'object', object: 'crm_event_attendee' },
    columns: [
      { field: 'attendee_type', width: 120, sortable: true },
      { field: 'crm_contact', width: 200 },
      { field: 'crm_lead', width: 200 },
      { field: 'sys_user', width: 200 },
      { field: 'external_name', width: 200 },
      { field: 'response', width: 140, sortable: true },
      { field: 'is_organizer', width: 100, align: 'center' },
    ],
    sort: [{ field: 'is_organizer', order: 'desc' }],
    rowColor: {
      // Mirrors the option colors on crm_event_attendee.response.
      field: 'response',
      colors: { accepted: '#16a34a', declined: '#dc2626', tentative: '#f97316', no_response: '#94a3b8' },
    },
    pagination: { pageSize: 25 },
  },

  form: {
    type: 'simple',
    sections: [
      {
        label: 'Attendee',
        columns: 2,
        fields: [
          { field: 'crm_event', required: true },
          { field: 'attendee_type', required: true },
          'crm_contact',
          'crm_lead',
          'sys_user',
          'external_name',
        ],
      },
      {
        label: 'Invitation',
        columns: 2,
        fields: ['response', 'is_organizer', 'invited_date'],
      },
    ],
  },
});
