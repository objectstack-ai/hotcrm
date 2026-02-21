// State machine configuration for idea lifecycle
import { StateMachineSchema, type StateMachineConfig } from '@objectstack/spec/automation';

/**
 * Idea Lifecycle State Machine
 * Manages the complete lifecycle of community ideas from submission through implementation or rejection.
 */
export const IdeaLifecycleStateMachine = {
  name: 'idea_lifecycle',
  label: 'Idea Lifecycle State Machine',
  object: 'idea',
  description: 'Manages idea states from submission through review, planning, development, implementation, or rejection',

  initial: 'submitted',

  states: [
    {
      name: 'submitted',
      label: 'Submitted',
      description: 'Idea has been submitted by a community member and is awaiting review',
      onEntry: [
        { type: 'fieldUpdate', field: 'status', value: 'submitted' },
        { type: 'fieldUpdate', field: 'submitted_date', value: 'NOW()' },
      ],
      transitions: [
        {
          to: 'under_review',
          event: 'review',
          description: 'Move idea to review by the product team',
          actions: [
            { type: 'fieldUpdate', field: 'review_started_date', value: 'NOW()' },
            {
              type: 'emailAlert',
              template: 'idea_under_review_notification',
              recipients: ['${author.email}'],
            },
          ],
        },
        {
          to: 'rejected',
          event: 'reject',
          description: 'Reject the submitted idea',
          actions: [
            { type: 'fieldUpdate', field: 'rejection_reason', value: '${reason}' },
          ],
        },
      ],
    },
    {
      name: 'under_review',
      label: 'Under Review',
      description: 'Idea is being reviewed by the product team',
      onEntry: [
        { type: 'fieldUpdate', field: 'status', value: 'under_review' },
        {
          type: 'taskCreation',
          subject: 'Review community idea: ${title}',
          assignee: '${owner.id}',
          dueDate: 'TODAY() + 14',
          priority: 'medium',
        },
      ],
      transitions: [
        {
          to: 'planned',
          event: 'plan',
          description: 'Accept and plan the idea for future development',
          actions: [
            { type: 'fieldUpdate', field: 'planned_date', value: 'NOW()' },
            {
              type: 'emailAlert',
              template: 'idea_planned_notification',
              recipients: ['${author.email}'],
            },
          ],
        },
        {
          to: 'rejected',
          event: 'reject',
          description: 'Reject the idea after review',
          actions: [
            { type: 'fieldUpdate', field: 'rejection_reason', value: '${reason}' },
          ],
        },
        {
          to: 'submitted',
          event: 'reopen',
          description: 'Return idea to submitted for additional information',
        },
      ],
    },
    {
      name: 'planned',
      label: 'Planned',
      description: 'Idea has been accepted and planned for development',
      onEntry: [
        { type: 'fieldUpdate', field: 'status', value: 'planned' },
      ],
      transitions: [
        {
          to: 'in_progress',
          event: 'start_development',
          description: 'Begin development of the planned idea',
          actions: [
            { type: 'fieldUpdate', field: 'development_started_date', value: 'NOW()' },
            {
              type: 'emailAlert',
              template: 'idea_in_progress_notification',
              recipients: ['${author.email}'],
            },
          ],
        },
        {
          to: 'rejected',
          event: 'reject',
          description: 'Cancel the planned idea',
          actions: [
            { type: 'fieldUpdate', field: 'rejection_reason', value: '${reason}' },
          ],
        },
      ],
    },
    {
      name: 'in_progress',
      label: 'In Progress',
      description: 'Idea is actively being developed',
      onEntry: [
        { type: 'fieldUpdate', field: 'status', value: 'in_progress' },
        {
          type: 'taskCreation',
          subject: 'Complete implementation of idea: ${title}',
          assignee: '${owner.id}',
          dueDate: 'TODAY() + 30',
          priority: 'high',
        },
      ],
      transitions: [
        {
          to: 'implemented',
          event: 'implement',
          description: 'Mark the idea as implemented',
          actions: [
            { type: 'fieldUpdate', field: 'implemented_date', value: 'NOW()' },
            {
              type: 'emailAlert',
              template: 'idea_implemented_notification',
              recipients: ['${author.email}'],
            },
          ],
        },
        {
          to: 'rejected',
          event: 'reject',
          description: 'Cancel development of the idea',
          actions: [
            { type: 'fieldUpdate', field: 'rejection_reason', value: '${reason}' },
          ],
        },
      ],
    },
    {
      name: 'implemented',
      label: 'Implemented',
      description: 'Idea has been fully implemented',
      type: 'final',
      onEntry: [
        { type: 'fieldUpdate', field: 'status', value: 'implemented' },
      ],
    },
    {
      name: 'rejected',
      label: 'Rejected',
      description: 'Idea has been rejected',
      type: 'final',
      onEntry: [
        { type: 'fieldUpdate', field: 'status', value: 'rejected' },
        { type: 'fieldUpdate', field: 'rejected_date', value: 'NOW()' },
      ],
      transitions: [
        {
          to: 'submitted',
          event: 'reopen',
          guard: 'DAYS_BETWEEN(rejected_date, NOW()) <= 90',
          description: 'Reopen a recently rejected idea for reconsideration',
        },
      ],
    },
  ],

  globalGuards: {
    hasAuthor: 'author_id != NULL',
    isNotImplemented: 'status != "implemented"',
  },

  events: {
    review: 'Move idea to review',
    plan: 'Accept and plan the idea',
    start_development: 'Begin development of the idea',
    implement: 'Mark idea as implemented',
    reject: 'Reject the idea',
    reopen: 'Reopen a rejected idea',
  },
};

// Spec-validated state machine definition
export const ValidatedIdeaLifecycleStateMachine = StateMachineSchema.parse({
  id: 'idea_lifecycle',
  initial: 'submitted',
  states: {
    submitted: { type: 'atomic' },
    under_review: { type: 'atomic' },
    planned: { type: 'atomic' },
    in_progress: { type: 'atomic' },
    implemented: { type: 'final' },
    rejected: { type: 'final' },
  },
} satisfies StateMachineConfig);

export default IdeaLifecycleStateMachine;
