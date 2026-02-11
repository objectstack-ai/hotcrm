import type { Hook, HookContext } from '@objectstack/spec/data';

const QuoteLineCalculationTrigger: Hook = {
  name: 'QuoteLineCalculationTrigger',
  object: 'quote_line_item',
  events: ['beforeInsert', 'beforeUpdate'],
  handler: async (ctx: HookContext) => {
    const doc = ctx.input.doc as Record<string, any>;

    try {
      const quantity = doc.quantity || 0;
      const unitPrice = doc.unit_price || 0;
      const discountPercent = doc.discount_percent || 0;
      const taxRate = doc.tax_rate || 0;

      const lineTotal = quantity * unitPrice;
      const discountAmount = lineTotal * (discountPercent / 100);
      const netAmount = lineTotal - discountAmount;
      const taxAmount = taxRate > 0 ? netAmount * (taxRate / 100) : 0;
      const finalAmount = netAmount + taxAmount;

      doc.line_total = lineTotal;
      doc.discount_amount = discountAmount;
      doc.net_amount = netAmount;
      doc.tax_amount = taxAmount;
      doc.final_amount = finalAmount;

      console.log(`💰 Quote line calculated: ${quantity} × ${unitPrice} = ${lineTotal}, discount=${discountAmount}, tax=${taxAmount}, final=${finalAmount}`);
    } catch (err) {
      console.error('❌ Quote Line Calculation Error:', err);
    }
  }
};

const QuoteLineTotalUpdateTrigger: Hook = {
  name: 'QuoteLineTotalUpdateTrigger',
  object: 'quote_line_item',
  events: ['afterInsert', 'afterUpdate'],
  handler: async (ctx: HookContext) => {
    const lineItem = ctx.result as Record<string, any>;

    if (!lineItem.quote) return;

    try {
      const lineItems = await (ctx.ql as any).find('quote_line_item', {
        filters: [['quote', '=', lineItem.quote]]
      });

      if (!lineItems || lineItems.length === 0) return;

      let subtotal = 0;
      let discountTotal = 0;
      let taxTotal = 0;
      let grandTotal = 0;

      for (const item of lineItems) {
        subtotal += item.line_total || 0;
        discountTotal += item.discount_amount || 0;
        taxTotal += item.tax_amount || 0;
        grandTotal += item.final_amount || 0;
      }

      await (ctx.ql as any).doc.update('quote', lineItem.quote, {
        subtotal,
        discount_total: discountTotal,
        tax_total: taxTotal,
        grand_total: grandTotal
      });

      console.log(`📊 Quote ${lineItem.quote} totals updated: subtotal=${subtotal}, discount=${discountTotal}, tax=${taxTotal}, grand_total=${grandTotal}`);
    } catch (err) {
      console.error('❌ Quote Line Total Update Error:', err);
    }
  }
};

export { QuoteLineCalculationTrigger, QuoteLineTotalUpdateTrigger };
export default [QuoteLineCalculationTrigger, QuoteLineTotalUpdateTrigger] as Hook[];
