// State machine configuration for patient lifecycle
import { StateMachineSchema, type StateMachineConfig } from '@objectstack/spec/automation';

/**
 * Patient Lifecycle State Machine
 * Manages the complete lifecycle of patients from registration through active care to discharge.
 */
export const PatientLifecycleStateMachine = {
  name: 'patient_lifecycle',
  label: 'Patient Lifecycle State Machine',
  object: 'patient',
  description: 'Manages patient states from initial registration through active care to discharge or transfer',

  initial: 'registered',

  states: [
    {
      name: 'registered',
      label: 'Registered',
      description: 'Patient has been registered but not yet seen by a provider',
      onEntry: [
        { type: 'fieldUpdate', field: 'status', value: 'registered' },
        { type: 'fieldUpdate', field: 'registration_date', value: 'NOW()' },
        {
          type: 'emailAlert',
          template: 'patient_registration_confirmation',
          recipients: ['${email}'],
        },
      ],
      transitions: [
        {
          to: 'active',
          event: 'admit',
          guard: 'primary_physician != NULL AND insurance != NULL',
          description: 'Patient has been admitted and assigned a provider',
          actions: [
            { type: 'fieldUpdate', field: 'admission_date', value: 'NOW()' },
            {
              type: 'taskCreation',
              subject: 'Initial assessment: ${name}',
              assignee: '${primary_physician}',
              dueDate: 'TODAY() + 1',
              priority: 'high',
            },
          ],
        },
        {
          to: 'inactive',
          event: 'deactivate',
          description: 'Patient did not complete registration requirements',
        },
      ],
    },
    {
      name: 'active',
      label: 'Active',
      description: 'Patient is actively receiving care',
      onEntry: [
        { type: 'fieldUpdate', field: 'status', value: 'active' },
      ],
      transitions: [
        {
          to: 'discharged',
          event: 'discharge',
          description: 'Patient has been discharged from care',
          actions: [
            { type: 'fieldUpdate', field: 'discharge_date', value: 'NOW()' },
            {
              type: 'emailAlert',
              template: 'patient_discharge_summary',
              recipients: ['${email}'],
            },
            {
              type: 'taskCreation',
              subject: 'Post-discharge follow-up: ${name}',
              assignee: '${primary_physician}',
              dueDate: 'TODAY() + 7',
              priority: 'medium',
            },
          ],
        },
        {
          to: 'on_hold',
          event: 'hold',
          description: 'Care temporarily paused pending insurance or authorization',
          actions: [
            { type: 'fieldUpdate', field: 'hold_reason', value: '${reason}' },
          ],
        },
      ],
    },
    {
      name: 'on_hold',
      label: 'On Hold',
      description: 'Patient care temporarily paused',
      onEntry: [
        { type: 'fieldUpdate', field: 'status', value: 'on_hold' },
      ],
      transitions: [
        {
          to: 'active',
          event: 'resume',
          description: 'Resume active care for the patient',
        },
        {
          to: 'discharged',
          event: 'discharge',
          description: 'Discharge patient while on hold',
          actions: [
            { type: 'fieldUpdate', field: 'discharge_date', value: 'NOW()' },
          ],
        },
      ],
    },
    {
      name: 'discharged',
      label: 'Discharged',
      description: 'Patient has been discharged from care',
      type: 'final',
      onEntry: [
        { type: 'fieldUpdate', field: 'status', value: 'discharged' },
      ],
      transitions: [
        {
          to: 'active',
          event: 'readmit',
          guard: 'DAYS_BETWEEN(discharge_date, NOW()) <= 365',
          description: 'Readmit a previously discharged patient',
          actions: [
            { type: 'fieldUpdate', field: 'admission_date', value: 'NOW()' },
          ],
        },
      ],
    },
    {
      name: 'inactive',
      label: 'Inactive',
      description: 'Patient record is inactive',
      type: 'final',
      onEntry: [
        { type: 'fieldUpdate', field: 'status', value: 'inactive' },
      ],
      transitions: [
        {
          to: 'registered',
          event: 'reactivate',
          description: 'Reactivate an inactive patient record',
        },
      ],
    },
  ],

  globalGuards: {
    hasPhysician: 'primary_physician != NULL',
    isNotDischarged: 'status != "discharged"',
  },

  events: {
    admit: 'Admit patient to active care',
    discharge: 'Discharge patient from care',
    hold: 'Place patient care on hold',
    resume: 'Resume patient care from hold',
    readmit: 'Readmit a discharged patient',
    deactivate: 'Deactivate patient record',
    reactivate: 'Reactivate an inactive patient',
  },
};

// Spec-validated state machine definition
export const ValidatedPatientLifecycleStateMachine = StateMachineSchema.parse({
  id: 'patient_lifecycle',
  initial: 'registered',
  states: {
    registered: { type: 'atomic' },
    active: { type: 'atomic' },
    on_hold: { type: 'atomic' },
    discharged: { type: 'final' },
    inactive: { type: 'final' },
  },
} satisfies StateMachineConfig);

export default PatientLifecycleStateMachine;
