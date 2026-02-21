import type { Hook, HookContext } from '@objectstack/spec/data';

import { createLogger } from '@hotcrm/core';
const logger = createLogger('analytics:report_schedule');

/** Valid IANA timezone pattern (simplified) */
const TIMEZONE_PATTERN = /^[A-Za-z_]+\/[A-Za-z_]+$/;
const VALID_FREQUENCIES = ['daily', 'weekly', 'monthly', 'quarterly'];

/**
 * Schedule Validation
 *
 * Validates frequency value and timezone format before a schedule
 * is created or updated.
 */
const ScheduleValidation: Hook = {
 name: 'ScheduleValidation',
 object: 'report_schedule',
 events: ['beforeInsert', 'beforeUpdate'],
 handler: async (ctx: HookContext) => {
 const doc = ctx.input.doc as Record<string, any>;

 if (doc.frequency && !VALID_FREQUENCIES.includes(doc.frequency)) {
 throw new Error(`Validation Error: Invalid frequency "${doc.frequency}". Valid values: ${VALID_FREQUENCIES.join(', ')}`);
 }

 if (doc.timezone) {
 const tz = String(doc.timezone).trim();
 if (tz !== 'UTC' && !TIMEZONE_PATTERN.test(tz)) {
 throw new Error(`Validation Error: Invalid timezone "${tz}". Expected IANA format (e.g., "America/New_York") or "UTC"`);
 }
 }

 // Validate recipients JSON if provided
 if (doc.recipients) {
 try {
 const parsed = typeof doc.recipients === 'string' ? JSON.parse(doc.recipients) : doc.recipients;
 if (!Array.isArray(parsed)) {
 throw new Error('Validation Error: recipients must be a JSON array');
 }
 } catch (error) {
 if (error instanceof SyntaxError) {
 throw new Error('Validation Error: recipients field contains invalid JSON');
 }
 throw error;
 }
 }
 }
};

/**
 * Next Run Calculation
 *
 * After a schedule is created or updated, calculates the next_run timestamp
 * based on the configured frequency.
 */
const NextRunCalculation: Hook = {
 name: 'NextRunCalculation',
 object: 'report_schedule',
 events: ['afterInsert', 'afterUpdate'],
 handler: async (ctx: HookContext) => {
 const schedule = ctx.result as Record<string, any>;
 if (!schedule?._id || !schedule.is_active) return;

 const frequency = schedule.frequency;
 if (!frequency) return;

 const now = new Date();
 let nextRun: Date;

 switch (frequency) {
 case 'daily':
 nextRun = new Date(now.getTime() + 24 * 60 * 60 * 1000);
 break;
 case 'weekly':
 nextRun = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
 break;
 case 'monthly':
 nextRun = new Date(now);
 nextRun.setMonth(nextRun.getMonth() + 1);
 break;
 case 'quarterly':
 nextRun = new Date(now);
 nextRun.setMonth(nextRun.getMonth() + 3);
 break;
 default:
 return;
 }

 try {
 await (ctx.ql as any).doc.update('report_schedule', schedule._id, {
 next_run: nextRun.toISOString()
 });
 logger.info(`Next run for schedule "${schedule.name}" set to ${nextRun.toISOString()}`);
 } catch (error) {
 logger.warn('Failed to set next run date:', error);
 }
 }
};

/**
 * Schedule Deactivation
 *
 * Before a schedule update, checks if the associated report still exists.
 * If the report has been deleted, deactivates the schedule.
 */
const ScheduleDeactivation: Hook = {
 name: 'ScheduleDeactivation',
 object: 'report_schedule',
 events: ['beforeUpdate'],
 handler: async (ctx: HookContext) => {
 const doc = ctx.input.doc as Record<string, any>;
 const previous = ctx.previous as Record<string, any> | undefined;

 const reportId = doc.report_id || previous?.report_id;
 if (!reportId) return;

 try {
 const report = await (ctx.ql as any).doc.get('report', reportId);
 if (!report || report._deleted) {
 logger.warn(`Report ${reportId} no longer exists — deactivating schedule`);
 doc.is_active = false;
 }
 } catch {
 // Report not found — deactivate schedule
 logger.warn(`Report ${reportId} not found — deactivating schedule`);
 doc.is_active = false;
 }
 }
};

export { ScheduleValidation, NextRunCalculation, ScheduleDeactivation };
export default ScheduleValidation;
