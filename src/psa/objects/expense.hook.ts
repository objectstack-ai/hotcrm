// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook, HookContext } from '@objectstack/spec/data';
import type { HookApi } from '../../sales/objects/_hook-api';

/**
 * Stamp an expense's approver when it is created: the project's Project
 * Manager at that moment, as a timesheet's is (`timesheet.hook.ts`).
 * Read-only to people; `expense_approval` asks them first.
 *
 * The approval decides (#2316 phase 1b): submitting starts `expense_approval`,
 * which writes Approved or Rejected when the approvers decide. A person who
 * sets either status is refused, so nobody approves spend into the project's
 * cost by editing the record; an administrator may, to repair an expense
 * whose approval cannot run.
 *
 * A locked project takes no submissions: moving an expense to Submitted on a
 * project whose Lock Time and Expenses is ticked is refused, naming the
 * project. Drafts are never refused, and nobody is exempt.
 *
 * A project that is over takes no spend (hotcrm#2491): on a Closed or
 * Cancelled project, a person cannot create an expense, move one onto it, or
 * submit one, and the refusal names the project and its status. A draft
 * already there stays readable and editable, and can be moved to an open
 * project; only its submission is refused. Completed stays open for late
 * claims, as a timesheet's does (`timesheet.hook.ts`). Judged on a person's
 * write, administrators included.
 */
const expenseApprover: Hook = {
  name: 'expense_approver',
  object: 'crm_expense',
  events: ['beforeInsert', 'beforeUpdate'],
  priority: 100,
  description: 'Stamp the project\'s Project Manager as the expense\'s approver, leave the decision to the approval, refuse a submission on a locked project, and take no expense onto a Closed or Cancelled project.',
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
    function refId(value: unknown): string {
      if (typeof value === 'string') return value;
      if (value && typeof value === 'object' && typeof (value as Record<string, unknown>).id === 'string') {
        return String((value as Record<string, unknown>).id);
      }
      return '';
    }
    const { input } = ctx;
    const api = ctx.api as HookApi | undefined;
    if (!input || !api) return;
    const previous = (ctx.previous ?? {}) as Record<string, unknown>;
    const person = Boolean(ctx.user?.id) && !ctx.session?.isSystem;
    const status = input.status;
    if (person && (status === 'approved' || status === 'rejected') && status !== previous.status) {
      const ADMIN_IDENTITIES = ['platform_admin', 'org_owner', 'org_admin'];
      const positions = (ctx.session?.positions ?? []) as string[];
      if (!positions.some((p) => ADMIN_IDENTITIES.includes(p))) {
        throw refuse(
          'An expense is approved or rejected by its approvers, from their Inbox, once it is submitted.',
          'FORBIDDEN',
          403,
        );
      }
    }
    const submitting = person && status === 'submitted' && previous.status !== 'submitted';
    const projectId = refId('crm_project' in input ? input.crm_project : previous.crm_project);
    const moving = ctx.event === 'beforeUpdate' && 'crm_project' in input && projectId !== refId(previous.crm_project);
    if (ctx.event !== 'beforeInsert' && !submitting && !moving) return;
    if (!projectId) return;
    const project = await api.object('crm_project').findOne({
      where: { id: projectId },
      fields: ['id', 'name', 'status', 'project_manager', 'time_entry_locked'],
    });
    // The statuses of a project that is over, as the console labels them.
    const PROJECT_OVER: Record<string, string> = { closed: 'Closed', cancelled: 'Cancelled' };
    const over = person && project && typeof project.status === 'string' ? PROJECT_OVER[project.status] : undefined;
    if (over) {
      const projectName = String(project?.name ?? 'This project');
      throw refuse(
        ctx.event === 'beforeInsert' || moving
          ? `${projectName} is ${over}, so it takes no new expenses. Record the expense on an open project.`
          : `${projectName} is ${over}, so this expense cannot be submitted. Keep it as a draft, or move it to an open project.`,
        'RECORD_LOCKED',
        409,
      );
    }
    if (submitting && project && project.time_entry_locked === true) {
      throw refuse(
        `${String(project.name ?? 'This project')} is locked for time and expenses, so this expense cannot be submitted. Keep it as a draft, or ask the project manager to untick Lock Time and Expenses on the project.`,
        'RECORD_LOCKED',
        409,
      );
    }
    if (ctx.event !== 'beforeInsert') return;
    const manager = refId(project?.project_manager);
    if (manager) input.approver = manager;
  },
};

export default [expenseApprover];
