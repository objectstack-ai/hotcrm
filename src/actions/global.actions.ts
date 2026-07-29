// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Action } from '@objectstack/spec/ui';

/**
 * Log a Call.
 *
 * Script-typed cross-domain (global) action: collects subject /
 * duration / notes then writes an `activity` record via the metadata
 * body. The originating record id is forwarded as `related_to_id`.
 */
export const LogCallAction: Action = {
  name: 'log_call',
  label: 'Log a Call',
  icon: 'phone',
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
 * Script-typed cross-domain (global) action: companion to `log_call`.
 * Collects subject / duration / attendees / notes then writes a semantic
 * `sys_activity` row so the meeting lands on the record's unified timeline.
 */
export const LogMeetingAction: Action = {
  name: 'log_meeting',
  label: 'Log a Meeting',
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

/**
 * Export to CSV.
 *
 * Script-typed cross-domain (global) action: dumps the rows of the
 * target object to a CSV string. Object name is forwarded by the
 * dispatcher via `input.objectName` (defaults to `crm_account`).
 */
export const ExportToCsvAction: Action = {
  name: 'export_csv',
  label: 'Export to CSV',
  icon: 'download',
  type: 'script',
  body: {
    language: 'js',
    source: `
      const objectName = input.objectName ?? 'crm_account';
      const raw = await ctx.api.object(objectName).find();
      // Drivers may return either a plain array or { records, total }.
      const records = Array.isArray(raw) ? raw : (raw?.records ?? raw?.value ?? []);
      if (!Array.isArray(records) || records.length === 0) return '';
      const keys = Object.keys(records[0]);
      const header = keys.join(',');
      const rows = records.map((r) => keys.map((k) => r[k] ?? '').join(','));
      return [header, ...rows].join('\\n');
    `,
    capabilities: ['api.read'],
    timeoutMs: 10000,
  },
  locations: ['list_toolbar'],
  successMessage: 'Export completed!',
  refreshAfter: false,
};
