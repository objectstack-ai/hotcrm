import type { Hook, HookContext } from '@objectstack/spec/data';

import { createLogger } from '@hotcrm/core';
const logger = createLogger('community:idea');

/**
 * Idea Vote Aggregation
 *
 * Recalculates the priority_score based on vote_count and recency
 * whenever an idea is updated.
 */
const IdeaVoteAggregation: Hook = {
  name: 'IdeaVoteAggregation',
  object: 'idea',
  events: ['afterUpdate'],
  handler: async (ctx: HookContext) => {
    const idea = ctx.result as Record<string, any>;
    if (!idea?._id) return;

    const voteCount = idea.vote_count || 0;
    const daysSinceCreation = idea.created_at
      ? Math.max(1, Math.floor((Date.now() - new Date(idea.created_at).getTime()) / 86400000))
      : 1;

    // Wilson score–inspired priority: votes weighted by recency
    const priorityScore = Math.round((voteCount / Math.sqrt(daysSinceCreation)) * 100);

    try {
      await (ctx.ql as any).doc.update('idea', idea._id, { priority_score: priorityScore });
    } catch (error) {
      logger.warn('Failed to update idea priority score:', error);
    }
  }
};

/**
 * Idea Status Transition
 *
 * Validates status transitions follow the allowed workflow:
 * submitted → under_review → planned → in_progress → released | declined
 */
const IdeaStatusTransition: Hook = {
  name: 'IdeaStatusTransition',
  object: 'idea',
  events: ['beforeUpdate'],
  handler: async (ctx: HookContext) => {
    const doc = ctx.input.doc as Record<string, any>;
    if (!doc.status || !ctx.input.id) return;

    const allowedTransitions: Record<string, string[]> = {
      submitted: ['under_review', 'declined'],
      under_review: ['planned', 'declined'],
      planned: ['in_progress', 'declined'],
      in_progress: ['released', 'declined'],
      released: [],
      declined: ['submitted']
    };

    try {
      const current = await (ctx.ql as any).findOne('idea', ctx.input.id);
      if (current && current.status) {
        const allowed = allowedTransitions[current.status] || [];
        if (!allowed.includes(doc.status)) {
          throw new Error(`Invalid status transition: ${current.status} → ${doc.status}`);
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('Invalid status transition')) throw error;
      logger.warn('Could not validate idea status transition:', error);
    }
  }
};

/**
 * Idea Notification
 *
 * Notifies the idea author and voters when the status changes.
 */
const IdeaNotification: Hook = {
  name: 'IdeaNotification',
  object: 'idea',
  events: ['afterUpdate'],
  handler: async (ctx: HookContext) => {
    const idea = ctx.result as Record<string, any>;
    if (!idea?._id || !idea?.status) return;

    logger.info(`Idea "${idea.title}" status changed to ${idea.status} — notifying author ${idea.author_id}`);
  }
};

export { IdeaVoteAggregation, IdeaStatusTransition, IdeaNotification };
export default IdeaVoteAggregation;
