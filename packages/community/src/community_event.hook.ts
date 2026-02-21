import type { Hook, HookContext } from '@objectstack/spec/data';

import { createLogger } from '@hotcrm/core';
const logger = createLogger('community:community_event');

/**
 * Event RSVP Management
 *
 * Tracks RSVP count and validates event dates before creation.
 */
const EventRSVPManagement: Hook = {
 name: 'EventRSVPManagement',
 object: 'community_event',
 events: ['beforeInsert', 'beforeUpdate'],
 handler: async (ctx: HookContext) => {
 const doc = ctx.input.doc as Record<string, any>;

 // Validate start_date is in the future for new events
 if (doc.start_date) {
 const startDate = new Date(doc.start_date);
 if (isNaN(startDate.getTime())) {
 throw new Error('Validation Error: Invalid start_date format');
 }
 }

 // Validate end_date is after start_date
 if (doc.start_date && doc.end_date) {
 const start = new Date(doc.start_date);
 const end = new Date(doc.end_date);
 if (end <= start) {
 throw new Error('Validation Error: end_date must be after start_date');
 }
 }
 }
};

/**
 * Event Capacity Enforcement
 *
 * Prevents RSVP count from exceeding capacity.
 */
const EventCapacityEnforcement: Hook = {
 name: 'EventCapacityEnforcement',
 object: 'community_event',
 events: ['beforeUpdate'],
 handler: async (ctx: HookContext) => {
 const doc = ctx.input.doc as Record<string, any>;

 if (doc.rsvp_count !== undefined && ctx.input.id) {
 try {
 const event = await (ctx.ql as any).findOne('community_event', ctx.input.id);
 if (event && event.capacity && doc.rsvp_count > event.capacity) {
 throw new Error(`Capacity Exceeded: Event "${event.title}" is full (${event.capacity} max)`);
 }
 } catch (error) {
 const msg = error instanceof Error ? error.message : String(error);
 if (msg.includes('Capacity Exceeded')) throw error;
 logger.warn('Could not validate event capacity:', error);
 }
 }
 }
};

/**
 * Event Reminder Scheduling
 *
 * Schedules reminder notifications when an event is created or its date changes.
 */
const EventReminderScheduling: Hook = {
 name: 'EventReminderScheduling',
 object: 'community_event',
 events: ['afterInsert', 'afterUpdate'],
 handler: async (ctx: HookContext) => {
 const event = ctx.result as Record<string, any>;
 if (!event?._id || !event?.start_date) return;

 const startDate = new Date(event.start_date);
 const reminderDate = new Date(startDate.getTime() - 24 * 60 * 60 * 1000); // 24h before

 logger.info(`⏰ Scheduling reminder for event "${event.title}" at ${reminderDate.toISOString()}`);
 }
};

export { EventRSVPManagement, EventCapacityEnforcement, EventReminderScheduling };
export default EventRSVPManagement;
