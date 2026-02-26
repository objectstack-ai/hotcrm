/**
 * Marketing Domain Event Definitions
 *
 * Defines the event contracts for cross-package communication.
 * Other plugins can subscribe to these events to react to Marketing domain changes.
 */
import { EventTypeDefinitionSchema } from '@objectstack/spec/kernel';

export const MarketingEvents = {
  campaignLaunched: EventTypeDefinitionSchema.parse({
    name: 'marketing.campaign.launched',
    description: 'Fired when a campaign is launched and active',
  }),
  campaignCompleted: EventTypeDefinitionSchema.parse({
    name: 'marketing.campaign.completed',
    description: 'Fired when a campaign reaches its end date or is manually completed',
  }),
  leadCaptured: EventTypeDefinitionSchema.parse({
    name: 'marketing.lead.captured',
    description: 'Fired when a new lead is captured from a form or landing page',
  }),
  emailSent: EventTypeDefinitionSchema.parse({
    name: 'marketing.email.sent',
    description: 'Fired when a marketing email is sent to a recipient',
  }),
  formSubmitted: EventTypeDefinitionSchema.parse({
    name: 'marketing.form.submitted',
    description: 'Fired when a marketing form is submitted by a prospect',
  }),
  unsubscribeRequested: EventTypeDefinitionSchema.parse({
    name: 'marketing.unsubscribe.requested',
    description: 'Fired when a contact requests to unsubscribe from communications',
  }),
};
