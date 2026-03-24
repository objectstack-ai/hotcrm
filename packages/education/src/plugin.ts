/**
 * @hotcrm/education - Education Plugin Definition
 *
 * This plugin provides education management functionality including:
 * - Student Management
 * - Course Catalog
 * - Enrollment Tracking
 * - Scholarship Management
 * - Admissions Applications
 * - Alumni Network
 * - Campus Events
 * - AI-Powered Student Success & Engagement
 *
 * Dependencies: @hotcrm/core
 */

import { PluginSchema } from '@objectstack/spec/kernel';
import type { PluginDefinition } from '@objectstack/spec/kernel';

// Import all Education objects
import { Student } from './student.object.js';
import { Enrollment } from './enrollment.object.js';
import { Course } from './course.object.js';
import { Alumni } from './alumni.object.js';
import { Scholarship } from './scholarship.object.js';
import { ApplicationForm } from './application_form.object.js';
import { CampusEvent } from './campus_event.object.js';

// Import hooks
import { StudentEnrollmentValidation, StudentAcademicStanding, StudentAdvisorAssignment } from './student.hook.js';
import { EnrollmentPrerequisiteCheck, EnrollmentCapacityEnforcement, EnrollmentWaitlistManagement, EnrollmentGradePosting } from './enrollment.hook.js';
import { ScholarshipEligibilityVerification, ScholarshipFundTracking, ScholarshipAutoRenewal } from './scholarship.hook.js';
import { ApplicationCompletenessCheck, ApplicationReviewerAssignment, ApplicationDecisionWorkflow } from './application_form.hook.js';

// Import actions
import EducationAIAction from './education_ai.action.js';

// Import datasets
import { CourseDataset } from './course.dataset.js';
import { StudentDataset } from './student.dataset.js';
import { EnrollmentDataset } from './enrollment.dataset.js';
import { ScholarshipDataset } from './scholarship.dataset.js';

/**
 * Education Plugin Definition
 *
 * Exports all education-related business objects, hooks, and actions
 * to be registered with the ObjectStack runtime
 */
export const EducationPlugin = {
  name: 'education',
  label: 'Education Cloud',
  version: '1.0.0',
  description: 'Education management - Students, Courses, Enrollments, Scholarships, and Alumni Engagement',

  // Plugin dependencies
  dependencies: [],

  // Business objects provided by this plugin
  objects: {
    student: Student,
    enrollment: Enrollment,
    course: Course,
    alumni: Alumni,
    scholarship: Scholarship,
    application_form: ApplicationForm,
    campus_event: CampusEvent,
  },

  // Actions provided by this plugin
  actions: {
    education_ai: EducationAIAction,
  },

  // Triggers/Hooks
  triggers: {
    student_enrollment_validation: StudentEnrollmentValidation,
    student_academic_standing: StudentAcademicStanding,
    student_advisor_assignment: StudentAdvisorAssignment,
    enrollment_prerequisite_check: EnrollmentPrerequisiteCheck,
    enrollment_capacity_enforcement: EnrollmentCapacityEnforcement,
    enrollment_waitlist_management: EnrollmentWaitlistManagement,
    enrollment_grade_posting: EnrollmentGradePosting,
    scholarship_eligibility_verification: ScholarshipEligibilityVerification,
    scholarship_fund_tracking: ScholarshipFundTracking,
    scholarship_auto_renewal: ScholarshipAutoRenewal,
    application_completeness_check: ApplicationCompletenessCheck,
    application_reviewer_assignment: ApplicationReviewerAssignment,
    application_decision_workflow: ApplicationDecisionWorkflow,
  },

  // Seed data (DatasetSchema)
  data: [
    CourseDataset,
    StudentDataset,
    EnrollmentDataset,
    ScholarshipDataset,
  ],

  // Apps provided by this plugin
  apps: [
    {
      name: 'education',
      label: 'Education Cloud',
      navigation: [
        {
          id: 'students',
          type: 'group',
          label: 'Students',
          children: [
            { id: 'student', label: 'Student', type: 'object', objectName: 'student' },
            { id: 'alumni', label: 'Alumni', type: 'object', objectName: 'alumni' },
          ]
        },
        {
          id: 'academics',
          type: 'group',
          label: 'Academics',
          children: [
            { id: 'course', label: 'Course', type: 'object', objectName: 'course' },
            { id: 'enrollment', label: 'Enrollment', type: 'object', objectName: 'enrollment' },
            { id: 'scholarship', label: 'Scholarship', type: 'object', objectName: 'scholarship' },
          ]
        },
        {
          id: 'admissions',
          type: 'group',
          label: 'Admissions',
          children: [
            { id: 'application_form', label: 'Application', type: 'object', objectName: 'application_form' },
          ]
        },
        {
          id: 'campus_life',
          type: 'group',
          label: 'Campus Life',
          children: [
            { id: 'campus_event', label: 'Campus Event', type: 'object', objectName: 'campus_event' },
          ]
        }
      ]
    }
  ]
};

/** Spec-validated plugin metadata */
export const EducationPluginMetadata: PluginDefinition = PluginSchema.parse({
  name: 'education',
  label: 'Education Cloud',
  version: '1.0.0',
  description: 'Education management - Students, Courses, Enrollments, Scholarships, and Alumni Engagement',
});

export default EducationPlugin;
