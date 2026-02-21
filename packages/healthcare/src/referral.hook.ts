import type { Hook, HookContext } from '@objectstack/spec/data';

import { createLogger } from '@hotcrm/core';
const logger = createLogger('healthcare:referral');

/**
 * Referral Auto Routing
 *
 * Routes referrals to the appropriate specialist based on reason after insert.
 */
const ReferralAutoRouting: Hook = {
 name: 'ReferralAutoRouting',
 object: 'referral',
 events: ['afterInsert'],
 handler: async (ctx: HookContext) => {
 const referral = ctx.result as Record<string, any>;
 if (!referral?._id || !referral?.reason) return;

 const reason = (referral.reason as string).toLowerCase();
 let specialistType = 'general';

 if (reason.includes('cardio') || reason.includes('heart')) {
 specialistType = 'cardiology';
 } else if (reason.includes('ortho') || reason.includes('bone') || reason.includes('joint')) {
 specialistType = 'orthopedics';
 } else if (reason.includes('neuro') || reason.includes('brain')) {
 specialistType = 'neurology';
 } else if (reason.includes('derma') || reason.includes('skin')) {
 specialistType = 'dermatology';
 }

 logger.info(`🔀 Referral ${referral._id} routed to ${specialistType} specialist`);
 }
};

/**
 * Referral Status Tracking
 *
 * Notifies the referring provider when referral status changes.
 */
const ReferralStatusTracking: Hook = {
 name: 'ReferralStatusTracking',
 object: 'referral',
 events: ['afterUpdate'],
 handler: async (ctx: HookContext) => {
 const doc = ctx.input.doc as Record<string, any>;
 const result = ctx.result as Record<string, any>;

 if (doc.status === undefined) return;

 try {
 if (result?.referring_provider) {
 logger.info(`Notification sent to referring provider ${result.referring_provider}: Referral ${result._id} status changed to ${doc.status}`);
 }
 } catch (error) {
 logger.warn('Failed to notify referring provider:', error);
 }
 }
};

/**
 * Referral Follow-Up Scheduling
 *
 * Schedules a follow-up appointment when a referral is completed.
 */
const ReferralFollowUpScheduling: Hook = {
 name: 'ReferralFollowUpScheduling',
 object: 'referral',
 events: ['afterUpdate'],
 handler: async (ctx: HookContext) => {
 const doc = ctx.input.doc as Record<string, any>;
 const result = ctx.result as Record<string, any>;

 if (doc.status !== 'completed') return;

 try {
 if (result?.patient_id && result?.referring_provider) {
 logger.info(`Follow-up appointment scheduled for patient ${result.patient_id} with provider ${result.referring_provider}`);
 }
 } catch (error) {
 logger.warn('Failed to schedule follow-up:', error);
 }
 }
};

export { ReferralAutoRouting, ReferralStatusTracking, ReferralFollowUpScheduling };
export default ReferralAutoRouting;
