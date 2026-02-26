import type { View } from '@objectstack/spec/ui';
import { ViewSchema } from '@objectstack/spec/ui';

/**
 * Wealth Account List Views
 * Multiple views for managing client wealth accounts.
 */

// All Accounts View
export const AllAccountsView = {
  list: {
    type: 'grid' as const,
    name: 'all_wealth_accounts',
    label: 'All Accounts',
    columns: [
      { field: 'client_name', width: 200, sortable: true, link: true },
      { field: 'account_number', width: 140, sortable: true },
      { field: 'account_type', width: 130, sortable: true },
      { field: 'total_aum', width: 160, sortable: true, align: 'right' as const },
      { field: 'risk_profile', width: 120, sortable: true },
      { field: 'kyc_status', width: 120, sortable: true },
      { field: 'advisor_id', width: 150, sortable: true },
      { field: 'created_date', width: 130, sortable: true }
    ],
    sort: [{ field: 'client_name', order: 'asc' as const }],
    bulkActions: ['delete', 'update_owner', 'export'],
    inlineEdit: true,
    pagination: { pageSize: 25, pageSizeOptions: [10, 25, 50, 100] }
  }
} satisfies View;

// Active Accounts View
export const ActiveAccountsView = {
  list: {
    type: 'grid' as const,
    name: 'active_wealth_accounts',
    label: 'Active Accounts',
    filter: [{ field: 'status', operator: '=', value: 'active' }],
    columns: [
      { field: 'client_name', width: 200, link: true },
      { field: 'account_number', width: 140 },
      { field: 'total_aum', width: 160, align: 'right' as const },
      { field: 'risk_profile', width: 120 },
      { field: 'advisor_id', width: 150 },
      { field: 'last_review_date', width: 130 }
    ],
    sort: [{ field: 'total_aum', order: 'desc' as const }]
  }
} satisfies View;

// By Risk Profile View
export const ByRiskProfileView = {
  list: {
    type: 'grid' as const,
    name: 'wealth_accounts_by_risk',
    label: 'By Risk Profile',
    columns: [
      { field: 'client_name', width: 200, link: true },
      { field: 'account_number', width: 140 },
      { field: 'risk_profile', width: 120, sortable: true },
      { field: 'total_aum', width: 160, align: 'right' as const },
      { field: 'investment_objective', width: 160 },
      { field: 'kyc_status', width: 120 }
    ],
    sort: [{ field: 'risk_profile', order: 'asc' as const }],
    conditionalFormatting: [
      { condition: 'risk_profile == "Aggressive"', style: { backgroundColor: '#FEF2F2', borderLeft: '3px solid #EF4444' } },
      { condition: 'risk_profile == "Conservative"', style: { backgroundColor: '#F0FDF4', borderLeft: '3px solid #22C55E' } }
    ]
  }
} satisfies View;

// By Advisor View
export const ByAdvisorView = {
  list: {
    type: 'grid' as const,
    name: 'wealth_accounts_by_advisor',
    label: 'By Advisor',
    columns: [
      { field: 'advisor_id', width: 150, sortable: true },
      { field: 'client_name', width: 200, link: true },
      { field: 'account_number', width: 140 },
      { field: 'total_aum', width: 160, align: 'right' as const },
      { field: 'risk_profile', width: 120 },
      { field: 'last_review_date', width: 130 }
    ],
    sort: [{ field: 'advisor_id', order: 'asc' as const }]
  }
} satisfies View;

ViewSchema.parse(AllAccountsView);
ViewSchema.parse(ActiveAccountsView);
ViewSchema.parse(ByRiskProfileView);
ViewSchema.parse(ByAdvisorView);

export const WealthAccountListViews = {
  all: AllAccountsView,
  active: ActiveAccountsView,
  byRiskProfile: ByRiskProfileView,
  byAdvisor: ByAdvisorView
};

export default WealthAccountListViews;
