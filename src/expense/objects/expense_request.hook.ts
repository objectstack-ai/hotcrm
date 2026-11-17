// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook, HookContext } from '@objectstack/spec/data';

/**
 * The approval decides a travel request (hotcrm#2578), as it decides an
 * expense (`./expense.hook.ts`): submitting starts an approval, which writes
 * Approved or Rejected when the approver decides. A person who sets either
 * status is refused, so nobody approves a trip by editing the record; an
 * administrator may, to repair a request whose approval cannot run.
 *
 * Cancelled and Closed are the traveler's own, one click each
 * (`../actions/expense-request.actions.ts`); the state machine on the object
 * allows them from Approved only.
 */
const expenseRequestDecisionGuard: Hook = {
  name: 'expense_request_decision_guard',
  object: 'crm_expense_request',
  events: ['beforeInsert', 'beforeUpdate'],
  priority: 100,
  refusals: {
    FORBIDDEN: { message: 'A travel request is approved or rejected by its approver, from their Inbox, once it is submitted.', status: 403 },
  },
  description: 'Leave the decision on a travel request to its approval: a person cannot set Approved or Rejected by hand.',
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
          'A travel request is approved or rejected by its approver, from their Inbox, once it is submitted.',
          'FORBIDDEN',
          403,
        );
      }
    }
  },
};

export default [expenseRequestDecisionGuard];
