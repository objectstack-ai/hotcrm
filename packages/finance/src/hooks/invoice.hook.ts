import type { Hook, HookContext } from '@objectstack/spec/data';

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['sent', 'cancelled'],
  sent: ['paid', 'overdue', 'cancelled'],
  overdue: ['paid', 'cancelled'],
  paid: [],
  cancelled: ['draft'],
};

const InvoiceStatusLifecycleTrigger: Hook = {
  name: 'InvoiceStatusLifecycleTrigger',
  object: 'invoice',
  events: ['beforeUpdate'],
  handler: async (ctx: HookContext) => {
    const doc = ctx.input.doc as Record<string, any>;
    const oldDoc = ctx.previous as Record<string, any> | undefined;

    if (!oldDoc || doc.status === oldDoc.status) return;

    try {
      const oldStatus = oldDoc.status as string;
      const newStatus = doc.status as string;
      const allowed = VALID_TRANSITIONS[oldStatus];

      if (!allowed || !allowed.includes(newStatus)) {
        throw new Error(`❌ Invalid invoice status transition: ${oldStatus} → ${newStatus}`);
      }

      if (newStatus === 'sent') {
        doc.sent_date = new Date().toISOString();
        console.log(`📧 Invoice ${oldDoc.invoice_number} sent — sent_date set`);
      }

      if (newStatus === 'overdue') {
        console.warn(`⚠️ Invoice ${oldDoc.invoice_number} is now overdue`);
      }

      console.log(`🔄 Invoice status transition: ${oldStatus} → ${newStatus}`);
    } catch (err) {
      console.error('❌ Invoice Status Lifecycle Error:', err);
    }
  }
};

const InvoiceLineCalculationTrigger: Hook = {
  name: 'InvoiceLineCalculationTrigger',
  object: 'invoice_line',
  events: ['beforeInsert', 'beforeUpdate'],
  handler: async (ctx: HookContext) => {
    const doc = ctx.input.doc as Record<string, any>;

    try {
      const quantity = doc.quantity || 0;
      const unitPrice = doc.unit_price || 0;
      const taxRate = doc.tax_rate || 0;

      const amount = quantity * unitPrice;
      const taxAmount = taxRate > 0 ? amount * taxRate / 100 : 0;
      const total = amount + taxAmount;

      doc.amount = amount;
      doc.tax_amount = taxAmount;
      doc.total = total;

      console.log(`💰 Invoice line calculated: qty=${quantity} × price=${unitPrice} = ${amount}, tax=${taxAmount}, total=${total}`);
    } catch (err) {
      console.error('❌ Invoice Line Calculation Error:', err);
    }
  }
};

export { InvoiceStatusLifecycleTrigger, InvoiceLineCalculationTrigger };
export default [InvoiceStatusLifecycleTrigger, InvoiceLineCalculationTrigger] as Hook[];
