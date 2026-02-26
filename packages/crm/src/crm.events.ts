/**
 * CRM Domain Event Definitions
 *
 * Defines the event contracts for cross-package communication.
 * Other plugins can subscribe to these events to react to CRM domain changes.
 */
import { EventTypeDefinitionSchema } from '@objectstack/spec/kernel';

export const CRMEvents = {
  accountCreated: EventTypeDefinitionSchema.parse({
    name: 'crm.account.created',
    description: 'Fired when a new account is created',
  }),
  accountUpdated: EventTypeDefinitionSchema.parse({
    name: 'crm.account.updated',
    description: 'Fired when an account record is updated',
  }),
  contactCreated: EventTypeDefinitionSchema.parse({
    name: 'crm.contact.created',
    description: 'Fired when a new contact is created',
  }),
  leadConverted: EventTypeDefinitionSchema.parse({
    name: 'crm.lead.converted',
    description: 'Fired when a lead is converted to account/contact/opportunity',
  }),
  leadScored: EventTypeDefinitionSchema.parse({
    name: 'crm.lead.scored',
    description: 'Fired when a lead score is recalculated',
  }),
  opportunityStageChanged: EventTypeDefinitionSchema.parse({
    name: 'crm.opportunity.stage_changed',
    description: 'Fired when an opportunity moves to a new stage',
  }),
  opportunityWon: EventTypeDefinitionSchema.parse({
    name: 'crm.opportunity.won',
    description: 'Fired when an opportunity is closed-won',
  }),
  opportunityLost: EventTypeDefinitionSchema.parse({
    name: 'crm.opportunity.lost',
    description: 'Fired when an opportunity is closed-lost',
  }),
  activityCompleted: EventTypeDefinitionSchema.parse({
    name: 'crm.activity.completed',
    description: 'Fired when an activity or task is marked as completed',
  }),
};
