import type { Hook, HookContext } from '@objectstack/spec/data';

import { createLogger } from '@hotcrm/core';
const logger = createLogger('real-estate:commission');

/**
 * Commission Split Calculation
 *
 * Calculates commission_amount from listing sold_price * commission_rate before insert.
 */
const CommissionSplitCalculation: Hook = {
 name: 'CommissionSplitCalculation',
 object: 'commission',
 events: ['beforeInsert'],
 handler: async (ctx: HookContext) => {
 const doc = ctx.input.doc as Record<string, any>;

 if (doc.transaction_id && doc.commission_rate && !doc.commission_amount) {
 try {
 const listing = await (ctx.ql as any).findOne('listing', doc.transaction_id);
 if (listing?.sold_price) {
 doc.commission_amount = listing.sold_price * (doc.commission_rate / 100);
 }
 } catch (error) {
 logger.warn('Failed to calculate commission from listing:', error);
 }
 }
 }
};

/**
 * Commission Cap Tracking
 *
 * Tracks annual commission cap for an agent after insert.
 */
const CommissionCapTracking: Hook = {
 name: 'CommissionCapTracking',
 object: 'commission',
 events: ['afterInsert'],
 handler: async (ctx: HookContext) => {
 const commission = ctx.result as Record<string, any>;
 if (!commission?._id || !commission?.agent_id) return;

 try {
 const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString();
 const agentCommissions = await (ctx.ql as any).find('commission', {
 filters: [['agent_id', '=', commission.agent_id]]
 });

 const totalCommission = agentCommissions.reduce(
 (sum: number, c: any) => sum + (c.commission_amount || 0), 0
 );

 logger.info(`📈 Agent ${commission.agent_id} annual commission total: $${totalCommission.toFixed(2)}`);
 } catch (error) {
 logger.warn('Failed to track commission cap:', error);
 }
 }
};

/**
 * Commission Payment Scheduling
 *
 * When payment_status changes to 'paid', logs payment_date.
 */
const CommissionPaymentScheduling: Hook = {
 name: 'CommissionPaymentScheduling',
 object: 'commission',
 events: ['afterUpdate'],
 handler: async (ctx: HookContext) => {
 const doc = ctx.input.doc as Record<string, any>;
 const result = ctx.result as Record<string, any>;

 if (doc.payment_status === 'paid' && result?._id) {
 const paymentDate = doc.payment_date || new Date().toISOString().split('T')[0];
 logger.info(`Commission ${result._id} paid on ${paymentDate} to agent ${result.agent_id}`);

 if (!doc.payment_date) {
 try {
 await (ctx.ql as any).doc.update('commission', result._id, {
 payment_date: paymentDate
 });
 } catch (error) {
 logger.warn('Failed to set payment date:', error);
 }
 }
 }
 }
};

export { CommissionSplitCalculation, CommissionCapTracking, CommissionPaymentScheduling };
export default CommissionSplitCalculation;
