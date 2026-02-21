// State machine configuration for employee lifecycle
import { StateMachineSchema, type StateMachineConfig } from '@objectstack/spec/automation';

/**
 * Employee Lifecycle State Machine
 * Manages the complete lifecycle of employees from candidate through termination.
 */
export const EmployeeLifecycleStateMachine = {
  name: 'employee_lifecycle',
  label: 'Employee Lifecycle State Machine',
  object: 'employee',
  description: 'Manages employee states from candidate screening through hiring, onboarding, active employment, leave management, and termination',

  initial: 'candidate',

  states: [
    {
      name: 'candidate',
      label: 'Candidate',
      description: 'Individual has applied and is being evaluated for a position',
      onEntry: [
        { type: 'fieldUpdate', field: 'status', value: 'candidate' },
        { type: 'fieldUpdate', field: 'application_date', value: 'NOW()' },
      ],
      transitions: [
        {
          to: 'hired',
          event: 'hire',
          guard: 'offer_accepted == true AND start_date != NULL',
          description: 'Extend and accept an offer to the candidate',
          actions: [
            { type: 'fieldUpdate', field: 'hire_date', value: 'NOW()' },
            {
              type: 'emailAlert',
              template: 'offer_accepted_notification',
              recipients: ['${candidate.email}'],
            },
          ],
        },
      ],
    },
    {
      name: 'hired',
      label: 'Hired',
      description: 'Candidate has accepted the offer and is awaiting onboarding',
      onEntry: [
        { type: 'fieldUpdate', field: 'status', value: 'hired' },
        {
          type: 'taskCreation',
          subject: 'Prepare onboarding for: ${employee_name}',
          assignee: '${hr_manager.id}',
          dueDate: 'TODAY() + 5',
          priority: 'high',
        },
      ],
      transitions: [
        {
          to: 'onboarding',
          event: 'start_onboarding',
          description: 'Begin the employee onboarding process',
          actions: [
            { type: 'fieldUpdate', field: 'onboarding_start_date', value: 'NOW()' },
            {
              type: 'emailAlert',
              template: 'onboarding_welcome',
              recipients: ['${employee.email}'],
            },
          ],
        },
      ],
    },
    {
      name: 'onboarding',
      label: 'Onboarding',
      description: 'Employee is going through the onboarding process',
      onEntry: [
        { type: 'fieldUpdate', field: 'status', value: 'onboarding' },
        {
          type: 'taskCreation',
          subject: 'Complete onboarding checklist for: ${employee_name}',
          assignee: '${employee.id}',
          dueDate: 'TODAY() + 30',
          priority: 'high',
        },
      ],
      transitions: [
        {
          to: 'active',
          event: 'activate',
          guard: 'onboarding_complete == true',
          description: 'Onboarding completed, employee is now fully active',
          actions: [
            { type: 'fieldUpdate', field: 'onboarding_complete_date', value: 'NOW()' },
          ],
        },
      ],
    },
    {
      name: 'active',
      label: 'Active',
      description: 'Employee is actively working',
      onEntry: [
        { type: 'fieldUpdate', field: 'status', value: 'active' },
      ],
      transitions: [
        {
          to: 'on_leave',
          event: 'request_leave',
          guard: 'leave_approved == true AND leave_start_date != NULL',
          description: 'Employee goes on approved leave',
          actions: [
            { type: 'fieldUpdate', field: 'leave_start_date', value: '${leave_start_date}' },
            {
              type: 'emailAlert',
              template: 'leave_confirmation',
              recipients: ['${employee.email}'],
            },
          ],
        },
        {
          to: 'terminated',
          event: 'terminate',
          description: 'Terminate the employee',
          actions: [
            { type: 'fieldUpdate', field: 'termination_date', value: 'NOW()' },
            { type: 'fieldUpdate', field: 'termination_reason', value: '${reason}' },
          ],
        },
      ],
    },
    {
      name: 'on_leave',
      label: 'On Leave',
      description: 'Employee is on approved leave of absence',
      onEntry: [
        { type: 'fieldUpdate', field: 'status', value: 'on_leave' },
        {
          type: 'taskCreation',
          subject: 'Follow up on return date for: ${employee_name}',
          assignee: '${hr_manager.id}',
          dueDate: '${leave_end_date}',
          priority: 'medium',
        },
      ],
      transitions: [
        {
          to: 'active',
          event: 'return_from_leave',
          description: 'Employee returns from leave to active status',
          actions: [
            { type: 'fieldUpdate', field: 'leave_return_date', value: 'NOW()' },
          ],
        },
        {
          to: 'terminated',
          event: 'terminate',
          description: 'Terminate the employee while on leave',
          actions: [
            { type: 'fieldUpdate', field: 'termination_date', value: 'NOW()' },
            { type: 'fieldUpdate', field: 'termination_reason', value: '${reason}' },
          ],
        },
      ],
    },
    {
      name: 'terminated',
      label: 'Terminated',
      description: 'Employee has been terminated or has resigned',
      type: 'final',
      onEntry: [
        { type: 'fieldUpdate', field: 'status', value: 'terminated' },
        {
          type: 'taskCreation',
          subject: 'Process offboarding for: ${employee_name}',
          assignee: '${hr_manager.id}',
          dueDate: 'TODAY() + 3',
          priority: 'high',
        },
      ],
    },
  ],

  globalGuards: {
    hasEmployee: 'employee_id != NULL',
    isNotTerminated: 'status != "terminated"',
  },

  events: {
    hire: 'Hire the candidate',
    start_onboarding: 'Begin onboarding process',
    activate: 'Activate the employee after onboarding',
    request_leave: 'Request leave of absence',
    return_from_leave: 'Return from leave',
    terminate: 'Terminate the employee',
  },
};

// Spec-validated state machine definition
export const ValidatedEmployeeLifecycleStateMachine = StateMachineSchema.parse({
  id: 'employee_lifecycle',
  initial: 'candidate',
  states: {
    candidate: { type: 'atomic' },
    hired: { type: 'atomic' },
    onboarding: { type: 'atomic' },
    active: { type: 'atomic' },
    on_leave: { type: 'atomic' },
    terminated: { type: 'final' },
  },
} satisfies StateMachineConfig);

export default EmployeeLifecycleStateMachine;
