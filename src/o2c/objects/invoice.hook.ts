// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook, HookContext } from '@objectstack/spec/data';
import type { HookApi } from '../../sales/objects/_hook-api';
import { createO2cRowStamp } from './_row-stamp';

/** The account stamp and Synced At — see `_row-stamp.ts`. */
const invoiceRowStamp: Hook = createO2cRowStamp('crm_invoice', 'invoice_row_stamp');

/**
 * An invoice's own derived figures, on every save:
 *
 *   - `due_date`, when it is empty: the issue date plus the Payment Terms of
 *     the contract, or else of the order (hotcrm#2560; the shared
 *     `payment_terms` picklist: Net 15/30/60/90 days, Due on Receipt the same
 *     day). Finance may always write a due date outright; the hook only fills
 *     a gap. An invoice whose contract and order carry no terms, or that names
 *     neither (hotcrm#2557), has none to read, so its due date stays as typed.
 *     `invoice_row_stamp` (priority 50) has already filled the contract from
 *     the order or the step, so an order under a contract reads the
 *     contract's terms first.
 *   - `open_amount` = amount − paid, never below 0, stored because the Overdue
 *     Invoices view filters on it (see the field), and `overpaid_amount` = paid
 *     − amount when the payments exceed the invoice, else 0 (#2513).
 *     `paid_amount` is a summary the engine recomputes by an UPDATE of this
 *     invoice when a payment is written, so that update passes through here
 *     too and both figures follow the payment. A cancelled invoice is open
 *     for nothing and overpaid by nothing.
 */
const invoiceFigures: Hook = {
  name: 'invoice_figures',
  object: 'crm_invoice',
  events: ['beforeInsert', 'beforeUpdate'],
  priority: 100,
  description: 'Fill an empty Due Date from the payment terms of the contract, or else the order, and keep Open = Amount − Paid (never below 0) and Overpaid = the excess.',
  handler: async (ctx: HookContext) => {
    function refId(value: unknown): string {
      if (typeof value === 'string') return value;
      if (value && typeof value === 'object' && typeof (value as Record<string, unknown>).id === 'string') {
        return String((value as Record<string, unknown>).id);
      }
      return '';
    }
    const { input } = ctx;
    if (!input) return;
    const previous = (ctx.previous ?? {}) as Record<string, unknown>;
    const pick = (key: string): unknown => (key in input ? input[key] : previous[key]);
    const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

    // Due date — only where none is held.
    const dueDate = pick('due_date');
    const issueDate = pick('issue_date');
    const api = ctx.api as HookApi | undefined;
    if ((dueDate == null || dueDate === '') && typeof issueDate === 'string' && issueDate !== '' && api) {
      const termDays: Record<string, number> = { net_15: 15, net_30: 30, net_60: 60, net_90: 90, due_on_receipt: 0 };
      const termsOf = (row: Record<string, unknown> | null | undefined): string =>
        typeof row?.payment_terms === 'string' && row.payment_terms in termDays ? row.payment_terms : '';
      const contractId = refId(pick('crm_contract'));
      const contract = contractId
        ? await api.object('crm_contract').findOne({ where: { id: contractId }, fields: ['id', 'payment_terms'] })
        : null;
      let terms = termsOf(contract);
      const orderId = refId(pick('crm_sales_order'));
      if (!terms && orderId) {
        terms = termsOf(await api.object('crm_sales_order').findOne({ where: { id: orderId }, fields: ['id', 'payment_terms'] }));
      }
      if (terms) {
        const day = new Date(`${issueDate.slice(0, 10)}T00:00:00.000Z`);
        if (!Number.isNaN(day.getTime())) {
          day.setUTCDate(day.getUTCDate() + termDays[terms]);
          input.due_date = day.toISOString().slice(0, 10);
        }
      }
    }

    // Open and Overpaid — only when a figure they read is part of this write.
    // Payments above the amount are allowed (#2513): the invoice is then fully
    // paid, Open floors at 0 and the excess is Overpaid, so no receivable that
    // sums Open goes negative. A cancelled invoice leaves every figure.
    if ('amount' in input || 'paid_amount' in input || 'status' in input || ctx.event === 'beforeInsert') {
      const diff = pick('status') === 'cancelled' ? 0 : Math.round((num(pick('amount')) - num(pick('paid_amount'))) * 100) / 100;
      input.open_amount = diff > 0 ? diff : 0;
      input.overpaid_amount = diff < 0 ? -diff : 0;
    }
  },
};

/**
 * An invoice's plan step belongs to the invoice's account (hotcrm#2755). The
 * form's picker lists every account's steps since the lookup lost its
 * `dependsOn` (see the field), and an import or an API write could always name
 * any step, so this rule is what keeps an invoice from counting toward one
 * account's receivable and another account's plan.
 *
 * It judges a write that sets the step, or that moves the account under a step
 * the invoice keeps, and reads the account as `invoice_row_stamp` (priority
 * 50, before this hook) left it: stamped from the order or the contract when
 * there is one. The refusal names the step, which is what the user chose.
 */
const invoicePlanStepGuard: Hook = {
  name: 'invoice_plan_step_guard',
  object: 'crm_invoice',
  events: ['beforeInsert', 'beforeUpdate'],
  priority: 90,
  refusals: {
    VALIDATION_FAILED: {
      message: 'This payment plan belongs to another account. Choose a payment plan of this invoice\'s account.',
      status: 400,
      params: ['milestone'],
      reasons: {
        milestone_named: { message: '{{milestone}} belongs to another account. Choose a payment plan of this invoice\'s account.' },
      },
    },
  },
  description: 'Refuse an invoice whose payment plan belongs to another account.',
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
    const stepId = refId('crm_billing_milestone' in input ? input.crm_billing_milestone : previous.crm_billing_milestone);
    const accountId = ('crm_account' in input ? refId(input.crm_account) : '') || refId(previous.crm_account);
    if (!stepId || !accountId) return;
    // Only a write that can change the answer: the summary recompute and an
    // edit of the amount pass through here too.
    if (!('crm_billing_milestone' in input) && accountId === refId(previous.crm_account)) return;

    const step = await api.object('crm_billing_milestone').findOne({
      where: { id: stepId }, fields: ['id', 'name', 'crm_account'],
    });
    const owner = refId(step?.crm_account);
    if (!owner || owner === accountId) return;
    const named = typeof step?.name === 'string' && step.name !== '';
    const name = named ? String(step?.name) : 'This payment plan';
    throw Object.assign(refuse(
      `${name} belongs to another account. Choose a payment plan of this invoice's account.`,
      'VALIDATION_FAILED',
      400,
    ), named ? { reason: 'milestone_named', params: { milestone: name } } : {});
  },
};

export default [invoiceRowStamp, invoicePlanStepGuard, invoiceFigures];
