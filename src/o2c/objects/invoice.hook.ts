// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook, HookContext } from '@objectstack/spec/data';
import type { HookApi } from '../../sales/objects/_hook-api';
import { createO2cRowStamp } from './_row-stamp';

/** The account stamp and Synced At — see `_row-stamp.ts`. */
const invoiceRowStamp: Hook = createO2cRowStamp('crm_invoice', 'invoice_row_stamp');

/**
 * An invoice's own two derived figures, on every save:
 *
 *   - `due_date`, when it is empty: the issue date plus the contract's Payment
 *     Terms (`payment_terms` picklist: Net 15/30/60/90 days, Due on Receipt the
 *     same day). Finance may always write a due date outright; the hook only
 *     fills a gap.
 *   - `open_amount` = amount − paid, stored because the Overdue Invoices view
 *     filters on it (see the field). `paid_amount` is a summary the engine
 *     recomputes by an UPDATE of this invoice when a payment is written, so
 *     that update passes through here too and the open amount follows the
 *     payment. A cancelled invoice is open for nothing.
 */
const invoiceFigures: Hook = {
  name: 'invoice_figures',
  object: 'crm_invoice',
  events: ['beforeInsert', 'beforeUpdate'],
  priority: 100,
  description: 'Fill an empty Due Date from the contract\'s payment terms, and keep Open = Amount − Paid.',
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
      const contractId = refId(pick('crm_contract'));
      const contract = contractId
        ? await api.object('crm_contract').findOne({ where: { id: contractId }, fields: ['id', 'payment_terms'] })
        : null;
      const termDays: Record<string, number> = { net_15: 15, net_30: 30, net_60: 60, net_90: 90, due_on_receipt: 0 };
      const terms = typeof contract?.payment_terms === 'string' ? contract.payment_terms : '';
      if (terms in termDays) {
        const day = new Date(`${issueDate.slice(0, 10)}T00:00:00.000Z`);
        if (!Number.isNaN(day.getTime())) {
          day.setUTCDate(day.getUTCDate() + termDays[terms]);
          input.due_date = day.toISOString().slice(0, 10);
        }
      }
    }

    // Open amount — only when a figure it reads is part of this write.
    if ('amount' in input || 'paid_amount' in input || 'status' in input || ctx.event === 'beforeInsert') {
      const open = pick('status') === 'cancelled' ? 0 : num(pick('amount')) - num(pick('paid_amount'));
      input.open_amount = Math.round(open * 100) / 100;
    }
  },
};

export default [invoiceRowStamp, invoiceFigures];
