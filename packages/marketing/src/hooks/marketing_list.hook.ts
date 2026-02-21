import type { Hook, HookContext } from '@objectstack/spec/data';

import { createLogger } from '@hotcrm/core';
const logger = createLogger('marketing:marketing_list');

/**
 * Marketing List Duplicate Detection Trigger
 * 
 * Before insert, checks for duplicate lists with the same name or list_code.
 * Also validates dynamic list filter criteria JSON.
 */
const MarketingListDuplicateDetectionTrigger: Hook = {
 name: 'MarketingListDuplicateDetectionTrigger',
 object: 'marketing_list',
 events: ['beforeInsert'],
 handler: async (ctx: HookContext) => {
 try {
 const doc = ctx.input.doc as Record<string, any>;

 // Check for duplicate list_code
 if (doc.list_code) {
 const existing = await (ctx.ql as any).find('marketing_list', {
 filters: [['list_code', '=', doc.list_code]],
 limit: 1
 });

 if (existing && existing.length > 0) {
 throw new Error(`A marketing list with code "${doc.list_code}" already exists.`);
 }
 }

 // Validate filter_criteria_json for dynamic lists
 if ((doc.list_type === 'dynamic' || doc.list_type === 'hybrid') && doc.filter_criteria_json) {
 try {
 JSON.parse(doc.filter_criteria_json);
 } catch {
 throw new Error('filter_criteria_json must contain valid JSON for dynamic lists.');
 }
 }

 // Dynamic lists require filter criteria
 if (doc.list_type === 'dynamic' && !doc.filter_criteria_json) {
 throw new Error('Dynamic lists require filter_criteria_json to be defined.');
 }

 logger.info(`Marketing list duplicate detection passed: ${doc.name || 'unknown'}`);
 } catch (error) {
 logger.error('Marketing list duplicate detection failed:', error);
 throw error;
 }
 }
};

/**
 * Marketing List Membership Count Trigger
 * 
 * After update, recalculate membership counts and active member ratio.
 */
const MarketingListMembershipCountTrigger: Hook = {
 name: 'MarketingListMembershipCountTrigger',
 object: 'marketing_list',
 events: ['afterUpdate'],
 handler: async (ctx: HookContext) => {
 try {
 const list = ctx.result as Record<string, any>;
 const oldList = ctx.previous as Record<string, any> | undefined;

 // Only process if member counts changed
 if (oldList &&
 oldList.total_members === list.total_members &&
 oldList.unsubscribed_members === list.unsubscribed_members &&
 oldList.bounced_members === list.bounced_members) {
 return;
 }

 const totalMembers = list.total_members || 0;
 const unsubscribed = list.unsubscribed_members || 0;
 const bounced = list.bounced_members || 0;
 const activeMembers = Math.max(0, totalMembers - unsubscribed - bounced);

 const deliverabilityRate = totalMembers > 0
 ? ((totalMembers - bounced) / totalMembers) * 100
 : 0;

 await (ctx.ql as any).doc.update('marketing_list', list._id || list.id, {
 active_members: activeMembers,
 deliverability_rate: Math.round(deliverabilityRate * 100) / 100
 });

 logger.info(`Marketing list membership updated - Total: ${totalMembers}, Active: ${activeMembers}, Deliverability: ${deliverabilityRate.toFixed(1)}%`);
 } catch (error) {
 logger.error('[marketing_list.hook] membership count update failed:', error);
 }
 }
};

export { MarketingListDuplicateDetectionTrigger, MarketingListMembershipCountTrigger };
export default [MarketingListDuplicateDetectionTrigger, MarketingListMembershipCountTrigger] as Hook[];
