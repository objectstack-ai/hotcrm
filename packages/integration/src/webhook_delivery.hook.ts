import type { Hook, HookContext } from '@objectstack/spec/data';

import { createLogger } from '@hotcrm/core';
const logger = createLogger('integration:webhook_delivery');

/**
 * Delivery Tracking
 *
 * Updates the parent subscription's last_triggered timestamp
 * when a delivery is recorded.
 */
const DeliveryTracking: Hook = {
 name: 'DeliveryTracking',
 object: 'webhook_delivery',
 events: ['afterInsert'],
 handler: async (ctx: HookContext) => {
 const doc = ctx.result as Record<string, any>;
 if (!doc?.subscription_id) return;

 try {
 await (ctx.ql as any).doc.update('webhook_subscription', doc.subscription_id, {
 last_triggered: new Date().toISOString()
 });
 } catch (error) {
 logger.warn('Failed to update subscription last_triggered:', error);
 }
 }
};

/**
 * Retry Scheduling
 *
 * Schedules a retry delivery when a webhook delivery fails
 * and the subscription's retry policy allows it.
 */
const RetryScheduling: Hook = {
 name: 'RetryScheduling',
 object: 'webhook_delivery',
 events: ['afterUpdate'],
 handler: async (ctx: HookContext) => {
 const doc = ctx.result as Record<string, any>;
 if (!doc?._id || doc.status !== 'failed') return;

 try {
 const subscription = await (ctx.ql as any).findOne('webhook_subscription', doc.subscription_id);
 if (!subscription || subscription.retry_policy === 'none') return;

 const maxRetries = subscription.max_retries || 3;
 if ((doc.attempt_number || 1) < maxRetries) {
 logger.info(`Scheduling retry ${(doc.attempt_number || 1) + 1}/${maxRetries} for delivery ${doc._id}`);
 await (ctx.ql as any).doc.update('webhook_delivery', doc._id, { status: 'retrying' });
 }
 } catch (error) {
 logger.warn('Failed to schedule retry:', error);
 }
 }
};

/**
 * Dead Letter Handling
 *
 * Marks a subscription as failed when all retry attempts are exhausted
 * for a delivery.
 */
const DeadLetterHandling: Hook = {
 name: 'DeadLetterHandling',
 object: 'webhook_delivery',
 events: ['afterUpdate'],
 handler: async (ctx: HookContext) => {
 const doc = ctx.result as Record<string, any>;
 if (!doc?._id || doc.status !== 'failed') return;

 try {
 const subscription = await (ctx.ql as any).findOne('webhook_subscription', doc.subscription_id);
 if (!subscription) return;

 const maxRetries = subscription.max_retries || 3;
 if ((doc.attempt_number || 1) >= maxRetries) {
 logger.info(`💀 Dead letter: delivery ${doc._id} exhausted all ${maxRetries} retries`);
 await (ctx.ql as any).doc.update('webhook_subscription', doc.subscription_id, { status: 'failed' });
 }
 } catch (error) {
 logger.warn('Failed to handle dead letter:', error);
 }
 }
};

export { DeliveryTracking, RetryScheduling, DeadLetterHandling };
export default DeliveryTracking;
