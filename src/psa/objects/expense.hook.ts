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
 */
const expenseApprover: Hook = {
  name: 'expense_approver',
  object: 'crm_expense',
  events: ['beforeInsert', 'beforeUpdate'],
  priority: 100,
  description: 'Stamp the project\'s Project Manager as the expense\'s approver, leave the decision to the approval, and refuse a submission on a locked project.',
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
    if (ctx.event !== 'beforeInsert' && !submitting) return;
    const projectId = refId('crm_project' in input ? input.crm_project : previous.crm_project);
    if (!projectId) return;
    const project = await api.object('crm_project').findOne({
      where: { id: projectId },
      fields: ['id', 'name', 'project_manager', 'time_entry_locked'],
    });
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
