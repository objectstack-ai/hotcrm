import { EmailTemplateSchema } from '@objectstack/spec/system';
import type { z } from 'zod';

type EmailTemplate = z.infer<typeof EmailTemplateSchema>;

/**
 * Confirmation email sent when a new support case is created.
 */
export const caseCreatedConfirmation: EmailTemplate = EmailTemplateSchema.parse({
  id: 'case_created_confirmation',
  subject: 'Case {{case.number}} Created: {{case.subject}}',
  body: [
    '<h2>Support Case Created</h2>',
    '<p>Dear {{contact.name}},</p>',
    '<p>Your support case has been successfully submitted. Our team will review it shortly.</p>',
    '<ul>',
    '  <li><strong>Case Number:</strong> {{case.number}}</li>',
    '  <li><strong>Subject:</strong> {{case.subject}}</li>',
    '  <li><strong>Priority:</strong> {{case.priority}}</li>',
    '  <li><strong>Assigned To:</strong> {{agent.name}}</li>',
    '</ul>',
    '<p>You will receive updates as your case progresses.</p>',
  ].join('\n'),
  bodyType: 'html',
  variables: [
    'case.number',
    'case.subject',
    'case.priority',
    'contact.name',
    'agent.name',
  ],
});

/**
 * Email sent when a support case is resolved.
 */
export const caseResolved: EmailTemplate = EmailTemplateSchema.parse({
  id: 'case_resolved',
  subject: 'Case {{case.number}} Resolved: {{case.subject}}',
  body: [
    '<h2>Case Resolved</h2>',
    '<p>Dear {{contact.name}},</p>',
    '<p>Your support case has been resolved:</p>',
    '<ul>',
    '  <li><strong>Case Number:</strong> {{case.number}}</li>',
    '  <li><strong>Subject:</strong> {{case.subject}}</li>',
    '  <li><strong>Resolution:</strong> {{case.resolution}}</li>',
    '  <li><strong>Resolved By:</strong> {{agent.name}}</li>',
    '</ul>',
    '<p>If you have any further questions, feel free to reopen this case.</p>',
  ].join('\n'),
  bodyType: 'html',
  variables: [
    'case.number',
    'case.subject',
    'case.resolution',
    'contact.name',
    'agent.name',
  ],
});

/**
 * Customer satisfaction survey email sent after case resolution.
 */
export const csatSurvey: EmailTemplate = EmailTemplateSchema.parse({
  id: 'csat_survey',
  subject: 'How was your experience? Case {{case.number}}',
  body: [
    '<h2>We Value Your Feedback</h2>',
    '<p>Dear {{contact.name}},</p>',
    '<p>Your support case <strong>{{case.number}}</strong> — "{{case.subject}}" has been resolved.</p>',
    '<p>We would love to hear about your experience. Please take a moment to complete our brief survey:</p>',
    '<p><a href="{{survey.url}}">Take the Survey</a></p>',
    '<p>Your feedback helps us improve our support quality. Thank you!</p>',
  ].join('\n'),
  bodyType: 'html',
  variables: [
    'case.number',
    'case.subject',
    'contact.name',
    'survey.url',
  ],
});

/**
 * Warning email sent when an SLA deadline is approaching.
 */
export const slaWarning: EmailTemplate = EmailTemplateSchema.parse({
  id: 'sla_warning',
  subject: 'SLA Warning: Case {{case.number}} — Deadline {{sla.deadline}}',
  body: [
    '<h2>SLA Deadline Approaching</h2>',
    '<p>The following case is at risk of breaching its SLA:</p>',
    '<ul>',
    '  <li><strong>Case Number:</strong> {{case.number}}</li>',
    '  <li><strong>Subject:</strong> {{case.subject}}</li>',
    '  <li><strong>SLA Policy:</strong> {{sla.policy}}</li>',
    '  <li><strong>Deadline:</strong> {{sla.deadline}}</li>',
    '  <li><strong>Time Remaining:</strong> {{sla.time_remaining}}</li>',
    '</ul>',
    '<p>Please prioritize this case to avoid an SLA breach.</p>',
  ].join('\n'),
  bodyType: 'html',
  variables: [
    'case.number',
    'case.subject',
    'sla.policy',
    'sla.deadline',
    'sla.time_remaining',
  ],
});

export const supportEmailTemplates = {
  caseCreatedConfirmation,
  caseResolved,
  csatSurvey,
  slaWarning,
};

export default supportEmailTemplates;
