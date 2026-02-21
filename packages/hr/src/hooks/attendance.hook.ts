import type { Hook, HookContext } from '@objectstack/spec/data';

import { createLogger } from '@hotcrm/core';
const logger = createLogger('hr:attendance');

/**
 * Attendance Validation Trigger
 * 
 * Automatically handles:
 * 1. Validate check_in is provided
 * 2. If check_out is provided, validate check_out > check_in
 * 3. Auto-calculate hours_worked from check_in and check_out
 */
const AttendanceValidationTrigger: Hook = {
 name: 'AttendanceValidationTrigger',
 object: 'attendance',
 events: ['beforeInsert', 'beforeUpdate'],
 handler: async (ctx: HookContext) => {
 const doc = ctx.input.doc as Record<string, any>;
 try {
 // Validate check_in is provided
 if (!doc.check_in) {
 throw new Error(' check_in is required for attendance records');
 }

 // If check_out is provided, validate check_out > check_in
 if (doc.check_out) {
 const checkIn = new Date(doc.check_in);
 const checkOut = new Date(doc.check_out);

 if (checkOut <= checkIn) {
 throw new Error(' check_out must be after check_in');
 }

 // Auto-calculate hours_worked
 const diffMs = checkOut.getTime() - checkIn.getTime();
 const hours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
 doc.hours_worked = hours;
 logger.info(`⏱ Auto-calculated hours_worked: ${hours}h`);
 }

 logger.info(`Attendance validation passed`);
 } catch (err) {
 logger.error('Error in AttendanceValidationTrigger:', err);
 throw err;
 }
 }
};

/**
 * Attendance Duplicate Check Trigger
 * 
 * Checks if an attendance record already exists for the same employee on the same date
 */
const AttendanceDuplicateCheckTrigger: Hook = {
 name: 'AttendanceDuplicateCheckTrigger',
 object: 'attendance',
 events: ['beforeInsert'],
 handler: async (ctx: HookContext) => {
 const doc = ctx.input.doc as Record<string, any>;
 try {
 if (!doc.employee || !doc.check_in) {
 return;
 }

 // Extract date from check_in
 const attendanceDate = new Date(doc.check_in).toISOString().split('T')[0];

 const existing = await (ctx.ql as any).find('attendance', {
 filters: [
 ['employee', '=', doc.employee],
 ['date', '=', attendanceDate]
 ],
 limit: 1
 });

 if (existing && existing.length > 0) {
 logger.warn(`Duplicate attendance record detected for employee ${doc.employee} on ${attendanceDate}`);
 throw new Error(` Attendance record already exists for employee ${doc.employee} on ${attendanceDate}`);
 }

 logger.info(`No duplicate attendance record found`);
 } catch (err) {
 logger.error('Error in AttendanceDuplicateCheckTrigger:', err);
 throw err;
 }
 }
};

export { AttendanceValidationTrigger, AttendanceDuplicateCheckTrigger };
export default [AttendanceValidationTrigger, AttendanceDuplicateCheckTrigger] as Hook[];
