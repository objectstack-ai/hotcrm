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
      { field: 'name', width: 240, sortable: true, link: true, pinned: 'left' },
      { field: 'industry', width: 140, sortable: true },
      { field: 'type', width: 130 },
      { field: 'annual_revenue', width: 160, align: 'right', summary: 'sum' },
      { field: 'number_of_employees', width: 130, align: 'right', summary: 'avg' },
      { field: 'health_score', width: 140 },
    ],
    sort: [{ field: 'annual_revenue', order: 'desc' }],
    rowColor: { field: 'is_active', colors: { true: '#16a34a', false: '#94a3b8' } },
    selection: { type: 'multiple' },
    pagination: { pageSize: 50, pageSizeOptions: [25, 50, 100] },
    exportOptions: { formats: ['csv', 'xlsx'] },
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
            name: 'owner_id',
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
        visibleFields: ['industry', 'annual_revenue', 'number_of_employees', 'phone', 'website', 'owner_id'],
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
      columns: ['name', 'industry', 'annual_revenue', 'number_of_employees', 'owner_id'],
      filter: [{ field: 'annual_revenue', operator: 'greater_than_or_equal', value: 10000000 }],
      sort: [{ field: 'annual_revenue', order: 'desc' }],

      // ADR-0047 end-user quick filters (Airtable "User filters", Elements:
      // dropdowns). `element: 'dropdown'`, deliberately — on an object list
      // the view SWITCHER owns the tab bar (it builds one entry per `list` /
      // `listViews` descriptor), so a quick-filter block shaped as tabs is
      // dropped there: the console logs `defines userFilters (element:
      // "tabs"), which are ignored on an object list view (ADR-0047 "views"
      // mode — the view switcher owns the tab bar here)` and renders nothing.
      // Dropdowns sit beside the switcher and are unaffected.
      // `owner_id` is the platform ownership lookup (#548) — it renders as a
      // record-picker dropdown.
      // NOTE: requires @objectstack/spec > 9.2.0 (ADR-0047 UserFiltersSchema);
      // on older specs defineStack strips this block — harmless no-op.
      ...({
        userFilters: {
          element: 'dropdown',
          fields: [
            { field: 'industry', showCount: true },
            { field: 'type' },
            { field: 'owner_id' },
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
      filter: [{ field: 'owner_id', operator: 'equals', value: '{current_user_id}' }],
      sort: [{ field: 'last_activity_date', order: 'desc' }],
    },

    // The `renewals_due` view is gone with the fields it was built on (#1181):
    // both its `is_not_null` filter and its sort key were
    // `crm_account.next_renewal_date`, so the view could not outlive the field.
    // Nothing is lost — `crm_contract` ships the renewals queue that the daily
    // sweep actually acts on (`renewal_calendar`, over `end_date`).

    /** At-risk customers — CSM action queue */
    at_risk_accounts: {
      name: 'at_risk_accounts',
      type: 'grid',
      label: '⚠️ At-Risk Accounts',
      data: { provider: 'object', object: 'crm_account' },
      columns: ['name', 'tier', 'health_score', 'segment', 'last_activity_date'],
      filter: [
        { field: 'type', operator: 'equals', value: 'customer' },
        { field: 'health_score', operator: 'in', value: ['at_risk', 'churning'] },
      ],
      sort: [{ field: 'health_score', order: 'desc' }],
    },
  },

  form: {
    type: 'tabbed',
    sections: [
      {
        name: 'profile',
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
          'owner_id',
          'parent_account',
          'is_active',
          'brand_color',
        ],
      },
      {
        // `child_account_revenue` is a roll-up the engine maintains, so it is
        // read-only on the form by construction — it is here because a hierarchy
        // nobody can see the effect of is the decoration this field replaced.
        name: 'financials',
        label: 'Financials',
        columns: 2,
        fields: ['annual_revenue', 'number_of_employees', 'child_account_revenue'],
      },
      {
        // The customer-success fields the at_risk_accounts view lists and
        // filters on. They existed on the object but no form offered them, so
        // the CS working queue stayed permanently empty. (`renewal_owner` and
        // `next_renewal_date` were removed from this section with the fields
        // themselves — #1181.)
        name: 'customer_success',
        label: 'Customer Success',
        columns: 2,
        fields: ['tier', 'segment', 'health_score'],
      },
      {
        name: 'locations',
        label: 'Locations',
        columns: 1,
        // `billing_country` and `territory` are readonly and derived, but both
        // are on the form on purpose: an admin asking "why does the NA team not
        // see this account?" reads the answer off the record instead of
        // guessing at the address blob (#621). `territory` is what the rules
        // actually match (#639) and `billing_country` is the input it was
        // classified from, so the two together show the whole derivation —
        // including the case the picklist alone cannot explain, an account
        // sitting in `Other` because its country was typed in a spelling the
        // mapping does not know.
        fields: ['billing_address', 'billing_country', 'territory', 'office_location'],
      },
      {
        name: 'description',
        label: 'Description',
        columns: 1,
        fields: ['description'],
      },
    ],
  },
});
