/**
 * @hotcrm/integration - Integration Plugin Definition
 *
 * This plugin provides integration and connectivity functionality including:
 * - Connector Marketplace & Management
 * - Connection Lifecycle Management
 * - Data Synchronization
 * - Webhook Subscriptions & Deliveries
 * - API Key Management
 * - Field Mapping Templates
 * - AI-Powered Integration Tools
 *
 * Dependencies: @hotcrm/ai
 */

import { PluginSchema } from '@objectstack/spec/kernel';
import type { PluginDefinition } from '@objectstack/spec/kernel';

// Import all Integration objects
import { Connector } from './connector.object.js';
import { Connection } from './connection.object.js';
import { SyncConfig } from './sync_config.object.js';
import { SyncLog } from './sync_log.object.js';
import { WebhookSubscription } from './webhook_subscription.object.js';
import { WebhookDelivery } from './webhook_delivery.object.js';
import { ApiKey } from './api_key.object.js';
import { FieldMapping } from './field_mapping.object.js';

// Import hooks
import { ConnectorActivation, ConnectorDeactivation, ConnectorHealthCheck } from './connector.hook.js';
import { ConnectionValidation, TokenRefresh, ExpiryAlert } from './connection.hook.js';
import { MappingValidation, ScheduleManagement, ConflictResolution } from './sync_config.hook.js';
import { SyncMonitoring, FailureAlert, RetryLogic } from './sync_log.hook.js';
import { SubscriptionValidation, SecretRotation, EndpointVerification } from './webhook_subscription.hook.js';
import { DeliveryTracking, RetryScheduling, DeadLetterHandling } from './webhook_delivery.hook.js';
import { KeyGeneration, ExpiryAlert as ApiKeyExpiryAlert, UsageTracking } from './api_key.hook.js';

// Import actions
import SyncAIAction from './actions/sync_ai.action.js';
import ConnectorAIAction from './actions/connector_ai.action.js';

// Import connector actions
import StripeAction from './connectors/stripe.action.js';
import DocuSignAction from './connectors/docusign.action.js';
import SlackAction from './connectors/slack.action.js';
import GmailAction from './connectors/gmail.action.js';
import TeamsAction from './connectors/teams.action.js';

// Import datasets
import { ConnectionDataset } from './connection.dataset.js';

/**
 * Integration Plugin Definition
 *
 * Exports all integration-related business objects, hooks, and actions
 * to be registered with the ObjectStack runtime
 */
export const IntegrationPlugin = {
  name: 'integration',
  label: 'Integration Cloud',
  version: '1.0.0',
  description: 'Integration and connectivity - Connectors, Sync, Webhooks, API Management, and AI-Powered Tools',

  // Plugin dependencies
  dependencies: ['ai'],

  // Plugin initialization
  init: async () => {
    // No initialization required for this plugin
  },

  // Business objects provided by this plugin
  objects: {
    connector: Connector,
    connection: Connection,
    sync_config: SyncConfig,
    sync_log: SyncLog,
    webhook_subscription: WebhookSubscription,
    webhook_delivery: WebhookDelivery,
    api_key: ApiKey,
    field_mapping: FieldMapping,
  },

  // Actions provided by this plugin
  actions: {
    sync_ai: SyncAIAction,
    connector_ai: ConnectorAIAction,
    stripe: StripeAction,
    docusign: DocuSignAction,
    slack: SlackAction,
    gmail: GmailAction,
    teams: TeamsAction,
  },

  // Triggers/Hooks
  triggers: {
    connector_activation: ConnectorActivation,
    connector_deactivation: ConnectorDeactivation,
    connector_health_check: ConnectorHealthCheck,
    connection_validation: ConnectionValidation,
    token_refresh: TokenRefresh,
    connection_expiry_alert: ExpiryAlert,
    mapping_validation: MappingValidation,
    schedule_management: ScheduleManagement,
    conflict_resolution: ConflictResolution,
    sync_monitoring: SyncMonitoring,
    sync_failure_alert: FailureAlert,
    sync_retry_logic: RetryLogic,
    subscription_validation: SubscriptionValidation,
    secret_rotation: SecretRotation,
    endpoint_verification: EndpointVerification,
    delivery_tracking: DeliveryTracking,
    retry_scheduling: RetryScheduling,
    dead_letter_handling: DeadLetterHandling,
    api_key_generation: KeyGeneration,
    api_key_expiry_alert: ApiKeyExpiryAlert,
    api_key_usage_tracking: UsageTracking,
  },

  // Seed data (DatasetSchema)
  data: [
    ConnectionDataset,
  ],

  // Apps provided by this plugin
  apps: [
    {
      name: 'integration',
      label: 'Integration Cloud',
      navigation: [
        {
          id: 'connectors',
          type: 'group',
          label: 'Connectors',
          children: [
            { id: 'connector', label: 'Connector', type: 'object', objectName: 'connector' },
            { id: 'connection', label: 'Connection', type: 'object', objectName: 'connection' },
          ]
        },
        {
          id: 'sync',
          type: 'group',
          label: 'Data Sync',
          children: [
            { id: 'sync_config', label: 'Sync Configuration', type: 'object', objectName: 'sync_config' },
            { id: 'sync_log', label: 'Sync Log', type: 'object', objectName: 'sync_log' },
            { id: 'field_mapping', label: 'Field Mapping', type: 'object', objectName: 'field_mapping' },
          ]
        },
        {
          id: 'webhooks',
          type: 'group',
          label: 'Webhooks',
          children: [
            { id: 'webhook_subscription', label: 'Webhook Subscription', type: 'object', objectName: 'webhook_subscription' },
            { id: 'webhook_delivery', label: 'Webhook Delivery', type: 'object', objectName: 'webhook_delivery' },
          ]
        },
        {
          id: 'api',
          type: 'group',
          label: 'API Management',
          children: [
            { id: 'api_key', label: 'API Key', type: 'object', objectName: 'api_key' },
          ]
        },
        {
          id: 'views_and_dashboards',
          type: 'group',
          label: 'Views & Dashboards',
          children: [
            { id: 'integration_dashboard', label: 'Integration Dashboard', type: 'dashboard', dashboardName: 'integration_dashboard' },
          ]
        }
      ]
    }
  ]
};

/** Spec-validated plugin metadata */
export const IntegrationPluginMetadata: PluginDefinition = PluginSchema.parse({
  name: 'integration',
  label: 'Integration Cloud',
  version: '1.0.0',
  description: 'Integration and connectivity - Connectors, Sync, Webhooks, API Management, and AI-Powered Tools',
});

export default IntegrationPlugin;
