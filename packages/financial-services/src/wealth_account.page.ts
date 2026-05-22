import type { Page } from '@objectstack/spec/ui';
import { PageSchema } from '@objectstack/spec/ui';

/**
 * Wealth Account Detail Page Layout
 * Comprehensive client wealth account page with portfolio view, KYC status, and advisory history.
 */
export const WealthAccountPage = {
  name: 'wealth_account_detail',
  object: 'wealth_account',
  type: 'record' as const,
  kind: 'full' as const,
  label: 'Wealth Account Detail',
  template: 'record_detail',
  isDefault: true,
  assignedProfiles: ['wealth_advisor', 'portfolio_manager', 'compliance_officer', 'admin'],

  regions: [
    {
      name: 'header',
      components: [
        {
          type: 'record:highlights' as const,
          properties: {
            fields: ['client_name', 'account_number', 'total_aum', 'risk_profile', 'kyc_status']
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
            tabs: ['account_overview', 'portfolio', 'kyc', 'advisory_history']
          }
        }
      ]
    },
    {
      name: 'account_overview',
      components: [
        {
          type: 'record:details' as const,
          label: 'Account Information',
          properties: {
            fields: [
              'client_name', 'account_number', 'account_type', 'total_aum',
              'risk_profile', 'investment_objective', 'advisor_id', 'branch'
            ],
            columns: 2
          }
        },
        {
          type: 'record:details' as const,
          label: 'Client Details',
          properties: {
            fields: [
              'date_of_birth', 'tax_id', 'citizenship', 'residency_status',
              'phone', 'email', 'mailing_address'
            ],
            columns: 2
          }
        }
      ]
    },
    {
      name: 'portfolio',
      components: [
        {
          type: 'record:related_list' as const,
          label: 'Portfolios',
          properties: {
            object: 'portfolio',
            columns: ['name', 'asset_class', 'market_value', 'performance_ytd', 'allocation_pct'],
            sort: [{ field: 'market_value', direction: 'desc' }],
            actions: ['new', 'edit']
          }
        },
        {
          type: 'record:related_list' as const,
          label: 'Recent Transactions',
          properties: {
            object: 'transaction_record',
            columns: ['transaction_date', 'type', 'security_name', 'amount', 'status'],
            sort: [{ field: 'transaction_date', direction: 'desc' }],
            actions: ['new', 'edit']
          }
        }
      ]
    },
    {
      name: 'kyc',
      components: [
        {
          type: 'record:related_list' as const,
          label: 'KYC Records',
          properties: {
            object: 'kyc',
            columns: ['verification_date', 'status', 'risk_rating', 'expiry_date', 'verified_by'],
            sort: [{ field: 'verification_date', direction: 'desc' }],
            actions: ['new', 'edit']
          }
        },
        {
          type: 'record:related_list' as const,
          label: 'Compliance Checks',
          properties: {
            object: 'compliance_check',
            columns: ['check_date', 'check_type', 'result', 'notes'],
            sort: [{ field: 'check_date', direction: 'desc' }],
            actions: ['new']
          }
        }
      ]
    },
    {
      name: 'advisory_history',
      components: [
        {
          type: 'record:related_list' as const,
          label: 'Advisory Meetings',
          properties: {
            object: 'advisory',
            columns: ['meeting_date', 'meeting_type', 'advisor_id', 'summary', 'status'],
            sort: [{ field: 'meeting_date', direction: 'desc' }],
            actions: ['new', 'edit']
          }
        },
        {
          type: 'record:activity' as const,
          label: 'Activity Timeline',
          properties: {}
        }
      ]
    },
    {
      name: 'ai_assistant',
      components: [
        {
          type: 'ai:chat_window' as const,
          label: 'Wealth Intelligence',
          properties: {
            mode: 'sidebar'
          }
        }
      ]
    }
  ]
} satisfies Page;

PageSchema.parse(WealthAccountPage);

export default WealthAccountPage;
