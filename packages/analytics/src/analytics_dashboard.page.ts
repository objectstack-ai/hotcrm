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

  regions: [
    {
      name: 'header',
      components: [
        {
          type: 'record:highlights' as const,
          properties: {
            fields: ['name', 'status', 'layout_type', 'auto_refresh_interval', 'owner']
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
              'name', 'description', 'layout_type', 'theme',
              'column_count', 'row_height'
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
              'auto_refresh_interval', 'default_date_range',
              'status', 'is_public', 'tags'
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
              'widgets', 'widget_count', 'data_sources'
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
              'owner', 'is_public', 'shared_with',
              'created_by', 'created_date',
              'last_modified_by', 'last_modified_date'
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
