// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook, HookContext } from '@objectstack/spec/data';

/**
 * The approval decides (#2316 phase 1b): submitting starts an approval, which
 * writes Approved or Rejected when the approvers decide. A person who sets
 * either status is refused, so nobody approves spend by editing the record;
 * an administrator may, to repair an expense whose approval cannot run.
 *
 * What this hook no longer does (hotcrm#2556). It used to stamp the approver
 * from the project and refuse spend on a locked, Closed or Cancelled project.
 * This package knows nothing of projects, and Project Delivery may not attach
 * a hook to an object it does not own (ADR-0130 R4), so each approval stamps
 * its own approver when the expense is submitted, and Project Delivery keeps
 * an over project out of the project picker and turns its submission back in
 * its own flow (`src/psa/flows/submission-approval.flow.ts`).
 */
const expenseDecisionGuard: Hook = {
  name: 'expense_decision_guard',
  object: 'crm_expense',
  events: ['beforeInsert', 'beforeUpdate'],
  priority: 100,
  refusals: {
    FORBIDDEN: { message: 'An expense is approved or rejected by its approvers, from their Inbox, once it is submitted.', status: 403 },
  },
  description: 'Leave the decision on an expense to its approval: a person cannot set Approved or Rejected by hand.',
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
    const { input } = ctx;
    if (!input) return;
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
  },
};

export default [expenseDecisionGuard];
