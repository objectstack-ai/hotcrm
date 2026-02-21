import type { Hook, HookContext } from '@objectstack/spec/data';

import { createLogger } from '@hotcrm/core';
const logger = createLogger('finance:invoice_line');

const InvoiceLineCalculationTrigger: Hook = {
 name: 'InvoiceLineCalculationTrigger',
 object: 'invoice_line',
 events: ['beforeInsert', 'beforeUpdate'],
 handler: async (ctx: HookContext) => {
 const doc = ctx.input.doc as Record<string, any>;

 try {
 const quantity = doc.quantity || 0;
 const unitPrice = doc.unit_price || 0;

 if (quantity <= 0) {
 throw new Error('Quantity must be greater than 0');
 }

 if (unitPrice < 0) {
 throw new Error('Unit price must be greater than or equal to 0');
 }

 const amount = quantity * unitPrice;
 doc.amount = amount;

 logger.info(`Invoice line calculated: qty=${quantity} × price=${unitPrice} = ${amount}`);
 } catch (err) {
 logger.error('Invoice Line Calculation Error:', err);
 }
 }
};

const InvoiceLineTotalUpdateTrigger: Hook = {
 name: 'InvoiceLineTotalUpdateTrigger',
 object: 'invoice_line',
 events: ['afterInsert', 'afterUpdate'],
 handler: async (ctx: HookContext) => {
 const lineItem = ctx.result as Record<string, any>;

 if (!lineItem.invoice) return;

 try {
 const lineItems = await (ctx.ql as any).find('invoice_line', {
 filters: [['invoice', '=', lineItem.invoice]]
 });

 let totalAmount = 0;

 if (!lineItems || lineItems.length === 0) {
 await (ctx.ql as any).doc.update('invoice', lineItem.invoice, {
 total_amount: totalAmount
 });
 logger.info(`Invoice ${lineItem.invoice} total_amount updated: ${totalAmount}`);
 return;
 }

 for (const item of lineItems) {
 totalAmount += item.amount || 0;
 }

 await (ctx.ql as any).doc.update('invoice', lineItem.invoice, {
 total_amount: totalAmount
 });

 logger.info(`Invoice ${lineItem.invoice} total_amount updated: ${totalAmount}`);
 } catch (err) {
 logger.error('Invoice Line Total Update Error:', err);
 }
 }
};

export { InvoiceLineCalculationTrigger, InvoiceLineTotalUpdateTrigger };
export default [InvoiceLineCalculationTrigger, InvoiceLineTotalUpdateTrigger] as Hook[];
