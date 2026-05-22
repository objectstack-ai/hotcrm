import type { Page } from '@objectstack/spec/ui';
import { PageSchema } from '@objectstack/spec/ui';

/**
 * Connector Detail Page Layout
 * Connector marketplace with setup wizard sections
 */
export const ConnectorPage = {
  name: 'connector_detail',
  object: 'connector',
  type: 'record' as const,
  kind: 'full' as const,
  label: 'Connector Detail Page',
  template: 'record_detail',
  isDefault: true,
  assignedProfiles: ['integration_admin', 'admin'],

  regions: [
    {
      name: 'header',
      components: [
        {
          type: 'record:highlights' as const,
          properties: {
            fields: ['name', 'provider', 'connector_type', 'status', 'category']
          }
        }
      ]
    },
    {
      name: 'tabs',
      components: [
        {
          type: 'page:tabs' as const,
          properties: {
            tabs: ['connector_info', 'authentication', 'connections']
          }
        }
      ]
    },
    {
      name: 'connector_info',
      components: [
        {
          type: 'record:details' as const,
          label: 'Connector Information',
          properties: {
            fields: [
              'name', 'description', 'provider', 'connector_type',
              'base_url', 'version', 'icon', 'category', 'status'
            ],
            columns: 2
          }
        }
      ]
    },
    {
      name: 'authentication',
      components: [
        {
          type: 'record:details' as const,
          label: 'Authentication Setup',
          properties: {
            fields: [
              'auth_type', 'credentials_ref'
            ],
            columns: 2
          }
        }
      ]
    },
    {
      name: 'connections',
      components: [
        {
          type: 'record:related_list' as const,
          label: 'Active Connections',
          properties: {
            object: 'connection',
            columns: ['name', 'status', 'tenant_id', 'last_used', 'expires_at'],
            filters: [['status', '=', 'connected']],
            sort: [{ field: 'last_used', direction: 'desc' }],
            actions: ['new', 'edit', 'delete']
          }
        }
      ]
    }
  ]
} satisfies Page;

PageSchema.parse(ConnectorPage);

export default ConnectorPage;
