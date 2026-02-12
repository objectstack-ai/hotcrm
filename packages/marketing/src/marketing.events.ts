/**
 * Marketing Domain Event Definitions
 *
 * Defines the event contracts for cross-package communication.
 * Other plugins can subscribe to these events to react to Marketing domain changes.
 */

export const MarketingEvents = {
  campaignLaunched: {
    name: 'marketing.campaign.launched',
    type: 'domain' as const,
    description: 'Fired when a campaign is launched and active',
  },
  campaignCompleted: {
    name: 'marketing.campaign.completed',
    type: 'domain' as const,
    description: 'Fired when a campaign reaches its end date or is manually completed',
  },
  leadCaptured: {
    name: 'marketing.lead.captured',
    type: 'domain' as const,
    description: 'Fired when a new lead is captured from a form or landing page',
  },
  emailSent: {
    name: 'marketing.email.sent',
    type: 'domain' as const,
    description: 'Fired when a marketing email is sent to a recipient',
  },
  formSubmitted: {
    name: 'marketing.form.submitted',
    type: 'domain' as const,
    description: 'Fired when a marketing form is submitted by a prospect',
  },
  unsubscribeRequested: {
    name: 'marketing.unsubscribe.requested',
    type: 'domain' as const,
    description: 'Fired when a contact requests to unsubscribe from communications',
  },
};
