// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook, HookContext } from '@objectstack/spec/data';
import type { HookApi } from './_hook-api';

/**
 * Task lifecycle hook.
 *
 * - On `completed` transition, stamps `completed_date` and `progress_percent=100`.
 * - Warns when `reminder_date` is after `due_date`.
 * - Bubbles activity to the polymorphic parent (account `last_activity_date`,
 *   lead `last_contacted_date`).
 * - Refuses to SCHEDULE a phone touch against a person flagged `do_not_call`
 *   (see {@link taskDoNotCallGuard}).
 */

const taskValidation: Hook = {
  name: 'task_completion',
  object: 'crm_task',
  events: ['beforeInsert', 'beforeUpdate'],
  priority: 200,
  description: 'Stamp completed/overdue flags + dates on completion and validate reminder timing.',
  handler: async (ctx: HookContext) => {
    // The refusal envelope (#1075). Mirrored from `./_refusal.ts` because a
    // lowered body has no module scope and `extractHookBody` THROWS on an
    // import; `test/refusal-envelope.test.ts` pins every copy against it.
    function refuse(message: string, code: string, status: number): Error {
      const err = new Error(message) as Error & { code: string; status: number };
      err.code = code;
      err.status = status;
      return err;
    }
    const { input } = ctx;
    const previous = ctx.previous;

    // Land `reminder_sent` as a real boolean on insert, never NULL. The
    // task_due_reminder sweep de-dups on `reminder_date` (cleared after each
    // send), not on this flag — but keep it a real boolean so the audit trail
    // and any future `!= true` filter behave under SQL three-valued logic.
    if (!previous && input.reminder_sent == null) {
      input.reminder_sent = false;
    }

    // Materialise the urgency ordinal so the to-do queue can sort by it —
    // sorting on `priority` itself compares raw strings and inverts urgency.
    const effPriority =
      (typeof input.priority === 'string' && input.priority) ||
      (typeof previous?.priority === 'string' && (previous.priority as string)) ||
      undefined;
    //
    // Inline and duplicated in case.hook.ts on purpose — L2 hook bodies run
    // body-only in the QuickJS sandbox, so a shared module constant resolves at
    // authoring time and arrives as `undefined` (see _line-item-price-fill.ts).
    // The vocabularies differ (normal vs medium), but the UNKNOWN fallback must
    // match crm_case: `0`, the unranked sentinel that sorts below every real
    // rank. `test/priority-rank-parity.test.ts` pins that agreement.
    if (effPriority) {
      const rank: Record<string, number> = { low: 1, normal: 2, high: 3, urgent: 4 };
      input.priority_rank = rank[effPriority] ?? 0;
    }

    if (input.status === 'completed' && previous?.status !== 'completed') {
      if (!input.completed_date) input.completed_date = new Date().toISOString();
      if (typeof input.progress_percent !== 'number') input.progress_percent = 100;
    }

    // Derived flags.
    const effStatus =
      (typeof input.status === 'string' && input.status) ||
      (typeof previous?.status === 'string' && (previous.status as string)) ||
      undefined;
    if (typeof effStatus === 'string') input.is_completed = effStatus === 'completed';
    const effDue =
      (typeof input.due_date === 'string' && input.due_date) ||
      (typeof previous?.due_date === 'string' && (previous.due_date as string)) ||
      undefined;
    const todayStr = new Date().toISOString().slice(0, 10);
    input.is_overdue = !!effDue && effDue.slice(0, 10) < todayStr && input.is_completed !== true;

    const reminder =
      (typeof input.reminder_date === 'string' && input.reminder_date) ||
      (typeof previous?.reminder_date === 'string' && (previous.reminder_date as string)) ||
      undefined;
    const due =
      (typeof input.due_date === 'string' && input.due_date) ||
      (typeof previous?.due_date === 'string' && (previous.due_date as string)) ||
      undefined;
    if (reminder && due && reminder.slice(0, 10) > due.slice(0, 10)) {
      throw refuse(
        `Reminder (${reminder}) is after the due date (${due}); reminders should fire before the deadline.`,
        'VALIDATION_FAILED',
        400,
      );
    }
  },
};

/**
 * Recurring-task generator.
 *
 * The schema carries `is_recurring` / `recurrence_type` / `recurrence_interval`
 * / `recurrence_end_date`, but nothing ever spawned the next occurrence — so a
 * "recurring" task was recurring in name only. On the completing transition of a
 * recurring task, this clones it with `due_date` (and `reminder_date`) advanced
 * by `recurrence_type × interval`, until `recurrence_end_date` is passed.
 *
 * Done in a hook (not a flow) because the next due date needs real calendar math
 * (month/year rollover); the flow runtime's `{NOW()+n}` only does day offsets and
 * has no `DATEADD`. The spawned task is `not_started`, so it never re-triggers
 * this completion hook (no recursion).
 */
const taskRecurrence: Hook = {
  name: 'task_recurrence',
  object: 'crm_task',
  events: ['afterUpdate'],
  priority: 700,
  async: true,
  onError: 'log',
  description: 'On completion of a recurring task, spawn the next occurrence (dates advanced by recurrence_type × interval).',
  handler: async (ctx: HookContext) => {
    /**
     * Advance a date by `interval` units of the given recurrence type.
     *
     * Declared INSIDE the handler, matching every other hook in this directory:
     * L2 hook bodies run body-only in the QuickJS sandbox, where module scope
     * is not available (cf. opportunity.hook.ts / lead.hook.ts). This was the
     * one module-level helper left in the tree.
     *
     * Month and year steps CLAMP to the last valid day of the target month
     * instead of overflowing. `Date.setMonth` rolls a day that does not exist
     * forward into the next month — Jan 31 + 1 month landed on Mar 3, so a
     * month-end recurring task walked further into the following month on every
     * occurrence and, for the 31st, skipped February entirely.
     */
    function advanceDate(d: Date, type: string, interval: number): Date {
      const next = new Date(d);
      if (type === 'daily') {
        next.setDate(next.getDate() + interval);
        return next;
      }
      if (type === 'weekly') {
        next.setDate(next.getDate() + 7 * interval);
        return next;
      }
      const months = type === 'monthly' ? interval : type === 'yearly' ? 12 * interval : 0;
      if (months === 0) return next;

      const day = next.getDate();
      // Move to the 1st first so the month arithmetic can never overflow, then
      // clamp the day to the target month's length.
      next.setDate(1);
      next.setMonth(next.getMonth() + months);
      const lastDayOfTargetMonth = new Date(
        next.getFullYear(), next.getMonth() + 1, 0,
      ).getDate();
      next.setDate(Math.min(day, lastDayOfTargetMonth));
      return next;
    }

    const { input } = ctx;
    const previous = ctx.previous;
    const api = ctx.api as HookApi | undefined;
    if (!api) return;

    // Fire only on the transition INTO completed (not on later edits of an
    // already-completed task).
    const nowDone = input.status === 'completed' || input.is_completed === true;
    const wasDone = previous?.status === 'completed' || previous?.is_completed === true;
    if (!nowDone || wasDone) return;

    const r: Record<string, any> = { ...(previous ?? {}), ...input };
    if (r.is_recurring !== true) return;

    const type = typeof r.recurrence_type === 'string' ? r.recurrence_type : undefined;
    if (!type || !['daily', 'weekly', 'monthly', 'yearly'].includes(type)) return;
    const interval = Number(r.recurrence_interval) > 0 ? Number(r.recurrence_interval) : 1;

    const baseDue = r.due_date ? new Date(r.due_date) : new Date();
    if (isNaN(baseDue.getTime())) return;
    const nextDue = advanceDate(baseDue, type, interval);

    // Stop the series once the next occurrence would fall past the end date.
    if (r.recurrence_end_date) {
      const end = new Date(r.recurrence_end_date);
      if (!isNaN(end.getTime()) && nextDue > end) return;
    }

    const doc: Record<string, any> = {
      subject: r.subject,
      description: r.description ?? null,
      priority: r.priority,
      type: r.type ?? null,
      owner_id: r.owner_id ?? null,
      status: 'not_started',
      is_completed: false,
      reminder_sent: false,
      due_date: nextDue.toISOString().slice(0, 10),
      is_recurring: true,
      recurrence_type: type,
      recurrence_interval: interval,
      recurrence_end_date: r.recurrence_end_date ?? null,
      related_to_type: r.related_to_type ?? null,
      related_to_account: r.related_to_account ?? null,
      related_to_contact: r.related_to_contact ?? null,
      related_to_opportunity: r.related_to_opportunity ?? null,
      related_to_lead: r.related_to_lead ?? null,
      related_to_case: r.related_to_case ?? null,
    };
    if (r.reminder_date) {
      const baseRem = new Date(r.reminder_date);
      if (!isNaN(baseRem.getTime())) doc.reminder_date = advanceDate(baseRem, type, interval).toISOString();
    }

    try {
      await api.object('crm_task').insert(doc);
    } catch {
      // Best-effort; never break the parent write. No `console` in the L2 hook
      // sandbox — logging here would throw its own ReferenceError (cf. #471).
    }
  },
};

const taskBubble: Hook = {
  name: 'task_activity_bubble',
  object: 'crm_task',
  events: ['afterUpdate'],
  priority: 800,
  async: true,
  onError: 'log',
  description:
    'A completed task stamps interaction recency on the related account (walking up from contact/opportunity/case), lead and contact.',
  handler: async (ctx: HookContext) => {
    /*
     * The activity bubble, second copy. `src/objects/event.hook.ts` carries the
     * canonical one and the rationale; this is a deliberate verbatim duplicate,
     * not drift — an L2 hook body ships body-only into the QuickJS sandbox, so a
     * shared module helper resolves at authoring time and arrives `undefined` at
     * runtime (same constraint as `_line-item-price-fill.ts` and the
     * `priority_rank` table above). `test/activity-recency.test.ts` runs BOTH
     * copies through the same cases so they cannot diverge silently.
     *
     * Two things changed here versus the version this replaces (#592):
     *
     *   1. It no longer keys off `related_to_type`. That discriminator is a
     *      display hint a rep can leave blank — and when they did, a task with a
     *      perfectly good `related_to_account` bubbled to nothing at all.
     *   2. It WALKS UP to the account. A rep completes a task on the
     *      opportunity, not on the account row, so bubbling only to the named
     *      record left `crm_account.last_activity_date` untouched through an
     *      entire deal — which is why `at_risk_accounts` listed active
     *      customers.
     */
    const { input } = ctx;
    const previous = ctx.previous;
    const api = ctx.api as HookApi | undefined;
    if (!api) return;

    // Recency means the interaction HAPPENED. An open task is a promise, not
    // contact; only the completing transition bubbles.
    const nowDone = input.status === 'completed' || input.is_completed === true;
    const wasDone = previous?.status === 'completed' || previous?.is_completed === true;
    if (!nowDone || wasDone) return;

    const r: Record<string, any> = { ...(previous ?? {}), ...input };

    const nowIso = new Date().toISOString();
    // `crm_account.last_activity_date` is a DATE column; the two contact
    // timestamps are datetimes.
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
        // Best-effort: a rep who cannot read the parent simply does not bubble
        // through it. No `console` in the L2 hook sandbox (cf. #471).
      }
    }

    const writes: Array<{ object: string; id: string; doc: Record<string, any> }> = [
      ...[...accountIds].map((id) => ({ object: 'crm_account', id, doc: { last_activity_date: today } })),
      ...[...contactIds].map((id) => ({ object: 'crm_contact', id, doc: { last_contacted_date: nowIso } })),
      ...[...leadIds].map((id) => ({ object: 'crm_lead', id, doc: { last_contacted_date: nowIso } })),
    ];

    for (const w of writes) {
      try {
        await api.object(w.object).update({ ...w.doc, id: w.id }, { where: { id: w.id } });
      } catch {
        // Best-effort activity bubble; never break the parent write.
      }
    }
  },
};

/**
 * `do_not_call` — refuse to SCHEDULE a phone touch, never to record one.
 *
 * # Why this is a hook and not an action predicate
 *
 * The obvious mirror of the `email_opt_out` treatment is
 * `visible: P\`record.do_not_call == false\`` on a button, the way
 * `send_email` and `add_contact_to_campaign` are gated in
 * `src/actions/contact.actions.ts`. That is a RENDERING hint, and it is the
 * whole of what those two do: it hides a button in the Console and leaves the
 * action reachable over REST, from an AI tool call, from a flow, and from an
 * import. For email that is only half a promise too — but the email half is
 * backed by real enforcement elsewhere (`campaign-enrollment.flow.ts` filters
 * on the flag, `campaign_member.hook.ts` writes it). `do_not_call` had no such
 * backing, so a predicate alone would have moved the field from "declared and
 * unenforced" to "declared and unenforced unless you use the mouse".
 *
 * Enforcing on the WRITE instead covers every entry point at once — the
 * `schedule_followup` screen flow, a hand-created task, an import, an AI agent
 * calling the data API — which is the same "one writer, not one per entry
 * point" reasoning `src/actions/global.actions.ts` gives for keeping the
 * recency bubble on `crm_event`'s hook rather than in each button's body.
 *
 * # Why `type: 'call'` and not "any forward-looking outreach"
 *
 * `do_not_call` is a promise about the PHONE. It is not `do_not_contact`:
 * this person may still be emailed (that is `email_opt_out`'s separate flag),
 * met, or demoed to. Refusing a `meeting` task here would silently widen a
 * declared field into a promise the app never made — the mirror image of the
 * defect this guard closes.
 *
 * # Why a completed task is allowed through
 *
 * A `completed` Call task is a RECORD of a call that already happened, not a
 * plan to place one. Refusing it would delete the evidence rather than prevent
 * the call — and would make the flag actively harmful, because the honest rep
 * who logs the call they should not have made is the one who gets blocked. The
 * same reasoning keeps the `log_call` action reachable and ungated.
 */
const taskDoNotCallGuard: Hook = {
  name: 'task_do_not_call_guard',
  object: 'crm_task',
  events: ['beforeInsert', 'beforeUpdate'],
  priority: 150,
  description: 'Refuse to schedule an open Call task against a lead/contact flagged Do Not Call.',
  handler: async (ctx: HookContext) => {
    // The refusal envelope (#1075). Mirrored from `./_refusal.ts` because a
    // lowered body has no module scope and `extractHookBody` THROWS on an
    // import; `test/refusal-envelope.test.ts` pins every copy against it.
    function refuse(message: string, code: string, status: number): Error {
      const err = new Error(message) as Error & { code: string; status: number };
      err.code = code;
      err.status = status;
      return err;
    }
    const { input } = ctx;
    const previous = ctx.previous;
    const api = ctx.api as HookApi | undefined;
    if (!api) return;

    // The value the row will HAVE after this write, not the value the write
    // happens to mention: flipping `type` to `call` on an existing task and
    // re-parenting an existing Call task are both ways in, and each only
    // supplies one of the two keys.
    const effective = (key: string): unknown =>
      input[key] !== undefined && input[key] !== null ? input[key] : previous?.[key];

    if (effective('type') !== 'call') return;
    if (effective('status') === 'completed') return;

    const leadId = effective('related_to_lead');
    const contactId = effective('related_to_contact');

    // Both branches run rather than an if/else: `related_to_required` on the
    // object guarantees at least one parent, and a row that somehow carries
    // both must be checked against both people, not against whichever the
    // author listed first.
    const targets: Array<{ object: string; id: string; label: string }> = [];
    if (typeof leadId === 'string' && leadId) {
      targets.push({ object: 'crm_lead', id: leadId, label: 'lead' });
    }
    if (typeof contactId === 'string' && contactId) {
      targets.push({ object: 'crm_contact', id: contactId, label: 'contact' });
    }

    for (const t of targets) {
      // `find(... top: 1)` rather than `findOne`, matching
      // `event_activity_bubble` in `src/objects/event.hook.ts` and the shape
      // the rest of the app's hooks read with. The result is normalised for
      // both driver shapes (bare array / `{ records }`).
      const raw: any = await api.object(t.object).find({
        where: { id: t.id },
        fields: ['id', 'do_not_call'],
        top: 1,
      });
      const rows = Array.isArray(raw) ? raw : (raw?.records ?? []);
      const person = rows[0];
      // `=== true` on purpose: an absent key, `null`, and `false` are all "not
      // flagged". A driver that stores only written columns hands back the key
      // ABSENT (see AGENTS.md on predicate totality), and treating that as
      // truthy would block every ordinary call task in the app.
      if (person?.do_not_call === true) {
        throw refuse(
          `This ${t.label} is flagged Do Not Call, so a Call task cannot be scheduled against them. ` +
            'Log a completed call if one already happened, choose a non-phone activity type, ' +
            'or clear Do Not Call on the record first.',
          'FORBIDDEN',
          403,
        );
      }
    }
  },
};

export default [taskValidation, taskDoNotCallGuard, taskRecurrence, taskBubble];
