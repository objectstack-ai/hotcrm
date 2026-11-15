// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook, HookContext } from '@objectstack/spec/data';

/**
 * Keep a project's Budget Status from its Budget Used % (#2316 phase 1b).
 *
 * On every save it works out spent ÷ Approved Budget from the values the save
 * carries over the stored ones, and writes `budget_status` when it changed:
 * Warning from BUDGET_WARNING_PERCENT, Exceeded from BUDGET_EXCEEDED_PERCENT
 * (`_thresholds.ts`; the body repeats both because it cannot import, and
 * `test/psa-approvals.test.ts` holds the copies equal). With no Approved
 * Budget there is nothing to measure against, so it is left empty.
 *
 * Measured on 18.4.0 in phase 1b: when an approval moves a timesheet or an
 * expense, the platform rewrites the project's `actual_labor_cost` /
 * `actual_expense_cost` summary through this same `beforeUpdate`, carrying the
 * new figure in `input`. So the signal moves in the very write that moves the
 * cost, and `project_budget_alert` sees it cross. `actual_cost` itself is a
 * formula and is not stored, which is why the parts are added here.
 *
 * Every write, a person's or the platform's: the signal is never a person's to
 * set, and `readonly` on the field keeps people from typing it.
 */
const projectBudgetStatus: Hook = {
  name: 'project_budget_status',
  object: 'crm_project',
  events: ['beforeInsert', 'beforeUpdate'],
  priority: 100,
  description: 'Keep the project\'s Budget Status from its spend against the Approved Budget.',
  handler: async (ctx: HookContext) => {
    const BUDGET_WARNING_PERCENT = 80;
    const BUDGET_EXCEEDED_PERCENT = 100;
    const input = ctx.input as Record<string, unknown> | undefined;
    if (!input) return;
    const previous = (ctx.previous ?? {}) as Record<string, unknown>;
    const amount = (key: string): number => {
      const value = key in input ? input[key] : previous[key];
      const n = typeof value === 'number' ? value : Number(value ?? 0);
      return Number.isFinite(n) ? n : 0;
    };
    const budget = amount('approved_budget');
    const spent = amount('actual_labor_cost') + amount('actual_expense_cost');
    let status: string | null = null;
    if (budget > 0) {
      const percent = (spent * 100) / budget;
      status = percent >= BUDGET_EXCEEDED_PERCENT ? 'exceeded' : percent >= BUDGET_WARNING_PERCENT ? 'warning' : 'on_track';
    }
    const held = previous.budget_status == null || previous.budget_status === '' ? null : String(previous.budget_status);
    if (ctx.event === 'beforeInsert' || status !== held) input.budget_status = status;
  },
};

/**
 * A project is approved or rejected only by its initiation approval
 * (`project_initiation_approval`), never by a person setting the status.
 *
 *   - A person's new project starts as Draft.
 *   - A person sends it for approval by setting In Approval, and only with an
 *     Approved Budget: the approval is of that figure.
 *   - Approved and Rejected are written by the approval when the approver
 *     decides. A person who sets either is refused, pointing to the Inbox.
 *
 * Judged only on a person's write (`ctx.user` present, not a system write):
 * the approval writes the decision as the platform, a seed or an import loads
 * rows in any state, and administrators are exempt so they can repair a
 * project whose approval cannot run. The order of statuses is the object's
 * `project_status_progression` state machine; this hook adds who may write
 * the two decisions.
 */
const projectStatusGuard: Hook = {
  name: 'project_status_guard',
  object: 'crm_project',
  events: ['beforeInsert', 'beforeUpdate'],
  priority: 90,
  description: 'Start a person\'s project as Draft, send it for approval only with a budget, and leave Approved and Rejected to the approval.',
  handler: async (ctx: HookContext) => {
    // The refusal envelope (#1075). Mirrored from `src/sales/objects/_refusal.ts` because a
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
    const input = ctx.input as Record<string, unknown> | undefined;
    if (!input || !ctx.user?.id || ctx.session?.isSystem) return;
    const ADMIN_IDENTITIES = ['platform_admin', 'org_owner', 'org_admin'];
    const positions = (ctx.session?.positions ?? []) as string[];
    if (positions.some((p) => ADMIN_IDENTITIES.includes(p))) return;
    const previous = (ctx.previous ?? {}) as Record<string, unknown>;

    if (ctx.event === 'beforeInsert') {
      if (input.status != null && input.status !== '' && input.status !== 'draft') {
        throw refuse(
          'A new project starts as Draft. Save it, then set In Approval to send it for approval.',
          'VALIDATION_FAILED',
          400,
        );
      }
      return;
    }

    if (!('status' in input) || input.status === previous.status) return;
    if (input.status === 'approved' || input.status === 'rejected') {
      throw refuse(
        'A project is approved or rejected by its approver, from their Inbox. Set In Approval to send it for approval.',
        'FORBIDDEN',
        403,
      );
    }
    if (input.status === 'in_approval') {
      const value = 'approved_budget' in input ? input.approved_budget : previous.approved_budget;
      const budget = typeof value === 'number' ? value : Number(value ?? 0);
      if (!Number.isFinite(budget) || budget <= 0) {
        throw refuse(
          'Set the Approved Budget before sending the project for approval: the approval is of that figure.',
          'VALIDATION_FAILED',
          400,
        );
      }
    }
  },
};

export default [projectBudgetStatus, projectStatusGuard];
