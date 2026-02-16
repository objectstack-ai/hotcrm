// Workflow rules for Appointment automation
import { WorkflowRuleSchema, type WorkflowRule } from '@objectstack/spec/automation';

/**
 * Appointment Reminder Workflow
 * Automatically sends reminders to patients before scheduled appointments.
 */
export const AppointmentReminder = {
  name: 'appointment_reminder',
  label: 'Appointment Reminder',
  object: 'appointment',
  description: 'Send automated reminders to patients 24 hours before their appointment',

  triggerType: 'scheduled',
  schedule: {
    frequency: 'daily',
    time: '08:00',
    timezone: 'UTC'
  },

  condition: 'status = "confirmed" AND appointment_date = TODAY() + 1',

  actions: [
    {
      type: 'emailAlert',
      template: 'appointment_reminder_24h',
      recipients: ['${patient.email}']
    },
    {
      type: 'fieldUpdate',
      field: 'reminder_sent',
      value: 'true'
    }
  ],

  active: true
};

/**
 * Appointment Confirmation Workflow
 * Sends confirmation when an appointment is created or rescheduled.
 */
export const AppointmentConfirmation = {
  name: 'appointment_confirmation',
  label: 'Appointment Confirmation',
  object: 'appointment',
  description: 'Send confirmation email when appointment is scheduled or updated',

  triggerType: 'onCreateOrUpdate',

  condition: 'ISCHANGED(appointment_date) OR ISCHANGED(appointment_time) OR ISNEW()',

  actions: [
    {
      type: 'fieldUpdate',
      field: 'status',
      value: 'confirmed'
    },
    {
      type: 'emailAlert',
      template: 'appointment_confirmation',
      recipients: ['${patient.email}'],
      cc: ['${provider.email}']
    },
    {
      type: 'taskCreation',
      subject: 'Prepare for appointment: ${patient.name}',
      description: 'Review patient history before appointment',
      assignee: '${provider_name}',
      dueDate: '${appointment_date}',
      priority: 'medium',
      status: 'not_started'
    }
  ],

  executionOrder: 1,
  active: true
};

/**
 * No-Show Follow-Up Workflow
 * Handles patient no-shows with automatic follow-up tasks.
 */
export const NoShowFollowUp = {
  name: 'no_show_follow_up',
  label: 'No-Show Follow-Up',
  object: 'appointment',
  description: 'Create follow-up tasks when a patient misses an appointment',

  triggerType: 'onCreateOrUpdate',

  condition: 'status = "no_show" AND ISCHANGED(status)',

  actions: [
    {
      type: 'taskCreation',
      subject: 'No-show follow-up: ${patient.name}',
      description: 'Contact patient to reschedule missed appointment',
      assignee: '${provider_name}',
      dueDate: 'TODAY() + 1',
      priority: 'high',
      status: 'not_started'
    },
    {
      type: 'emailAlert',
      template: 'missed_appointment_notification',
      recipients: ['${patient.email}']
    },
    {
      type: 'fieldUpdate',
      field: 'no_show_count',
      formula: 'no_show_count + 1'
    }
  ],

  executionOrder: 2,
  active: true
};

/**
 * Telehealth Link Generation Workflow
 * Automatically generates telehealth links for virtual appointments.
 */
export const TelehealthSetup = {
  name: 'telehealth_setup',
  label: 'Telehealth Link Setup',
  object: 'appointment',
  description: 'Generate telehealth meeting link for virtual appointments',

  triggerType: 'onCreate',

  condition: 'type = "telehealth"',

  actions: [
    {
      type: 'customAction',
      handler: 'generateTelehealthLink',
      parameters: {
        appointment_id: '${id}',
        provider: '${provider_name}',
        patient: '${patient.name}'
      }
    },
    {
      type: 'emailAlert',
      template: 'telehealth_link_notification',
      recipients: ['${patient.email}', '${provider.email}']
    }
  ],

  active: true
};

export const AppointmentWorkflows = {
  reminder: AppointmentReminder,
  confirmation: AppointmentConfirmation,
  noShowFollowUp: NoShowFollowUp,
  telehealthSetup: TelehealthSetup
};

export default AppointmentWorkflows;

// Spec-validated workflow definitions
export const ValidatedWorkflows = {
  appointmentReminder: WorkflowRuleSchema.parse({
    name: 'appointment_reminder',
    objectName: 'appointment',
    triggerType: 'schedule',
    active: true,
    actions: [{ type: 'field_update', name: 'set_reminder_sent', field: 'reminder_sent', value: 'true' }],
    executionOrder: 1,
    reevaluateOnChange: false,
  } satisfies WorkflowRule),

  appointmentConfirmation: WorkflowRuleSchema.parse({
    name: 'appointment_confirmation',
    objectName: 'appointment',
    triggerType: 'on_create_or_update',
    active: true,
    actions: [{ type: 'field_update', name: 'set_confirmed', field: 'status', value: 'confirmed' }],
    executionOrder: 2,
    reevaluateOnChange: false,
  } satisfies WorkflowRule),

  noShowFollowUp: WorkflowRuleSchema.parse({
    name: 'no_show_follow_up',
    objectName: 'appointment',
    triggerType: 'on_create_or_update',
    active: true,
    actions: [{ type: 'field_update', name: 'increment_no_show', field: 'no_show_count', value: 'incremented' }],
    executionOrder: 3,
    reevaluateOnChange: false,
  } satisfies WorkflowRule),

  telehealthSetup: WorkflowRuleSchema.parse({
    name: 'telehealth_setup',
    objectName: 'appointment',
    triggerType: 'on_create',
    active: true,
    actions: [{ type: 'field_update', name: 'set_telehealth_link', field: 'telehealth_link', value: 'generated' }],
    executionOrder: 4,
    reevaluateOnChange: false,
  } satisfies WorkflowRule),
};
