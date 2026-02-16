// State machine configuration for application lifecycle
import { StateMachineSchema, type StateMachineConfig } from '@objectstack/spec/automation';

/**
 * Application State Machine
 * Manages the admissions application lifecycle from submission through review to final decision.
 */
export const ApplicationStateMachine = {
  name: 'application_lifecycle',
  label: 'Application Lifecycle State Machine',
  object: 'application_form',
  description: 'Manages application states from submission through review to acceptance or rejection',

  initial: 'submitted',

  states: [
    {
      name: 'submitted',
      label: 'Submitted',
      description: 'Application has been received and is awaiting initial review',
      onEntry: [
        { type: 'fieldUpdate', field: 'status', value: 'submitted' },
        { type: 'fieldUpdate', field: 'application_date', value: 'NOW()' },
        {
          type: 'emailAlert',
          template: 'application_received_confirmation',
          recipients: ['${email}'],
        },
      ],
      transitions: [
        {
          to: 'under_review',
          event: 'start_review',
          guard: 'recommendations >= 1 AND gpa > 0',
          description: 'Begin reviewing the application when materials are complete',
          actions: [
            {
              type: 'taskCreation',
              subject: 'Review application: ${applicant_name}',
              assignee: 'admissions_committee',
              dueDate: 'TODAY() + 14',
              priority: 'medium',
            },
          ],
        },
      ],
    },
    {
      name: 'under_review',
      label: 'Under Review',
      description: 'Application is being evaluated by the admissions committee',
      onEntry: [
        { type: 'fieldUpdate', field: 'status', value: 'under_review' },
      ],
      transitions: [
        {
          to: 'interview',
          event: 'schedule_interview',
          description: 'Schedule an interview with the applicant',
          actions: [
            {
              type: 'emailAlert',
              template: 'interview_invitation',
              recipients: ['${email}'],
            },
          ],
        },
        {
          to: 'waitlisted',
          event: 'waitlist',
          description: 'Place applicant on the waitlist',
          actions: [
            { type: 'fieldUpdate', field: 'decision', value: 'waitlist' },
            {
              type: 'emailAlert',
              template: 'waitlist_notification',
              recipients: ['${email}'],
            },
          ],
        },
        {
          to: 'accepted',
          event: 'accept',
          guard: 'gpa >= 2.0',
          description: 'Accept the applicant',
          actions: [
            { type: 'fieldUpdate', field: 'decision', value: 'admit' },
            { type: 'fieldUpdate', field: 'decision_date', value: 'NOW()' },
          ],
        },
        {
          to: 'rejected',
          event: 'reject',
          description: 'Reject the application',
          actions: [
            { type: 'fieldUpdate', field: 'decision', value: 'deny' },
            { type: 'fieldUpdate', field: 'decision_date', value: 'NOW()' },
          ],
        },
      ],
    },
    {
      name: 'interview',
      label: 'Interview',
      description: 'Applicant has been invited for an interview',
      onEntry: [
        { type: 'fieldUpdate', field: 'status', value: 'interview' },
      ],
      transitions: [
        {
          to: 'accepted',
          event: 'accept',
          description: 'Accept following successful interview',
          actions: [
            { type: 'fieldUpdate', field: 'decision', value: 'admit' },
            { type: 'fieldUpdate', field: 'decision_date', value: 'NOW()' },
          ],
        },
        {
          to: 'rejected',
          event: 'reject',
          description: 'Reject following interview',
          actions: [
            { type: 'fieldUpdate', field: 'decision', value: 'deny' },
            { type: 'fieldUpdate', field: 'decision_date', value: 'NOW()' },
          ],
        },
        {
          to: 'waitlisted',
          event: 'waitlist',
          description: 'Place on waitlist after interview',
        },
      ],
    },
    {
      name: 'waitlisted',
      label: 'Waitlisted',
      description: 'Application is on the waitlist pending available spots',
      onEntry: [
        { type: 'fieldUpdate', field: 'status', value: 'waitlisted' },
      ],
      transitions: [
        {
          to: 'accepted',
          event: 'accept',
          description: 'Accept from waitlist when spots become available',
          actions: [
            { type: 'fieldUpdate', field: 'decision', value: 'admit' },
            { type: 'fieldUpdate', field: 'decision_date', value: 'NOW()' },
          ],
        },
        {
          to: 'rejected',
          event: 'reject',
          description: 'Reject from waitlist when no spots available',
          actions: [
            { type: 'fieldUpdate', field: 'decision', value: 'deny' },
            { type: 'fieldUpdate', field: 'decision_date', value: 'NOW()' },
          ],
        },
      ],
    },
    {
      name: 'accepted',
      label: 'Accepted',
      description: 'Applicant has been accepted to the program',
      type: 'final',
      onEntry: [
        { type: 'fieldUpdate', field: 'status', value: 'accepted' },
        {
          type: 'emailAlert',
          template: 'acceptance_letter',
          recipients: ['${email}'],
        },
        {
          type: 'taskCreation',
          subject: 'Enrollment package: ${applicant_name}',
          assignee: 'registrar',
          dueDate: 'TODAY() + 30',
          priority: 'high',
        },
      ],
      transitions: [
        {
          to: 'enrolled',
          event: 'enroll',
          description: 'Applicant confirms enrollment',
          actions: [
            { type: 'fieldUpdate', field: 'status', value: 'enrolled' },
          ],
        },
      ],
    },
    {
      name: 'enrolled',
      label: 'Enrolled',
      description: 'Applicant has confirmed enrollment',
      type: 'final',
      onEntry: [
        { type: 'fieldUpdate', field: 'status', value: 'enrolled' },
        {
          type: 'emailAlert',
          template: 'enrollment_confirmation',
          recipients: ['${email}'],
        },
      ],
      transitions: [],
    },
    {
      name: 'rejected',
      label: 'Rejected',
      description: 'Application has been denied',
      type: 'final',
      onEntry: [
        { type: 'fieldUpdate', field: 'status', value: 'rejected' },
        {
          type: 'emailAlert',
          template: 'rejection_notification',
          recipients: ['${email}'],
        },
      ],
      transitions: [],
    },
  ],

  globalGuards: {
    hasCompleteMaterials: 'recommendations >= 1 AND gpa > 0',
    meetsMinimumGPA: 'gpa >= 2.0',
  },

  events: {
    start_review: 'Begin reviewing the submitted application',
    schedule_interview: 'Schedule an interview with the applicant',
    accept: 'Accept the applicant to the program',
    reject: 'Reject the application',
    waitlist: 'Place the applicant on the waitlist',
    enroll: 'Confirm applicant enrollment',
  },
};

// Spec-validated state machine definition
export const ValidatedApplicationStateMachine = StateMachineSchema.parse({
  id: 'application_lifecycle',
  initial: 'submitted',
  states: {
    submitted: { type: 'atomic' },
    under_review: { type: 'atomic' },
    interview: { type: 'atomic' },
    waitlisted: { type: 'atomic' },
    accepted: { type: 'final' },
    enrolled: { type: 'final' },
    rejected: { type: 'final' },
  },
} satisfies StateMachineConfig);

export default ApplicationStateMachine;
