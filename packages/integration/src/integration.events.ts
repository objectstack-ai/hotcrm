/**
 * Integration Domain Event Definitions
 *
 * Defines the event contracts for cross-package communication.
 * Other plugins can subscribe to these events to react to integration domain changes.
 */

export const IntegrationEvents = {
  connectorActivated: {
    name: 'integration.connector.activated',
    type: 'domain' as const,
    description: 'Fired when a connector is activated and ready for use',
  },
  syncCompleted: {
    name: 'integration.sync.completed',
    type: 'domain' as const,
    description: 'Fired when a data synchronization run completes successfully',
  },
  webhookDelivered: {
    name: 'integration.webhook.delivered',
    type: 'domain' as const,
    description: 'Fired when a webhook is successfully delivered to its target endpoint',
  },
  apiKeyCreated: {
    name: 'integration.api_key.created',
    type: 'domain' as const,
    description: 'Fired when a new API key is created',
  },
};
