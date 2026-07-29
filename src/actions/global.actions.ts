// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Action } from '@objectstack/spec/ui';

/**
 * Log a Call.
 *
 * Modal-typed cross-domain (global) action: collects subject /
 * duration / notes then writes an `activity` record via the metadata
 * body. The originating record id is forwarded as `related_to_id`.
 */
export const LogCallAction: Action = {
  name: 'log_call',
  label: 'Log a Call',
  // Scoped to crm_case, no longer global — issue #509. The runtime registers
  // a body action without an objectName under the key 'global', but the
  // dispatcher only probes '<objectName>' then '*' — a global body action is
  // therefore unreachable from every surface ("Action 'log_call' on object
  // '*' not found", verified 2026-07-28). crm_case is where the app wires
  // this action (case_detail header); scoped, it registers under crm_case
  // and executes. When the upstream key mismatch is fixed, restoring the
  // global design is just deleting this objectName (and log_meeting's).
  objectName: 'crm_case',
  icon: 'phone',
  // script, not modal: modal submits die on GET /api/v1/meta/object/<target>
  // → 400 in 16.1.0; script actions POST /api/v1/actions/... and execute.
  type: 'script',
  body: {
    language: 'js',
    source: `
      const recordId = ctx.recordId ?? ctx.record?.id ?? null;
      const objectName = ctx.objectName ?? input.objectName ?? null;
      const subject = input.subject ? String(input.subject) : 'Untitled Call';
      const duration = input.duration ? Number(input.duration) : 0;
      const notes = input.notes ? String(input.notes) : '';
      const summary = duration
        ? subject + ' (' + duration + ' min)'
        : subject;
      const activity = await ctx.api.object('sys_activity').insert({
        type: 'completed',
        summary,
        actor_id: ctx.user?.id ?? null,
        actor_name: ctx.user?.name ?? null,
        object_name: objectName,
        record_id: recordId,
        record_label: ctx.record?.name ?? null,
        metadata: JSON.stringify({ kind: 'call', duration_minutes: duration, notes, direction: 'outbound' }),
      });
      return { activityId: activity?.id };
    `,
    capabilities: ['api.write'],
    timeoutMs: 5000,
  },
  locations: ['record_header', 'list_item', 'record_related'],
  params: [
    {
      name: 'subject',
      label: 'Call Subject',
      type: 'text',
      required: true,
    },
    {
      name: 'duration',
      label: 'Duration (minutes)',
      type: 'number',
      required: true,
    },
    {
      name: 'notes',
      label: 'Call Notes',
      type: 'textarea',
      required: false,
    }
  ],
  successMessage: 'Call logged successfully!',
  refreshAfter: true,
};

/**
 * Log a Meeting.
 *
 * Modal-typed cross-domain (global) action: companion to `log_call`.
 * Collects subject / duration / attendees / notes then writes a semantic
 * `sys_activity` row so the meeting lands on the record's unified timeline.
 */
export const LogMeetingAction: Action = {
  name: 'log_meeting',
  label: 'Log a Meeting',
  // Scoped to crm_case for the same dispatcher-key reason as log_call (issue #509).
  objectName: 'crm_case',
  icon: 'calendar',
  type: 'script',
  body: {
    language: 'js',
    source: `
      const recordId = ctx.recordId ?? ctx.record?.id ?? null;
      const objectName = ctx.objectName ?? input.objectName ?? null;
      const subject = input.subject ? String(input.subject) : 'Untitled Meeting';
      const duration = input.duration ? Number(input.duration) : 0;
      const attendees = input.attendees ? String(input.attendees) : '';
      const notes = input.notes ? String(input.notes) : '';
      const summary = duration
        ? subject + ' (' + duration + ' min)'
        : subject;
      const activity = await ctx.api.object('sys_activity').insert({
        type: 'completed',
        summary: 'Meeting: ' + summary,
        actor_id: ctx.user?.id ?? null,
        actor_name: ctx.user?.name ?? null,
        object_name: objectName,
        record_id: recordId,
        record_label: ctx.record?.name ?? null,
        metadata: JSON.stringify({ kind: 'meeting', duration_minutes: duration, attendees, notes }),
      });
      return { activityId: activity?.id };
    `,
    capabilities: ['api.write'],
    timeoutMs: 5000,
  },
  locations: ['record_header', 'list_item', 'record_related'],
  params: [
    {
      name: 'subject',
      label: 'Meeting Subject',
      type: 'text',
      required: true,
    },
    {
      name: 'duration',
      label: 'Duration (minutes)',
      type: 'number',
      required: false,
    },
    {
      name: 'attendees',
      label: 'Attendees',
      type: 'text',
      required: false,
    },
    {
      name: 'notes',
      label: 'Meeting Notes',
      type: 'textarea',
      required: false,
    }
  ],
  successMessage: 'Meeting logged successfully!',
  refreshAfter: true,
};

// ExportToCsvAction was removed: as a global body action it registered under
// the 'global' key the dispatcher never probes (same defect as log_call above),
// and the list grids' built-in `exportOptions: ['csv', 'xlsx']` already cover
// CSV export without any action.
