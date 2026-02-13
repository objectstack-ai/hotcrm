import type { Page } from '@objectstack/spec/ui';
import { PageSchema } from '@objectstack/spec/ui';

/**
 * Account Detail Page Layout
 * Comprehensive page layout with tabs, sections, related lists, and AI assistant.
 * Leverages PageSchema features: isDefault, assignedProfiles, visibility, ai:chat_window, record:activity.
 */
export const AccountPage = {
  name: 'account_detail',
  object: 'account',
  type: 'record' as const,
  label: 'Account Detail Page',
  template: 'record_detail',
  isDefault: true,
  assignedProfiles: ['sales_rep', 'sales_manager', 'account_executive', 'admin'],

  regions: [
    {
      name: 'header',
      components: [
        {
          type: 'record:highlights' as const,
          properties: {
            fields: ['name', 'type', 'industry', 'annual_revenue', 'phone']
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
            tabs: ['account_info', 'address_info', 'additional_info']
          }
        }
      ]
    },
    {
      name: 'account_info',
      components: [
        {
          type: 'record:details' as const,
          label: 'Account Information',
          properties: {
            fields: [
              'name', 'account_number', 'type', 'industry',
              'phone', 'website', 'annual_revenue', 'number_of_employees',
              'parent_account', 'ownership'
            ],
            columns: 2
          }
        }
      ]
    },
    {
      name: 'address_info',
      components: [
        {
          type: 'record:details' as const,
          label: 'Address Information',
          properties: {
            fields: [
              'billing_street', 'billing_city', 'billing_state',
              'billing_postal_code', 'billing_country',
              'shipping_street', 'shipping_city', 'shipping_state',
              'shipping_postal_code', 'shipping_country'
            ],
            columns: 2
          }
        }
      ]
    },
    {
      name: 'additional_info',
      components: [
        {
          type: 'record:details' as const,
          label: 'Additional Information',
          properties: {
            fields: [
              'description', 'rating', 'sic_code', 'ticker_symbol',
              'fax', 'created_by', 'created_date',
              'last_modified_by', 'last_modified_date'
            ],
            columns: 2
          }
        }
      ]
    },
    {
      name: 'activity',
      components: [
        {
          type: 'record:activity' as const,
          label: 'Activity Timeline',
          properties: {}
        }
      ]
    },
    {
      name: 'related_lists',
      components: [
        {
          type: 'record:related_list' as const,
          label: 'Opportunities',
          properties: {
            object: 'opportunity',
            columns: ['name', 'stage', 'amount', 'close_date', 'probability'],
            filters: [['stage', '!=', 'closed_lost']],
            sort: [{ field: 'close_date', direction: 'asc' }],
            actions: ['new', 'edit', 'delete']
          }
        },
        {
          type: 'record:related_list' as const,
          label: 'Contacts',
          properties: {
            object: 'contact',
            columns: ['name', 'title', 'email', 'phone', 'is_decision_maker'],
            actions: ['new', 'edit', 'delete']
          }
        },
        {
          type: 'record:related_list' as const,
          label: 'Cases',
          visibility: "record.sla_tier != null",
          properties: {
            object: 'case',
            columns: ['case_number', 'subject', 'status', 'priority', 'created_date'],
            filters: [['status', '!=', 'closed']],
            sort: [{ field: 'created_date', direction: 'desc' }],
            actions: ['new', 'edit']
          }
        },
        {
          type: 'record:related_list' as const,
          label: 'Contracts',
          properties: {
            object: 'contract',
            columns: ['contract_number', 'status', 'start_date', 'end_date', 'contract_term'],
            actions: ['new', 'edit']
          }
        }
      ]
    },
    {
      name: 'ai_assistant',
      components: [
        {
          type: 'ai:chat_window' as const,
          label: 'Account Intelligence',
          properties: {
            mode: 'sidebar'
          }
        }
      ]
    }
  ]
} satisfies Page;

PageSchema.parse(AccountPage);

export default AccountPage;
