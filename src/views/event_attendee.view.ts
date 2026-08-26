// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { defineView } from '@objectstack/spec/ui';

/**
 * Event Attendee Views (#592)
 *
 * A junction object is normally edited inside its parent's related list, and
 * `crm_event_attendee` is no exception. It carries no navigation entry: an
 * attendee is never something you go looking for on its own, you reach it
 * through the meeting.
 *
 * # What each half of this bundle actually renders — measured (#944)
 *
 * This header used to justify both halves in one sentence: the related list
 * renders THIS view's columns, the quick-create modal renders THIS form, and
 * without them the panel falls back to every column in declaration order while
 * the modal offers the raw autonumber — "for the same reason
 * `crm_campaign_member` has them". `crm_campaign_member` has no view metadata
 * at all, which is what sent #944 looking; re-measuring the paragraph against
 * the shipped Console (17.0.0-rc.3) left only the form half standing.
 *
 * **`form` — live.** The Console merges a view bundle's `form` onto the object
 * definition it holds, and the record drawer a related list opens ("New" on
 * the panel, edit on a row) renders that form's `sections`. What the authored
 * form buys is the section split and the field order — not rescue from a raw
 * autonumber, because the no-form fallback is not raw either: in `create` mode
 * the drawer drops `autonumber`, `formula` and `summary` fields (and anything
 * hidden or readonly) and sections whatever is left by the object's own
 * `fieldGroups`. `attendee_number` was never on offer.
 *
 * **`list` — not what the related list reads.** A detail-page related list
 * takes its columns from the CHILD's lookup field — `relatedListColumns` on
 * `crm_event`, which this app authors nowhere — and falls back to the child
 * object's `highlightFields` minus the parent lookup, capped at six, with
 * columns that are empty on every fetched row dropped. Only an object with no
 * `highlightFields` reaches the last resort, and that is a heuristic over the
 * field map (title-ish names first, audit columns last, `rich_text` / `html` /
 * `json` excluded) — not declaration order, and never this view. So the
 * attendee panel on a meeting shows `attendee_type`, `response` and
 * `is_organizer`, straight off `crm_event_attendee.highlightFields`, whatever
 * the columns below say.
 *
 * The grid is therefore reachable only at this object's own list URL, which no
 * navigation entry links to. It is kept as the curated answer to "what do you
 * show about an attendee", and it is what a future `relatedListColumns` would
 * be copied from — but nothing in this repo may cite it as what makes a
 * related list readable. The load-bearing metadata is `highlightFields`, and
 * `test/view-references.test.ts` pins it for every object reached only through
 * a parent: strip it and the panel really does fall to the heuristic, which
 * leads with the autonumber these objects use as their `nameField`.
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
        name: 'attendee',
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
        name: 'invitation',
        label: 'Invitation',
        columns: 2,
        fields: ['response', 'is_organizer', 'invited_date'],
      },
    ],
  },
});
