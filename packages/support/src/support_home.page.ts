import type { Page } from '@objectstack/spec/ui';
import { PageSchema } from '@objectstack/spec/ui';

/**
 * Support Home Page Layout
 * Landing page for support teams with open cases queue, metrics, and AI case routing.
 */
export const SupportHomePage = {
  name: 'support_home',
  type: 'home' as const,
  label: 'Support Home Page',
  assignedProfiles: ['support_agent', 'support_manager', 'admin'],

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
      name: 'queue',
      components: [
        {
          type: 'record:related_list' as const,
          label: 'Open Cases Queue',
          properties: {
            object: 'case',
            columns: ['case_number', 'subject', 'priority', 'status', 'created_date'],
            filters: [['status', '!=', 'Closed']],
            sort: [{ field: 'priority', direction: 'desc' }]
          }
        }
      ]
    },
    {
      name: 'metrics',
      components: [
        {
          type: 'page:card' as const,
          label: 'SLA Alerts',
          properties: {}
        },
        {
          type: 'page:card' as const,
          label: 'CSAT Trends',
          properties: {}
        }
      ]
    },
    {
      name: 'ai_routing',
      components: [
        {
          type: 'ai:suggestion' as const,
          label: 'AI Case Routing',
          properties: {
            context: 'case_routing'
          }
        }
      ]
    }
  ]
} satisfies Page;

PageSchema.parse(SupportHomePage);

export default SupportHomePage;
