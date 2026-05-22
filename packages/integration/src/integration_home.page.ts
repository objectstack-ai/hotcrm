import type { Page } from '@objectstack/spec/ui';
import { PageSchema } from '@objectstack/spec/ui';

/**
 * Integration Home Page Layout
 * Landing page for integration admins with active connections, recent syncs, and alerts.
 */
export const IntegrationHomePage = {
  name: 'integration_home',
  type: 'home' as const,
  kind: 'full' as const,
  label: 'Integration Home Page',
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
      name: 'active_connections',
      components: [
        {
          type: 'record:related_list' as const,
          label: 'Active Connections',
          properties: {
            object: 'connector',
            filters: [['status', '=', 'active']]
          }
        }
      ]
    },
    {
      name: 'recent_syncs',
      components: [
        {
          type: 'record:related_list' as const,
          label: 'Recent Syncs',
          properties: {
            object: 'sync_config'
          }
        }
      ]
    },
    {
      name: 'alerts',
      components: [
        {
          type: 'page:card' as const,
          label: 'Sync Alerts',
          properties: {}
        }
      ]
    }
  ]
} satisfies Page;

PageSchema.parse(IntegrationHomePage);

export default IntegrationHomePage;
