// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook, HookContext } from '@objectstack/spec/data';
import type { HookApi } from './_hook-api';

/**
 * Opportunity lifecycle hook.
 *
 * - Re-derives `expected_revenue` from `amount * stageProbability` when either changes.
 * - Stamps `stage_entry_date` on insert and on every stage change — the stored
 *   clock behind the `days_in_stage` formula and the stagnation sweep (#489).
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
    // Framework-managed columns are re-stamped by the runtime itself (ownership
    // reassignment, audit timestamps) — including during post-seed ownership
    // assignment introduced in ObjectStack 9.x. The "freeze closed record" guard
    // must never reject these system writes, only user edits to business fields.
    // (Declared in-handler: sandboxed bodies have no module scope.)
    const SYSTEM_FIELDS = new Set([
      'id', 'owner_id', 'created_at', 'updated_at',
      'created_by', 'updated_by', 'space_id', 'organization_id', 'org_id', 'version',
    ]);
    // Approval verdicts must be allowed to land even if the deal closes while
    // the request is in flight — the opportunity_approval flow writes these
    // via the user-context resume, and rejecting them left the record locked
    // with a permanently pending approval.
    const APPROVAL_FIELDS = new Set(['approval_status', 'approved_date']);
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

    // Freeze closed opportunities — but guard ONLY genuine USER edits. A write
    // with no authenticated user (`ctx.user?.id` absent) is a system / seed /
    // backfill write and must pass: the seed's `close_date: daysAgo(15)`
    // re-evaluates to a new date on every reboot, so a re-seed legitimately
    // changes close_date on already-closed opps. Guarding those threw 23
    // boot-time BodyRunner errors AND blocked the seed from correcting
    // closed-won `probability` to 100 (#459). `ctx.user?.id` is this repo's
    // system-write signal (cf. case/lead/quote hooks) and matches the
    // SYSTEM_FIELDS intent above ("only user edits to business fields").
    // Still runs before the derived-field recompute below so a genuine user
    // edit is judged on the caller's own fields, not injected ones.
    if (event === 'beforeUpdate' && previous && ctx.user?.id) {
      const prevStage = previous.stage as string | undefined;
      const isClosed = prevStage === 'closed_won' || prevStage === 'closed_lost';
      if (isClosed) {
        const violating = Object.keys(input).filter(
          (k) => !NARRATIVE_FIELDS.has(k) && !SYSTEM_FIELDS.has(k) && !APPROVAL_FIELDS.has(k) && input[k] !== previous[k],
        );
        if (violating.length > 0) {
          throw new Error(
            `Opportunity is closed (${prevStage}); only ${[...NARRATIVE_FIELDS].join(', ')} may be edited. Attempted: ${violating.join(', ')}.`,
          );
        }
      }
    }

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

    // Start the stage-age clock at creation. Without this the row lands with a
    // null `stage_entry_date`, `days_in_stage` reads null instead of 0, and the
    // deal is invisible to the stagnation sweep until its first stage change —
    // exactly backwards, since a deal that never moves is the stalled one.
    if (event === 'beforeInsert' && !input.stage_entry_date) {
      input.stage_entry_date = new Date().toISOString().slice(0, 10);
    }

    if (event === 'beforeUpdate' && previous) {
      // Stamp close_date when transitioning into closed_won
      if (input.stage === 'closed_won' && previous.stage !== 'closed_won' && !input.close_date) {
        input.close_date = new Date().toISOString().slice(0, 10);
      }
      // Restart the stage-age clock on any stage change so a deal that
      // advances stops matching the stagnation sweep. `days_in_stage` is a
      // formula over this column, so this one write IS the reset — it used to
      // set `days_in_stage = 0` against a counter nothing ever incremented.
      // (Readonly fields are writable from before-hooks via input mutation:
      // readonly stripping only drops keys the CALLER supplied.)
      if (typeof input.stage === 'string' && input.stage !== previous.stage) {
        input.stage_entry_date = new Date().toISOString().slice(0, 10);
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

    const account = await api.object('crm_account').findOne({ where: { id: accountId } });
    if (account && account.type !== 'customer') {
      await api.object('crm_account').update(
        { id: accountId, type: 'customer' },
        { where: { id: accountId } },
      );
    }

    const oppId = (typeof input.id === 'string' && input.id) || previous?.id;
    const ownerId =
      (typeof input.owner_id === 'string' && input.owner_id) ||
      (typeof previous?.owner_id === 'string' && previous.owner_id) ||
      ctx.user?.id;
    const due = new Date();
    due.setDate(due.getDate() + 3);
    await api.object('crm_task').insert({
      subject: `Activate new customer for opportunity ${oppId ?? ''}`.trim(),
      status: 'not_started',
      priority: 'high',
      type: 'follow_up',
      due_date: due.toISOString().slice(0, 10),
      owner_id: ownerId,
      related_to_type: 'crm_opportunity',
      related_to_opportunity: oppId,
      related_to_account: accountId,
    });
  },
};


export default [opportunityValidationHook, opportunityWonHook];
