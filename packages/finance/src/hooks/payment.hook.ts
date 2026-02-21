import type { Hook, HookContext } from '@objectstack/spec/data';

import { createLogger } from '@hotcrm/core';
const logger = createLogger('finance:payment');

const PaymentMatchingTrigger: Hook = {
 name: 'PaymentMatchingTrigger',
 object: 'payment',
 events: ['afterInsert'],
 handler: async (ctx: HookContext) => {
 const payment = ctx.result as Record<string, any>;

 if (!payment.invoice) return;

 try {
 const invoices = await (ctx.ql as any).find('invoice', {
 filters: [['_id', '=', payment.invoice]]
 });

 if (!invoices || invoices.length === 0) {
 logger.warn(`Payment ${payment._id}: linked invoice ${payment.invoice} not found`);
 return;
 }

 const invoice = invoices[0];

 if (payment.amount >= invoice.total_amount) {
 await (ctx.ql as any).doc.update('invoice', invoice._id, {
 status: 'paid',
 paid_amount: invoice.total_amount
 });
 logger.info(`Invoice ${invoice.invoice_number} fully paid by payment ${payment._id}`);
 } else {
 const newPaidAmount = (invoice.paid_amount || 0) + payment.amount;
 await (ctx.ql as any).doc.update('invoice', invoice._id, {
 paid_amount: newPaidAmount
 });
 logger.info(`Invoice ${invoice.invoice_number} partially paid: ${newPaidAmount} of ${invoice.total_amount}`);
 }
 } catch (err) {
 logger.error('Payment Matching Error:', err);
 }
 }
};

const PaymentValidationTrigger: Hook = {
 name: 'PaymentValidationTrigger',
 object: 'payment',
 events: ['beforeInsert', 'beforeUpdate'],
 handler: async (ctx: HookContext) => {
 const doc = ctx.input.doc as Record<string, any>;

 try {
 if (!doc.amount || doc.amount <= 0) {
 throw new Error('Payment amount must be positive');
 }

 if (doc.payment_date) {
 const paymentDate = new Date(doc.payment_date);
 const now = new Date();
 if (paymentDate > now) {
 throw new Error('Payment date must not be in the future');
 }
 }

 if (!doc.payment_method) {
 throw new Error('Payment method must be specified');
 }

 if (doc.invoice) {
 const invoices = await (ctx.ql as any).find('invoice', {
 filters: [['_id', '=', doc.invoice]]
 });

 if (!invoices || invoices.length === 0) {
 throw new Error(`Linked invoice ${doc.invoice} not found`);
 }

 const invoice = invoices[0];
 if (invoice.status === 'paid') {
 throw new Error(`Invoice ${invoice.invoice_number} is already fully paid`);
 }
 }

 logger.info(`Payment validation passed`);
 } catch (err) {
 logger.error('Payment Validation Error:', err);
 }
 }
};

export { PaymentMatchingTrigger, PaymentValidationTrigger };
export default [PaymentMatchingTrigger, PaymentValidationTrigger] as Hook[];
