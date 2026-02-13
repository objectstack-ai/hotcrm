import type { EmailTemplate } from '@objectstack/spec/system';
import { EmailTemplateSchema } from '@objectstack/spec/system';

/**
 * Offer letter sent to candidates.
 */
export const HrOfferLetterEmail = {
  id: 'hr_offer_letter',
  subject: 'Job Offer: {{position}} at Our Company',
  bodyType: 'html',
  body: [
    '<h2>Job Offer</h2>',
    '<p>Dear {{candidate_name}},</p>',
    '<p>We are pleased to offer you the position of <strong>{{position}}</strong>.</p>',
    '<ul>',
    '  <li><strong>Salary:</strong> {{salary}}</li>',
    '  <li><strong>Start Date:</strong> {{start_date}}</li>',
    '  <li><strong>Hiring Manager:</strong> {{hiring_manager}}</li>',
    '</ul>',
    '<p>Please review the attached offer details and confirm your acceptance at your earliest convenience.</p>',
  ].join('\n'),
  variables: ['candidate_name', 'position', 'salary', 'start_date', 'hiring_manager'],
} satisfies EmailTemplate;
EmailTemplateSchema.parse(HrOfferLetterEmail);

/**
 * Welcome email sent to new employees during onboarding.
 */
export const HrOnboardingWelcomeEmail = {
  id: 'hr_onboarding_welcome',
  subject: 'Welcome aboard, {{employee_name}}!',
  bodyType: 'html',
  body: [
    '<h2>Welcome to the Team!</h2>',
    '<p>Dear {{employee_name}},</p>',
    '<p>We are thrilled to have you join the <strong>{{team_name}}</strong> team.</p>',
    '<ul>',
    '  <li><strong>Start Date:</strong> {{start_date}}</li>',
    '  <li><strong>Manager:</strong> {{manager_name}}</li>',
    '  <li><strong>Team:</strong> {{team_name}}</li>',
    '</ul>',
    '<p>Your manager will reach out shortly with onboarding details. Welcome aboard!</p>',
  ].join('\n'),
  variables: ['employee_name', 'start_date', 'manager_name', 'team_name'],
} satisfies EmailTemplate;
EmailTemplateSchema.parse(HrOnboardingWelcomeEmail);

/**
 * Notification sent when a PTO request is approved.
 */
export const HrPtoApprovedEmail = {
  id: 'hr_pto_approved',
  subject: 'PTO Approved: {{start_date}} – {{end_date}}',
  bodyType: 'html',
  body: [
    '<h2>PTO Request Approved</h2>',
    '<p>Hello {{employee_name}},</p>',
    '<p>Your time-off request has been approved by <strong>{{manager_name}}</strong>.</p>',
    '<ul>',
    '  <li><strong>Start Date:</strong> {{start_date}}</li>',
    '  <li><strong>End Date:</strong> {{end_date}}</li>',
    '  <li><strong>Days:</strong> {{days}}</li>',
    '</ul>',
    '<p>Enjoy your time off!</p>',
  ].join('\n'),
  variables: ['employee_name', 'start_date', 'end_date', 'days', 'manager_name'],
} satisfies EmailTemplate;
EmailTemplateSchema.parse(HrPtoApprovedEmail);

/**
 * Reminder to complete a performance review.
 */
export const HrPerformanceReviewEmail = {
  id: 'hr_performance_review',
  subject: 'Performance Review Due: {{employee_name}} — {{review_period}}',
  bodyType: 'html',
  body: [
    '<h2>Performance Review Reminder</h2>',
    '<p>Hello {{reviewer_name}},</p>',
    '<p>A performance review is due for <strong>{{employee_name}}</strong>.</p>',
    '<ul>',
    '  <li><strong>Review Period:</strong> {{review_period}}</li>',
    '  <li><strong>Due Date:</strong> {{due_date}}</li>',
    '</ul>',
    '<p>Please complete the review before the deadline to ensure timely feedback.</p>',
  ].join('\n'),
  variables: ['employee_name', 'review_period', 'due_date', 'reviewer_name'],
} satisfies EmailTemplate;
EmailTemplateSchema.parse(HrPerformanceReviewEmail);

export default {
  HrOfferLetterEmail,
  HrOnboardingWelcomeEmail,
  HrPtoApprovedEmail,
  HrPerformanceReviewEmail,
};
