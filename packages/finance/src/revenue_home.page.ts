import type { Page } from '@objectstack/spec/ui';
import { PageSchema } from '@objectstack/spec/ui';

/**
 * Revenue Cloud Home Page Layout
 * Landing page for finance users with revenue metrics, recent invoices, and AR aging summary.
 */
export const RevenueHomePage = {
  name: 'revenue_home',
  type: 'home' as const,
  label: 'Revenue Cloud Home Page',
  template: 'default',
  isDefault: false,
  assignedProfiles: ['finance_analyst', 'finance_manager', 'ar_specialist', 'admin'],

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
      name: 'metrics',
      components: [
        {
          type: 'page:card' as const,
          label: 'Revenue This Quarter',
          properties: {}
        },
        {
          type: 'page:card' as const,
          label: 'Outstanding Receivables',
          properties: {}
        },
        {
          type: 'page:card' as const,
          label: 'DSO (Days Sales Outstanding)',
          properties: {}
        }
      ]
    },
    {
      name: 'recent_invoices',
      components: [
        {
          type: 'record:related_list' as const,
          label: 'Recent Invoices',
          properties: {
            object: 'invoice',
            columns: ['invoice_number', 'account_id', 'total_amount', 'status', 'due_date']
          }
        }
      ]
    },
    {
      name: 'ar_aging',
      components: [
        {
          type: 'page:card' as const,
          label: 'AR Aging Summary',
          properties: {}
        }
      ]
    },
    {
      name: 'insights',
      components: [
        {
          type: 'ai:suggestion' as const,
          label: 'Finance Insights',
          properties: {
            context: 'revenue_management'
          }
        }
      ]
    }
  ]
} satisfies Page;

PageSchema.parse(RevenueHomePage);

export default RevenueHomePage;
