import type { Hook, HookContext } from '@objectstack/spec/data';

const ContractBillingHook: Hook = {
  name: 'ContractBillingAutomation',
  object: 'contract',
  events: ['afterUpdate'],
  handler: async (ctx: HookContext) => {
    const newDoc = ctx.result as Record<string, any>;
    const oldDoc = ctx.previous as Record<string, any> | undefined;

    // Trigger only when status changes to 'activated'
    if (newDoc.status === 'activated' && oldDoc?.status !== 'activated') {
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
            status: 'draft',
            due_date: dueDate.toISOString(), // Assuming ObjectQL handles Date types or ISO strings
            total_amount: newDoc.contract_value,
            payment_terms: 'net_30'
        };

        const invoice = await (ctx.ql as any).doc.create('invoice', invoiceData);
        
        // Create a single line item for the full contract value (since we don't have contract lines yet)
        await (ctx.ql as any).doc.create('invoice_line', {
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

export { ContractBillingHook };
export default [ContractBillingHook] as Hook[];
