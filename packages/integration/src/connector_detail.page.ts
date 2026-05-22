import type { Page } from '@objectstack/spec/ui';
import { PageSchema } from '@objectstack/spec/ui';

/**
 * Connector Detail Page Layout
 * Detail page for individual connector records with sync history, field mappings, and logs.
 */
export const ConnectorDetailPage = {
  name: 'connector_detail',
  type: 'record' as const,
  kind: 'full' as const,
  label: 'Connector Detail Page',
  template: 'default',
  isDefault: false,
  assignedProfiles: ['integration_admin', 'admin'],

  regions: [
    {
      name: 'header',
      components: [
        {
          type: 'page:header' as const,
          properties: {}
        }
      ]
    },
    {
      name: 'details',
      components: [
        {
          type: 'record:detail' as const,
          properties: {}
        }
      ]
    },
    {
      name: 'sync_history',
      components: [
        {
          type: 'record:related_list' as const,
          label: 'Sync History',
          properties: {
            object: 'sync_config'
          }
        }
      ]
    },
    {
      name: 'field_mappings',
      components: [
        {
          type: 'record:related_list' as const,
          label: 'Field Mappings',
          properties: {
            object: 'field_mapping'
          }
        }
      ]
    },
    {
      name: 'logs',
      components: [
        {
          type: 'page:card' as const,
          label: 'Connection Logs',
          properties: {}
        }
      ]
    }
  ]
} satisfies Page;

PageSchema.parse(ConnectorDetailPage);

export default ConnectorDetailPage;
