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
 *   off.
 *
 * # Why the walk-up matters
 *
 * `at_risk_accounts` and `customer_churn_signals` are built on
 * `crm_account.last_activity_date`, but a rep logs a call on the OPPORTUNITY
 * or the CONTACT — almost never on the account row itself. Bubbling only to
 * the directly-named record (what `task_activity_bubble` used to do) therefore
 * left the account clock untouched through an entire sales cycle, and the
 * churn report counted a busy customer as silent. The walk-up is the whole
 * reason the signal becomes real.
 */

const eventScheduleDerive: Hook = {
  name: 'event_schedule_derive',
  object: 'crm_event',
  events: ['beforeInsert', 'beforeUpdate'],
  priority: 200,
  description:
    'Keep start/end/duration coherent: derive whichever of end_datetime or duration_minutes was not supplied.',
  handler: async (ctx: HookContext) => {
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

const eventActivityBubble: Hook = {
  name: 'event_activity_bubble',
  object: 'crm_event',
  events: ['afterInsert', 'afterUpdate'],
  priority: 800,
  async: true,
  onError: 'log',
  description:
    'A held event stamps interaction recency on the related account (walking up from contact/opportunity/case), lead and contact.',
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
          where: { id },
          fields: ['crm_account'],
          top: 1,
        });
        const rows = Array.isArray(raw) ? raw : (raw?.records ?? []);
        const parent = rows.length ? rows[0].crm_account : undefined;
        if (typeof parent === 'string' && parent.length > 0) accountIds.add(parent);
      } catch {
        // Best-effort: a rep who cannot read the parent record simply does not
        // bubble through it. No `console` in the L2 hook sandbox — logging here
        // would throw its own ReferenceError (cf. #471).
      }
    }

    const writes: Array<{ object: string; id: string; doc: Record<string, any> }> = [
      ...[...accountIds].map((id) => ({ object: 'crm_account', id, doc: { last_activity_date: today } })),
      ...[...contactIds].map((id) => ({ object: 'crm_contact', id, doc: { last_contacted_date: nowIso } })),
      ...[...leadIds].map((id) => ({ object: 'crm_lead', id, doc: { last_contacted_date: nowIso } })),
    ];

    for (const w of writes) {
      try {
        // `update(document, options)` — `ctx.api` is the engine repo facade,
        // whose update takes a DOCUMENT, not an id (#616; pinned by
        // test/hook-write-shape.test.ts against a real kernel).
        await api.object(w.object).update({ ...w.doc, id: w.id }, { where: { id: w.id } });
      } catch {
        // Best-effort activity bubble; never break the parent write.
      }
    }
  },
};

export default [eventScheduleDerive, eventActivityBubble];
