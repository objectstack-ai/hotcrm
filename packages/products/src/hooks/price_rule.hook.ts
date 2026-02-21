import type { Hook, HookContext } from '@objectstack/spec/data';

import { createLogger } from '@hotcrm/core';
const logger = createLogger('products:price_rule');

const VALID_RULE_TYPES = ['tiered', 'volumediscount', 'contractbased', 'customerspecific', 'promotional', 'competitive', 'bundlediscount'];

const PriceRuleValidationTrigger: Hook = {
 name: 'PriceRuleValidationTrigger',
 object: 'price_rule',
 events: ['beforeInsert', 'beforeUpdate'],
 handler: async (ctx: HookContext) => {
 const doc = ctx.input.doc as Record<string, any>;

 try {
 if (!doc.name || doc.name.trim() === '') {
 throw new Error('Rule name is required');
 }

 if (doc.rule_type && !VALID_RULE_TYPES.includes(doc.rule_type)) {
 throw new Error(`Invalid rule type "${doc.rule_type}". Must be one of: ${VALID_RULE_TYPES.join(', ')}`);
 }

 if (!doc.start_date) {
 throw new Error('Start date (start_date) is required');
 }

 if (doc.end_date && doc.start_date) {
 const startDate = new Date(doc.start_date);
 const endDate = new Date(doc.end_date);
 if (endDate <= startDate) {
 throw new Error('End date must be after start date');
 }
 }

 logger.info(`Price rule validated: ${doc.name}`);
 } catch (err) {
 logger.error('PriceRuleValidationTrigger Error:', err);
 throw err;
 }
 }
};

const PriceRuleConflictDetectionTrigger: Hook = {
 name: 'PriceRuleConflictDetectionTrigger',
 object: 'price_rule',
 events: ['beforeInsert'],
 handler: async (ctx: HookContext) => {
 const doc = ctx.input.doc as Record<string, any>;

 try {
 if (!doc.product_id || !doc.start_date) return;

 const existingRules = await (ctx.ql as any).find('price_rule', {
 filters: [
 ['product_id', '=', doc.product_id],
 ['status', '=', 'active']
 ]
 });

 if (!existingRules || existingRules.length === 0) return;

 const newStart = new Date(doc.start_date).getTime();
 const newEnd = doc.end_date ? new Date(doc.end_date).getTime() : Infinity;

 for (const rule of existingRules) {
 const ruleStart = new Date(rule.start_date).getTime();
 const ruleEnd = rule.end_date ? new Date(rule.end_date).getTime() : Infinity;

 if (newStart <= ruleEnd && newEnd >= ruleStart) {
 logger.warn(`Warning: New price rule "${doc.name}" overlaps with existing rule "${rule.name}" (${rule.start_date} - ${rule.end_date || 'no end date'})`);
 }
 }
 } catch (err) {
 logger.error('PriceRuleConflictDetectionTrigger Error:', err);
 }
 }
};

export { PriceRuleValidationTrigger, PriceRuleConflictDetectionTrigger };
export default [PriceRuleValidationTrigger, PriceRuleConflictDetectionTrigger] as Hook[];
