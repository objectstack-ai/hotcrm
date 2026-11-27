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
 * It also refuses an invoice or a plan step of another account, since the
 * payment would then count toward one account's invoice or step and another
 * account's figures (hotcrm#2557: the rows belong to the account, so the
 * account is what must match; before, the contract). The form's step picker
 * lists every account's steps since hotcrm#2755 (a picker filtered by the
 * account hid and then dropped the step the payment plan page's New
 * prefills), so this is the rule that keeps them apart, for the form as for
 * an import. The invoice is hidden since hotcrm#2806, so only an API write
 * names one now. Each is judged when the write sets it, and both when the
 * write moves the payment to another account.
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
      params: ['invoice', 'milestone'],
      reasons: {
        named: { message: '{{invoice}} belongs to another account. Choose an invoice of this payment\'s account.' },
        milestone_named: { message: '{{milestone}} belongs to another account. Choose a payment plan of this payment\'s account.' },
        invoice_milestone: { message: '{{invoice}} counts toward {{milestone}}, a payment plan of another account. Correct the invoice\'s payment plan, or choose another invoice.' },
      },
    },
  },
  description: 'Copy the invoice\'s payment plan onto the payment; refuse an invoice or a payment plan of another account.',
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
    const held = (key: string): string => refId(key in input ? input[key] : previous[key]);
    // The account as `payment_row_stamp` (priority 50, before this hook) left
    // it: stamped from the order or the contract when there is one.
    const accountId = ('crm_account' in input ? refId(input.crm_account) : '') || refId(previous.crm_account);
    // An insert has no previous account, so it reads as moved and both are
    // judged.
    const accountMoved = accountId !== refId(previous.crm_account);

    // The invoice that gave the payment its step in this write, when the step
    // is not one the write itself named: a step of another account is then
    // the invoice's fault, and the refusal names the invoice the user chose.
    let stepFromInvoice = '';
    const invoiceId = held('crm_invoice');
    if (invoiceId && ('crm_invoice' in input || accountMoved)) {
      const invoice = await api.object('crm_invoice').findOne({
        where: { id: invoiceId }, fields: ['id', 'invoice_number', 'crm_account', 'crm_billing_milestone'],
      });
      if (invoice) {
        if (accountId && refId(invoice.crm_account) && refId(invoice.crm_account) !== accountId) {
          const number = typeof invoice.invoice_number === 'string' ? invoice.invoice_number : 'This invoice';
          throw Object.assign(refuse(
            `${number} belongs to another account. Choose an invoice of this payment's account.`,
            'VALIDATION_FAILED',
            400,
          ), typeof invoice.invoice_number === 'string' ? { reason: 'named', params: { invoice: invoice.invoice_number } } : {});
        }
        const invoiceStep = refId(invoice.crm_billing_milestone);
        if (invoiceStep && 'crm_invoice' in input) {
          if (refId(input.crm_billing_milestone) !== invoiceStep) {
            stepFromInvoice = typeof invoice.invoice_number === 'string' && invoice.invoice_number !== ''
              ? invoice.invoice_number
              : 'This invoice';
          }
          input.crm_billing_milestone = invoiceStep;
        }
      }
    }

    // The step, the invoice's copy included: an invoice of this account whose
    // step is another account's is refused too, rather than counted there —
    // by the invoice when the step came from it, since the user chose the
    // invoice and not the step.
    const stepId = held('crm_billing_milestone');
    if (stepId && accountId && ('crm_billing_milestone' in input || accountMoved)) {
      const step = await api.object('crm_billing_milestone').findOne({
        where: { id: stepId }, fields: ['id', 'name', 'crm_account'],
      });
      if (step && refId(step.crm_account) && refId(step.crm_account) !== accountId) {
        const name = typeof step.name === 'string' && step.name !== '' ? step.name : 'This payment plan';
        if (stepFromInvoice) {
          throw Object.assign(refuse(
            `${stepFromInvoice} counts toward ${name}, a payment plan of another account. Correct the invoice's payment plan, or choose another invoice.`,
            'VALIDATION_FAILED',
            400,
          ), { reason: 'invoice_milestone', params: { invoice: stepFromInvoice, milestone: name } });
        }
        throw Object.assign(refuse(
          `${name} belongs to another account. Choose a payment plan of this payment's account.`,
          'VALIDATION_FAILED',
          400,
        ), { reason: 'milestone_named', params: { milestone: name } });
      }
    }
  },
};

export default [paymentRowStamp, paymentPlanStepStamp];
