// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook, HookContext } from '@objectstack/spec/data';
import type { HookApi } from '../../sales/objects/_hook-api';

/**
 * The legs of a travel request (hotcrm#2579, F3b).
 *
 * - `expense_request_line_lock` — a leg cannot be added to, removed from or
 *   moved off or onto a request that is Submitted, Approved, Cancelled or
 *   Closed. The values of a
 *   leg that is already there are held by their own `parent`-scoped
 *   `readonlyWhen` (`./expense_request_line.object.ts`), which leaves the
 *   booking reference open; adding or removing a whole leg is a change of
 *   plan that no field lock can see, so it is judged here.
 * - `expense_request_line_number` — `line_number`, as on the order line.
 */
const expenseRequestLineLock: Hook = {
  name: 'expense_request_line_lock',
  object: 'crm_expense_request_line',
  events: ['beforeInsert', 'beforeUpdate', 'beforeDelete'],
  priority: 90,
  description: "Hold a travel request's legs once it is submitted: only the booking reference can still be written.",
  refusals: {
    RECORD_LOCKED: {
      message: 'Travel request {{request}} is Submitted, so its legs are held: only a Booking Reference can still be written. Recall it to Draft to change them.',
      status: 409,
      params: ['request'],
      reasons: {
        approved: { message: 'Travel request {{request}} is Approved, so its legs are fixed: only a Booking Reference can still be written. To change the plan, cancel it and file a new request.' },
        cancelled: { message: 'Travel request {{request}} is Cancelled, so its legs are fixed: only a Booking Reference can still be written.' },
        closed: { message: 'Travel request {{request}} is Closed, so its legs are fixed: only a Booking Reference can still be written.' },
      },
    },
  },
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
    // USER writes only: a seed or an import carries no user. The engine's
    // cascade delete (the request going) carries `referentialCascadeDelete`.
    if (!ctx.user?.id || ctx.session?.isSystem) return;
    if (ctx.event === 'beforeDelete' && ctx.referentialCascadeDelete === true) return;
    // An insert is judged on the request it lands on, a delete on the one it
    // leaves, and a move between requests on both: a leg moved off an approved
    // request changes that plan as surely as a deleted one. An update that
    // keeps its request is judged when it changes a planned value; a write of
    // the booking reference alone, or of nothing new, passes. Empty and absent
    // read alike, and a date is compared by its day, so a form that sends the
    // whole leg back unchanged is not a change.
    const landing = ctx.input?.crm_expense_request as unknown;
    const leaving = ctx.previous?.crm_expense_request as unknown;
    const moved = ctx.event === 'beforeUpdate' && landing !== undefined && landing !== leaving;
    if (ctx.event === 'beforeUpdate' && !moved) {
      const PLANNED = ['kind', 'origin', 'destination', 'start_date', 'end_date', 'details'];
      const norm = (v: unknown): string => (v === null || v === undefined || v === '' ? '' : String(v).slice(0, /^\d{4}-\d{2}-\d{2}T/.test(String(v)) ? 10 : undefined));
      const input = (ctx.input ?? {}) as Record<string, unknown>;
      const previous = (ctx.previous ?? {}) as Record<string, unknown>;
      if (!PLANNED.some((k) => k in input && norm(input[k]) !== norm(previous[k]))) return;
    }
    const ids = ctx.event === 'beforeInsert' ? [landing] : ctx.event === 'beforeDelete' ? [leaving] : moved ? [landing, leaving] : [leaving];
    const LABELS: Record<string, string> = { submitted: 'Submitted', approved: 'Approved', cancelled: 'Cancelled', closed: 'Closed' };
    const sentence: Record<string, string> = {
      submitted: 'so its legs are held: only a Booking Reference can still be written. Recall it to Draft to change them.',
      approved: 'so its legs are fixed: only a Booking Reference can still be written. To change the plan, cancel it and file a new request.',
      cancelled: 'so its legs are fixed: only a Booking Reference can still be written.',
      closed: 'so its legs are fixed: only a Booking Reference can still be written.',
    };
    for (const id of ids) {
      if (typeof id !== 'string' || !id) continue;
      const request = await (ctx.api as HookApi | undefined)?.object('crm_expense_request')
        .findOne({ where: { id }, fields: ['request_number', 'status'] });
      const status = typeof request?.status === 'string' ? request.status : '';
      if (!LABELS[status]) continue;
      const name = String(request?.request_number ?? '');
      const message = `Travel request ${name} is ${LABELS[status]}, ${sentence[status]}`;
      throw Object.assign(refuse(message, 'RECORD_LOCKED', 409), {
        reason: status === 'submitted' ? undefined : status,
        params: { request: name },
      });
    }
  },
};

/** `line_number` = (max under the request) + 1, as on the order line. */
const expenseRequestLineNumber: Hook = {
  name: 'expense_request_line_number',
  object: 'crm_expense_request_line',
  events: ['beforeInsert'],
  priority: 110,
  runAs: 'system',
  description: 'Assign line_number = (max under the travel request) + 1.',
  handler: async (ctx: HookContext) => {
    const { input } = ctx;
    const api = ctx.api as HookApi | undefined;
    if (!api || !input) return;
    if (!ctx.user?.id && typeof input.line_number === 'number') return;
    const requestId = input.crm_expense_request;
    if (typeof requestId !== 'string' || !requestId) return;
    const siblings = await api.object('crm_expense_request_line').find({
      where: { crm_expense_request: requestId }, fields: ['line_number'], top: 5000,
    });
    let max = 0;
    for (const s of siblings) {
      if (typeof s.line_number === 'number' && s.line_number > max) max = s.line_number;
    }
    // A batch insert runs every row's beforeInsert before storing any row.
    const offset = ctx.dispatch?.mode === 'per-row' ? ctx.dispatch.index : 0;
    input.line_number = max + 1 + offset;
  },
};

export default [expenseRequestLineLock, expenseRequestLineNumber];
