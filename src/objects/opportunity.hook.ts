// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook, HookContext } from '@objectstack/spec/data';
import type { HookApi } from './_hook-api';

/**
 * Opportunity lifecycle hook.
 *
 * - Re-derives `expected_revenue` from `amount * stageProbability` when either changes.
 * - Stamps `stage_entry_date` on insert and on every stage change — the stored
 *   clock behind the `days_in_stage` formula and the stagnation sweep (#489).
 * - Freezes most fields after stage is closed (won/lost) — only narrative fields
 *   editable. The freeze yields to the engine's reference cleanup, so a closed
 *   deal never makes the records it points at undeletable (#720).
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
    // The refusal envelope (#1075). Mirrored from `./_refusal.ts` because a
    // lowered body has no module scope and `extractHookBody` THROWS on an
    // import; `test/refusal-envelope.test.ts` pins every copy against it.
    function refuse(message: string, code: string, status: number): Error {
      const err = new Error(message) as Error & { code: string; status: number };
      err.code = code;
      err.status = status;
      return err;
    }
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
    // Stage → forecast category.
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
          // Every lookup on `crm_opportunity` a referential clear can attack.
          const REFERENCE_FIELDS = new Set(['crm_account', 'primary_contact', 'crm_campaign']);
          // ───────────────────────────────────── the reference-cleanup yield ──
          // #720. The engine implements `deleteBehavior: 'set_null'` by UPDATING
          // the row that HOLDS the lookup, so deleting a contact or a campaign a
          // CLOSED opportunity references arrives here as an ordinary user
          // `beforeUpdate` — and this freeze refused it, which made the frozen
          // opportunity able to keep a person undeletable forever (and, through
          // the master-detail cascade, that person's account too — a GDPR
          // erasure that cannot be carried out).
          //
          // Measured on 17.1.0 — the version this repo pinned AT THE TIME of
          // the measurement, not the current pin (#1416: this repo has pinned
          // 17.2.0 since PR #1442, and the cascade shape below has NOT been
          // re-measured on it) — with a probe hook at priority 199 immediately
          // ahead of each guard, not assumed.
          // The engine builds its cleanup write on the CALLER's own context
          // plus two engine keys, so on the path a REST `DELETE` takes, the
          // cascade and a user's hand-clear of the same lookup are identical
          // everywhere a guard can look: payload
          // `{ id, <link>: null, updated_at, updated_by }`, `ctx.user` the
          // CALLER, `ctx.session` the caller's own `{ userId, isSystem }`.
          // (Both `updated_by` and the identity drop out together when the
          // DELETE itself carried no `userId` — a rig artefact, not this app's
          // path.) So the WRITE SHAPE is not a discriminator, and the yield
          // below is not one either: it lets ANY caller clear a declared link
          // on a settled record. That is the trade #720 accepted, not a side
          // effect of it.
          //
          // ⚠️ A marker DOES reach a hook — and is deliberately not read. An
          // earlier version of this note concluded "no marker reaches a hook,
          // and the WRITE SHAPE is the only evidence there is"; it reasoned
          // only about `ctx.session`, whose allow-list really does omit
          // `__`-prefixed operation-private keys, and missed the other route
          // into the context. `ObjectQL.cascadeDeleteRelations` builds
          // `{ ...context, __referentialFieldClear: true }`, readable at
          // `ctx.api.executionContext.__referentialFieldClear`: measured `true`
          // on every cascade into `crm_opportunity`, `crm_quote` and
          // `crm_lead`, `undefined` on every hand-clear (#1165, #1412).
          //
          // ⛔ The #1165 ruling (2026-08-25) reviewed that and upheld NOT
          // reading it, on two grounds. It is an operation-private key — an
          // undeclared dependency that can vanish in a patch release. And
          // reachability through the SHIPPED path is unproven: a hook body runs
          // body-only in QuickJS, where `buildSandboxApi` passes `engineCtx.api`
          // only when that exposes `object()`, and otherwise a shim with no
          // `executionContext` at all. Green in a kernel rig and silently false
          // in production is the worst outcome a guard can have. The declared
          // replacement `ctx.referentialFieldClear` is asked for upstream as
          // objectstack-ai/objectstack#13644.
          //
          // ⛔ Keep this narrow (maintainer's ruling on #720, Option A): a write
          // yields ONLY when every one of its non-system changes is a DECLARED
          // link going from a value to `null`. One business field alongside it,
          // or a link repointed to a NEW value, and the refusal below still
          // fires. The three freeze guards share this block verbatim — sharing
          // it as an imported helper is not possible (hook bodies run body-only
          // in the sandbox and cannot reach module scope), so
          // `test/freeze-guard-reference-cleanup.test.ts` pins the three copies
          // as identical text and pins both directions of the narrowness.
          const isReferenceCleanup = violating.every(
            (k) => REFERENCE_FIELDS.has(k) && input[k] === null && previous?.[k] != null,
          );
          if (isReferenceCleanup) return;

          // `crm_opportunity.nameField` IS `name`, so the name on its own is
          // exactly how every other surface titles this record. ⛔ Never append
          // the record id — it matches none of them.
          const name = typeof previous.name === 'string' ? previous.name.trim() : '';
          const subject = name ? `Opportunity ${name}` : 'Opportunity';
          throw refuse(
            `${subject} is closed (${prevStage}); only ${[...NARRATIVE_FIELDS].join(', ')} may be edited. Attempted: ${violating.join(', ')}.`,
            'RECORD_LOCKED',
            409,
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

    // Title the task with the opportunity's NAME (#1243). This is one of the
    // two rows a walkthrough of current main still writes with a raw key in it,
    // and it lands in **All Tasks** next to the escalation rows #1208 already
    // fixed. `crm_opportunity.name` is required + notNull, so the bare fallback
    // is a shape the schema does not permit rather than an expected case — it
    // exists so a pre-image that arrived without the column still produces a
    // sentence instead of a dangling one. The 255 cap is the same one
    // `case.hook.ts` documents: `crm_task.subject` enforces it, and this hook is
    // `async: true` + `onError: 'log'`, so a rejected insert would surface
    // nowhere at all.
    const oppName =
      (typeof input.name === 'string' && input.name.trim()) ||
      (typeof previous?.name === 'string' && previous.name.trim()) ||
      '';
    const titled = oppName
      ? `Activate new customer for opportunity ${oppName}`
      : 'Activate new customer';
    await api.object('crm_task').insert({
      subject: titled.length > 255 ? `${titled.slice(0, 254)}…` : titled,
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
