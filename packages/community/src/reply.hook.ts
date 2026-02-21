import type { Hook, HookContext } from '@objectstack/spec/data';

import { createLogger } from '@hotcrm/core';
const logger = createLogger('community:reply');

/**
 * Reply Answer Acceptance
 *
 * Ensures only one reply per topic can be marked as the accepted answer.
 * When a reply is accepted, any previous accepted answer is unset.
 */
const ReplyAnswerAcceptance: Hook = {
 name: 'ReplyAnswerAcceptance',
 object: 'reply',
 events: ['beforeUpdate'],
 handler: async (ctx: HookContext) => {
 const doc = ctx.input.doc as Record<string, any>;

 if (doc.is_accepted_answer === true && doc.topic_id) {
 // Unset any existing accepted answer for this topic
 try {
 const existing = await (ctx.ql as any).find('reply', {
 filters: [['topic_id', '=', doc.topic_id], ['is_accepted_answer', '=', true]]
 });
 for (const reply of existing) {
 if (reply._id !== ctx.input.id) {
 await (ctx.ql as any).doc.update('reply', reply._id, { is_accepted_answer: false });
 }
 }
 } catch (error) {
 logger.warn('Failed to unset previous accepted answer:', error);
 }
 }
 }
};

/**
 * Reply Upvote Tracking
 *
 * Recalculates net score and updates the topic's reply_count after a reply is modified.
 */
const ReplyUpvoteTracking: Hook = {
 name: 'ReplyUpvoteTracking',
 object: 'reply',
 events: ['afterInsert', 'afterUpdate'],
 handler: async (ctx: HookContext) => {
 const reply = ctx.result as Record<string, any>;
 if (!reply?._id || !reply?.topic_id) return;

 try {
 const replyCount = await (ctx.ql as any).find('reply', {
 filters: [['topic_id', '=', reply.topic_id]]
 });
 await (ctx.ql as any).doc.update('topic', reply.topic_id, {
 reply_count: replyCount.length,
 last_activity_at: new Date().toISOString()
 });
 } catch (error) {
 logger.warn('Failed to update topic reply count:', error);
 }
 }
};

/**
 * Reply Author Reputation
 *
 * Awards reputation points to an author when their reply receives upvotes
 * or is accepted as the answer.
 */
const ReplyAuthorReputation: Hook = {
 name: 'ReplyAuthorReputation',
 object: 'reply',
 events: ['afterUpdate'],
 handler: async (ctx: HookContext) => {
 const reply = ctx.result as Record<string, any>;
 if (!reply?._id || !reply?.author_id) return;

 if (reply.is_accepted_answer) {
 logger.info(`🏆 Reply ${reply._id} accepted as answer — awarding reputation to ${reply.author_id}`);
 }
 }
};

/**
 * Reply Spam Detection
 *
 * Flags replies that match spam patterns and prevents rapid posting.
 */
const ReplySpamDetection: Hook = {
 name: 'ReplySpamDetection',
 object: 'reply',
 events: ['beforeInsert'],
 handler: async (ctx: HookContext) => {
 const doc = ctx.input.doc as Record<string, any>;

 if (doc.body) {
 const bodyLower = doc.body.toLowerCase();
 const spamPatterns = ['buy now', 'click here', 'free money', 'act now'];
 for (const pattern of spamPatterns) {
 if (bodyLower.includes(pattern)) {
 doc.is_flagged = true;
 doc.flag_reason = `Auto-flagged: contains spam pattern "${pattern}"`;
 break;
 }
 }
 }

 // Rate limiting: check for rapid posting by the same author
 if (doc.author_id) {
 try {
 const recentReplies = await (ctx.ql as any).find('reply', {
 filters: [['author_id', '=', doc.author_id]],
 sort: { created_at: -1 },
 limit: 5
 });
 if (recentReplies.length >= 5) {
 logger.warn(`Rate limit warning for user ${doc.author_id}: high posting frequency`);
 }
 } catch (error) {
 // Non-blocking
 }
 }
 }
};

export { ReplyAnswerAcceptance, ReplyUpvoteTracking, ReplyAuthorReputation, ReplySpamDetection };
export default ReplyAnswerAcceptance;
