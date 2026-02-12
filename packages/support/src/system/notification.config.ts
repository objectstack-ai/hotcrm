import { NotificationConfigSchema } from '@objectstack/spec/system';
import type { z } from 'zod';

type NotificationConfig = z.infer<typeof NotificationConfigSchema>;

/**
 * Notification sent when a new support case is created.
 */
export const caseCreationNotification: NotificationConfig =
  NotificationConfigSchema.parse({
    id: 'case_creation',
    name: 'Case Creation Notification',
    channel: 'email',
    template: {
      id: 'case_created_email',
      subject: 'New Support Case Created: {{case.subject}}',
      body: [
        '<h2>New Case Created</h2>',
        '<p>A new support case has been submitted.</p>',
        '<ul>',
        '  <li><strong>Case Number:</strong> {{case.case_number}}</li>',
        '  <li><strong>Subject:</strong> {{case.subject}}</li>',
        '  <li><strong>Priority:</strong> {{case.priority}}</li>',
        '  <li><strong>Account:</strong> {{case.account_name}}</li>',
        '</ul>',
      ].join('\n'),
      bodyType: 'html',
    },
    recipients: {
      to: ['assigned_agent', 'queue_members'],
    },
  });

/**
 * In-app notification sent when a case is escalated.
 */
export const caseEscalationNotification: NotificationConfig =
  NotificationConfigSchema.parse({
    id: 'case_escalation',
    name: 'Case Escalation Notification',
    channel: 'in-app',
    template: {
      title: 'Case Escalated: {{case.case_number}}',
      message:
        'Case "{{case.subject}}" has been escalated to {{case.escalation_level}}. Immediate attention required.',
      type: 'warning',
      dismissible: false,
    },
    recipients: {
      to: ['support_manager', 'escalation_team'],
    },
  });

/**
 * Email notification sent when an SLA breach is imminent or has occurred.
 */
export const slaBreachNotification: NotificationConfig =
  NotificationConfigSchema.parse({
    id: 'sla_breach',
    name: 'SLA Breach Notification',
    channel: 'email',
    template: {
      id: 'sla_breach_email',
      subject: 'SLA Breach Alert: Case {{case.case_number}}',
      body: [
        '<h2>SLA Breach Alert</h2>',
        '<p>A service level agreement breach has been detected.</p>',
        '<ul>',
        '  <li><strong>Case Number:</strong> {{case.case_number}}</li>',
        '  <li><strong>Subject:</strong> {{case.subject}}</li>',
        '  <li><strong>SLA Policy:</strong> {{sla.policy_name}}</li>',
        '  <li><strong>Milestone:</strong> {{sla.milestone_name}}</li>',
        '  <li><strong>Deadline:</strong> {{sla.deadline}}</li>',
        '</ul>',
        '<p>Please take immediate action to resolve this case.</p>',
      ].join('\n'),
      bodyType: 'html',
    },
    recipients: {
      to: ['assigned_agent', 'support_manager'],
    },
  });

export const supportNotifications = {
  caseCreationNotification,
  caseEscalationNotification,
  slaBreachNotification,
};

export default supportNotifications;
