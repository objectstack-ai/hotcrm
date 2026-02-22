import type { Hook, HookContext } from '@objectstack/spec/data';

import { createLogger } from '@hotcrm/core';
const logger = createLogger('education:student');

/**
 * Student Enrollment Validation
 *
 * Validates enrollment status transitions before update.
 */
const StudentEnrollmentValidation: Hook = {
  name: 'StudentEnrollmentValidation',
  object: 'student',
  events: ['beforeUpdate'],
  handler: async (ctx: HookContext) => {
    const doc = ctx.input.doc as Record<string, any>;

    if (!doc.enrollment_status) return;

    const validTransitions: Record<string, string[]> = {
      prospective: ['applied'],
      applied: ['admitted', 'prospective'],
      admitted: ['enrolled', 'withdrawn'],
      enrolled: ['graduated', 'withdrawn', 'suspended'],
      graduated: [],
      withdrawn: ['prospective'],
      suspended: ['enrolled', 'withdrawn']
    };

    const current = (ctx.result as Record<string, any>)?.enrollment_status || 'prospective';
    const next = doc.enrollment_status;

    if (current !== next && validTransitions[current] && !validTransitions[current].includes(next)) {
      throw new Error(`Invalid enrollment status transition from '${current}' to '${next}'`);
    }
  }
};

/**
 * Student Academic Standing
 *
 * Calculates academic standing from GPA after update.
 */
const StudentAcademicStanding: Hook = {
  name: 'StudentAcademicStanding',
  object: 'student',
  events: ['afterUpdate'],
  handler: async (ctx: HookContext) => {
    const result = ctx.result as Record<string, any>;
    const doc = ctx.input.doc as Record<string, any>;

    if (doc.gpa === undefined) return;

    const gpa = doc.gpa;
    let standing = 'good';
    if (gpa < 1.0) standing = 'academic_dismissal';
    else if (gpa < 2.0) standing = 'probation';
    else if (gpa >= 3.5) standing = 'honors';

    logger.info(`Student ${result?._id} academic standing: ${standing} (GPA: ${gpa})`);
  }
};

/**
 * Student Advisor Assignment
 *
 * Auto-assigns advisor based on program/major after insert.
 */
const StudentAdvisorAssignment: Hook = {
  name: 'StudentAdvisorAssignment',
  object: 'student',
  events: ['afterInsert'],
  handler: async (ctx: HookContext) => {
    const student = ctx.result as Record<string, any>;
    if (!student?._id) return;

    const program = student.program || student.major;
    if (!program) {
      logger.info(`Student ${student._id} has no program/major — skipping advisor assignment`);
      return;
    }

    try {
      const advisors = await (ctx.ql as any).find('contact', {
        filters: [['role', '=', 'advisor']],
        limit: 1
      });

      if (advisors.length > 0) {
        await (ctx.ql as any).doc.update('student', student._id, { advisor_id: advisors[0]._id });
        logger.info(`Auto-assigned advisor ${advisors[0]._id} to student ${student._id}`);
      }
    } catch (error) {
      logger.warn('Failed to auto-assign advisor:', error);
    }
  }
};

export { StudentEnrollmentValidation, StudentAcademicStanding, StudentAdvisorAssignment };
export default StudentEnrollmentValidation;
