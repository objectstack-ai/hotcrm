import { EmailTemplateSchema } from '@objectstack/spec/system';
// @ts-expect-error zod is available at runtime via @objectstack/spec
import type { z } from 'zod';

type EmailTemplate = z.infer<typeof EmailTemplateSchema>;

/**
 * Offer letter email sent to a candidate upon selection.
 */
export const offerLetter: EmailTemplate = EmailTemplateSchema.parse({
  id: 'offer_letter',
  subject: 'Offer Letter: {{position.title}} at {{company.name}}',
  body: [
    '<h2>Congratulations, {{candidate.name}}!</h2>',
    '<p>We are pleased to offer you the position of <strong>{{position.title}}</strong> at {{company.name}}.</p>',
    '<ul>',
    '  <li><strong>Position:</strong> {{position.title}}</li>',
    '  <li><strong>Department:</strong> {{position.department}}</li>',
    '  <li><strong>Start Date:</strong> {{offer.start_date}}</li>',
    '  <li><strong>Compensation:</strong> {{offer.compensation}}</li>',
    '</ul>',
    '<p>Please review the attached offer details and respond by {{offer.deadline}}.</p>',
    '<p>We look forward to having you on the team!</p>',
  ].join('\n'),
  bodyType: 'html',
  variables: [
    'candidate.name',
    'position.title',
    'position.department',
    'company.name',
    'offer.start_date',
    'offer.compensation',
    'offer.deadline',
  ],
});

/**
 * Welcome email sent to a new employee during onboarding.
 */
export const onboardingWelcome: EmailTemplate = EmailTemplateSchema.parse({
  id: 'onboarding_welcome',
  subject: 'Welcome to {{company.name}}, {{employee.name}}!',
  body: [
    '<h2>Welcome to the Team!</h2>',
    '<p>Dear {{employee.name}},</p>',
    '<p>We are thrilled to have you join {{company.name}} as <strong>{{position.title}}</strong>.</p>',
    '<ul>',
    '  <li><strong>Start Date:</strong> {{employee.start_date}}</li>',
    '  <li><strong>Department:</strong> {{position.department}}</li>',
    '  <li><strong>Manager:</strong> {{manager.name}}</li>',
    '  <li><strong>Buddy:</strong> {{buddy.name}}</li>',
    '</ul>',
    '<p>Your onboarding schedule and resources have been prepared. Please check your portal for next steps.</p>',
  ].join('\n'),
  bodyType: 'html',
  variables: [
    'employee.name',
    'employee.start_date',
    'position.title',
    'position.department',
    'company.name',
    'manager.name',
    'buddy.name',
  ],
});

/**
 * Notification sent when a PTO request is approved.
 */
export const ptoApproved: EmailTemplate = EmailTemplateSchema.parse({
  id: 'pto_approved',
  subject: 'PTO Approved: {{pto.start_date}} — {{pto.end_date}}',
  body: [
    '<h2>PTO Request Approved</h2>',
    '<p>Dear {{employee.name}},</p>',
    '<p>Your paid time off request has been approved:</p>',
    '<ul>',
    '  <li><strong>Start Date:</strong> {{pto.start_date}}</li>',
    '  <li><strong>End Date:</strong> {{pto.end_date}}</li>',
    '  <li><strong>Days:</strong> {{pto.total_days}}</li>',
    '  <li><strong>Approved By:</strong> {{approver.name}}</li>',
    '  <li><strong>Remaining Balance:</strong> {{pto.remaining_balance}}</li>',
    '</ul>',
    '<p>Enjoy your time off!</p>',
  ].join('\n'),
  bodyType: 'html',
  variables: [
    'employee.name',
    'pto.start_date',
    'pto.end_date',
    'pto.total_days',
    'approver.name',
    'pto.remaining_balance',
  ],
});

/**
 * Reminder email sent when a performance review period is approaching.
 */
export const performanceReviewReminder: EmailTemplate = EmailTemplateSchema.parse({
  id: 'performance_review_reminder',
  subject: 'Performance Review Reminder: {{review.period}}',
  body: [
    '<h2>Performance Review Reminder</h2>',
    '<p>Dear {{employee.name}},</p>',
    '<p>This is a reminder that your performance review is scheduled:</p>',
    '<ul>',
    '  <li><strong>Review Period:</strong> {{review.period}}</li>',
    '  <li><strong>Due Date:</strong> {{review.due_date}}</li>',
    '  <li><strong>Reviewer:</strong> {{reviewer.name}}</li>',
    '</ul>',
    '<p>Please complete your self-assessment before the due date.</p>',
  ].join('\n'),
  bodyType: 'html',
  variables: [
    'employee.name',
    'review.period',
    'review.due_date',
    'reviewer.name',
  ],
});

export const hrEmailTemplates = {
  offerLetter,
  onboardingWelcome,
  ptoApproved,
  performanceReviewReminder,
};

export default hrEmailTemplates;
