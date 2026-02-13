import { EmailTemplateSchema } from '@objectstack/spec/system';
import type { z } from 'zod';

type EmailTemplate = z.infer<typeof EmailTemplateSchema>;

/**
 * Welcome email sent when a new account is created.
 */
export const welcomeEmail: EmailTemplate = EmailTemplateSchema.parse({
  id: 'welcome_email',
  subject: 'Welcome to {{company.name}}, {{account.name}}!',
  body: [
    '<h2>Welcome Aboard!</h2>',
    '<p>Dear {{contact.name}},</p>',
    '<p>Thank you for choosing {{company.name}}. Your account <strong>{{account.name}}</strong> has been successfully created.</p>',
    '<p>Your dedicated account manager is {{owner.name}}. Feel free to reach out at any time.</p>',
    '<p>Best regards,<br/>The {{company.name}} Team</p>',
  ].join('\n'),
  bodyType: 'html',
  variables: [
    'company.name',
    'account.name',
    'contact.name',
    'owner.name',
  ],
});

/**
 * Notification sent when a deal is closed-won.
 */
export const dealWonNotification: EmailTemplate = EmailTemplateSchema.parse({
  id: 'deal_won_notification',
  subject: 'Deal Won: {{deal.name}} — {{deal.amount}}',
  body: [
    '<h2>Congratulations! Deal Closed-Won 🎉</h2>',
    '<p>The following deal has been successfully closed:</p>',
    '<ul>',
    '  <li><strong>Deal:</strong> {{deal.name}}</li>',
    '  <li><strong>Amount:</strong> {{deal.amount}}</li>',
    '  <li><strong>Account:</strong> {{account.name}}</li>',
    '  <li><strong>Close Date:</strong> {{deal.close_date}}</li>',
    '  <li><strong>Owner:</strong> {{owner.name}}</li>',
    '</ul>',
  ].join('\n'),
  bodyType: 'html',
  variables: [
    'deal.name',
    'deal.amount',
    'account.name',
    'deal.close_date',
    'owner.name',
  ],
});

/**
 * Email requesting approval for a quote.
 */
export const quoteApprovalRequest: EmailTemplate = EmailTemplateSchema.parse({
  id: 'quote_approval_request',
  subject: 'Approval Required: Quote {{quote.name}} for {{account.name}}',
  body: [
    '<h2>Quote Approval Request</h2>',
    '<p>A quote requires your approval:</p>',
    '<ul>',
    '  <li><strong>Quote:</strong> {{quote.name}}</li>',
    '  <li><strong>Account:</strong> {{account.name}}</li>',
    '  <li><strong>Total Amount:</strong> {{quote.total_amount}}</li>',
    '  <li><strong>Discount:</strong> {{quote.discount_percent}}%</li>',
    '  <li><strong>Requested By:</strong> {{requester.name}}</li>',
    '</ul>',
    '<p>Please review and approve or reject this quote at your earliest convenience.</p>',
  ].join('\n'),
  bodyType: 'html',
  variables: [
    'quote.name',
    'account.name',
    'quote.total_amount',
    'quote.discount_percent',
    'requester.name',
  ],
});

/**
 * Reminder email sent before a scheduled meeting.
 */
export const meetingReminder: EmailTemplate = EmailTemplateSchema.parse({
  id: 'meeting_reminder',
  subject: 'Reminder: {{meeting.title}} at {{meeting.time}}',
  body: [
    '<h2>Meeting Reminder</h2>',
    '<p>You have an upcoming meeting:</p>',
    '<ul>',
    '  <li><strong>Title:</strong> {{meeting.title}}</li>',
    '  <li><strong>Date &amp; Time:</strong> {{meeting.time}}</li>',
    '  <li><strong>Location:</strong> {{meeting.location}}</li>',
    '  <li><strong>Account:</strong> {{account.name}}</li>',
    '  <li><strong>Organizer:</strong> {{organizer.name}}</li>',
    '</ul>',
    '<p>Please ensure you are prepared and on time.</p>',
  ].join('\n'),
  bodyType: 'html',
  variables: [
    'meeting.title',
    'meeting.time',
    'meeting.location',
    'account.name',
    'organizer.name',
  ],
});

export const crmEmailTemplates = {
  welcomeEmail,
  dealWonNotification,
  quoteApprovalRequest,
  meetingReminder,
};

export default crmEmailTemplates;
