// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Action } from '@objectstack/spec/ui';
import * as objects from '../objects';

/**
 * Activity-logging actions — `log_call`, `log_meeting`, `schedule_meeting`.
 *
 * (The file is still named `global.actions.ts` for import stability; nothing
 * here is a *global* action any more, and nothing can be — see the dispatcher
 * note on `objectName` below.)
 *
 * # What changed in #592
 *
 * Two defects, one shape:
 *
 *  1. **Scope.** Both twins were pinned to `crm_case` as a workaround for the
 *     upstream key mismatch (#509), so a sales rep could not log a call on a
 *     lead, a contact, an account or an opportunity — i.e. on anything they
 *     sell to. They are now GENERATED per object: one registered action per
 *     (kind × object), which sidesteps #509 without waiting for the platform,
 *     because the runtime keys the registry on `<objectName>:<action.name>` and
 *     the dispatcher probes `<objectName>` first.
 *  2. **Shape.** The write was a `sys_activity` row whose `metadata` carried a
 *     JSON blob — `{"kind":"meeting","attendees":"Bob, Alice"}`. That is not
 *     data: no view filters it, no dataset groups by it, no report counts it.
 *     Every one of these actions now inserts a real `crm_event`, real
 *     `crm_event_attendee` rows, and keeps the `sys_activity` row purely as the
 *     unified-timeline pointer (ADR-0052 `source_object`/`source_id`), the same
 *     way `send_email` points at its `sys_email`.
 *
 * The recency bubble (`crm_account.last_activity_date`,
 * `crm_lead.last_contacted_date`, `crm_contact.last_contacted_date`) is
 * deliberately NOT written here. It hangs off `crm_event`'s own hook, so an
 * event created from the calendar, from an import, or from a future flow bumps
 * recency exactly like one created from this button. One writer, not one per
 * entry point.
 */

/**
 * `objectName` → the object's DECLARED `nameField`, derived from the object
 * definitions rather than hand-listed.
 *
 * Issue #514 item 2: the activity writers stamped `record_label: ctx.record?.name`,
 * but `name` is not the display field on almost anything here — most objects
 * declare a different `nameField` (`display_title`, `full_name`, `subject`,
 * `contract_number`, …) and have no `name` column at all, so the label landed
 * `null`.
 *
 * Deriving the map keeps it correct when an object retargets its `nameField`.
 * Since #592 the lookup happens at AUTHORING time (each action knows its own
 * object), so the body carries the resolved field name rather than a table —
 * one less thing for a body to get wrong at runtime.
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
 * The objects a rep can log an interaction against, and the `crm_event`
 * lookup that records the link.
 *
 * The keys are exactly `crm_event.related_to_type`'s options
 * (`RELATED_TO_TYPE_OPTIONS`), and the values exactly the `related_to_*`
 * lookups that back them. `test/activity-actions.test.ts` pins that agreement
 * against the object definition, so adding a sixth `related_to_*` field
 * without extending this map fails in CI instead of producing an action that
 * writes an event linked to nothing.
 */
export const ACTIVITY_TARGETS: Record<string, string> = {
  crm_lead: 'related_to_lead',
  crm_contact: 'related_to_contact',
  crm_account: 'related_to_account',
  crm_opportunity: 'related_to_opportunity',
  crm_case: 'related_to_case',
};

/** JS string literal, safely quoted for splicing into a body source. */
const lit = (value: string): string => JSON.stringify(value);

/**
 * The authored difference between one activity action and the next.
 *
 * Issue #514 item 15: `log_call` and `log_meeting` were near-verbatim copies —
 * identical bodies apart from a summary prefix and a metadata key — which is
 * how they drifted into disagreeing about whether `duration` is required.
 * Everything they share lives in {@link activityAction}; this type is the
 * complete list of what a variant is still allowed to differ on.
 */
type ActivitySpec = {
  name: string;
  label: string;
  icon: string;
  /** `crm_event.type` for the row this action writes. */
  eventType: string;
  /** `crm_event.status`: `held` for something that happened, `planned` for a booking. */
  eventStatus: 'held' | 'planned';
  /** Stamped in front of the activity summary; `''` for calls. */
  summaryPrefix: string;
  /** Subject used when the user submits the form with the field blank. */
  defaultSubject: string;
  subjectLabel: string;
  notesLabel: string;
  /** Booked-in-the-future variants collect a start time and a location. */
  collectsSchedule?: boolean;
  successMessage: string;
};

/**
 * Build one activity action, bound to one object.
 *
 * `duration` is OPTIONAL everywhere. It was `required: true` for calls and
 * `required: false` for meetings with nothing documenting the split; optional
 * is the direction that keeps every form submittable, and it is the one the
 * body is written for.
 */
function activityAction(spec: ActivitySpec, objectName: string): Action {
  const relatedField = ACTIVITY_TARGETS[objectName];
  if (!relatedField) {
    throw new Error(
      `activityAction: '${objectName}' is not an activity target — extend ACTIVITY_TARGETS ` +
        'together with crm_event.related_to_type and its related_to_* lookup.',
    );
  }
  // Resolved here, not in the body: the action knows its object at authoring
  // time, so the body carries the answer instead of a lookup table it could
  // miss on. `?? 'name'` only fires for an object that declares no nameField
  // at all, which no business object in this app does.
  const nameField = NAME_FIELD_BY_OBJECT[objectName] ?? 'name';

  return {
    name: spec.name,
    label: spec.label,
    // Object-scoped, one registration per object (#509 / #592). The runtime
    // registers a body action under `<objectName>:<name>` and the dispatcher
    // probes `<objectName>` then `*`; a body action with no objectName lands
    // under a 'global' key nothing ever probes ("Action 'log_call' on object
    // '*' not found", verified 2026-07-28). Generating the family is what makes
    // the action reachable from every sales object without the platform fix.
    objectName,
    icon: spec.icon,
    // script, not modal: modal submits die on GET /api/v1/meta/object/<target>
    // → 400 in 16.1.0; script actions POST /api/v1/actions/... and execute.
    type: 'script',
    body: {
      language: 'js',
      source: `
      const OBJECT_NAME = ${lit(objectName)};
      const RELATED_FIELD = ${lit(relatedField)};
      const NAME_FIELD = ${lit(nameField)};
      const EVENT_TYPE = ${lit(spec.eventType)};
      const EVENT_STATUS = ${lit(spec.eventStatus)};

      const record = ctx.record ?? {};
      const recordId = ctx.recordId ?? record.id ?? null;
      const userId = ctx.user?.id ?? null;
      const nowIso = new Date().toISOString();

      const subject = input.subject ? String(input.subject) : ${lit(spec.defaultSubject)};
      const duration = input.duration ? Number(input.duration) : 0;
      const notes = input.notes ? String(input.notes) : '';
      const location = input.location ? String(input.location) : '';
      // A booking states its own start; a log is "just now". An unparseable
      // value falls back to now rather than writing NaN into a required column.
      let startIso = nowIso;
      if (input.start) {
        const parsed = new Date(String(input.start));
        if (!isNaN(parsed.getTime())) startIso = parsed.toISOString();
      }

      // 1. the interaction itself, as a queryable record.
      const eventDoc = {
        subject: subject,
        type: EVENT_TYPE,
        status: EVENT_STATUS,
        start_datetime: startIso,
        owner: userId,
        related_to_type: OBJECT_NAME,
      };
      if (duration > 0) eventDoc.duration_minutes = duration;
      if (location) eventDoc.location = location;
      if (notes) eventDoc.description = notes;
      if (recordId) eventDoc[RELATED_FIELD] = recordId;
      const event = await ctx.api.object('crm_event').insert(eventDoc);
      const eventId = event?.id ?? null;

      // 2. attendees, as rows — the point of #592.
      // A multi-lookup param may arrive as an array or, on a surface that
      // renders it single-valued, as one scalar. Normalising both is not a
      // lenient parse of authored metadata: it is the console's own input
      // shape, which this body does not control.
      const toList = (v) => {
        if (v === null || v === undefined || v === '') return [];
        return Array.isArray(v) ? v : [v];
      };
      const attendees = [];
      if (userId) {
        attendees.push({ attendee_type: 'user', sys_user: userId, is_organizer: true, response: 'accepted' });
      }
      // The record the action was fired from IS an attendee when it is a
      // person. On an account / opportunity / case it is not, so nothing is
      // invented for it — the event's related_to_* link already records it.
      if (OBJECT_NAME === 'crm_contact' && recordId) {
        attendees.push({ attendee_type: 'contact', crm_contact: recordId, response: 'no_response' });
      }
      if (OBJECT_NAME === 'crm_lead' && recordId) {
        attendees.push({ attendee_type: 'lead', crm_lead: recordId, response: 'no_response' });
      }
      for (const c of toList(input.attendee_contacts)) {
        attendees.push({ attendee_type: 'contact', crm_contact: String(c), response: 'no_response' });
      }
      for (const u of toList(input.attendee_users)) {
        attendees.push({ attendee_type: 'user', sys_user: String(u), response: 'no_response' });
      }

      const seen = {};
      const attendeeIds = [];
      for (const a of attendees) {
        const who = a.sys_user ?? a.crm_contact ?? a.crm_lead ?? '';
        const key = a.attendee_type + ':' + who;
        if (seen[key]) continue;
        seen[key] = true;
        const doc = Object.assign({}, a, { crm_event: eventId, invited_date: nowIso });
        const row = await ctx.api.object('crm_event_attendee').insert(doc);
        if (row?.id) attendeeIds.push(row.id);
      }

      // 3. the unified-timeline pointer.
      // \`metadata\` no longer carries the attendee list: it is a display hint
      // beside a real record now, not the record itself. ADR-0052
      // source_object/source_id is the queryable drill to the crm_event row.
      const summary = duration ? subject + ' (' + duration + ' min)' : subject;
      const activity = await ctx.api.object('sys_activity').insert({
        type: EVENT_STATUS === 'held' ? 'completed' : 'scheduled',
        summary: ${lit(spec.summaryPrefix)} + summary,
        actor_id: userId,
        actor_name: ctx.user?.name ?? null,
        object_name: OBJECT_NAME,
        record_id: recordId,
        // #514 item 2: the object's DECLARED nameField, not a hardcoded name.
        record_label: record[NAME_FIELD] ?? null,
        source_object: 'crm_event',
        source_id: eventId,
        metadata: JSON.stringify({
          kind: EVENT_TYPE,
          duration_minutes: duration,
          notes: notes,
          attendee_count: attendeeIds.length,
        }),
      });

      // 4. SLA first-response stamp (#575 B2, cases only).
      // \`first_response_date\` was the one member of the case SLA family with
      // no writer at all, so the metric was permanently null. A logged call or
      // meeting is the only record of outbound contact a case carries, which
      // makes the FIRST one the moment the customer first heard back — the
      // industry definition (Salesforce \`FirstResponseDateTime\`, Zendesk first
      // reply time). A status change is deliberately NOT used: an agent can
      // move a case to "in progress" and investigate for an hour while the
      // customer hears nothing. A meeting merely BOOKED is not a response
      // either, which is why this is gated on EVENT_STATUS.
      //
      // CONVENTION: any future customer-facing path on a case MUST stamp this
      // too, or the metric silently under-reports.
      //
      // The stored value is READ rather than taken from \`ctx.record\`: the
      // list_item / record_related dispatch paths hand the body a PROJECTED
      // record, and a field missing from that projection reads as blank — which
      // would re-stamp on every log and turn "first response" into "last".
      if (OBJECT_NAME === 'crm_case' && recordId && EVENT_STATUS === 'held') {
        const raw = await ctx.api.object('crm_case').find({
          where: { id: recordId },
          fields: ['first_response_date'],
          top: 1,
        });
        const found = Array.isArray(raw) ? raw : (raw?.records ?? []);
        const stored = found.length ? found[0].first_response_date : record.first_response_date;
        if (!stored) {
          // \`update(data, options)\` — \`ctx.api\` is the engine repo facade,
          // whose update takes a DOCUMENT, not an id (test/action-sandbox.test.ts
          // pins the contract against a real kernel).
          await ctx.api.object('crm_case').update(
            { id: recordId, first_response_date: nowIso },
            { where: { id: recordId } },
          );
        }
      }

      return { eventId: eventId, activityId: activity?.id ?? null, attendeeIds: attendeeIds };
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
      ...(spec.collectsSchedule
        ? ([
            { name: 'start', label: 'Starts At', type: 'datetime', required: true },
            { name: 'location', label: 'Location', type: 'text', required: false },
          ] as NonNullable<Action['params']>)
        : []),
      {
        name: 'duration',
        label: 'Duration (minutes)',
        type: 'number',
        required: false,
      },
      // The queryable replacement for the old free-text `attendees` string.
      // Two params, not one, because the platform has no polymorphic picker —
      // and two typed lookups produce typed rows, where one text box produced
      // a comma-separated sentence.
      {
        name: 'attendee_contacts',
        label: 'Contact Attendees',
        type: 'lookup',
        reference: 'crm_contact',
        multiple: true,
        required: false,
      },
      {
        name: 'attendee_users',
        label: 'Internal Attendees',
        type: 'lookup',
        reference: 'sys_user',
        multiple: true,
        required: false,
      },
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

const LOG_CALL_SPEC: ActivitySpec = {
  name: 'log_call',
  label: 'Log a Call',
  icon: 'phone',
  eventType: 'call',
  eventStatus: 'held',
  summaryPrefix: '',
  defaultSubject: 'Untitled Call',
  subjectLabel: 'Call Subject',
  notesLabel: 'Call Notes',
  successMessage: 'Call logged successfully!',
};

const LOG_MEETING_SPEC: ActivitySpec = {
  name: 'log_meeting',
  label: 'Log a Meeting',
  icon: 'calendar-check',
  eventType: 'meeting',
  eventStatus: 'held',
  summaryPrefix: 'Meeting: ',
  defaultSubject: 'Untitled Meeting',
  subjectLabel: 'Meeting Subject',
  notesLabel: 'Meeting Notes',
  successMessage: 'Meeting logged successfully!',
};

const SCHEDULE_MEETING_SPEC: ActivitySpec = {
  name: 'schedule_meeting',
  label: 'Schedule a Meeting',
  icon: 'calendar-plus',
  eventType: 'meeting',
  // `planned`, and that is the whole difference that matters: a booking must
  // NOT reset the customer's recency clock (see event.hook.ts).
  eventStatus: 'planned',
  summaryPrefix: 'Meeting scheduled: ',
  defaultSubject: 'Untitled Meeting',
  subjectLabel: 'Meeting Subject',
  notesLabel: 'Agenda',
  collectsSchedule: true,
  successMessage: 'Meeting scheduled!',
};

/** The three activity kinds, in the order they appear on a record header. */
export const ACTIVITY_SPEC_NAMES = ['log_call', 'log_meeting', 'schedule_meeting'] as const;

const ACTIVITY_SPECS: ActivitySpec[] = [LOG_CALL_SPEC, LOG_MEETING_SPEC, SCHEDULE_MEETING_SPEC];

/**
 * Every activity action, one per (kind × object).
 *
 * Exported as a flat list so `src/actions/index.ts` can spread it into the
 * stack without naming fifteen constants — and so a new activity target is one
 * entry in {@link ACTIVITY_TARGETS} rather than three new exports.
 */
export const ActivityActions: Action[] = Object.keys(ACTIVITY_TARGETS).flatMap((objectName) =>
  ACTIVITY_SPECS.map((spec) => activityAction(spec, objectName)),
);

/**
 * One generated action, by object and kind.
 *
 * The named exports below go through this rather than re-running the factory,
 * so a page that imports `LogCallAction` and the stack that registers
 * `ActivityActions` hold the SAME object. Two structurally-identical actions
 * under one `<objectName>:<name>` registry key is a duplicate registration the
 * runtime warns about and one of them silently loses.
 */
const activityActionFor = (objectName: string, name: string): Action => {
  const found = ActivityActions.find((a) => a.objectName === objectName && a.name === name);
  if (!found) throw new Error(`no ${objectName}-scoped '${name}' action was generated`);
  return found;
};

/*
 * The family, named. `src/actions/index.ts` re-exports exactly these — the
 * stack is built from `Object.values(actions)`, so every export it forwards
 * must be one Action, never a list of them.
 *
 * Spelled out rather than looped for grep-ability: "which surface can log a
 * call on a lead?" has to be answerable with one search, and AGENTS.md trades
 * verbosity for exactly that everywhere else too.
 */
export const LeadLogCallAction: Action = activityActionFor('crm_lead', 'log_call');
export const LeadLogMeetingAction: Action = activityActionFor('crm_lead', 'log_meeting');
export const LeadScheduleMeetingAction: Action = activityActionFor('crm_lead', 'schedule_meeting');

export const ContactLogCallAction: Action = activityActionFor('crm_contact', 'log_call');
export const ContactLogMeetingAction: Action = activityActionFor('crm_contact', 'log_meeting');
export const ContactScheduleMeetingAction: Action = activityActionFor('crm_contact', 'schedule_meeting');

export const AccountLogCallAction: Action = activityActionFor('crm_account', 'log_call');
export const AccountLogMeetingAction: Action = activityActionFor('crm_account', 'log_meeting');
export const AccountScheduleMeetingAction: Action = activityActionFor('crm_account', 'schedule_meeting');

export const OpportunityLogCallAction: Action = activityActionFor('crm_opportunity', 'log_call');
export const OpportunityLogMeetingAction: Action = activityActionFor('crm_opportunity', 'log_meeting');
export const OpportunityScheduleMeetingAction: Action = activityActionFor('crm_opportunity', 'schedule_meeting');

/**
 * The `crm_case`-scoped twins keep their original export names, because
 * `src/pages/case_detail.page.ts` imports them by those names.
 */
export const LogCallAction: Action = activityActionFor('crm_case', 'log_call');
export const LogMeetingAction: Action = activityActionFor('crm_case', 'log_meeting');
export const CaseScheduleMeetingAction: Action = activityActionFor('crm_case', 'schedule_meeting');

// ExportToCsvAction was removed: as a global body action it registered under
// the 'global' key the dispatcher never probes (same defect as #509 above),
// and the list grids' built-in `exportOptions: ['csv', 'xlsx']` already cover
// CSV export without any action.
