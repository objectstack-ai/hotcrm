import { ListView } from '@objectstack/spec/ui';

/**
 * Account List Views
 * Demonstrates various list view configurations with filters, sorting, and bulk actions
 */

// All Accounts View
export const AllAccountsView = ListView.create({
  name: 'all_accounts',
  label: 'All Accounts',
  object: 'account',

  columns: [
    {
      field: 'name',
      width: 250,
      sortable: true,
      link: true
    },
    {
      field: 'type',
      width: 120,
      sortable: true
    },
    {
      field: 'industry',
      width: 150,
      sortable: true
    },
    {
      field: 'annual_revenue',
      width: 150,
      sortable: true,
      align: 'right'
    },
    {
      field: 'phone',
      width: 150
    },
    {
      field: 'owner',
      width: 150
    },
    {
      field: 'created_date',
      width: 150,
      sortable: true,
      format: 'YYYY-MM-DD'
    }
  ],

  sort: [
    { field: 'name', direction: 'asc' }
  ],

  bulkActions: ['delete', 'update_owner', 'export'],
  inlineEdit: true,

  pagination: {
    pageSize: 25,
    options: [10, 25, 50, 100]
  }
});

// My Accounts View
export const MyAccountsView = ListView.create({
  name: 'my_accounts',
  label: 'My Accounts',
  object: 'account',

  filters: [
    { field: 'owner', operator: '=', value: '${currentUser.id}' }
  ],

  columns: [
    { field: 'name', width: 250, link: true },
    { field: 'type', width: 120 },
    { field: 'industry', width: 150 },
    { field: 'last_activity_date', width: 150 },
    { field: 'annual_revenue', width: 150, align: 'right' }
  ],

  sort: [
    { field: 'last_activity_date', direction: 'desc' }
  ]
});

// Enterprise Accounts View
export const EnterpriseAccountsView = ListView.create({
  name: 'enterprise_accounts',
  label: 'Enterprise Accounts',
  object: 'account',

  filters: [
    { field: 'annual_revenue', operator: '>', value: 10000000 },
    { field: 'type', operator: '=', value: 'Customer' }
  ],

  columns: [
    { field: 'name', width: 250, link: true },
    { field: 'annual_revenue', width: 150, align: 'right' },
    { field: 'employees', width: 100 },
    { field: 'industry', width: 150 },
    { field: 'rating', width: 100 },
    { field: 'owner', width: 150 }
  ],

  sort: [
    { field: 'annual_revenue', direction: 'desc' }
  ]
});

// Recently Created Accounts
export const RecentlyCreatedView = ListView.create({
  name: 'recently_created_accounts',
  label: 'Recently Created',
  object: 'account',

  filters: [
    { field: 'created_date', operator: '>=', value: 'LAST_30_DAYS' }
  ],

  columns: [
    { field: 'name', width: 250, link: true },
    { field: 'type', width: 120 },
    { field: 'owner', width: 150 },
    { field: 'created_by', width: 150 },
    { field: 'created_date', width: 150 }
  ],

  sort: [
    { field: 'created_date', direction: 'desc' }
  ]
});

// Hot Accounts (High Value, Active)
export const HotAccountsView = ListView.create({
  name: 'hot_accounts',
  label: 'Hot Accounts',
  object: 'account',

  filters: [
    { field: 'rating', operator: '=', value: 'Hot' },
    { field: 'type', operator: 'IN', value: ['Customer', 'Prospect'] }
  ],

  columns: [
    { field: 'name', width: 250, link: true },
    { field: 'annual_revenue', width: 150, align: 'right' },
    { field: 'industry', width: 150 },
    { field: 'last_activity_date', width: 150 },
    { field: 'owner', width: 150 }
  ],

  sort: [
    { field: 'annual_revenue', direction: 'desc' }
  ],

  // Highlight hot accounts in red
  rowStyles: {
    backgroundColor: '#FEF2F2',
    borderLeft: '3px solid #EF4444'
  }
});

// Accounts Needing Attention
export const NeedAttentionView = ListView.create({
  name: 'accounts_need_attention',
  label: 'Needs Attention',
  object: 'account',

  filters: [
    { field: 'last_activity_date', operator: '<', value: 'LAST_60_DAYS' },
    { field: 'type', operator: '=', value: 'Customer' }
  ],

  columns: [
    { field: 'name', width: 250, link: true },
    { field: 'last_activity_date', width: 150 },
    { field: 'annual_revenue', width: 150, align: 'right' },
    { field: 'owner', width: 150 }
  ],

  sort: [
    { field: 'last_activity_date', direction: 'asc' }
  ],

  // Warning styling
  rowStyles: {
    backgroundColor: '#FFFBEB',
    borderLeft: '3px solid #F59E0B'
  }
});

export const AccountListViews = {
  all: AllAccountsView,
  my: MyAccountsView,
  enterprise: EnterpriseAccountsView,
  recent: RecentlyCreatedView,
  hot: HotAccountsView,
  needAttention: NeedAttentionView
};

export default AccountListViews;
