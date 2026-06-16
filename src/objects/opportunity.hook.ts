// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook, HookContext } from '@objectstack/spec/data';
import type { HookApi } from './_hook-api';

/**
 * Opportunity lifecycle hook.
 *
 * - Re-derives `expected_revenue` from `amount * stageProbability` when either changes.
 * - Freezes most fields after stage is closed (won/lost) — only narrative fields editable.
 * - On `closed_won`: stamps `close_date=today`, promotes the parent account to `customer`,
 *   and asynchronously schedules an "Activate customer" task.
 */

const opportunityValidationHook: Hook = {
  name: 'opportunity_lifecycle',
  object: 'crm_opportunity',
  events: ['beforeInsert', 'beforeUpdate'],
  priority: 200,
  description:
    'Recompute expected_revenue, freeze closed opportunities except narrative fields.',
  handler: async (ctx: HookContext) => {
    // NOTE: L2 hook bodies run *body-only* in a sandbox (QuickJS) — module-level
    // constants are NOT in scope at runtime. These MUST be declared inside the
    // handler or the body throws `ReferenceError` on every write. (See ADR on
    // sandboxed hooks; same pattern as lead.hook.ts.)
    const STAGE_PROBABILITY: Record<string, number> = {
      prospecting: 10,
      qualification: 25,
      needs_analysis: 40,
      proposal: 60,
      negotiation: 80,
      closed_won: 100,
      closed_lost: 0,
    };
    const NARRATIVE_FIELDS = new Set(['description', 'next_step', 'notes']);
    // Stage → forecast category (migrated from the removed
    // `set_forecast_category_by_stage` object workflow — 7.7 dropped workflows[]).
    const STAGE_FORECAST: Record<string, string> = {
      prospecting: 'pipeline',
      qualification: 'pipeline',
      needs_analysis: 'best_case',
      proposal: 'commit',
      negotiation: 'commit',
      closed_won: 'closed',
      closed_lost: 'omitted',
    };

    const { event, input } = ctx;
    const previous = ctx.previous;

    // Recompute expected_revenue
    const amount =
      typeof input.amount === 'number'
        ? input.amount
        : typeof previous?.amount === 'number'
          ? (previous.amount as number)
          : undefined;
    const stage =
      typeof input.stage === 'string'
        ? input.stage
        : typeof previous?.stage === 'string'
          ? (previous.stage as string)
          : undefined;
    if (typeof amount === 'number' && stage && STAGE_PROBABILITY[stage] !== undefined) {
      input.expected_revenue = Math.round(amount * STAGE_PROBABILITY[stage]) / 100;
    }
    if (stage && STAGE_PROBABILITY[stage] !== undefined) {
      // Always sync probability with stage (single source of truth = stage).
      input.probability = STAGE_PROBABILITY[stage];
    }
    // Sync forecast_category with stage on insert and whenever stage changes.
    if (stage && STAGE_FORECAST[stage] !== undefined) {
      const stageChanged = event === 'beforeInsert' || (typeof input.stage === 'string' && input.stage !== previous?.stage);
      if (stageChanged) input.forecast_category = STAGE_FORECAST[stage];
    }

    if (event === 'beforeUpdate' && previous) {
      const prevStage = previous.stage as string | undefined;
      const isClosed = prevStage === 'closed_won' || prevStage === 'closed_lost';
      if (isClosed) {
        const violating = Object.keys(input).filter(
          (k) => !NARRATIVE_FIELDS.has(k) && input[k] !== previous[k],
        );
        if (violating.length > 0) {
          throw new Error(
            `Opportunity is closed (${prevStage}); only ${[...NARRATIVE_FIELDS].join(', ')} may be edited. Attempted: ${violating.join(', ')}.`,
          );
        }
      }

      // Stamp close_date when transitioning into closed_won
      if (input.stage === 'closed_won' && prevStage !== 'closed_won' && !input.close_date) {
        input.close_date = new Date().toISOString().slice(0, 10);
      }
    }
  },
};

const opportunityWonHook: Hook = {
  name: 'opportunity_promote_account',
  object: 'crm_opportunity',
  events: ['afterUpdate'],
  priority: 800,
  async: true,
  onError: 'log',
  description:
    'On closed_won: promote linked account to customer and create activation task.',
  handler: async (ctx: HookContext) => {
    const { input } = ctx;
    const previous = ctx.previous;
    const becameWon = input.stage === 'closed_won' && previous?.stage !== 'closed_won';
    if (!becameWon) return;
    const api = ctx.api as HookApi | undefined;
    if (!api) return;

    const accountId =
      (typeof input.crm_account === 'string' && input.crm_account) ||
      (typeof previous?.crm_account === 'string' && previous.crm_account) ||
      undefined;
    if (!accountId) return;

    const account = await api.object('crm_account').findOne({ filter: { id: accountId } });
    if (account && account.type !== 'customer') {
      await api.object('crm_account').update(accountId, { type: 'customer' });
    }

    const oppId = (typeof input.id === 'string' && input.id) || previous?.id;
    const ownerId =
      (typeof input.owner === 'string' && input.owner) ||
      (typeof previous?.owner === 'string' && previous.owner) ||
      ctx.user?.id;
    const due = new Date();
    due.setDate(due.getDate() + 3);
    await api.object('crm_task').insert({
      subject: `Activate new customer for opportunity ${oppId ?? ''}`.trim(),
      status: 'not_started',
      priority: 'high',
      type: 'follow_up',
      due_date: due.toISOString().slice(0, 10),
      owner: ownerId,
      related_to_type: 'crm_opportunity',
      related_to_opportunity: oppId,
      related_to_account: accountId,
    });
  },
};

/**
 * Opportunity activity-timeline hook.
 *
 * On every stage transition, write a *semantic* `sys_activity` row so the
 * record's unified timeline reads like a sales narrative ("Stage advanced to
 * Negotiation", "Deal won — Acme Renewal ($250000)") instead of the generic
 * "updated crm_opportunity" the audit writer emits. Win/loss is mirrored onto
 * the linked account's timeline too. Side-effect only: `async` + `onError:'log'`
 * so a timeline write can never block or fail the underlying update.
 */
const opportunityActivityHook: Hook = {
  name: 'opportunity_activity_timeline',
  object: 'crm_opportunity',
  events: ['afterUpdate'],
  priority: 850,
  async: true,
  onError: 'log',
  description: 'Write semantic activity-timeline rows on stage advance and win/loss.',
  handler: async (ctx: HookContext) => {
    const STAGE_LABELS: Record<string, string> = {
      prospecting: 'Prospecting',
      qualification: 'Qualification',
      needs_analysis: 'Needs Analysis',
      proposal: 'Proposal',
      negotiation: 'Negotiation',
      closed_won: 'Closed Won',
      closed_lost: 'Closed Lost',
    };

    const { input } = ctx;
    const previous = ctx.previous;
    const newStage = typeof input.stage === 'string' ? input.stage : undefined;
    if (!newStage || newStage === previous?.stage) return;

    const api = ctx.api as HookApi | undefined;
    if (!api) return;

    const oppId =
      (typeof input.id === 'string' && input.id) ||
      (typeof previous?.id === 'string' ? (previous.id as string) : undefined);
    if (!oppId) return;

    const label =
      (typeof input.name === 'string' && input.name) ||
      (typeof previous?.name === 'string' ? (previous.name as string) : oppId);
    const amount =
      typeof input.amount === 'number'
        ? input.amount
        : typeof previous?.amount === 'number'
          ? (previous.amount as number)
          : undefined;
    const accountId =
      (typeof input.crm_account === 'string' && input.crm_account) ||
      (typeof previous?.crm_account === 'string' && previous.crm_account) ||
      undefined;

    let type = 'updated';
    let kind = 'stage_change';
    let summary = `Stage advanced to ${STAGE_LABELS[newStage] ?? newStage} — ${label}`;
    if (newStage === 'closed_won') {
      type = 'completed';
      kind = 'deal_won';
      summary = `Deal won — ${label}${typeof amount === 'number' ? ` ($${amount})` : ''}`;
    } else if (newStage === 'closed_lost') {
      type = 'completed';
      kind = 'deal_lost';
      const reason = typeof input.loss_reason === 'string' ? input.loss_reason : undefined;
      summary = `Deal lost — ${label}${reason ? ` (${reason})` : ''}`;
    }

    const base = {
      type,
      summary,
      actor_id: ctx.user?.id ?? null,
      actor_name: ctx.user?.name ?? null,
      record_label: label,
      metadata: JSON.stringify({ kind, stage: newStage, amount: amount ?? null }),
    };

    await api.object('sys_activity').insert({
      ...base,
      object_name: 'crm_opportunity',
      record_id: oppId,
    });

    // Mirror win/loss onto the account timeline so the account narrative shows it.
    if ((newStage === 'closed_won' || newStage === 'closed_lost') && accountId) {
      await api.object('sys_activity').insert({
        ...base,
        object_name: 'crm_account',
        record_id: accountId,
      });
    }
  },
};

export default [opportunityValidationHook, opportunityWonHook, opportunityActivityHook];
