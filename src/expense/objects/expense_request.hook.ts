// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook, HookContext } from '@objectstack/spec/data';

/**
 * The approval decides a travel request (hotcrm#2578), as it decides an
 * expense report (`./expense_report.hook.ts`): submitting starts an approval, which writes
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

/**
 * Only a draft travel request is deleted (seat order 2026-11-17, no card). A
 * request that has been sent is a record of the trip: its approval, its
 * reports and the amounts they read hang off it. Calling a trip off is
 * Cancel Trip (`../actions/expense-request.actions.ts`), which keeps it; a
 * rejected request goes back to Draft to be corrected, and can be deleted
 * there.
 *
 * Before this a Closed request with a paid report deleted (200) and left the
 * report holding the deleted id (that dangling reference is the platform's,
 * objectstack#34899); an Approved request with a report in approval was
 * refused only by accident, naming the report. This rule stops the shipped
 * path before either.
 *
 * Judged on a person's delete; an administrator may, to repair, as on the
 * expense report (`./expense_report.hook.ts`).
 */
const expenseRequestDeleteGuard: Hook = {
  name: 'expense_request_delete_guard',
  object: 'crm_expense_request',
  events: ['beforeDelete'],
  priority: 100,
  refusals: {
    RECORD_LOCKED: {
      message: 'Only a draft travel request can be deleted. To call off an approved trip, use Cancel Trip.',
      status: 409,
      params: ['name'],
      reasons: {
        submitted: { message: 'Only a draft travel request can be deleted. Travel request {{name}} is waiting for approval; once it is approved, Cancel Trip calls it off.' },
        approved: { message: 'Only a draft travel request can be deleted. Travel request {{name}} is approved; to call the trip off, use Cancel Trip.' },
        rejected: { message: 'Only a draft travel request can be deleted. Travel request {{name}} was rejected; move it back to Draft to correct or delete it.' },
        cancelled: { message: 'Only a draft travel request can be deleted. Travel request {{name}} is cancelled, and stays on record.' },
        closed: { message: 'Only a draft travel request can be deleted. Travel request {{name}} is closed, and stays on record with its reports.' },
      },
    },
  },
  description: 'Let a person delete a travel request only while it is a draft; a sent request stays on record, and Cancel Trip calls an approved one off.',
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
    const person = Boolean(ctx.user?.id) && !ctx.session?.isSystem;
    if (!person) return;
    const ADMIN_IDENTITIES = ['platform_admin', 'org_owner', 'org_admin'];
    if (((ctx.session?.positions ?? []) as string[]).some((p) => ADMIN_IDENTITIES.includes(p))) return;
    const previous = (ctx.previous ?? {}) as Record<string, unknown>;
    const status = String(previous.status ?? 'draft');
    if (status === 'draft') return;
    const name = String(previous.name ?? '');
    const MESSAGES: Record<string, string> = {
      submitted: `Only a draft travel request can be deleted. Travel request ${name} is waiting for approval; once it is approved, Cancel Trip calls it off.`,
      approved: `Only a draft travel request can be deleted. Travel request ${name} is approved; to call the trip off, use Cancel Trip.`,
      rejected: `Only a draft travel request can be deleted. Travel request ${name} was rejected; move it back to Draft to correct or delete it.`,
      cancelled: `Only a draft travel request can be deleted. Travel request ${name} is cancelled, and stays on record.`,
      closed: `Only a draft travel request can be deleted. Travel request ${name} is closed, and stays on record with its reports.`,
    };
    const known = status in MESSAGES;
    throw Object.assign(refuse(
      known ? MESSAGES[status]! : 'Only a draft travel request can be deleted. To call off an approved trip, use Cancel Trip.',
      'RECORD_LOCKED',
      409,
    ), known ? { reason: status, params: { name } } : { params: { name } });
  },
};

export default [expenseRequestDecisionGuard, expenseRequestDeleteGuard];
