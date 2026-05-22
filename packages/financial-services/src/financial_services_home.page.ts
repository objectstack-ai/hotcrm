import type { Page } from '@objectstack/spec/ui';
import { PageSchema } from '@objectstack/spec/ui';

/**
 * Financial Services Home Page Layout
 * Landing page for wealth management users with AUM metrics, portfolio alerts, and compliance tasks.
 */
export const FinancialServicesHomePage = {
  name: 'financial_services_home',
  type: 'home' as const,
  kind: 'full' as const,
  label: 'Financial Services Home',
  template: 'default',
  isDefault: false,
  assignedProfiles: ['wealth_advisor', 'portfolio_manager', 'compliance_officer', 'admin'],

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
      name: 'summary',
      components: [
        {
          type: 'page:card' as const,
          label: 'Total AUM',
          properties: {}
        },
        {
          type: 'page:card' as const,
          label: 'Portfolio Alerts',
          properties: {}
        },
        {
          type: 'page:card' as const,
          label: 'Pending KYC Reviews',
          properties: {}
        },
        {
          type: 'page:card' as const,
          label: 'Compliance Tasks',
          properties: {}
        }
      ]
    },
    {
      name: 'insights',
      components: [
        {
          type: 'ai:suggestion' as const,
          label: 'Wealth Management Insights',
          properties: {
            context: 'wealth_management'
          }
        }
      ]
    },
    {
      name: 'top_accounts',
      components: [
        {
          type: 'record:related_list' as const,
          label: 'Top Client Accounts by AUM',
          properties: {
            object: 'wealth_account',
            columns: ['client_name', 'account_number', 'total_aum', 'risk_profile', 'kyc_status']
          }
        }
      ]
    },
    {
      name: 'upcoming_meetings',
      components: [
        {
          type: 'record:related_list' as const,
          label: 'Upcoming Advisory Meetings',
          properties: {
            object: 'advisory',
            columns: ['wealth_account', 'meeting_date', 'meeting_type', 'advisor_id', 'status']
          }
        }
      ]
    }
  ]
} satisfies Page;

PageSchema.parse(FinancialServicesHomePage);

export default FinancialServicesHomePage;
