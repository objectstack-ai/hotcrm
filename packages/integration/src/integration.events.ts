/**
 * Integration Domain Event Definitions
 *
 * Defines the event contracts for cross-package communication.
 * Other plugins can subscribe to these events to react to integration domain changes.
 */
import { EventTypeDefinitionSchema } from '@objectstack/spec/kernel';

export const IntegrationEvents = {
  connectorActivated: EventTypeDefinitionSchema.parse({
    name: 'integration.connector.activated',
    description: 'Fired when a connector is activated and ready for use',
  }),
  syncCompleted: EventTypeDefinitionSchema.parse({
    name: 'integration.sync.completed',
    description: 'Fired when a data synchronization run completes successfully',
  }),
  webhookDelivered: EventTypeDefinitionSchema.parse({
    name: 'integration.webhook.delivered',
    description: 'Fired when a webhook is successfully delivered to its target endpoint',
  }),
  apiKeyCreated: EventTypeDefinitionSchema.parse({
    name: 'integration.api_key.created',
    description: 'Fired when a new API key is created',
  }),
};
