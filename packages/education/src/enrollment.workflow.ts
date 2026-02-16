// Workflow rules for Enrollment automation
import { WorkflowRuleSchema, type WorkflowRule } from '@objectstack/spec/automation';

/**
 * Enrollment Registration Workflow
 * Sends confirmation when a student enrolls in a course.
 */
export const EnrollmentRegistration = {
  name: 'enrollment_registration',
  label: 'Enrollment Registration',
  object: 'enrollment',
  description: 'Send confirmation and update records when a student enrolls in a course',

  triggerType: 'onCreate',

  condition: 'status = "enrolled"',

  actions: [
    {
      type: 'fieldUpdate',
      field: 'enrollment_date',
      value: 'NOW()'
    },
    {
      type: 'emailAlert',
      template: 'enrollment_confirmation',
      recipients: ['${student_id.email}']
    },
    {
      type: 'taskCreation',
      subject: 'New enrollment: ${student_id.name} in ${course_id.name}',
      description: 'Verify prerequisites and finalize registration',
      assignee: 'registrar',
      dueDate: 'TODAY() + 3',
      priority: 'medium',
      status: 'not_started'
    }
  ],

  executionOrder: 1,
  active: true
};

/**
 * Grade Posted Workflow
 * Updates enrollment status when a grade is recorded.
 */
export const GradePosted = {
  name: 'grade_posted',
  label: 'Grade Posted',
  object: 'enrollment',
  description: 'Update enrollment status and notify student when a final grade is posted',

  triggerType: 'onCreateOrUpdate',

  condition: 'ISCHANGED(grade) AND grade != NULL',

  actions: [
    {
      type: 'fieldUpdate',
      field: 'status',
      value: 'completed'
    },
    {
      type: 'emailAlert',
      template: 'grade_posted_notification',
      recipients: ['${student_id.email}']
    }
  ],

  executionOrder: 2,
  active: true
};

/**
 * Course Drop Workflow
 * Handles student course drops and notifications.
 */
export const CourseDrop = {
  name: 'course_drop',
  label: 'Course Drop',
  object: 'enrollment',
  description: 'Process course drop and notify relevant parties',

  triggerType: 'onCreateOrUpdate',

  condition: 'status = "dropped" AND ISCHANGED(status)',

  actions: [
    {
      type: 'emailAlert',
      template: 'course_drop_confirmation',
      recipients: ['${student_id.email}']
    },
    {
      type: 'taskCreation',
      subject: 'Course drop processed: ${student_id.name} from ${course_id.name}',
      description: 'Update financial aid and billing records',
      assignee: 'registrar',
      dueDate: 'TODAY() + 5',
      priority: 'medium',
      status: 'not_started'
    }
  ],

  executionOrder: 3,
  active: true
};

/**
 * Academic Probation Check Workflow
 * Scheduled check for students falling below minimum GPA requirements.
 */
export const AcademicProbationCheck = {
  name: 'academic_probation_check',
  label: 'Academic Probation Check',
  object: 'enrollment',
  description: 'Flag students with GPA below 2.0 for academic probation review',

  triggerType: 'scheduled',
  schedule: {
    frequency: 'monthly',
    time: '06:00',
    timezone: 'UTC'
  },

  condition: 'status = "completed"',

  actions: [
    {
      type: 'taskCreation',
      subject: 'Academic standing review: ${student_id.name}',
      description: 'Review academic standing and advising requirements',
      assignee: '${student_id.advisor_id}',
      dueDate: 'TODAY() + 7',
      priority: 'high',
      status: 'not_started'
    }
  ],

  active: true
};

export const EnrollmentWorkflows = {
  registration: EnrollmentRegistration,
  gradePosted: GradePosted,
  courseDrop: CourseDrop,
  academicProbationCheck: AcademicProbationCheck
};

export default EnrollmentWorkflows;

// Spec-validated workflow definitions
export const ValidatedWorkflows = {
  enrollmentRegistration: WorkflowRuleSchema.parse({
    name: 'enrollment_registration',
    objectName: 'enrollment',
    triggerType: 'on_create',
    active: true,
    actions: [{ type: 'field_update', name: 'set_enrollment_date', field: 'enrollment_date', value: 'NOW()' }],
    executionOrder: 1,
    reevaluateOnChange: false,
  } satisfies WorkflowRule),

  gradePosted: WorkflowRuleSchema.parse({
    name: 'grade_posted',
    objectName: 'enrollment',
    triggerType: 'on_create_or_update',
    active: true,
    actions: [{ type: 'field_update', name: 'set_completed', field: 'status', value: 'completed' }],
    executionOrder: 2,
    reevaluateOnChange: false,
  } satisfies WorkflowRule),

  courseDrop: WorkflowRuleSchema.parse({
    name: 'course_drop',
    objectName: 'enrollment',
    triggerType: 'on_create_or_update',
    active: true,
    actions: [{ type: 'field_update', name: 'process_drop', field: 'status', value: 'dropped' }],
    executionOrder: 3,
    reevaluateOnChange: false,
  } satisfies WorkflowRule),

  academicProbationCheck: WorkflowRuleSchema.parse({
    name: 'academic_probation_check',
    objectName: 'enrollment',
    triggerType: 'schedule',
    active: true,
    actions: [{ type: 'field_update', name: 'flag_probation', field: 'status', value: 'flagged' }],
    executionOrder: 4,
    reevaluateOnChange: false,
  } satisfies WorkflowRule),
};
