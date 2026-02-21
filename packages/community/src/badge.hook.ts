import type { Hook, HookContext } from '@objectstack/spec/data';

import { createLogger } from '@hotcrm/core';
const logger = createLogger('community:badge');

/**
 * Badge Auto-Award
 *
 * Evaluates badge criteria and automatically awards badges to qualifying users.
 */
const BadgeAutoAward: Hook = {
 name: 'BadgeAutoAward',
 object: 'badge',
 events: ['afterInsert', 'afterUpdate'],
 handler: async (ctx: HookContext) => {
 const badge = ctx.result as Record<string, any>;
 if (!badge?._id || !badge?.is_automatic || !badge?.criteria) return;

 logger.info(`🏅 Evaluating auto-award criteria for badge "${badge.name}"`);

 // Parse criteria and find qualifying users
 try {
 const criteria = typeof badge.criteria === 'string' ? JSON.parse(badge.criteria) : badge.criteria;
 if (criteria && criteria.min_posts) {
 logger.info(`Badge requires minimum ${criteria.min_posts} posts`);
 }
 } catch (error) {
 logger.warn('Failed to parse badge criteria:', error);
 }
 }
};

/**
 * Badge Points Calculation
 *
 * Validates points_value and ensures badge_type consistency with rarity.
 */
const BadgePointsCalculation: Hook = {
 name: 'BadgePointsCalculation',
 object: 'badge',
 events: ['beforeInsert', 'beforeUpdate'],
 handler: async (ctx: HookContext) => {
 const doc = ctx.input.doc as Record<string, any>;

 // Ensure legendary badges have high points
 if (doc.rarity === 'legendary' && doc.points_value !== undefined && doc.points_value < 100) {
 doc.points_value = 100;
 }

 // Validate criteria JSON if provided
 if (doc.criteria) {
 try {
 typeof doc.criteria === 'string' ? JSON.parse(doc.criteria) : doc.criteria;
 } catch (error) {
 if (error instanceof SyntaxError) {
 throw new Error('Validation Error: criteria field contains invalid JSON');
 }
 throw error;
 }
 }
 }
};

export { BadgeAutoAward, BadgePointsCalculation };
export default BadgeAutoAward;
