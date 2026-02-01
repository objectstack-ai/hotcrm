import type { Hook } from '@objectstack/spec/data';
import { db } from '../db';

const ContractBillingHook: Hook = {
  name: 'ContractBillingAutomation',
  object: 'contract',
  events: ['afterUpdate'],
  handler: async (ctx) => {
    const newDoc = ctx.new;
    const oldDoc = ctx.old;

    // Trigger only when status changes to 'Activated'
    if (newDoc.status === 'Activated' && oldDoc.status !== 'Activated') {
      console.log(`Starting Billing Process for Contract ${newDoc.contract_number}`);

      try {
        // Calculate Due Date (e.g., Net 30 from Start Date)
        const startDate = new Date(newDoc.start_date);
        const dueDate = new Date(startDate);
        dueDate.setDate(dueDate.getDate() + 30);

        // Create Invoice
        const invoiceData = {
            account: newDoc.account,
            contract: newDoc._id,
            status: 'Draft',
            due_date: dueDate.toISOString(), // Assuming ObjectQL handles Date types or ISO strings
            total_amount: newDoc.contract_value,
            payment_terms: 'Net 30'
        };

        const invoice = await db.insert('invoice', invoiceData);
        
        // Create a single line item for the full contract value (since we don't have contract lines yet)
        await db.insert('invoice_line', {
            invoice: invoice._id,
            description: `Contract ${newDoc.contract_number} Billing`,
            quantity: 1,
            unit_price: newDoc.contract_value,
            amount: newDoc.contract_value
        });

        console.log(`✅ Generated Invoice ${invoice.invoice_number} for Contract ${newDoc.contract_number}`);

      } catch (err) {
        console.error('❌ Billing Error:', err);
        // We might want to throw here to prevent contract activation if billing fails, 
        // but for now we just log it.
      }
    }
  }
};

export default [ContractBillingHook];
