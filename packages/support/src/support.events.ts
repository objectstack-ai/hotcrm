/**
 * Support Domain Event Definitions
 *
 * Defines the event contracts for cross-package communication.
 * Other plugins can subscribe to these events to react to Support domain changes.
 */
import { EventTypeDefinitionSchema } from '@objectstack/spec/kernel';

export const SupportEvents = {
  caseCreated: EventTypeDefinitionSchema.parse({
    name: 'support.case.created',
    description: 'Fired when a new support case is created',
  }),
  caseEscalated: EventTypeDefinitionSchema.parse({
    name: 'support.case.escalated',
    description: 'Fired when a case is escalated to a higher tier',
  }),
  caseClosed: EventTypeDefinitionSchema.parse({
    name: 'support.case.closed',
    description: 'Fired when a support case is resolved and closed',
  }),
  slaBreached: EventTypeDefinitionSchema.parse({
    name: 'support.sla.breached',
    description: 'Fired when an SLA milestone is breached',
  }),
  slaWarning: EventTypeDefinitionSchema.parse({
    name: 'support.sla.warning',
    description: 'Fired when an SLA milestone is approaching its deadline',
  }),
  articlePublished: EventTypeDefinitionSchema.parse({
    name: 'support.article.published',
    description: 'Fired when a knowledge article is published',
  }),
  caseAssigned: EventTypeDefinitionSchema.parse({
    name: 'support.case.assigned',
    description: 'Fired when a case is assigned to an agent or queue',
  }),
};
