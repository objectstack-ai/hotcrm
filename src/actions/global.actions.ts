// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Action } from '@objectstack/spec/ui';
import * as objects from '../objects';

/**
 * `objectName` → the object's DECLARED `nameField`, derived from the object
 * definitions rather than hand-listed.
 *
 * Issue #514 item 2: the activity writers below stamped
 * `record_label: ctx.record?.name`, but `name` is not the display field on
 * almost anything here — 14 of the 15 objects declare a different `nameField`
 * (`display_title`, `full_name`, `subject`, `contract_number`, …), and most of
 * them have no `name` column at all, so the label landed `null`. `crm_case` —
 * the object both actions are currently scoped to — is one of those.
 *
 * Deriving the map has two properties a hardcoded read cannot have: it stays
 * correct when an object retargets its `nameField`, and it keeps working if
 * these actions are restored to the global design described below (where the
 * object is only known at call time). Formula `nameField`s resolve fine — the
 * data engine materialises formula fields on read, so the loaded `ctx.record`
 * carries `display_title` alongside the stored columns.
 */
const NAME_FIELD_BY_OBJECT: Record<string, string> = Object.fromEntries(
  Object.values(objects as Record<string, { name?: unknown; nameField?: unknown }>)
    .filter(
      (o): o is { name: string; nameField: string } =>
        typeof o?.name === 'string' && typeof o?.nameField === 'string',
    )
    .map((o) => [o.name, o.nameField]),
);

/**
 * The authored difference between one activity-logging action and the next.
 *
 * Issue #514 item 15: `log_call` and `log_meeting` were near-verbatim copies —
 * identical bodies apart from a summary prefix and a metadata key, identical
 * params apart from labels and the meeting's `attendees` — which is how they
 * drifted into disagreeing about whether `duration` is required. Everything
 * they share now lives in {@link logActivityAction}; this type is the complete
 * list of what a twin is still allowed to differ on.
 */
type LogActivitySpec = {
  name: string;
  label: string;
  icon: string;
  /** Stamped in front of the activity summary; `''` for calls. */
  summaryPrefix: string;
  /** Subject used when the user submits the form with the field blank. */
  defaultSubject: string;
  /** `metadata.kind` discriminator on the `sys_activity` row. */
  kind: string;
  /** Extra `metadata` entries as `key` → JS expression source, spliced into the body. */
  metadataExtras: Record<string, string>;
  subjectLabel: string;
  notesLabel: string;
  /** Params appended after the shared subject / duration core. */
  extraParams?: NonNullable<Action['params']>;
  successMessage: string;
};

/**
 * Build an activity-logging action from the one shared body + param core.
 *
 * `duration` is OPTIONAL on every twin. It was `required: true` for calls and
 * `required: false` for meetings with nothing documenting the split; optional
 * is the direction that keeps both forms submittable, and it is the one the
 * body was already written for — the `duration ? … : subject` summary branch
 * is unreachable while the field is mandatory.
 *
 * The shared body is also where `crm_case.first_response_date` is stamped
 * (#575 B2) — because every activity twin routes through here, "the first
 * outbound contact on a case" has exactly one implementation instead of one
 * per action.
 */
function logActivityAction(spec: LogActivitySpec): Action {
  const extras = Object.entries(spec.metadataExtras)
    .map(([key, expr]) => `${key}: ${expr}`)
    .join(', ');
  return {
    name: spec.name,
    label: spec.label,
    // Scoped to crm_case, no longer global — issue #509. The runtime registers
    // a body action without an objectName under the key 'global', but the
    // dispatcher only probes '<objectName>' then '*' — a global body action is
    // therefore unreachable from every surface ("Action 'log_call' on object
    // '*' not found", verified 2026-07-28). crm_case is where the app wires
    // this action (case_detail header); scoped, it registers under crm_case
    // and executes. When the upstream key mismatch is fixed, restoring the
    // global design is just deleting this objectName.
    objectName: 'crm_case',
    icon: spec.icon,
    // script, not modal: modal submits die on GET /api/v1/meta/object/<target>
    // → 400 in 16.1.0; script actions POST /api/v1/actions/... and execute.
    type: 'script',
    body: {
      language: 'js',
      source: `
      const NAME_FIELD_BY_OBJECT = ${JSON.stringify(NAME_FIELD_BY_OBJECT)};
      const record = ctx.record ?? {};
      const recordId = ctx.recordId ?? record.id ?? null;
      // \`ctx.object\` is the name the sandbox context carries; the dispatcher
      // also mirrors it into the params as \`objectName\`. Both are checked
      // because the label lookup below is only as good as this value.
      const objectName = ctx.objectName ?? ctx.object ?? input.objectName ?? null;
      const subject = input.subject ? String(input.subject) : '${spec.defaultSubject}';
      const duration = input.duration ? Number(input.duration) : 0;
      const notes = input.notes ? String(input.notes) : '';
      const summary = duration
        ? subject + ' (' + duration + ' min)'
        : subject;
      // #514 item 2: read the object's declared nameField, NOT a hardcoded
      // \`.name\` — see NAME_FIELD_BY_OBJECT in src/actions/global.actions.ts.
      const nameField = NAME_FIELD_BY_OBJECT[objectName] ?? 'name';
      const activity = await ctx.api.object('sys_activity').insert({
        type: 'completed',
        summary: '${spec.summaryPrefix}' + summary,
        actor_id: ctx.user?.id ?? null,
        actor_name: ctx.user?.name ?? null,
        object_name: objectName,
        record_id: recordId,
        record_label: record[nameField] ?? null,
        metadata: JSON.stringify({ kind: '${spec.kind}', duration_minutes: duration, notes, ${extras} }),
      });
      // SLA first-response stamp (#575 B2). \`first_response_date\` was the one
      // member of the case SLA family with no writer at all — \`sla_due_date\`
      // and \`resolution_time_hours\` come from case.hook, \`is_sla_violated\`
      // from the case_sla_monitor flow — so the metric was permanently null.
      // A logged call or meeting is the only record of outbound contact a case
      // carries, which makes the FIRST \`sys_activity\` on the case the moment
      // the customer first heard back: the industry definition (Salesforce
      // \`FirstResponseDateTime\`, Zendesk first reply time). A status change is
      // deliberately NOT used — an agent can move a case to "in progress" and
      // investigate for an hour while the customer hears nothing.
      //
      // CONVENTION: any future customer-facing path on a case (a reply-email
      // action, an inbound portal reply) MUST stamp this too, or the metric
      // silently under-reports.
      //
      // The stored value is read rather than taken from \`ctx.record\`: the
      // list_item / record_related dispatch paths hand the body a PROJECTED
      // record, and a field missing from that projection reads as blank — which
      // would re-stamp on every log and turn "first response" into "last".
      if (objectName === 'crm_case' && recordId) {
        const raw = await ctx.api.object('crm_case').find({
          where: { id: recordId },
          fields: ['first_response_date'],
          top: 1,
        });
        const found = Array.isArray(raw) ? raw : (raw?.records ?? []);
        const stored = found.length ? found[0].first_response_date : record.first_response_date;
        if (!stored) {
          // \`update(data, options)\` — \`ctx.api\` is the engine repo facade,
          // whose update takes a DOCUMENT, not an id (mass_update_stage is the
          // action that got this wrong; test/action-sandbox.test.ts pins the
          // contract against a real kernel).
          await ctx.api.object('crm_case').update(
            { id: recordId, first_response_date: new Date().toISOString() },
            { where: { id: recordId } },
          );
        }
      }
      return { activityId: activity?.id };
    `,
      capabilities: ['api.read', 'api.write'],
      timeoutMs: 5000,
    },
    locations: ['record_header', 'list_item', 'record_related'],
    params: [
      {
        name: 'subject',
        label: spec.subjectLabel,
        type: 'text',
        required: true,
      },
      {
        name: 'duration',
        label: 'Duration (minutes)',
        type: 'number',
        required: false,
      },
      ...(spec.extraParams ?? []),
      {
        name: 'notes',
        label: spec.notesLabel,
        type: 'textarea',
        required: false,
      },
    ],
    successMessage: spec.successMessage,
    refreshAfter: true,
  };
}

/**
 * Log a Call.
 *
 * Collects subject / duration / notes then writes a `sys_activity` record via
 * the metadata body. The originating record id is forwarded as `record_id`,
 * and the record's display name as `record_label`.
 */
export const LogCallAction: Action = logActivityAction({
  name: 'log_call',
  label: 'Log a Call',
  icon: 'phone',
  summaryPrefix: '',
  defaultSubject: 'Untitled Call',
  kind: 'call',
  metadataExtras: { direction: `'outbound'` },
  subjectLabel: 'Call Subject',
  notesLabel: 'Call Notes',
  successMessage: 'Call logged successfully!',
});

/**
 * Log a Meeting.
 *
 * Companion to `log_call`: same `sys_activity` write, plus an `attendees`
 * param, so the meeting lands on the record's unified timeline.
 */
export const LogMeetingAction: Action = logActivityAction({
  name: 'log_meeting',
  label: 'Log a Meeting',
  icon: 'calendar',
  summaryPrefix: 'Meeting: ',
  defaultSubject: 'Untitled Meeting',
  kind: 'meeting',
  metadataExtras: { attendees: `input.attendees ? String(input.attendees) : ''` },
  subjectLabel: 'Meeting Subject',
  notesLabel: 'Meeting Notes',
  extraParams: [
    {
      name: 'attendees',
      label: 'Attendees',
      type: 'text',
      required: false,
    },
  ],
  successMessage: 'Meeting logged successfully!',
});

// ExportToCsvAction was removed: as a global body action it registered under
// the 'global' key the dispatcher never probes (same defect as log_call above),
// and the list grids' built-in `exportOptions: ['csv', 'xlsx']` already cover
// CSV export without any action.
