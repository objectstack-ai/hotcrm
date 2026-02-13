import type { Page } from '@objectstack/spec/ui';
import { PageSchema } from '@objectstack/spec/ui';

/**
 * Analytics Dashboard Detail Page
 * Dashboard canvas with widget configuration
 */
export const AnalyticsDashboardPage = {
  name: 'analytics_dashboard_detail',
  object: 'analytics_dashboard',
  type: 'record' as const,
  label: 'Dashboard Canvas',
  template: 'default',
  isDefault: true,

  regions: [
    {
      name: 'header',
      components: [
        {
          type: 'record:highlights' as const,
          properties: {
            fields: ['name', 'is_public', 'refresh_interval', 'owner_id']
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
            tabs: ['dashboard_config', 'widgets']
          }
        }
      ]
    },
    {
      name: 'dashboard_config',
      components: [
        {
          type: 'record:details' as const,
          label: 'Dashboard Configuration',
          properties: {
            fields: [
              'name', 'description', 'layout_config',
              'refresh_interval', 'is_public', 'folder'
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
            fields: ['widgets'],
            columns: 1
          }
        }
      ]
    }
  ]
} satisfies Page;

PageSchema.parse(AnalyticsDashboardPage);

export default AnalyticsDashboardPage;
