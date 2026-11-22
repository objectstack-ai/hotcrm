// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook, HookContext } from '@objectstack/spec/data';
import type { HookApi } from '../../sales/objects/_hook-api';
import { createO2cRowStamp } from './_row-stamp';

/** The account stamp and Synced At — see `_row-stamp.ts`. */
const paymentRowStamp: Hook = createO2cRowStamp('crm_payment', 'payment_row_stamp');

/**
 * The plan step a payment counts toward, copied from its invoice (plan *The
 * data model*): a step's Received is a one-hop summary over payments that
 * point at it, so a payment made against an invoice must carry that invoice's
 * step too. Runs whenever a write sets the invoice; a payment with no invoice
 * keeps the step finance gave it (an advance paid before it is invoiced).
 *
 * It also refuses an invoice of another account — an import can name one,
 * where the form's picker cannot — since the payment would then count toward
 * one account's invoice and another account's figures (hotcrm#2557: the rows
 * belong to the account, so the account is what must match; before, the
 * contract).
 */
const paymentPlanStepStamp: Hook = {
  name: 'payment_plan_step_stamp',
  object: 'crm_payment',
  events: ['beforeInsert', 'beforeUpdate'],
  priority: 100,
  refusals: {
    VALIDATION_FAILED: {
      message: 'This invoice belongs to another account. Choose an invoice of this payment\'s account.',
      status: 400,
      params: ['invoice'],
      reasons: {
        named: { message: '{{invoice}} belongs to another account. Choose an invoice of this payment\'s account.' },
      },
    },
  },
  description: 'Copy the invoice\'s billing milestone onto the payment; refuse an invoice of another account.',
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
    const invoiceId = refId(input.crm_invoice);
    if (!invoiceId) return;

    const invoice = await api.object('crm_invoice').findOne({
      where: { id: invoiceId }, fields: ['id', 'invoice_number', 'crm_account', 'crm_billing_milestone'],
    });
    if (!invoice) return;
    // The account as `payment_row_stamp` (priority 50, before this hook) left
    // it: stamped from the contract when there is one.
    const accountId = ('crm_account' in input ? refId(input.crm_account) : '') || refId(ctx.previous?.crm_account);
    if (accountId && refId(invoice.crm_account) && refId(invoice.crm_account) !== accountId) {
      const number = typeof invoice.invoice_number === 'string' ? invoice.invoice_number : 'This invoice';
      throw Object.assign(refuse(
        `${number} belongs to another account. Choose an invoice of this payment's account.`,
        'VALIDATION_FAILED',
        400,
      ), typeof invoice.invoice_number === 'string' ? { reason: 'named', params: { invoice: invoice.invoice_number } } : {});
    }
    const stepId = refId(invoice.crm_billing_milestone);
    if (stepId) input.crm_billing_milestone = stepId;
  },
};

export default [paymentRowStamp, paymentPlanStepStamp];
