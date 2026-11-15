// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook, HookContext } from '@objectstack/spec/data';
import type { HookApi } from '../../sales/objects/_hook-api';

/**
 * Stamp an expense's approver when it is created: the project's Project
 * Manager at that moment, as a timesheet's is (`timesheet.hook.ts`).
 * Read-only to people; the approval in phase 1b routes to it.
 *
 * Only the approver decides: a person's write that moves the status to
 * Approved or Rejected is refused unless the writer is the expense's approver
 * or an administrator, so nobody approves their own spend into the project's
 * cost. The approver edits the expense through the `expense_approver_edit`
 * share.
 */
const expenseApprover: Hook = {
  name: 'expense_approver',
  object: 'crm_expense',
  events: ['beforeInsert', 'beforeUpdate'],
  priority: 100,
  description: 'Stamp the project\'s Project Manager as the expense\'s approver, and let only the approver decide.',
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
    const status = input.status;
    if (ctx.user?.id && (status === 'approved' || status === 'rejected') && status !== previous.status) {
      const ADMIN_IDENTITIES = ['platform_admin', 'org_owner', 'org_admin'];
      const positions = (ctx.session?.positions ?? []) as string[];
      const approver = refId('approver' in input ? input.approver : previous.approver);
      if (approver !== ctx.user.id && !positions.some((p) => ADMIN_IDENTITIES.includes(p))) {
        throw refuse(
          approver
            ? 'Only the expense\'s approver (the project\'s Project Manager when it was created) can approve or reject it.'
            : 'This expense has no approver: its project had no Project Manager when it was created. An administrator can approve or reject it.',
          'FORBIDDEN',
          403,
        );
      }
    }
    if (ctx.event !== 'beforeInsert') return;
    const projectId = refId(input.crm_project);
    if (!projectId) return;
    const project = await api.object('crm_project').findOne({ where: { id: projectId }, fields: ['id', 'project_manager'] });
    const manager = refId(project?.project_manager);
    if (manager) input.approver = manager;
  },
};

export default [expenseApprover];
