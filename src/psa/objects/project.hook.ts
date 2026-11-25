// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook, HookContext } from '@objectstack/spec/data';
import type { HookApi } from '../../sales/objects/_hook-api';

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
 *   - A person sends it for approval by setting In Approval, and only with a
 *     budget ready to approve (hotcrm#2547): its open budget version (version
 *     1 for a new project) has lines, a total above zero, and every line
 *     complete (a labor line its rate card and hours, any other its
 *     quantity). The approval is of that budget, which rides along
 *     (`project_budget_follow`). A project that already has a baseline and
 *     no open version goes as it is.
 *   - Approved and Rejected are written by the approval when the approver
 *     decides. A person who sets either is refused, pointing to the Inbox.
 *   - The Approved Budget is not typed: it is the baseline version's total,
 *     and a new figure is a top-up version with its own approval, which
 *     finance signs above the threshold.
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
  refusals: {
    VALIDATION_FAILED: {
      message: 'This project change is not allowed.',
      status: 400,
      params: ['line'],
      reasons: {
        starts_as_draft: { message: 'A new project starts as Draft. Save it, then set In Approval to send it for approval.' },
        budget_required: { message: 'Add the project\'s budget (version 1, with its lines) before sending it for approval: the approval is of that budget.' },
        budget_no_lines: { message: 'The budget is not ready to approve: it has no lines. Complete it, then send the project for approval.' },
        budget_labor_no_rate_card: { message: 'The budget is not ready to approve: the labor line "{{line}}" names no rate card. Complete it, then send the project for approval.' },
        budget_labor_no_hours: { message: 'The budget is not ready to approve: the labor line "{{line}}" has no hours. Complete it, then send the project for approval.' },
        budget_line_no_quantity: { message: 'The budget is not ready to approve: the line "{{line}}" has no quantity. Complete it, then send the project for approval.' },
        budget_total_zero: { message: 'The budget is not ready to approve: its total is zero. Complete it, then send the project for approval.' },
      },
    },
    FORBIDDEN: {
      message: 'You cannot make this project change.',
      status: 403,
      reasons: {
        decided_by_approver: { message: 'A project is approved or rejected by its approver, from their Inbox. Set In Approval to send it for approval.' },
      },
    },
  },
  description: 'Start a person\'s project as Draft, send it for approval only with a budget ready to approve, and leave Approved and Rejected to the approval.',
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
        throw Object.assign(refuse(
          'A new project starts as Draft. Save it, then set In Approval to send it for approval.',
          'VALIDATION_FAILED',
          400,
        ), { reason: 'starts_as_draft' });
      }
      return;
    }

    if (!('status' in input) || input.status === previous.status) return;
    if (input.status === 'approved' || input.status === 'rejected') {
      throw Object.assign(refuse(
        'A project is approved or rejected by its approver, from their Inbox. Set In Approval to send it for approval.',
        'FORBIDDEN',
        403,
      ), { reason: 'decided_by_approver' });
    }
    if (input.status === 'in_approval') {
      const api = ctx.api as HookApi | undefined;
      if (!api) return;
      const projectId = String(previous.id ?? '');
      const versions = projectId
        ? await api.object('crm_project_budget').find({
          where: { crm_project: projectId },
          fields: ['id', 'version', 'status', 'total_cost'],
          top: 200,
        })
        : [];
      const open = versions.find((v) => v.status === 'draft' || v.status === 'rejected');
      if (!open) {
        const baseline = Number(previous.approved_budget ?? 0);
        if (Number.isFinite(baseline) && baseline > 0) return;
        throw Object.assign(refuse(
          'Add the project\'s budget (version 1, with its lines) before sending it for approval: the approval is of that budget.',
          'VALIDATION_FAILED',
          400,
        ), { reason: 'budget_required' });
      }
      // The same readiness `project_budget_rules` asks of a top-up; a body
      // cannot import, so the two copies are pinned by
      // `test/psa-budget-versions.test.ts`.
      const lines = await api.object('crm_project_budget_line').find({
        where: { crm_project_budget: open.id },
        fields: ['id', 'category', 'description', 'rate_card', 'hours', 'quantity', 'amount'],
        top: 500,
      });
      const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v ?? 0) || 0);
      // Each way a budget is not ready is its own reason, so a locale pack holds
      // one whole sentence per case and the line's description is the only thing
      // filled in (hotcrm#2766).
      const notReady = (problem: string, detail: { reason: string; params?: { line: string } }): Error =>
        Object.assign(refuse(`The budget is not ready to approve: ${problem} Complete it, then send the project for approval.`, 'VALIDATION_FAILED', 400), detail);
      if (lines.length === 0) throw notReady('it has no lines.', { reason: 'budget_no_lines' });
      for (const line of lines) {
        const params = { line: String(line.description ?? '') };
        if (line.category === 'labor') {
          if (!line.rate_card) throw notReady(`the labor line "${params.line}" names no rate card.`, { reason: 'budget_labor_no_rate_card', params });
          if (num(line.hours) <= 0) throw notReady(`the labor line "${params.line}" has no hours.`, { reason: 'budget_labor_no_hours', params });
        } else if (num(line.quantity) <= 0) {
          throw notReady(`the line "${params.line}" has no quantity.`, { reason: 'budget_line_no_quantity', params });
        }
      }
      if (lines.reduce((sum, line) => sum + num(line.amount), 0) <= 0) throw notReady('its total is zero.', { reason: 'budget_total_zero' });
    }
  },
};

/**
 * Version 1 of the budget rides on the project's initiation approval
 * (hotcrm#2547, seat ruling A).
 *
 *   - The project goes In Approval: its open budget version goes In Approval
 *     with it, marked Approved With the Project (`with_initiation`).
 *   - The project is Approved: that version is Approved, and
 *     `project_budget_baseline` makes it the baseline, so the project's
 *     Approved Budget becomes its total.
 *   - The project is Rejected or recalled to Draft: the version goes back to
 *     Draft, to be corrected and sent again with the project.
 *
 * `runAs: 'system'`: the approval holds the project locked and writes its
 * status as the platform, and the version's status is never a person's to
 * set. Every read is keyed to the project (rule 10).
 */
const projectBudgetFollow: Hook = {
  name: 'project_budget_follow',
  object: 'crm_project',
  events: ['afterUpdate'],
  priority: 100,
  runAs: 'system',
  description: 'Send the project\'s open budget version for approval with the project, approve it with the project, and return it to Draft when the project is rejected or recalled.',
  handler: async (ctx: HookContext) => {
    const api = ctx.api as HookApi | undefined;
    const input = (ctx.input ?? {}) as Record<string, unknown>;
    const previous = (ctx.previous ?? {}) as Record<string, unknown>;
    if (!api || !('status' in input) || input.status === previous.status) return;
    const projectId = String(previous.id ?? input.id ?? '');
    if (!projectId) return;
    const versions = await api.object('crm_project_budget').find({
      where: { crm_project: projectId },
      fields: ['id', 'status', 'with_initiation'],
      top: 200,
    });
    const update = (id: unknown, fields: Record<string, unknown>) =>
      api.object('crm_project_budget').update({ id: String(id), ...fields }, { where: { id: String(id) } });
    if (input.status === 'in_approval') {
      const open = versions.find((v) => v.status === 'draft' || v.status === 'rejected');
      if (!open) return;
      if (open.status === 'rejected') await update(open.id, { status: 'draft' });
      await update(open.id, { status: 'in_approval', with_initiation: true });
      return;
    }
    if (previous.status !== 'in_approval') return;
    const riding = versions.find((v) => v.status === 'in_approval' && v.with_initiation === true);
    if (!riding) return;
    if (input.status === 'approved') await update(riding.id, { status: 'approved' });
    else await update(riding.id, { status: 'draft', with_initiation: false });
  },
};

export default [projectBudgetStatus, projectStatusGuard, projectBudgetFollow];
