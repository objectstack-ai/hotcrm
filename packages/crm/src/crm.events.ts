/**
 * CRM Domain Event Definitions
 *
 * Defines the event contracts for cross-package communication.
 * Other plugins can subscribe to these events to react to CRM domain changes.
 */

export const CRMEvents = {
  accountCreated: {
    name: 'crm.account.created',
    type: 'domain' as const,
    description: 'Fired when a new account is created',
  },
  accountUpdated: {
    name: 'crm.account.updated',
    type: 'domain' as const,
    description: 'Fired when an account record is updated',
  },
  contactCreated: {
    name: 'crm.contact.created',
    type: 'domain' as const,
    description: 'Fired when a new contact is created',
  },
  leadConverted: {
    name: 'crm.lead.converted',
    type: 'domain' as const,
    description: 'Fired when a lead is converted to account/contact/opportunity',
  },
  leadScored: {
    name: 'crm.lead.scored',
    type: 'domain' as const,
    description: 'Fired when a lead score is recalculated',
  },
  opportunityStageChanged: {
    name: 'crm.opportunity.stage_changed',
    type: 'domain' as const,
    description: 'Fired when an opportunity moves to a new stage',
  },
  opportunityWon: {
    name: 'crm.opportunity.won',
    type: 'domain' as const,
    description: 'Fired when an opportunity is closed-won',
  },
  opportunityLost: {
    name: 'crm.opportunity.lost',
    type: 'domain' as const,
    description: 'Fired when an opportunity is closed-lost',
  },
  activityCompleted: {
    name: 'crm.activity.completed',
    type: 'domain' as const,
    description: 'Fired when an activity or task is marked as completed',
  },
};
