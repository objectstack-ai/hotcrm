import type { Page } from '@objectstack/spec/ui';
import { PageSchema } from '@objectstack/spec/ui';

/**
 * Analytics Dashboard Canvas Page
 * Provides drag-and-drop widget placement and dashboard configuration
 */
export const AnalyticsDashboardPage = {
  name: 'analytics_dashboard_detail',
  object: 'analytics_dashboard',
  type: 'record' as const,
  label: 'Dashboard Canvas',
  template: 'record_detail',
  isDefault: true,
  assignedProfiles: ['analyst', 'manager', 'admin'],

  regions: [
    {
      name: 'header',
      components: [
        {
          type: 'record:highlights' as const,
          properties: {
            fields: ['name', 'theme', 'refresh_interval', 'is_default', 'owner_id']
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
            tabs: ['canvas', 'settings', 'widgets', 'sharing']
          }
        }
      ]
    },
    {
      name: 'canvas',
      components: [
        {
          type: 'record:details' as const,
          label: 'Dashboard Layout',
          properties: {
            fields: [
              'name', 'description', 'layout_config', 'theme',
              'folder', 'is_default'
            ],
            columns: 2
          }
        }
      ]
    },
    {
      name: 'settings',
      components: [
        {
          type: 'record:details' as const,
          label: 'Dashboard Configuration',
          properties: {
            fields: [
              'refresh_interval', 'theme',
              'is_default', 'folder'
            ],
            columns: 2
          }
        }
      ]
    },
    {
      name: 'widgets',
      components: [
        {
          type: 'record:details' as const,
          label: 'Widget Configuration',
          properties: {
            fields: [
              'widgets', 'layout_config'
            ],
            columns: 1
          }
        }
      ]
    },
    {
      name: 'sharing',
      components: [
        {
          type: 'record:details' as const,
          label: 'Access & Sharing',
          properties: {
            fields: [
              'owner_id', 'shared_with',
              'is_default'
            ],
            columns: 2
          }
        }
      ]
    }
  ]
} satisfies Page;

PageSchema.parse(AnalyticsDashboardPage);

export default AnalyticsDashboardPage;
