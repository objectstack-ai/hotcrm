import type { Hook, HookContext } from '@objectstack/spec/data';

import { createLogger } from '@hotcrm/core';
const logger = createLogger('marketing:lead_nurture');

/**
 * Nurture Enrollment Trigger
 * 
 * When program status changes:
 * - If activated, validate enrollment_criteria is set
 * - Recalculate graduation_rate = (total_graduated / total_enrolled) * 100
 * - If all enrolled have graduated or dropped, auto-set status to 'completed'
 */
const NurtureEnrollmentTrigger: Hook = {
 name: 'NurtureEnrollmentTrigger',
 object: 'lead_nurture_program',
 events: ['beforeUpdate'],
 handler: async (ctx: HookContext) => {
 try {
 const program = ctx.input.doc as Record<string, any>;
 const oldProgram = ctx.previous as Record<string, any> | undefined;

 // If activating, validate enrollment_criteria
 const isActivating = program.status === 'active' &&
 (!oldProgram || oldProgram.status !== 'active');

 if (isActivating && !program.enrollment_criteria) {
 logger.error(`Cannot activate nurture program without enrollment_criteria`);
 program.status = oldProgram?.status || 'draft';
 return;
 }

 if (isActivating) {
 logger.info(`🚀 Nurture program "${program.name}" activated`);
 }

 // Recalculate graduation_rate
 const totalEnrolled = program.total_enrolled || 0;
 const totalGraduated = program.total_graduated || 0;

 if (totalEnrolled > 0) {
 program.graduation_rate = (totalGraduated / totalEnrolled) * 100;
 logger.info(`🎓 Graduation rate: ${program.graduation_rate.toFixed(2)}%`);
 } else {
 program.graduation_rate = 0;
 }

 // Auto-complete if all enrolled have graduated or dropped
 const totalDropped = program.total_dropped || 0;
 if (totalEnrolled > 0 && (totalGraduated + totalDropped) >= totalEnrolled) {
 if (program.status === 'active') {
 program.status = 'completed';
 logger.info(`Nurture program "${program.name}" auto-completed - all enrolled have graduated or dropped`);
 }
 }

 } catch (error) {
 logger.error(`[lead_nurture.hook] enrollment trigger failed:`, error);
 }
 }
};

/**
 * Nurture Graduation Trigger
 * 
 * When total_graduated increases:
 * - Log graduation milestone
 * - If graduation_rate > 50%, log success metric
 */
const NurtureGraduationTrigger: Hook = {
 name: 'NurtureGraduationTrigger',
 object: 'lead_nurture_program',
 events: ['afterUpdate'],
 handler: async (ctx: HookContext) => {
 try {
 const program = ctx.result as Record<string, any>;
 const oldProgram = ctx.previous as Record<string, any> | undefined;

 // Check if total_graduated increased
 const oldGraduated = oldProgram?.total_graduated || 0;
 const newGraduated = program.total_graduated || 0;

 if (newGraduated <= oldGraduated) {
 return;
 }

 logger.info(`🎓 Graduation milestone: ${newGraduated} total graduates for program "${program.name}"`);

 // Check graduation_rate for success metric
 const totalEnrolled = program.total_enrolled || 0;
 if (totalEnrolled > 0) {
 const graduationRate = (newGraduated / totalEnrolled) * 100;

 if (graduationRate > 50) {
 logger.info(`🏆 Success metric: Graduation rate ${graduationRate.toFixed(2)}% exceeds 50% for program "${program.name}"`);
 }
 }

 } catch (error) {
 logger.error(`[lead_nurture.hook] graduation trigger failed:`, error);
 }
 }
};

// Export all hooks
export {
 NurtureEnrollmentTrigger,
 NurtureGraduationTrigger
};

export default [
 NurtureEnrollmentTrigger,
 NurtureGraduationTrigger
] as Hook[];
