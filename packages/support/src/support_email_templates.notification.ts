import type { EmailTemplate } from '@objectstack/spec/system';
import { EmailTemplateSchema } from '@objectstack/spec/system';

/**
 * Confirmation email sent when a support case is created.
 */
export const SupportCaseCreatedEmail = {
  id: 'support_case_created',
  subject: 'Case {{case_number}} Created: {{subject}}',
  bodyType: 'html',
  body: [
    '<h2>Support Case Created</h2>',
    '<p>Hello {{contact_name}},</p>',
    '<p>Your support case has been received and assigned a tracking number.</p>',
    '<ul>',
    '  <li><strong>Case Number:</strong> {{case_number}}</li>',
    '  <li><strong>Subject:</strong> {{subject}}</li>',
    '</ul>',
    '<p>Our team will review your case and respond as soon as possible.</p>',
  ].join('\n'),
  variables: ['case_number', 'subject', 'contact_name'],
} satisfies EmailTemplate;
EmailTemplateSchema.parse(SupportCaseCreatedEmail);

/**
 * Notification sent when a support case is resolved.
 */
export const SupportCaseResolvedEmail = {
  id: 'support_case_resolved',
  subject: 'Case {{case_number}} Resolved',
  bodyType: 'html',
  body: [
    '<h2>Case Resolved</h2>',
    '<p>Your support case has been resolved by <strong>{{agent_name}}</strong>.</p>',
    '<ul>',
    '  <li><strong>Case Number:</strong> {{case_number}}</li>',
    '  <li><strong>Subject:</strong> {{subject}}</li>',
    '  <li><strong>Resolution:</strong> {{resolution}}</li>',
    '</ul>',
    '<p>If this does not fully address your issue, please reply to reopen the case.</p>',
  ].join('\n'),
  variables: ['case_number', 'subject', 'resolution', 'agent_name'],
} satisfies EmailTemplate;
EmailTemplateSchema.parse(SupportCaseResolvedEmail);

/**
 * CSAT survey request sent after case resolution.
 */
export const SupportCsatSurveyEmail = {
  id: 'support_csat_survey',
  subject: 'How did we do? Rate your experience — Case {{case_number}}',
  bodyType: 'html',
  body: [
    '<h2>We Value Your Feedback</h2>',
    '<p>Hello {{contact_name}},</p>',
    '<p>Your support case <strong>{{case_number}}</strong> was recently resolved.</p>',
    '<p>We would love to hear about your experience. Please take a moment to complete our brief survey:</p>',
    '<p><a href="{{survey_link}}">Take the Survey</a></p>',
    '<p>Thank you for helping us improve our service.</p>',
  ].join('\n'),
  variables: ['case_number', 'survey_link', 'contact_name'],
} satisfies EmailTemplate;
EmailTemplateSchema.parse(SupportCsatSurveyEmail);

/**
 * Warning email sent when an SLA breach is imminent.
 */
export const SupportSlaWarningEmail = {
  id: 'support_sla_warning',
  subject: 'SLA Warning: Case {{case_number}} approaching breach',
  bodyType: 'html',
  body: [
    '<h2>SLA Breach Warning</h2>',
    '<p>The following case is at risk of breaching its SLA target:</p>',
    '<ul>',
    '  <li><strong>Case Number:</strong> {{case_number}}</li>',
    '  <li><strong>SLA Target:</strong> {{sla_target}}</li>',
    '  <li><strong>Time Remaining:</strong> {{time_remaining}}</li>',
    '</ul>',
    '<p>Please prioritize this case to avoid a breach.</p>',
  ].join('\n'),
  variables: ['case_number', 'sla_target', 'time_remaining'],
} satisfies EmailTemplate;
EmailTemplateSchema.parse(SupportSlaWarningEmail);

export default {
  SupportCaseCreatedEmail,
  SupportCaseResolvedEmail,
  SupportCsatSurveyEmail,
  SupportSlaWarningEmail,
};
