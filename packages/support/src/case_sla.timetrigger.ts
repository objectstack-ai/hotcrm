// Time trigger definitions for case SLA management
import { TimeTriggerSchema, type TimeTrigger } from '@objectstack/spec/automation';

/**
 * Case SLA Time Triggers
 * Defines time-based triggers for SLA enforcement on support cases
 */

/**
 * First Response SLA - 4 hours after case creation
 * Ensures agents provide initial response within the SLA window
 */
export const FirstResponseSLA = {
  name: 'first_response_sla',
  label: 'First Response SLA (4 Hours)',
  object: 'case',
  description: 'Trigger actions if first response is not provided within 4 hours of case creation',

  timeLength: 4,
  timeUnit: 'hours' as const,
  offsetDirection: 'after' as const,
  offsetFrom: 'trigger_date' as const,

  condition: 'first_response_date = NULL AND status != "closed" AND status != "resolved"',

  actions: [
    {
      type: 'field_update',
      name: 'mark_sla_breach',
      field: 'first_response_sla_breached',
      value: 'true',
    },
    {
      type: 'email_alert',
      name: 'notify_owner_sla',
      template: 'first_response_sla_warning',
      recipients: ['${owner.email}'],
    },
    {
      type: 'email_alert',
      name: 'notify_manager_sla',
      template: 'first_response_sla_escalation',
      recipients: ['${owner.manager.email}'],
    },
  ],
};

/**
 * Resolution SLA - 24 hours after case creation
 * Ensures cases are resolved within the target resolution window
 */
export const ResolutionSLA = {
  name: 'resolution_sla',
  label: 'Resolution SLA (24 Hours)',
  object: 'case',
  description: 'Trigger escalation if case is not resolved within 24 hours of creation',

  timeLength: 24,
  timeUnit: 'hours' as const,
  offsetDirection: 'after' as const,
  offsetFrom: 'trigger_date' as const,

  condition: 'status != "closed" AND status != "resolved" AND priority IN ("high", "critical")',

  actions: [
    {
      type: 'field_update',
      name: 'mark_resolution_breach',
      field: 'resolution_sla_breached',
      value: 'true',
    },
    {
      type: 'field_update',
      name: 'escalate_priority',
      field: 'priority',
      value: 'critical',
    },
    {
      type: 'email_alert',
      name: 'escalation_alert',
      template: 'resolution_sla_escalation',
      recipients: ['${owner.email}', '${owner.manager.email}', 'support-escalation@company.com'],
    },
  ],
};

/**
 * Follow-Up Reminder - 48 hours after last update
 * Reminds agents to follow up on cases that have gone stale
 */
export const FollowUpReminder = {
  name: 'follow_up_reminder',
  label: 'Follow-Up Reminder (48 Hours)',
  object: 'case',
  description: 'Send reminder if case has no activity for 48 hours after last update',

  timeLength: 48,
  timeUnit: 'hours' as const,
  offsetDirection: 'after' as const,
  offsetFrom: 'date_field' as const,
  dateField: 'last_modified_date',

  condition: 'status != "closed" AND status != "resolved" AND status != "waiting_on_customer"',

  actions: [
    {
      type: 'field_update',
      name: 'set_reminder_sent',
      field: 'follow_up_reminder_sent',
      value: 'true',
    },
    {
      type: 'email_alert',
      name: 'remind_owner',
      template: 'case_follow_up_reminder',
      recipients: ['${owner.email}'],
    },
  ],
};

export const CaseSLATimeTriggers = {
  firstResponseSLA: FirstResponseSLA,
  resolutionSLA: ResolutionSLA,
  followUpReminder: FollowUpReminder,
};

// Spec-validated time trigger definitions
export const ValidatedTimeTriggers = {
  firstResponseSLA: TimeTriggerSchema.parse({
    timeLength: 4,
    timeUnit: 'hours',
    offsetDirection: 'after',
    offsetFrom: 'trigger_date',
    actions: [{ type: 'field_update', name: 'mark_sla_breach', field: 'first_response_sla_breached', value: 'true' }],
  } satisfies TimeTrigger),

  resolutionSLA: TimeTriggerSchema.parse({
    timeLength: 24,
    timeUnit: 'hours',
    offsetDirection: 'after',
    offsetFrom: 'trigger_date',
    actions: [{ type: 'field_update', name: 'mark_resolution_breach', field: 'resolution_sla_breached', value: 'true' }],
  } satisfies TimeTrigger),

  followUpReminder: TimeTriggerSchema.parse({
    timeLength: 48,
    timeUnit: 'hours',
    offsetDirection: 'after',
    offsetFrom: 'date_field',
    dateField: 'last_modified_date',
    actions: [{ type: 'field_update', name: 'set_reminder_sent', field: 'follow_up_reminder_sent', value: 'true' }],
  } satisfies TimeTrigger),
};

export default CaseSLATimeTriggers;
