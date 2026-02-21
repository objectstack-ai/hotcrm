import type { Hook, HookContext } from '@objectstack/spec/data';

import { createLogger } from '@hotcrm/core';
const logger = createLogger('products:discount_schedule');

const DiscountScheduleActivationTrigger: Hook = {
 name: 'DiscountScheduleActivationTrigger',
 object: 'discount_schedule',
 events: ['beforeUpdate'],
 handler: async (ctx: HookContext) => {
 const doc = ctx.input.doc as Record<string, any>;
 const oldDoc = ctx.previous as Record<string, any> | undefined;

 if (!oldDoc) return;
 if (doc.status === oldDoc.status || doc.status !== 'active') return;

 try {
 // Validate that a tiered discount schedule has proper configuration
 if (oldDoc.discount_type === 'tiered' || doc.discount_type === 'tiered') {
 // Check that minimum/maximum discount percentages are configured
 const minPct = doc.minimum_discount_percent ?? oldDoc.minimum_discount_percent;
 const maxPct = doc.maximum_discount_percent ?? oldDoc.maximum_discount_percent;

 if (minPct == null && maxPct == null) {
 logger.warn('Warning: Tiered discount schedule activated without discount tier configuration. Configure minimum/maximum discount percentages.');
 }
 }

 // Set activated timestamp
 doc.start_date = doc.start_date || new Date().toISOString();

 logger.info(`Discount schedule "${oldDoc.name}" activated`);
 } catch (err) {
 logger.error('DiscountScheduleActivationTrigger Error:', err);
 }
 }
};

const DiscountScheduleOverlapDetectionTrigger: Hook = {
 name: 'DiscountScheduleOverlapDetectionTrigger',
 object: 'discount_schedule',
 events: ['beforeInsert', 'beforeUpdate'],
 handler: async (ctx: HookContext) => {
 const doc = ctx.input.doc as Record<string, any>;

 try {
 if (!doc.start_date || !doc.end_date) return;

 const filters: any[] = [['status', '=', 'active']];

 // Scope overlap check to the same applies_to target
 if (doc.applies_to && doc.applies_to !== 'allproducts') {
 filters.push(['applies_to', '=', doc.applies_to]);
 }

 // Exclude current record on updates
 if (doc._id) {
 filters.push(['_id', '!=', doc._id]);
 }

 const existingSchedules = await (ctx.ql as any).find('discount_schedule', {
 filters
 });

 if (!existingSchedules || existingSchedules.length === 0) return;

 const newStart = new Date(doc.start_date).getTime();
 const newEnd = new Date(doc.end_date).getTime();

 for (const schedule of existingSchedules) {
 if (!schedule.start_date || !schedule.end_date) continue;

 const schedStart = new Date(schedule.start_date).getTime();
 const schedEnd = new Date(schedule.end_date).getTime();

 if (newStart <= schedEnd && newEnd >= schedStart) {
 logger.warn(`Warning: Discount schedule "${doc.name}" overlaps with existing schedule "${schedule.name}" (${schedule.start_date} - ${schedule.end_date})`);
 }
 }
 } catch (err) {
 logger.error('DiscountScheduleOverlapDetectionTrigger Error:', err);
 }
 }
};

export { DiscountScheduleActivationTrigger, DiscountScheduleOverlapDetectionTrigger };
export default [DiscountScheduleActivationTrigger, DiscountScheduleOverlapDetectionTrigger] as Hook[];
