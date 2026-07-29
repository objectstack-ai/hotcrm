// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { defineView } from '@objectstack/spec/ui';

/**
 * Account Views
 *
 *   • grid    — primary list with revenue / industry summaries
 *   • gallery — branded account cards with brand_color highlights
 *   • map     — geospatial distribution (uses office_location)
 */
export const AccountViews = defineView({
  list: {
    type: 'grid',
    name: 'all_accounts',
    label: 'All Accounts',
    data: { provider: 'object', object: 'crm_account' },
    columns: [
      { field: 'name', width: 220, sortable: true, link: true, pinned: 'left' },
      { field: 'account_number', width: 140 },
      { field: 'industry', width: 140, sortable: true },
      { field: 'annual_revenue', width: 160, align: 'right', summary: 'sum' },
      { field: 'number_of_employees', width: 130, align: 'right', summary: 'avg' },
      { field: 'phone', width: 150 },
      { field: 'website', width: 200 },
      { field: 'owner', width: 150 },
      { field: 'is_active', width: 100, align: 'center' },
    ],
    sort: [{ field: 'annual_revenue', order: 'desc' }],
    grouping: { fields: [{ field: 'industry', order: 'asc', collapsed: false }] },
    rowColor: { field: 'is_active', colors: { true: '#16a34a', false: '#94a3b8' } },
    selection: { type: 'multiple' },
    pagination: { pageSize: 50, pageSizeOptions: [25, 50, 100] },
    exportOptions: ['csv', 'xlsx'],
    compactToolbar: true,
    bulkActionDefs: [
      {
        name: 'update_tier',
        label: 'Update Tier',
        icon: 'tag',
        operation: 'update',
        params: [
          {
            name: 'tier',
            label: 'Customer Tier',
            type: 'select',
            required: true,
            options: [
              { label: 'Strategic',  value: 'strategic'  },
              { label: 'Enterprise', value: 'enterprise' },
              { label: 'Mid-Market', value: 'mid_market' },
              { label: 'SMB',        value: 'smb'        },
            ],
          },
        ],
        confirmText: 'Update tier on {{count}} account(s) to {{tier}}?',
      },
      {
        name: 'transfer_owner',
        label: 'Transfer Owner',
        icon: 'user-check',
        operation: 'update',
        params: [
          {
            name: 'owner',
            label: 'New Owner',
            type: 'lookup',
            // The platform registers `sys_user` — `user` matches no object and
            // rendered an empty picker.
            object: 'sys_user',
            required: true,
          },
        ],
        confirmText: 'Transfer ownership of {{count}} account(s)?',
      },
      {
        name: 'delete',
        label: 'Delete',
        icon: 'trash-2',
        variant: 'danger',
        operation: 'delete',
        confirmText: 'Permanently delete {{count}} account(s)? This cannot be undone.',
        confirmLabel: 'Delete',
      },
    ],
    appearance: {
      showDescription: true,
      allowedVisualizations: ['grid', 'gallery', 'map'],
    },
    tabs: [
      { name: 'all', label: 'All', view: 'all_accounts', isDefault: true, pinned: true },
      { name: 'cards', label: 'Cards', icon: 'gallery-thumbnails', view: 'account_gallery' },
      { name: 'map', label: 'Map', icon: 'map', view: 'account_map' },
      { name: 'enterprise', label: 'Enterprise', icon: 'crown', view: 'enterprise_accounts' },
      { name: 'mine', label: 'My Accounts', icon: 'user', view: 'my_accounts' },
      { name: 'renewals', label: 'Renewals', icon: 'refresh-cw', view: 'renewals_due' },
      { name: 'at_risk', label: 'At Risk', icon: 'triangle-alert', view: 'at_risk_accounts' },
    ],
  },

  listViews: {
    /** Branded account cards */
    account_gallery: {
      name: 'account_gallery',
      type: 'gallery',
      label: 'Account Cards',
      data: { provider: 'object', object: 'crm_account' },
      columns: ['name', 'industry', 'annual_revenue', 'phone'],
      gallery: {
        cardSize: 'medium',
        titleField: 'name',
        visibleFields: ['industry', 'annual_revenue', 'number_of_employees', 'phone', 'website', 'owner'],
      },
    },

    /** Geospatial distribution */
    account_map: {
      name: 'account_map',
      type: 'map',
      label: 'Accounts by Location',
      data: { provider: 'object', object: 'crm_account' },
      columns: ['name', 'industry', 'office_location', 'billing_address'],
    },

    /** Tier accounts: Enterprise (>= $10M ARR) */
    enterprise_accounts: {
      name: 'enterprise_accounts',
      type: 'grid',
      label: 'Enterprise Accounts',
      data: { provider: 'object', object: 'crm_account' },
      columns: ['name', 'industry', 'annual_revenue', 'number_of_employees', 'owner'],
      filter: [{ field: 'annual_revenue', operator: 'greater_than_or_equal', value: 10000000 }],
      sort: [{ field: 'annual_revenue', order: 'desc' }],

      // ADR-0047 end-user quick filters (Airtable "User filters", Elements:
      // dropdowns). Lives on THIS view, not the default one: the default
      // view's `tabs` act as the view switcher, and filter tabs/dropdowns
      // are mutually exclusive with a tab row on the same toolbar.
      // `owner` is a user lookup — it renders as a record-picker dropdown.
      // NOTE: requires @objectstack/spec > 9.2.0 (ADR-0047 UserFiltersSchema);
      // on older specs defineStack strips this block — harmless no-op.
      ...({
        userFilters: {
          element: 'dropdown',
          fields: [
            { field: 'industry', showCount: true },
            { field: 'type' },
            { field: 'owner' },
          ],
        },
        // typed via spread-as-any until @objectstack/spec ships ADR-0047
        // (UserFiltersSchema is in framework main, > 9.2.0)
      } as any),
    },

    my_accounts: {
      name: 'my_accounts',
      type: 'grid',
      label: 'My Accounts',
      data: { provider: 'object', object: 'crm_account' },
      columns: ['name', 'industry', 'annual_revenue', 'phone', 'last_activity_date'],
      filter: [{ field: 'owner', operator: 'equals', value: '{current_user_id}' }],
      sort: [{ field: 'last_activity_date', order: 'desc' }],
    },

    /** Customer-success: upcoming renewals, sorted by date ascending */
    renewals_due: {
      name: 'renewals_due',
      type: 'grid',
      label: '🔄 Upcoming Renewals',
      data: { provider: 'object', object: 'crm_account' },
      columns: ['name', 'tier', 'health_score', 'next_renewal_date', 'renewal_owner', 'annual_revenue'],
      // Operator-only filter (no `{TODAY() + 90d}` template — sort exposes
      // the soonest renewals at the top of the list).
      filter: [
        { field: 'type', operator: 'equals', value: 'customer' },
        { field: 'next_renewal_date', operator: 'is_not_null' },
      ],
      sort: [{ field: 'next_renewal_date', order: 'asc' }],
    },

    /** At-risk customers — CSM action queue */
    at_risk_accounts: {
      name: 'at_risk_accounts',
      type: 'grid',
      label: '⚠️ At-Risk Accounts',
      data: { provider: 'object', object: 'crm_account' },
      columns: ['name', 'tier', 'health_score', 'segment', 'renewal_owner', 'last_activity_date'],
      filter: [
        { field: 'type', operator: 'equals', value: 'customer' },
        { field: 'health_score', operator: 'in', value: ['at_risk', 'churning'] },
      ],
      sort: [{ field: 'health_score', order: 'desc' }],
    },
  },

  form: {
    type: 'tabbed',
    data: { provider: 'object', object: 'crm_account' },
    sections: [
      {
        label: 'Profile',
        columns: 2,
        fields: [
          { field: 'name', required: true, colSpan: 2 },
          'account_number',
          // `type` (prospect / customer / partner …) drives the Renewals and
          // At-Risk views' `type = customer` filter — with no form field it
          // could never be set, so those views matched nothing.
          'type',
          'industry',
          'phone',
          'website',
          'owner',
          'parent_account',
          'is_active',
          'brand_color',
        ],
      },
      {
        label: 'Financials',
        columns: 2,
        fields: ['annual_revenue', 'number_of_employees'],
      },
      {
        // The customer-success fields the renewals_due / at_risk_accounts
        // views list and filter on. They existed on the object but no form
        // offered them, so the CS working queues stayed permanently empty.
        label: 'Customer Success',
        columns: 2,
        fields: ['tier', 'segment', 'health_score', 'renewal_owner', 'next_renewal_date'],
      },
      {
        label: 'Locations',
        columns: 1,
        fields: ['billing_address', 'office_location'],
      },
      {
        label: 'Description',
        columns: 1,
        fields: ['description'],
      },
    ],
  },
});
