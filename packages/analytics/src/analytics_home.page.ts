import type { Page } from '@objectstack/spec/ui';
import { PageSchema } from '@objectstack/spec/ui';

/**
 * Analytics Home Page Layout
 * Landing page for analytics users with recent reports, dashboards, and AI insights.
 */
export const AnalyticsHomePage = {
  name: 'analytics_home',
  type: 'home' as const,
  label: 'Analytics Home Page',
  template: 'default',
  isDefault: false,
  assignedProfiles: ['analyst', 'admin', 'manager'],

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
      name: 'recent_reports',
      components: [
        {
          type: 'record:related_list' as const,
          label: 'Recent Reports',
          properties: {
            object: 'report',
            columns: ['report_name', 'report_type', 'last_run_date', 'owner_id'],
            sort: [{ field: 'last_run_date', direction: 'desc' }]
          }
        }
      ]
    },
    {
      name: 'dashboards',
      components: [
        {
          type: 'record:related_list' as const,
          label: 'Dashboards',
          properties: {
            object: 'dashboard',
            columns: ['dashboard_name', 'folder', 'last_refreshed'],
            sort: [{ field: 'last_refreshed', direction: 'desc' }]
          }
        }
      ]
    },
    {
      name: 'ai_insights',
      components: [
        {
          type: 'ai:suggestion' as const,
          label: 'AI Insights',
          properties: {
            context: 'analytics_insights'
          }
        }
      ]
    }
  ]
} satisfies Page;

PageSchema.parse(AnalyticsHomePage);

export default AnalyticsHomePage;
