import type { Hook, HookContext } from '@objectstack/spec/data';

import { createLogger } from '@hotcrm/core';
const logger = createLogger('finance:credit_note');

const CreditNoteValidationTrigger: Hook = {
  name: 'CreditNoteValidationTrigger',
  object: 'credit_note',
  events: ['beforeInsert', 'beforeUpdate'],
  handler: async (ctx: HookContext) => {
    const doc = ctx.input.doc as Record<string, any>;

    try {
      if (!doc.amount || doc.amount <= 0) {
        throw new Error('Credit note amount must be greater than 0');
      }

      const amount = doc.amount || 0;
      const taxAmount = doc.tax_amount || 0;

      // Calculate total amount
      doc.total_amount = amount + taxAmount;

      // Initialize remaining balance on insert
      if (ctx.input.doc && !doc.remaining_balance && doc.remaining_balance !== 0) {
        doc.remaining_balance = doc.total_amount;
      }

      // Validate remaining balance does not exceed total
      if (doc.remaining_balance !== undefined && doc.remaining_balance > doc.total_amount) {
        throw new Error('Remaining balance cannot exceed total amount');
      }

      logger.info(`Credit note validated: amount=${amount}, tax=${taxAmount}, total=${doc.total_amount}, remaining=${doc.remaining_balance}`);
    } catch (err) {
      logger.error('Credit Note Validation Error:', err);
    }
  }
};

const CreditNoteBalanceAdjustmentTrigger: Hook = {
  name: 'CreditNoteBalanceAdjustmentTrigger',
  object: 'credit_note',
  events: ['afterUpdate'],
  handler: async (ctx: HookContext) => {
    const creditNote = ctx.result as Record<string, any>;
    const oldDoc = ctx.previous as Record<string, any> | undefined;

    if (!oldDoc || creditNote.status === oldDoc.status) return;
    if (creditNote.status !== 'applied') return;

    // Guard: skip if remaining_balance is already 0 to prevent recursive triggers
    if (creditNote.remaining_balance === 0) return;

    try {
      // Update remaining balance to 0 when fully applied
      await (ctx.ql as any).doc.update('credit_note', creditNote._id, {
        remaining_balance: 0
      });

      // Update the linked invoice balance if applied_to_invoice_id is set
      if (creditNote.applied_to_invoice_id) {
        const invoices = await (ctx.ql as any).find('invoice', {
          filters: [['_id', '=', creditNote.applied_to_invoice_id]]
        });

        if (invoices && invoices.length > 0) {
          const invoice = invoices[0];
          const newPaidAmount = (invoice.paid_amount || 0) + (creditNote.total_amount || 0);

          await (ctx.ql as any).doc.update('invoice', invoice._id, {
            paid_amount: newPaidAmount
          });

          logger.info(`Credit note ${creditNote.credit_note_number} applied to invoice ${invoice.invoice_number}: credited ${creditNote.total_amount}`);
        }
      }

      logger.info(`Credit note ${creditNote.credit_note_number} status changed to applied`);
    } catch (err) {
      logger.error('Credit Note Balance Adjustment Error:', err);
    }
  }
};

export { CreditNoteValidationTrigger, CreditNoteBalanceAdjustmentTrigger };
export default [CreditNoteValidationTrigger, CreditNoteBalanceAdjustmentTrigger] as Hook[];
