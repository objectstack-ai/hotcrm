import type { Hook, HookContext } from '@objectstack/spec/data';

import { createLogger } from '@hotcrm/core';
const logger = createLogger('finance:billing_schedule');

const BillingScheduleValidationTrigger: Hook = {
 name: 'BillingScheduleValidationTrigger',
 object: 'billing_schedule',
 events: ['beforeInsert', 'beforeUpdate'],
 handler: async (ctx: HookContext) => {
 const doc = ctx.input.doc as Record<string, any>;

 try {
 // Validate start_date < end_date
 if (doc.start_date && doc.end_date) {
 const startDate = new Date(doc.start_date);
 const endDate = new Date(doc.end_date);

 if (startDate >= endDate) {
 throw new Error('Start date must be before end date');
 }
 }

 // Validate billing_day between 1-28
 if (doc.billing_day !== undefined && doc.billing_day !== null) {
 if (doc.billing_day < 1 || doc.billing_day > 28) {
 throw new Error('Billing day must be between 1 and 28');
 }
 }

 // Calculate next_billing_date
 if (doc.start_date && doc.billing_day) {
 const now = new Date();
 const startDate = new Date(doc.start_date);
 const baseDate = now > startDate ? now : startDate;

 let nextBilling = new Date(baseDate.getFullYear(), baseDate.getMonth(), doc.billing_day);

 if (nextBilling <= baseDate) {
 nextBilling = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, doc.billing_day);
 }

 // Ensure next billing date does not exceed end_date
 if (doc.end_date) {
 const endDate = new Date(doc.end_date);
 if (nextBilling > endDate) {
 nextBilling = endDate;
 }
 }

 doc.next_billing_date = nextBilling.toISOString().split('T')[0];
 }

 logger.info(`Billing schedule validated: billing_day=${doc.billing_day}, next_billing_date=${doc.next_billing_date}`);
 } catch (err) {
 logger.error('Billing Schedule Validation Error:', err);
 }
 }
};

const BillingScheduleInvoiceGenerationTrigger: Hook = {
 name: 'BillingScheduleInvoiceGenerationTrigger',
 object: 'billing_schedule',
 events: ['afterUpdate'],
 handler: async (ctx: HookContext) => {
 const schedule = ctx.result as Record<string, any>;
 const oldDoc = ctx.previous as Record<string, any> | undefined;

 if (!oldDoc || schedule.status === oldDoc.status) return;
 if (schedule.status !== 'active') return;

 try {
 if (schedule.auto_generate_invoice) {
 logger.info(`Billing schedule ${schedule.name} activated — auto-invoice generation scheduled for day ${schedule.billing_day} of each ${schedule.frequency} cycle`);
 logger.info(`Next billing date: ${schedule.next_billing_date}, amount: ${schedule.amount}`);
 } else {
 logger.info(`Billing schedule ${schedule.name} activated — manual invoicing mode`);
 }
 } catch (err) {
 logger.error('Billing Schedule Invoice Generation Error:', err);
 }
 }
};

export { BillingScheduleValidationTrigger, BillingScheduleInvoiceGenerationTrigger };
export default [BillingScheduleValidationTrigger, BillingScheduleInvoiceGenerationTrigger] as Hook[];
