import type { EmailTemplate } from '@objectstack/spec/system';
import { EmailTemplateSchema } from '@objectstack/spec/system';

/**
 * Welcome email sent to new account contacts.
 */
export const CrmWelcomeEmail = {
  id: 'crm_welcome',
  subject: 'Welcome to {{company_name}}',
  bodyType: 'html',
  body: [
    '<h2>Welcome, {{contact_name}}!</h2>',
    '<p>Thank you for choosing <strong>{{company_name}}</strong>. We are excited to have you on board.</p>',
    '<p>Your dedicated account representative is <strong>{{rep_name}}</strong>, who will be your primary point of contact.</p>',
    '<p>If you have any questions, feel free to reach out at any time.</p>',
    '<p>Best regards,<br/>The {{company_name}} Team</p>',
  ].join('\n'),
  variables: ['company_name', 'contact_name', 'rep_name'],
} satisfies EmailTemplate;
EmailTemplateSchema.parse(CrmWelcomeEmail);

/**
 * Notification sent when a deal is won.
 */
export const CrmDealWonEmail = {
  id: 'crm_deal_won',
  subject: '🎉 Deal Won: {{deal_name}}',
  bodyType: 'html',
  body: [
    '<h2>🎉 Congratulations! Deal Won</h2>',
    '<p>The deal <strong>{{deal_name}}</strong> has been closed-won.</p>',
    '<ul>',
    '  <li><strong>Amount:</strong> {{amount}}</li>',
    '  <li><strong>Account:</strong> {{account_name}}</li>',
    '  <li><strong>Rep:</strong> {{rep_name}}</li>',
    '</ul>',
    '<p>Great work closing this opportunity!</p>',
  ].join('\n'),
  variables: ['deal_name', 'amount', 'account_name', 'rep_name'],
} satisfies EmailTemplate;
EmailTemplateSchema.parse(CrmDealWonEmail);

/**
 * Quote approval request sent to approvers.
 */
export const CrmQuoteApprovalEmail = {
  id: 'crm_quote_approval',
  subject: 'Quote Approval Required: {{quote_number}}',
  bodyType: 'html',
  body: [
    '<h2>Quote Approval Required</h2>',
    '<p>Hello {{approver_name}},</p>',
    '<p>A quote requires your approval before it can be sent to the customer.</p>',
    '<ul>',
    '  <li><strong>Quote Number:</strong> {{quote_number}}</li>',
    '  <li><strong>Amount:</strong> {{amount}}</li>',
    '  <li><strong>Account:</strong> {{account_name}}</li>',
    '</ul>',
    '<p>Please review and approve or reject this quote at your earliest convenience.</p>',
  ].join('\n'),
  variables: ['quote_number', 'amount', 'account_name', 'approver_name'],
} satisfies EmailTemplate;
EmailTemplateSchema.parse(CrmQuoteApprovalEmail);

/**
 * Meeting reminder sent to reps before scheduled meetings.
 */
export const CrmMeetingReminderEmail = {
  id: 'crm_meeting_reminder',
  subject: 'Reminder: Meeting with {{contact_name}} tomorrow',
  bodyType: 'html',
  body: [
    '<h2>Meeting Reminder</h2>',
    '<p>You have an upcoming meeting scheduled for tomorrow.</p>',
    '<ul>',
    '  <li><strong>Contact:</strong> {{contact_name}}</li>',
    '  <li><strong>Time:</strong> {{meeting_time}}</li>',
    '  <li><strong>Location:</strong> {{location}}</li>',
    '</ul>',
    '<p>Please ensure you are prepared and on time.</p>',
  ].join('\n'),
  variables: ['contact_name', 'meeting_time', 'location'],
} satisfies EmailTemplate;
EmailTemplateSchema.parse(CrmMeetingReminderEmail);

export default {
  CrmWelcomeEmail,
  CrmDealWonEmail,
  CrmQuoteApprovalEmail,
  CrmMeetingReminderEmail,
};
