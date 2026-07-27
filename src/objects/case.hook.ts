// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook, HookContext } from '@objectstack/spec/data';
import type { HookApi } from './_hook-api';

/**
 * Case SLA & escalation hook.
 *
 * - For `critical` cases without `sla_due_date`, sets a 4-hour SLA.
 * - On escalation: creates a follow-up task assigned to the account owner.
 * - On `resolved`: stamps `resolved_date` and bumps account `last_activity_date`.
 * - Declarative `condition` flags SLA breach when due date is past and case not closed.
 */

const caseValidation: Hook = {
  name: 'case_sla_defaults',
  object: 'crm_case',
  events: ['beforeInsert', 'beforeUpdate'],
  priority: 200,
  description: 'Apply SLA defaults for critical cases.',
  handler: async (ctx: HookContext) => {
    const { input } = ctx;

    const isGuestSubmission = !ctx.previous && !ctx.user?.id;
    if (isGuestSubmission) {
      if (!input.origin)   input.origin   = 'web';
      if (!input.status)   input.status   = 'new';
      if (!input.priority) input.priority = 'medium';
      delete (input as Record<string, unknown>).owner;
      delete (input as Record<string, unknown>).is_escalated;
      delete (input as Record<string, unknown>).is_closed;
      delete (input as Record<string, unknown>).internal_notes;
      delete (input as Record<string, unknown>).resolution;
    }

    const priority =
      (typeof input.priority === 'string' && input.priority) ||
      (typeof ctx.previous?.priority === 'string' && (ctx.previous.priority as string)) ||
      undefined;

    // Materialise the urgency ordinal so queue views can sort by it. Sorting
    // on `priority` itself compares raw strings and inverts urgency
    // (medium > low > high > critical).
    if (priority) {
      const rank: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };
      input.priority_rank = rank[priority] ?? 1;
    }

    if (priority === 'critical' && !input.sla_due_date && !ctx.previous?.sla_due_date) {
      const due = new Date();
      due.setHours(due.getHours() + 4);
      input.sla_due_date = due.toISOString();
    }

    // Closed flag/date + resolution time (migrated from removed `set_closed_flag`
    // / `set_closed_date` / `calculate_resolution_time` workflows — 7.7 dropped
    // workflows[]). Guest submissions had is_closed stripped above; recompute it
    // here for trusted writes.
    if (!isGuestSubmission) {
      const effStatus =
        (typeof input.status === 'string' && input.status) ||
        (typeof ctx.previous?.status === 'string' && (ctx.previous.status as string)) ||
        undefined;
      if (typeof effStatus === 'string') input.is_closed = effStatus === 'closed';

      const becameClosed = input.status === 'closed' && ctx.previous?.status !== 'closed';
      if (becameClosed && !input.closed_date && !ctx.previous?.closed_date) {
        input.closed_date = new Date().toISOString();
      }

      const closedDate =
        (typeof input.closed_date === 'string' && input.closed_date) ||
        (typeof ctx.previous?.closed_date === 'string' && (ctx.previous.closed_date as string)) ||
        undefined;
      const createdDate =
        (typeof input.created_date === 'string' && input.created_date) ||
        (typeof ctx.previous?.created_date === 'string' && (ctx.previous.created_date as string)) ||
        (typeof ctx.previous?.created_at === 'string' && (ctx.previous.created_at as string)) ||
        undefined;
      if (closedDate && createdDate) {
        const hrs = (new Date(closedDate).getTime() - new Date(createdDate).getTime()) / 3_600_000;
        if (Number.isFinite(hrs) && hrs >= 0) input.resolution_time_hours = Math.round(hrs * 10) / 10;
      }
    }
  },
};

const caseSideEffects: Hook = {
  name: 'case_status_side_effects',
  object: 'crm_case',
  events: ['afterUpdate'],
  priority: 800,
  async: true,
  onError: 'log',
  description: 'Escalation tasks, resolved-date stamping, and account activity rollup.',
  handler: async (ctx: HookContext) => {
    const { input } = ctx;
    const previous = ctx.previous;
    if (!previous) return;
    const api = ctx.api as HookApi | undefined;
    if (!api) return;

    const caseId =
      (typeof input.id === 'string' && input.id) ||
      (typeof previous.id === 'string' ? (previous.id as string) : undefined);
    const accountId =
      (typeof input.crm_account === 'string' && input.crm_account) ||
      (typeof previous.crm_account === 'string' && previous.crm_account) ||
      undefined;

    // Escalation: open task for account owner
    if (input.status === 'escalated' && previous.status !== 'escalated' && accountId) {
      const account = await api.object('crm_account').findOne({ filter: { id: accountId } });
      const ownerId = (account as { owner?: string } | null)?.owner ?? ctx.user?.id;
      const due = new Date();
      due.setDate(due.getDate() + 1);
      await api.object('crm_task').insert({
        subject: `Escalated case ${caseId ?? ''} needs attention`.trim(),
        status: 'not_started',
        priority: 'urgent',
        type: 'follow_up',
        due_date: due.toISOString().slice(0, 10),
        owner: ownerId,
        related_to_type: 'crm_case',
        related_to_case: caseId,
        related_to_account: accountId,
      });
    }

    // Resolution rollup
    if (input.status === 'resolved' && previous.status !== 'resolved') {
      if (caseId && !input.closed_date && !previous.closed_date) {
        // Use closed_date as a proxy for resolved_date (schema field).
        await api.object('crm_case').update(caseId, { closed_date: new Date().toISOString() });
      }
      if (accountId) {
        await api.object('crm_account').update(accountId, {
          last_activity_date: new Date().toISOString().slice(0, 10),
        });
      }
    }
  },
};

export default [caseValidation, caseSideEffects];
