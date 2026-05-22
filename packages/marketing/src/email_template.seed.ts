/**
 * Email Template Seed Data
 * Sample email templates for marketing, newsletters, and notifications
 */

export const EmailTemplateSeedData = [
  { name: 'Monthly Product Newsletter', subject: 'What\'s New in HotCRM — {{month}} {{year}}', status: 'active', html_body: '<h1>Monthly Update</h1><p>Hi {{first_name}}, here are the latest features and tips from HotCRM.</p>' },
  { name: 'Webinar Invitation', subject: 'You\'re Invited: {{webinar_title}} on {{event_date}}', status: 'active', html_body: '<h1>Join Our Webinar</h1><p>Hi {{first_name}}, register now for our upcoming webinar on {{webinar_title}}.</p><a href="{{registration_url}}">Register Now</a>' },
  { name: 'Trial Expiration Reminder', subject: 'Your HotCRM Trial Ends in {{days_remaining}} Days', status: 'draft', html_body: '<h1>Don\'t Lose Access</h1><p>Hi {{first_name}}, your free trial expires on {{expiration_date}}. Upgrade today to keep your data.</p>' }
];

export default EmailTemplateSeedData;
