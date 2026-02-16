import type { Page } from '@objectstack/spec/ui';
import { PageSchema } from '@objectstack/spec/ui';

/**
 * AR Aging Page Layout
 * Dashboard page showing accounts receivable aging buckets and collection status.
 */
export const ArAgingPage = {
  name: 'ar_aging_page',
  type: 'record' as const,
  label: 'AR Aging Dashboard',
  template: 'record_detail',
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
      name: 'aging_buckets',
      components: [
        {
          type: 'page:card' as const,
          label: 'Current (0-30 Days)',
          properties: {}
        },
        {
          type: 'page:card' as const,
          label: '31-60 Days',
          properties: {}
        },
        {
          type: 'page:card' as const,
          label: '61-90 Days',
          properties: {}
        },
        {
          type: 'page:card' as const,
          label: '90+ Days',
          properties: {}
        }
      ]
    },
    {
      name: 'overdue_invoices',
      components: [
        {
          type: 'record:related_list' as const,
          label: 'Overdue Invoices',
          properties: {
            object: 'invoice',
            columns: ['invoice_number', 'account_id', 'total_amount', 'balance_due', 'due_date', 'aging_bucket'],
            filters: [['status', '!=', 'paid']],
            sort: [{ field: 'due_date', direction: 'asc' }]
          }
        }
      ]
    }
  ]
} satisfies Page;

PageSchema.parse(ArAgingPage);

export default ArAgingPage;
