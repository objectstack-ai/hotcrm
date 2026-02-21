import type { Hook, HookContext } from '@objectstack/spec/data';

import { createLogger } from '@hotcrm/core';
const logger = createLogger('products:order');

const VALID_ORDER_TRANSITIONS: Record<string, string[]> = {
 draft: ['activated', 'cancelled'],
 activated: ['fulfilled', 'partially_fulfilled', 'shipped', 'cancelled'],
 partially_fulfilled: ['fulfilled', 'shipped', 'cancelled'],
 fulfilled: ['shipped', 'completed'],
 shipped: ['completed'],
 completed: [],
 cancelled: [],
};

const OrderValidationTrigger: Hook = {
 name: 'OrderValidationTrigger',
 object: 'order',
 events: ['beforeInsert', 'beforeUpdate'],
 handler: async (ctx: HookContext) => {
 const doc = ctx.input.doc as Record<string, any>;

 try {
 // Validate order_date
 if (doc.order_date) {
 const orderDate = new Date(doc.order_date);
 if (isNaN(orderDate.getTime())) {
 throw new Error('Invalid order date');
 }
 }

 // Calculate totals from order items
 const subtotal = doc.subtotal || 0;
 const taxAmount = doc.tax_amount || 0;
 const shippingAmount = doc.shipping_amount || 0;
 const discountAmount = doc.discount_amount || 0;

 doc.total_amount = subtotal + taxAmount + shippingAmount - discountAmount;

 logger.info(`Order validated: subtotal=${subtotal}, tax=${taxAmount}, shipping=${shippingAmount}, discount=${discountAmount}, total=${doc.total_amount}`);
 } catch (err) {
 logger.error('Order Validation Error:', err);
 }
 }
};

const OrderStatusLifecycleTrigger: Hook = {
 name: 'OrderStatusLifecycleTrigger',
 object: 'order',
 events: ['beforeUpdate'],
 handler: async (ctx: HookContext) => {
 const doc = ctx.input.doc as Record<string, any>;
 const oldDoc = ctx.previous as Record<string, any> | undefined;

 if (!oldDoc || doc.status === oldDoc.status) return;

 try {
 const oldStatus = oldDoc.status as string;
 const newStatus = doc.status as string;
 const allowed = VALID_ORDER_TRANSITIONS[oldStatus];

 if (!allowed || !allowed.includes(newStatus)) {
 throw new Error(`Invalid order status transition: ${oldStatus} → ${newStatus}`);
 }

 if (newStatus === 'activated') {
 doc.effective_date = doc.effective_date || new Date().toISOString().split('T')[0];
 logger.info(`🚀 Order ${oldDoc.order_number} activated — effective date: ${doc.effective_date}`);
 }

 if (newStatus === 'cancelled') {
 logger.warn(`Order ${oldDoc.order_number} has been cancelled`);
 }

 logger.info(`Order status transition: ${oldStatus} → ${newStatus}`);
 } catch (err) {
 logger.error('Order Status Lifecycle Error:', err);
 }
 }
};

export { OrderValidationTrigger, OrderStatusLifecycleTrigger };
export default [OrderValidationTrigger, OrderStatusLifecycleTrigger] as Hook[];
