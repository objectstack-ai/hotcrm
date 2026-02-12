/**
 * Support Domain Event Definitions
 *
 * Defines the event contracts for cross-package communication.
 * Other plugins can subscribe to these events to react to Support domain changes.
 */

export const SupportEvents = {
  caseCreated: {
    name: 'support.case.created',
    type: 'domain' as const,
    description: 'Fired when a new support case is created',
  },
  caseEscalated: {
    name: 'support.case.escalated',
    type: 'domain' as const,
    description: 'Fired when a case is escalated to a higher tier',
  },
  caseClosed: {
    name: 'support.case.closed',
    type: 'domain' as const,
    description: 'Fired when a support case is resolved and closed',
  },
  slaBreached: {
    name: 'support.sla.breached',
    type: 'domain' as const,
    description: 'Fired when an SLA milestone is breached',
  },
  slaWarning: {
    name: 'support.sla.warning',
    type: 'domain' as const,
    description: 'Fired when an SLA milestone is approaching its deadline',
  },
  articlePublished: {
    name: 'support.article.published',
    type: 'domain' as const,
    description: 'Fired when a knowledge article is published',
  },
  caseAssigned: {
    name: 'support.case.assigned',
    type: 'domain' as const,
    description: 'Fired when a case is assigned to an agent or queue',
  },
};
