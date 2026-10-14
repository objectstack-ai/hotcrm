// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook, HookContext } from '@objectstack/spec/data';
import type { HookApi } from './_hook-api';

/**
 * Event lifecycle hooks (#592).
 *
 * - `event_schedule_derive` keeps `start_datetime` / `end_datetime` /
 *   `duration_minutes` mutually consistent, so a calendar view and a duration
 *   report cannot disagree about the same row.
 * - `event_activity_bubble` is the app's PRIMARY writer of interaction
 *   recency: a `held` event stamps `crm_account.last_activity_date`,
 *   `crm_lead.last_contacted_date` and `crm_contact.last_contacted_date`,
 *   walking UP from an opportunity / case / contact to the account it hangs
 *   off. Since #595 it is also the SINGLE writer of
 *   `crm_case.first_response_date` (see the block at the end of the handler).
 *
 * # Why the walk-up matters
 *
 * `at_risk_accounts` and `customer_churn_signals` are built on
 * `crm_account.last_activity_date`, but a rep logs a call on the OPPORTUNITY or
 * the CONTACT — almost never on the account row itself. ⛔ Bubbling only to the
 * directly-named record leaves the account clock untouched through an entire
 * sales cycle, and the churn report then counts a busy customer as silent. The
 * walk-up is the whole reason the signal becomes real.
 */

const eventScheduleDerive: Hook = {
  name: 'event_schedule_derive',
  object: 'crm_event',
  events: ['beforeInsert', 'beforeUpdate'],
  priority: 200,
  description:
    'Keep start/end/duration coherent: derive whichever of end_datetime or duration_minutes was not supplied.',
  handler: async (ctx: HookContext) => {
    // D3 stand-down: a predicate update has ONE payload for every matched row,
    // so the `ctx.previous`-conditioned writes below would land on rows that
    // did not earn them — refused as a diverging key set, or stored silently
    // from the last row. Full account and the measurement: `forecast.hook.ts`.
    if (ctx.event === 'beforeUpdate' && ctx.dispatch?.mode === 'per-row') return;

    const { input } = ctx;
    const previous = ctx.previous;

    const effective = (key: string): unknown =>
      input[key] !== undefined && input[key] !== null ? input[key] : previous?.[key];

    const start = effective('start_datetime');
    const end = effective('end_datetime');
    const durationRaw = effective('duration_minutes');

    const startMs = typeof start === 'string' || start instanceof Date ? new Date(start as string).getTime() : NaN;
    const endMs = typeof end === 'string' || end instanceof Date ? new Date(end as string).getTime() : NaN;
    const duration = typeof durationRaw === 'number' && isFinite(durationRaw) ? durationRaw : NaN;

    // An all-day event has no meaningful minute count; leave duration alone so
    // a report can tell "all day" apart from "we forgot to fill it in".
    const allDay = effective('all_day') === true;

    if (!isNaN(startMs) && !isNaN(endMs)) {
      // Both ends known — the duration is a MEASUREMENT, so it is recomputed
      // even when the caller supplied one. A stored duration that disagrees
      // with its own timestamps is the kind of metadata a report quietly
      // averages into nonsense.
      if (!allDay) input.duration_minutes = Math.max(0, Math.round((endMs - startMs) / 60000));
    } else if (!isNaN(startMs) && isNaN(endMs) && !isNaN(duration) && duration > 0) {
      // Duration-only, the shape `log_call` submits ("a 20-minute call, now").
      // Materialising the end timestamp is what puts the row on a calendar.
      input.end_datetime = new Date(startMs + duration * 60000).toISOString();
    }

    // A cancelled or no-show meeting occupies no one's time. Zeroing it keeps
    // "meeting minutes this week" honest without deleting the row, which is
    // still evidence that the interaction was attempted.
    const status = effective('status');
    if (status === 'cancelled' || status === 'no_show') input.duration_minutes = 0;
  },
};

/**
 * The activity bubble — the canonical copy (`task_activity_bubble` carries a
 * verbatim twin).
 *
 * ## `runAs: 'system'` (#2014, AGENTS.md rule 9)
 *
 * The clocks it stamps belong to the records the interaction was WITH — the
 * account, contact and lead — and to the case it answered, not to the person
 * who logged it. As the caller, every one of those writes (and the walk-up
 * reads) met the caller's grants: a service agent holds no edit right on
 * accounts, and a rep need not own the account or contact their own deal hangs
 * off. Each refusal was swallowed best-effort, so the clocks never moved
 * (measured on 17.7.0: a service agent's held call on their own case left the
 * case account's `last_activity_date` empty while an admin's identical call
 * stamped it; the task twin the same, and a rep's completed task on their own
 * deal reached neither the account nor the contact a manager owns). So the
 * hook elevates. It writes nothing the caller chose beyond the links already on
 * the event, and only the recency dates and the case's first-response stamp;
 * elevation is not anonymity — `updated_by` still names the person.
 *
 * ## Organization (AGENTS.md rule 10)
 *
 * Every read and every write is pinned to the triggering event's own
 * `organization_id` when it carries one: the walk-up reads carry the predicate,
 * and because a by-id update cannot (the engine refuses an extra `where` key on
 * the by-id path), each write target is first confirmed inside the
 * organization by one pinned read per object. A person's elevated context
 * already keeps their tenant; the pin is what holds the wall for a trigger
 * that carries none (a system write, which runs unscoped). An event with no
 * organization (a single-organization install) has no wall, and is not pinned.
 */
const eventActivityBubble: Hook = {
  name: 'event_activity_bubble',
  object: 'crm_event',
  events: ['afterInsert', 'afterUpdate'],
  priority: 800,
  async: true,
  onError: 'log',
  runAs: 'system',
  description:
    'A held event stamps interaction recency on the related account (walking up from contact/opportunity/case), lead and contact, and the first-response time on a related case.',
  handler: async (ctx: HookContext) => {
    const { input } = ctx;
    const previous = ctx.previous;
    const api = ctx.api as HookApi | undefined;
    if (!api) return;

    const r: Record<string, any> = { ...(previous ?? {}), ...input };

    // Only an interaction that HAPPENED resets the recency clock. A meeting
    // booked for next quarter is not contact; letting `planned` bubble would
    // make an account look freshly-touched the moment someone put a placeholder
    // on the calendar, which is the exact failure mode the churn report exists
    // to avoid.
    if (r.status !== 'held') return;
    // Fire once, on the transition into `held` (afterInsert has no `previous`).
    if (previous && previous.status === 'held') return;

    const nowIso = new Date().toISOString();
    // `crm_account.last_activity_date` is a DATE column; the two contact
    // timestamps are datetimes. Passing an ISO instant to a date column is what
    // stores '2026-08-04T…' in a field every filter compares as 'YYYY-MM-DD'.
    const today = nowIso.slice(0, 10);

    const idOf = (key: string): string | undefined =>
      typeof r[key] === 'string' && r[key].length > 0 ? (r[key] as string) : undefined;
    // The rule-10 pin — see the hook's note.
    const org = idOf('organization_id');
    const inOrg: Record<string, string> = org ? { organization_id: org } : {};

    const accountIds = new Set<string>();
    const contactIds = new Set<string>();
    const leadIds = new Set<string>();

    const direct = idOf('related_to_account');
    if (direct) accountIds.add(direct);
    const contactId = idOf('related_to_contact');
    if (contactId) contactIds.add(contactId);
    const leadId = idOf('related_to_lead');
    if (leadId) leadIds.add(leadId);

    // Walk UP to the account. Every one of these objects names its parent
    // `crm_account`, so one loop covers all three. `find(... top: 1)` rather
    // than `findOne`: the two agree here, and `find` is the shape the rest of
    // the app's hooks read with.
    const parentLookups: Array<[string, string]> = [
      ['related_to_contact', 'crm_contact'],
      ['related_to_opportunity', 'crm_opportunity'],
      ['related_to_case', 'crm_case'],
    ];
    for (const [field, object] of parentLookups) {
      const id = idOf(field);
      if (!id) continue;
      try {
        const raw: any = await api.object(object).find({
          where: { id, ...inOrg },
          fields: ['crm_account'],
          top: 1,
        });
        const rows = Array.isArray(raw) ? raw : (raw?.records ?? []);
        const parent = rows.length ? rows[0].crm_account : undefined;
        if (typeof parent === 'string' && parent.length > 0) accountIds.add(parent);
      } catch {
        // Best-effort: a parent that cannot be read is not bubbled through.
        // No `console` in the L2 hook sandbox — logging here would throw its
        // own ReferenceError (cf. #471).
      }
    }

    const targets: Array<[string, Set<string>, Record<string, any>]> = [
      ['crm_account', accountIds, { last_activity_date: today }],
      ['crm_contact', contactIds, { last_contacted_date: nowIso }],
      ['crm_lead', leadIds, { last_contacted_date: nowIso }],
    ];
    for (const [object, ids, doc] of targets) {
      let inside = [...ids];
      if (org && inside.length > 0) {
        try {
          const raw: any = await api.object(object).find({ where: { id: { $in: inside }, ...inOrg }, fields: ['id'], top: inside.length });
          inside = (Array.isArray(raw) ? raw : (raw?.records ?? [])).map((row: any) => String(row.id));
        } catch {
          inside = [];
        }
      }
      for (const id of inside) {
        try {
          // `update(document, options)` — `ctx.api` is the engine repo facade,
          // whose update takes a DOCUMENT, not an id (#616; pinned by
          // test/hook-write-shape.test.ts against a real kernel).
          await api.object(object).update({ ...doc, id }, { where: { id } });
        } catch {
          // Best-effort activity bubble; never break the parent write.
        }
      }
    }

    // ── First response on a case (#595) ──────────────────────────────────
    //
    // ⛔ The SINGLE writer of `crm_case.first_response_date`, and it belongs
    // here rather than in the `log_call` / `log_meeting` action bodies: stamping
    // it per-button covers only interactions recorded through those two
    // buttons, and an event created any other way (the Activity tab, an import,
    // an integration, a future action) leaves the most standard SLA metric a
    // service desk reports permanently null. The rule those actions express is
    // the one this hook already computes for recency — an interaction that
    // HAPPENED — so it lives once, where every writer of a held event passes
    // through it. Same argument that makes this hook the single writer of
    // recency, and `case_status_side_effects` the single owner of escalation
    // follow-up tasks.
    //
    // A status change is deliberately NOT a first response: an agent can move a
    // case to "in progress" and investigate
    // for an hour while the customer hears nothing, so a status-derived number
    // would report a response that never happened. Neither is a meeting merely
    // BOOKED — that is the `held` gate above, which this block sits under.
    const responseCaseId = idOf('related_to_case');
    if (responseCaseId) {
      try {
        // Read the STORED value rather than trusting the event's own payload:
        // "first response" is a property of the case, so the second held event
        // on a case must find the first one's stamp and leave it alone. A
        // re-stamp would silently turn the metric into "last response".
        // Pinned like the bubble, and written only when the read FOUND the
        // case: under elevation an empty read means "not this organization's"
        // (or gone), never "not stamped yet".
        const raw: any = await api.object('crm_case').find({
          where: { id: responseCaseId, ...inOrg },
          fields: ['first_response_date'],
          top: 1,
        });
        const rows = Array.isArray(raw) ? raw : (raw?.records ?? []);
        if (rows.length > 0 && !rows[0].first_response_date) {
          await api.object('crm_case').update(
            { id: responseCaseId, first_response_date: nowIso },
            { where: { id: responseCaseId } },
          );
        }
      } catch {
        // Best-effort, like the bubble above: never break the event write.
      }
    }
  },
};

/**
 * `do_not_call` — the calendar half of the same promise.
 *
 * `crm_task` carries the follow-up a rep OWES; `crm_event` carries the slot a
 * rep BOOKS. A `planned` event of type `call` is a booked outbound phone call,
 * so it is refused against a person flagged `do_not_call` for exactly the
 * reasons stated on `task_do_not_call_guard` in `src/sales/objects/task.hook.ts`
 * (read that block first — it carries the full rationale for enforcing on the
 * write rather than on a button, and for scoping to the phone).
 *
 * The status split is what makes this guard honest, and it is the whole reason
 * `log_call` needs no gate of its own:
 *
 *   - `status: 'held'`   — the call HAPPENED. Allowed, always. This is what
 *     `log_call` writes, and refusing it would hide evidence of a call rather
 *     than prevent one.
 *   - `status: 'planned'` — the call is BOOKED. Refused.
 *
 * `schedule_meeting` is deliberately NOT caught here: it hardcodes
 * `type: 'meeting'`, and a person who does not want phone calls may still be
 * met in person or over video. Gating it would widen `do_not_call` into
 * `do_not_contact`.
 */
const eventDoNotCallGuard: Hook = {
  name: 'event_do_not_call_guard',
  object: 'crm_event',
  events: ['beforeInsert', 'beforeUpdate'],
  priority: 150,
  description: 'Refuse to book a planned Call event against a lead/contact flagged Do Not Call.',
  handler: async (ctx: HookContext) => {
    // The refusal envelope (#1075). Mirrored from `./_refusal.ts` because a
    // lowered body has no module scope and `extractHookBody` THROWS on an
    // import; `test/refusal-envelope.test.ts` pins every copy against it.
    function refuse(
      message: string,
      code: string,
      status: number,
      userMessage: string = message,
    ): Error {
      const err = new Error(message) as Error & {
        code: string;
        status: number;
        userMessage: string;
      };
      err.code = code;
      err.status = status;
      err.userMessage = userMessage;
      return err;
    }
    const { input } = ctx;
    const previous = ctx.previous;
    const api = ctx.api as HookApi | undefined;
    if (!api) return;

    const effective = (key: string): unknown =>
      input[key] !== undefined && input[key] !== null ? input[key] : previous?.[key];

    if (effective('type') !== 'call') return;
    // Only a booking. `held` (what `log_call` writes) and every other status
    // describe a call that is no longer preventable.
    if (effective('status') !== 'planned') return;

    const leadId = effective('related_to_lead');
    const contactId = effective('related_to_contact');

    const targets: Array<{ object: string; id: string; label: string }> = [];
    if (typeof leadId === 'string' && leadId) {
      targets.push({ object: 'crm_lead', id: leadId, label: 'lead' });
    }
    if (typeof contactId === 'string' && contactId) {
      targets.push({ object: 'crm_contact', id: contactId, label: 'contact' });
    }

    for (const t of targets) {
      // `find(... top: 1)`, normalised for both driver shapes — same reasoning
      // as `event_activity_bubble` below.
      const raw: any = await api.object(t.object).find({
        where: { id: t.id },
        fields: ['id', 'do_not_call'],
        top: 1,
      });
      const rows = Array.isArray(raw) ? raw : (raw?.records ?? []);
      const person = rows[0];
      // `=== true`: absent / null / false are all "not flagged".
      if (person?.do_not_call === true) {
        throw refuse(
          `This ${t.label} is flagged Do Not Call, so a call cannot be scheduled against them. ` +
            'Log the call as held if it already happened, book a meeting instead, ' +
            'or clear Do Not Call on the record first.',
          'FORBIDDEN',
          403,
        );
      }
    }
  },
};

export default [eventScheduleDerive, eventDoNotCallGuard, eventActivityBubble];
