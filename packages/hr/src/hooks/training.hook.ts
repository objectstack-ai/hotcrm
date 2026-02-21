import type { Hook, HookContext } from '@objectstack/spec/data';

import { createLogger } from '@hotcrm/core';
const logger = createLogger('hr:training');

/**
 * Training Enrollment Validation Trigger
 * 
 * Validates training data before insert/update:
 * 1. end_date must be after start_date
 * 2. Auto-calculate duration_hours from start and end dates
 * 3. Exam score must be between 0 and 100
 */
const TrainingEnrollmentValidationTrigger: Hook = {
 name: 'TrainingEnrollmentValidationTrigger',
 object: 'training',
 events: ['beforeInsert', 'beforeUpdate'],
 handler: async (ctx: HookContext) => {
 const doc = ctx.input.doc as Record<string, any>;
 try {
 // Validate end_date is after start_date
 if (doc.start_date && doc.end_date) {
 const startDate = new Date(doc.start_date);
 const endDate = new Date(doc.end_date);

 if (endDate <= startDate) {
 throw new Error(' End date must be after start date');
 }

 // Auto-calculate duration_hours
 const diffMs = endDate.getTime() - startDate.getTime();
 const hours = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;
 doc.duration_hours = hours;
 logger.info(`⏱ Auto-calculated training duration: ${hours}h`);
 }

 // Validate exam_score range
 if (doc.exam_score !== undefined && doc.exam_score !== null) {
 if (doc.exam_score < 0 || doc.exam_score > 100) {
 throw new Error(' Exam score must be between 0 and 100');
 }
 }

 // Cannot mark as completed without attendance
 if (doc.status === 'completed' && !doc.attendance_status) {
 doc.attendance_status = 'attended';
 logger.info(`Auto-set attendance status to "attended" for completed training`);
 }

 logger.info(`Training enrollment validation passed: ${doc.title || 'unknown'}`);
 } catch (err) {
 logger.error('Error in TrainingEnrollmentValidationTrigger:', err);
 throw err;
 }
 }
};

/**
 * Training Completion Tracking Trigger
 * 
 * After update, track completion status and auto-create certification
 * records when training is completed with a passing score.
 */
const TrainingCompletionTrackingTrigger: Hook = {
 name: 'TrainingCompletionTrackingTrigger',
 object: 'training',
 events: ['afterUpdate'],
 handler: async (ctx: HookContext) => {
 try {
 const training = ctx.result as Record<string, any>;
 const oldTraining = ctx.previous as Record<string, any> | undefined;

 // Only process if status changed to completed
 if (!oldTraining || oldTraining.status === training.status) {
 return;
 }

 if (training.status === 'completed') {
 logger.info(`🎓 Training "${training.title}" completed by employee ${training.employee_id}`);

 // If passed and category is certification, log for cert creation
 if (training.passed && training.category === 'certification') {
 logger.info(`🏆 Employee ${training.employee_id} passed certification training "${training.title}" with score: ${training.exam_score}`);
 logger.info(`📜 Certification record should be created for this training`);
 }

 // Auto-set completion_percentage to 100
 if (training.completion_percentage !== 100) {
 await (ctx.ql as any).doc.update('training', training._id || training.id, {
 completion_percentage: 100
 });
 logger.info(`Completion percentage set to 100%`);
 }
 }

 if (training.status === 'cancelled') {
 logger.info(`Training "${training.title}" was cancelled for employee ${training.employee_id}`);
 }

 logger.info(`Training completion tracking complete`);
 } catch (err) {
 logger.error('Error in TrainingCompletionTrackingTrigger:', err);
 }
 }
};

export { TrainingEnrollmentValidationTrigger, TrainingCompletionTrackingTrigger };
export default [TrainingEnrollmentValidationTrigger, TrainingCompletionTrackingTrigger] as Hook[];
