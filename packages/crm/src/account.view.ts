import type { View } from '@objectstack/spec/ui';
import { ViewSchema } from '@objectstack/spec/ui';

/**
 * Account List Views
 * Demonstrates various list view configurations with filters, sorting, and bulk actions
 */

// All Accounts View
export const AllAccountsView = {
  list: {
    type: 'grid' as const,
    name: 'all_accounts',
    label: 'All Accounts',
    columns: [
      { field: 'name', width: 250, sortable: true, link: true },
      { field: 'type', width: 120, sortable: true },
      { field: 'industry', width: 150, sortable: true },
      { field: 'annual_revenue', width: 150, sortable: true, align: 'right' as const },
      { field: 'phone', width: 150 },
      { field: 'owner', width: 150 },
      { field: 'created_date', width: 150, sortable: true }
    ],
    sort: [{ field: 'name', order: 'asc' as const }],
    bulkActions: ['delete', 'update_owner', 'export'],
    inlineEdit: true,
    pagination: { pageSize: 25, pageSizeOptions: [10, 25, 50, 100] }
  }
} satisfies View;

// My Accounts View
export const MyAccountsView = {
  list: {
    type: 'grid' as const,
    name: 'my_accounts',
    label: 'My Accounts',
    filter: [{ field: 'owner', operator: '=', value: '${currentUser.id}' }],
    columns: [
      { field: 'name', width: 250, link: true },
      { field: 'type', width: 120 },
      { field: 'industry', width: 150 },
      { field: 'last_activity_date', width: 150 },
      { field: 'annual_revenue', width: 150, align: 'right' as const }
    ],
    sort: [{ field: 'last_activity_date', order: 'desc' as const }]
  }
} satisfies View;

// Enterprise Accounts View
export const EnterpriseAccountsView = {
  list: {
    type: 'grid' as const,
    name: 'enterprise_accounts',
    label: 'Enterprise Accounts',
    filter: [
      { field: 'annual_revenue', operator: '>', value: 10000000 },
      { field: 'type', operator: '=', value: 'customer' }
    ],
    columns: [
      { field: 'name', width: 250, link: true },
      { field: 'annual_revenue', width: 150, align: 'right' as const },
      { field: 'employees', width: 100 },
      { field: 'industry', width: 150 },
      { field: 'rating', width: 100 },
      { field: 'owner', width: 150 }
    ],
    sort: [{ field: 'annual_revenue', order: 'desc' as const }]
  }
} satisfies View;

// Recently Created Accounts
export const RecentlyCreatedView = {
  list: {
    type: 'grid' as const,
    name: 'recently_created_accounts',
    label: 'Recently Created',
    filter: [{ field: 'created_date', operator: '>=', value: 'LAST_30_DAYS' }],
    columns: [
      { field: 'name', width: 250, link: true },
      { field: 'type', width: 120 },
      { field: 'owner', width: 150 },
      { field: 'created_by', width: 150 },
      { field: 'created_date', width: 150 }
    ],
    sort: [{ field: 'created_date', order: 'desc' as const }]
  }
} satisfies View;

// Hot Accounts (High Value, Active)
export const HotAccountsView = {
  list: {
    type: 'grid' as const,
    name: 'hot_accounts',
    label: 'Hot Accounts',
    filter: [
      { field: 'rating', operator: '=', value: 'Hot' },
      { field: 'type', operator: 'IN', value: ['customer', 'prospect'] }
    ],
    columns: [
      { field: 'name', width: 250, link: true },
      { field: 'annual_revenue', width: 150, align: 'right' as const },
      { field: 'industry', width: 150 },
      { field: 'last_activity_date', width: 150 },
      { field: 'owner', width: 150 }
    ],
    sort: [{ field: 'annual_revenue', order: 'desc' as const }],
    conditionalFormatting: [
      { condition: { dialect: 'cel', source: 'rating == "Hot"' }, style: { backgroundColor: '#FEF2F2', borderLeft: '3px solid #EF4444' } }
    ]
  }
} satisfies View;

// Accounts Needing Attention
export const NeedAttentionView = {
  list: {
    type: 'grid' as const,
    name: 'accounts_need_attention',
    label: 'Needs Attention',
    filter: [
      { field: 'last_activity_date', operator: '<', value: 'LAST_60_DAYS' },
      { field: 'type', operator: '=', value: 'customer' }
    ],
    columns: [
      { field: 'name', width: 250, link: true },
      { field: 'last_activity_date', width: 150 },
      { field: 'annual_revenue', width: 150, align: 'right' as const },
      { field: 'owner', width: 150 }
    ],
    sort: [{ field: 'last_activity_date', order: 'asc' as const }],
    conditionalFormatting: [
      { condition: { dialect: 'cel', source: 'last_activity_date < LAST_60_DAYS' }, style: { backgroundColor: '#FFFBEB', borderLeft: '3px solid #F59E0B' } }
    ]
  }
} satisfies View;

ViewSchema.parse(AllAccountsView);
ViewSchema.parse(MyAccountsView);
ViewSchema.parse(EnterpriseAccountsView);
ViewSchema.parse(RecentlyCreatedView);
ViewSchema.parse(HotAccountsView);
ViewSchema.parse(NeedAttentionView);

export const AccountListViews = {
  all: AllAccountsView,
  my: MyAccountsView,
  enterprise: EnterpriseAccountsView,
  recent: RecentlyCreatedView,
  hot: HotAccountsView,
  needAttention: NeedAttentionView
};

export default AccountListViews;
