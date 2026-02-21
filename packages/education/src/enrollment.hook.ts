import type { Hook, HookContext } from '@objectstack/spec/data';

import { createLogger } from '@hotcrm/core';
const logger = createLogger('education:enrollment');

/**
 * Enrollment Prerequisite Check
 *
 * Verifies prerequisites are met before enrollment.
 */
const EnrollmentPrerequisiteCheck: Hook = {
 name: 'EnrollmentPrerequisiteCheck',
 object: 'enrollment',
 events: ['beforeInsert'],
 handler: async (ctx: HookContext) => {
 const doc = ctx.input.doc as Record<string, any>;

 if (!doc.course_id || !doc.student_id) return;

 try {
 const course = await (ctx.ql as any).findOne('course', doc.course_id);
 if (!course?.prerequisites) return;

 const prereqs = JSON.parse(course.prerequisites);
 if (!Array.isArray(prereqs) || prereqs.length === 0) return;

 const completedEnrollments = await (ctx.ql as any).find('enrollment', {
 filters: [
 ['student_id', '=', doc.student_id],
 ['status', '=', 'completed']
 ]
 });

 const completedCourseIds = completedEnrollments.map((e: any) => e.course_id);
 const missingPrereqs = prereqs.filter((p: string) => !completedCourseIds.includes(p));

 if (missingPrereqs.length > 0) {
 throw new Error(`Missing prerequisites: ${missingPrereqs.join(', ')}`);
 }
 } catch (error) {
 if ((error as Error).message?.includes('Missing prerequisites')) throw error;
 logger.warn('Failed to check prerequisites:', error);
 }
 }
};

/**
 * Enrollment Capacity Enforcement
 *
 * Checks course capacity before enrollment.
 */
const EnrollmentCapacityEnforcement: Hook = {
 name: 'EnrollmentCapacityEnforcement',
 object: 'enrollment',
 events: ['beforeInsert'],
 handler: async (ctx: HookContext) => {
 const doc = ctx.input.doc as Record<string, any>;

 if (!doc.course_id) return;

 try {
 const course = await (ctx.ql as any).findOne('course', doc.course_id);
 if (!course?.capacity) return;

 const enrolledCount = await (ctx.ql as any).count('enrollment', {
 filters: [
 ['course_id', '=', doc.course_id],
 ['status', '=', 'enrolled']
 ]
 });

 if (enrolledCount >= course.capacity) {
 throw new Error(`Course ${doc.course_id} is at full capacity (${course.capacity})`);
 }
 } catch (error) {
 if ((error as Error).message?.includes('full capacity')) throw error;
 logger.warn('Failed to check course capacity:', error);
 }
 }
};

/**
 * Enrollment Waitlist Management
 *
 * Adds to waitlist if course is full after insert.
 */
const EnrollmentWaitlistManagement: Hook = {
 name: 'EnrollmentWaitlistManagement',
 object: 'enrollment',
 events: ['afterInsert'],
 handler: async (ctx: HookContext) => {
 const enrollment = ctx.result as Record<string, any>;
 if (!enrollment?._id || !enrollment?.course_id) return;

 try {
 const course = await (ctx.ql as any).findOne('course', enrollment.course_id);
 if (!course?.capacity) return;

 const enrolledCount = await (ctx.ql as any).count('enrollment', {
 filters: [
 ['course_id', '=', enrollment.course_id],
 ['status', '=', 'enrolled']
 ]
 });

 if (enrolledCount > course.capacity) {
 logger.info(`Course ${enrollment.course_id} over capacity — adding ${enrollment._id} to waitlist`);
 }
 } catch (error) {
 logger.warn('Failed to manage waitlist:', error);
 }
 }
};

/**
 * Enrollment Grade Posting
 *
 * Updates student GPA when grade is posted.
 */
const EnrollmentGradePosting: Hook = {
 name: 'EnrollmentGradePosting',
 object: 'enrollment',
 events: ['afterUpdate'],
 handler: async (ctx: HookContext) => {
 const doc = ctx.input.doc as Record<string, any>;
 const result = ctx.result as Record<string, any>;

 if (doc.grade === undefined || !result?.student_id) return;

 const gradePoints: Record<string, number> = {
 'A': 4.0, 'A-': 3.7, 'B+': 3.3, 'B': 3.0, 'B-': 2.7,
 'C+': 2.3, 'C': 2.0, 'C-': 1.7, 'D+': 1.3, 'D': 1.0, 'F': 0.0
 };

 try {
 const enrollments = await (ctx.ql as any).find('enrollment', {
 filters: [
 ['student_id', '=', result.student_id],
 ['status', '=', 'completed']
 ]
 });

 let totalPoints = 0;
 let totalCredits = 0;
 for (const e of enrollments) {
 const points = gradePoints[e.grade];
 if (points !== undefined && e.credits) {
 totalPoints += points * e.credits;
 totalCredits += e.credits;
 }
 }

 if (totalCredits > 0) {
 const gpa = Math.round((totalPoints / totalCredits) * 100) / 100;
 await (ctx.ql as any).doc.update('student', result.student_id, { gpa });
 logger.info(`Updated GPA for student ${result.student_id}: ${gpa}`);
 }
 } catch (error) {
 logger.warn('Failed to update student GPA:', error);
 }
 }
};

export { EnrollmentPrerequisiteCheck, EnrollmentCapacityEnforcement, EnrollmentWaitlistManagement, EnrollmentGradePosting };
export default EnrollmentPrerequisiteCheck;
