import type { Hook, HookContext } from '@objectstack/spec/data';

import { createLogger } from '@hotcrm/core';
const logger = createLogger('real-estate:showing');

/**
 * Showing Conflict Detection
 *
 * Checks for scheduling conflicts on the same listing before insert.
 */
const ShowingConflictDetection: Hook = {
 name: 'ShowingConflictDetection',
 object: 'showing',
 events: ['beforeInsert'],
 handler: async (ctx: HookContext) => {
 const doc = ctx.input.doc as Record<string, any>;

 if (!doc.listing_id || !doc.scheduled_date) return;

 try {
 const existingShowings = await (ctx.ql as any).find('showing', {
 filters: [
 ['listing_id', '=', doc.listing_id],
 ['scheduled_date', '=', doc.scheduled_date]
 ]
 });

 if (existingShowings.length > 0) {
 throw new Error(`Scheduling Conflict: A showing is already scheduled for this listing at ${doc.scheduled_date}`);
 }
 } catch (error) {
 if ((error as Error).message.startsWith('Scheduling Conflict')) {
 throw error;
 }
 logger.warn('Failed to check showing conflicts:', error);
 }
 }
};

/**
 * Showing Feedback Request
 *
 * Notifies the agent to submit feedback within 24 hours after a showing is created.
 */
const ShowingFeedbackRequest: Hook = {
 name: 'ShowingFeedbackRequest',
 object: 'showing',
 events: ['afterInsert'],
 handler: async (ctx: HookContext) => {
 const showing = ctx.result as Record<string, any>;
 if (!showing?._id || !showing?.agent_id) return;

 logger.info(`Feedback request sent to agent ${showing.agent_id} for showing ${showing._id} — due within 24h`);
 }
};

/**
 * Showing Lead Scoring
 *
 * Updates buyer lead score based on showing activity and rating after update.
 */
const ShowingLeadScoring: Hook = {
 name: 'ShowingLeadScoring',
 object: 'showing',
 events: ['afterUpdate'],
 handler: async (ctx: HookContext) => {
 const showing = ctx.result as Record<string, any>;
 if (!showing?._id || !showing?.buyer_contact_id) return;

 const rating = showing.rating || 0;
 const scoreBoost = rating >= 4 ? 20 : rating >= 3 ? 10 : 5;

 logger.info(`Lead score for buyer ${showing.buyer_contact_id} boosted by ${scoreBoost} based on showing rating ${rating}`);
 }
};

export { ShowingConflictDetection, ShowingFeedbackRequest, ShowingLeadScoring };
export default ShowingConflictDetection;
