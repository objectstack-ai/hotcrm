import type { Page } from '@objectstack/spec/ui';
import { PageSchema } from '@objectstack/spec/ui';

/**
 * Email Analytics Page Layout
 * Dashboard page showing email campaign performance metrics and trends.
 */
export const EmailAnalyticsPage = {
  name: 'email_analytics_page',
  type: 'record' as const,
  label: 'Email Analytics',
  template: 'record_detail',
  isDefault: false,
  assignedProfiles: ['marketing_specialist', 'marketing_manager', 'admin'],

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
      name: 'email_metrics',
      components: [
        {
          type: 'page:card' as const,
          label: 'Open Rate',
          properties: {}
        },
        {
          type: 'page:card' as const,
          label: 'Click-Through Rate',
          properties: {}
        },
        {
          type: 'page:card' as const,
          label: 'Bounce Rate',
          properties: {}
        },
        {
          type: 'page:card' as const,
          label: 'Unsubscribe Rate',
          properties: {}
        }
      ]
    },
    {
      name: 'email_sends',
      components: [
        {
          type: 'record:related_list' as const,
          label: 'Recent Email Sends',
          properties: {
            object: 'email_template',
            columns: ['name', 'subject', 'type', 'is_active']
          }
        }
      ]
    }
  ]
} satisfies Page;

PageSchema.parse(EmailAnalyticsPage);

export default EmailAnalyticsPage;
