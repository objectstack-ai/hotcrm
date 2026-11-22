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
    userActions: { editInline: true, hideFields: true },
    data: { provider: 'object', object: 'crm_account' },
    columns: [
      { field: 'name', width: 240, sortable: true, link: true, pinned: 'left' },
      { field: 'industry', width: 140, sortable: true },
      { field: 'type', width: 130 },
      // An average, not a total: the accounts' revenues added up are no
      // figure anyone owns (#2432 row 6).
      { field: 'annual_revenue', width: 160, align: 'right', summary: 'avg' },
      { field: 'number_of_employees', width: 130, align: 'right', summary: 'avg' },
      { field: 'health_score', width: 140 },
    ],
    sort: [{ field: 'annual_revenue', order: 'desc' }],
    // Only the exception row is tinted: an inactive account greys out, an
    // active one stays plain. On 18.0.0-next.1 it painted nothing: the console
    // fetched only the columns and `is_active` is not one (objectui#12376,
    // reported from #2107; ⛔ no column was added to dodge it). The
    // 18.0.0-next.2 console selects the tint's field and greys the row out
    // (measured).
    rowColor: { field: 'is_active', colors: { false: 'slate' } },
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
    // The working lists lead the strip, a rep's own first (#2367 row 2):
    // declaration order IS tab order, and behind the gallery and the map
    // My Accounts sat in the "1 more" overflow at 1280px. The same correction
    // `lead.view.ts` made for My Leads. The gallery and the map follow.
    my_accounts: {
      name: 'my_accounts',
      type: 'grid',
      label: 'My Accounts',
      userActions: { editInline: true, hideFields: true },
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
      userActions: { editInline: true, hideFields: true },
      data: { provider: 'object', object: 'crm_account' },
      columns: ['name', 'tier', 'health_score', 'segment', 'last_activity_date'],
      filter: [
        { field: 'type', operator: 'equals', value: 'customer' },
        { field: 'health_score', operator: 'in', value: ['at_risk', 'churning'] },
      ],
      sort: [{ field: 'health_score', order: 'desc' }],
    },

    /** Tier accounts: Enterprise (>= $10M ARR) */
    enterprise_accounts: {
      name: 'enterprise_accounts',
      type: 'grid',
      label: 'Enterprise Accounts',
      userActions: { editInline: true, hideFields: true },
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

    /** Branded account cards */
    account_gallery: {
      name: 'account_gallery',
      type: 'gallery',
      label: 'Account Cards',
      data: { provider: 'object', object: 'crm_account' },
      // `logo` rides in the projection for the same reason the timeline view
      // carries its date fields: the list data source projects the configured
      // columns, and `coverField` reads off that projection.
      columns: ['name', 'industry', 'annual_revenue', 'phone', 'logo'],
      gallery: {
        // The card art this view was named for. "Branded account cards" had a
        // brand COLOUR and no brand IMAGE — `crm_account.logo` is the object's
        // only image field and nothing displayed it, so every card drew the
        // same blank cover. `coverFit` is left unstated: the schema's default
        // is the crop these cards want, and materialising a default rewrites
        // "the author said nothing" into "the author asked for this".
        coverField: 'logo',
        cardSize: 'medium',
        titleField: 'name',
        visibleFields: ['industry', 'annual_revenue', 'number_of_employees', 'phone', 'website', 'owner_id'],
      },
    },

    /**
     * Geospatial distribution.
     *
     * The `map` block is what BINDS the view to a coordinate source. Without it
     * the renderer falls back to literal default field names, which resolve on
     * `crm_account` only by luck — the view draws no marker while authoring
     * reports success (`view/layout-without-binding`). `office_location` is the
     * object's `Field.location(...)`, which is the one field on `crm_account`
     * carrying coordinates; `billing_address` is an `address` field and is a
     * postal shape, not a coordinate one, so it stays a column rather than the
     * binding. `titleField` names the marker label — `name`, which is also the
     * object's `nameField` (#2369 row 10) and what the map's own `columns`
     * show.
     */
    account_map: {
      name: 'account_map',
      type: 'map',
      label: 'Accounts by Location',
      data: { provider: 'object', object: 'crm_account' },
      columns: ['name', 'industry', 'office_location', 'billing_address'],
      map: { locationField: 'office_location', titleField: 'name' },
    },
  },
});
