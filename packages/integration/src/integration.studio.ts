/**
 * Integration Studio Plugin — Integration Cloud
 *
 * Provides Studio IDE extensions for the Integration Cloud package including
 * connector setup tools, connection testing, and sync log viewing.
 */
import { defineStudioPlugin, StudioPluginManifestSchema } from '@objectstack/spec/studio';

const integrationStudioConfig = {
  id: 'hotcrm.integration',
  name: 'hotcrm-integration-studio',
  version: '1.0.0',
  description: 'Studio extensions for Integration Cloud',
  activationEvents: [
    'onObject:connector',
    'onObject:sync_config',
    'onObject:webhook_subscription'
  ],
  contributes: {
    sidebarGroups: [
      {
        key: 'integration',
        label: 'Integration Cloud',
        order: 70,
        metadataTypes: ['object']
      }
    ],
    actions: [
      {
        id: 'setup_connector',
        label: 'Setup Connector',
        location: 'toolbar' as const
      },
      {
        id: 'test_connection',
        label: 'Test Connection',
        location: 'toolbar' as const
      },
      {
        id: 'view_sync_logs',
        label: 'View Sync Logs',
        location: 'commandPalette' as const
      }
    ],
    panels: [
      {
        id: 'connection_status',
        label: 'Connection Status',
        location: 'right' as const
      },
      {
        id: 'sync_monitor',
        label: 'Sync Monitor',
        location: 'right' as const
      }
    ],
    commands: [
      { id: 'hotcrm.integration.setupConnector', label: 'Setup Connector' },
      { id: 'hotcrm.integration.testConnection', label: 'Test Connection' },
      { id: 'hotcrm.integration.viewSyncLogs', label: 'View Sync Logs' }
    ]
  }
};

export const IntegrationStudioPlugin = defineStudioPlugin(integrationStudioConfig);

export const IntegrationStudioManifest = StudioPluginManifestSchema.parse(integrationStudioConfig);

export default IntegrationStudioPlugin;
