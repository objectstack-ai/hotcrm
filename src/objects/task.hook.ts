// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook, HookContext } from '@objectstack/spec/data';
import type { HookApi } from './_hook-api';

/**
 * Task lifecycle hook.
 *
 * - On `completed` transition, stamps `completed_date` and `progress_percent=100`.
 * - Warns when `reminder_date` is after `due_date`.
 * - Bubbles `last_activity_date` to the polymorphic parent (account/opportunity/lead).
 */

const taskValidation: Hook = {
  name: 'task_completion',
  object: 'crm_task',
  events: ['beforeInsert', 'beforeUpdate'],
  priority: 200,
  description: 'Stamp completed/overdue flags + dates on completion and validate reminder timing.',
  handler: async (ctx: HookContext) => {
    const { input } = ctx;
    const previous = ctx.previous;

    // Land `reminder_sent` as a real boolean on insert, never NULL. The
    // task_due_reminder sweep filters `reminder_sent != true`, and SQL's
    // three-valued logic means NULL rows never match `!= true` — so without
    // this, freshly-created tasks (column defaulted at the schema layer but
    // stored NULL) would never be picked up by the reminder sweep.
    if (!previous && input.reminder_sent == null) {
      input.reminder_sent = false;
    }

    // Materialise the urgency ordinal so the to-do queue can sort by it —
    // sorting on `priority` itself compares raw strings and inverts urgency.
    const effPriority =
      (typeof input.priority === 'string' && input.priority) ||
      (typeof previous?.priority === 'string' && (previous.priority as string)) ||
      undefined;
    if (effPriority) {
      const rank: Record<string, number> = { low: 1, normal: 2, high: 3, urgent: 4 };
      input.priority_rank = rank[effPriority] ?? 2;
    }

    if (input.status === 'completed' && previous?.status !== 'completed') {
      if (!input.completed_date) input.completed_date = new Date().toISOString();
      if (typeof input.progress_percent !== 'number') input.progress_percent = 100;
      input.is_completed = true;
    }

    // Derived flags (migrated from removed `set_completed_flag` / `check_overdue`
    // object workflows — 7.7 dropped workflows[]).
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
    if (reminder && due && reminder.slice(0, 10) > due) {
      throw new Error(
        `Reminder (${reminder}) is after the due date (${due}); reminders should fire before the deadline.`,
      );
    }
  },
};

/** Advance a date by `interval` units of the given recurrence type. */
function advanceDate(d: Date, type: string, interval: number): Date {
  const next = new Date(d);
  if (type === 'daily') next.setDate(next.getDate() + interval);
  else if (type === 'weekly') next.setDate(next.getDate() + 7 * interval);
  else if (type === 'monthly') next.setMonth(next.getMonth() + interval);
  else if (type === 'yearly') next.setFullYear(next.getFullYear() + interval);
  return next;
}

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
      owner: r.owner ?? null,
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
  description: 'Bubble last_activity_date to the polymorphic parent record.',
  handler: async (ctx: HookContext) => {
    const { input } = ctx;
    const previous = ctx.previous;
    const api = ctx.api as HookApi | undefined;
    if (!api) return;

    const today = new Date().toISOString().slice(0, 10);
    const targetType =
      (typeof input.related_to_type === 'string' && input.related_to_type) ||
      (typeof previous?.related_to_type === 'string' && (previous.related_to_type as string)) ||
      undefined;
    if (!targetType) return;

    const fieldByType: Record<string, string> = {
      crm_account: 'related_to_account',
      crm_contact: 'related_to_contact',
      crm_opportunity: 'related_to_opportunity',
      crm_lead: 'related_to_lead',
      crm_case: 'related_to_case',
    };
    const refField = fieldByType[targetType];
    if (!refField) return;
    const targetId =
      (typeof input[refField] === 'string' && (input[refField] as string)) ||
      (typeof previous?.[refField] === 'string' && (previous[refField] as string)) ||
      undefined;
    if (!targetId) return;

    // Only bubble to objects that have a `last_activity_date` field (account/lead).
    if (targetType !== 'crm_account' && targetType !== 'crm_lead') return;
    try {
      await api.object(targetType).update(targetId, { last_activity_date: today });
    } catch {
      // Best-effort activity bubble; never break the parent write. No `console`
      // in the L2 hook sandbox (would throw ReferenceError — cf. #471).
    }
  },
};

export default [taskValidation, taskRecurrence, taskBubble];
