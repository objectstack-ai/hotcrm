// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { defineView } from '@objectstack/spec/ui';

/**
 * Contact Views
 *
 *   • grid    — primary roster with avatar
 *   • gallery — people directory cards (avatar as cover)
 */
export const ContactViews = defineView({
  list: {
    type: 'grid',
    name: 'all_contacts',
    label: 'All Contacts',
    userActions: { editInline: true },
    data: { provider: 'object', object: 'crm_contact' },
    columns: [
      { field: 'avatar', width: 64, align: 'center' },
      // One name column, the stored `full_name` (#2685), as on the lead grid.
      // Two columns hung the record link off the given name alone, so a
      // contact whose given name is empty had nothing to click, and a
      // Chinese name read 「伟 | 张」 across two cells instead of 「张伟」.
      { field: 'full_name', width: 200, sortable: true, link: true },
      { field: 'crm_account', width: 200 },
      { field: 'title', width: 180 },
      { field: 'department', width: 140 },
      // REQ-0004 acceptance 2: the three buying-centre attributes are columns
      // on the landing roster, which is already grouped by account — so one
      // account's group reads as a MAP (who decides, who is on our side)
      // instead of a directory. Columns are also what the list's own filter
      // and grouping controls offer.
      { field: 'buying_function', width: 160 },
      { field: 'attitude', width: 140 },
      { field: 'relationship_strength', width: 180 },
      { field: 'email', width: 220 },
      { field: 'phone', width: 150 },
      { field: 'owner_id', width: 150 },
    ],
    sort: [{ field: 'full_name', order: 'asc' }],
    // Groups start OPEN (#2290). Collapsed groups left the landing screen with
    // account headers and not one contact row: an org with one or two
    // contacts per account (the demo seed has one) had to expand every group
    // to find a person. Open groups keep the per-account map and still let a
    // reader fold the accounts they are not working.
    grouping: { fields: [{ field: 'crm_account', order: 'asc', collapsed: false }] },
    selection: { type: 'multiple' },
    // The selection-bar entry point for campaigning at existing customers
    // (#597), mirroring `bulkActions: ['create_campaign']` on the lead grid.
    // The bare-string form fans the action out once per selected row; do not
    // add strings for `mark_primary` / `send_email`, which declare
    // `locations: ['list_item']` and are auto-injected into the row menu.
    bulkActions: ['add_contact_to_campaign'],
    pagination: { pageSize: 50, pageSizeOptions: [25, 50, 100] },
    exportOptions: { formats: ['csv', 'xlsx'] },
    appearance: {
      showDescription: true,
      allowedVisualizations: ['grid', 'gallery'],
    },
  },

  listViews: {
    /** People directory */
    contact_directory: {
      name: 'contact_directory',
      type: 'gallery',
      label: 'People Directory',
      data: { provider: 'object', object: 'crm_contact' },
      // A card is titled by the whole name (#2685): titled by the family name
      // with the given name printed beneath it, a card split one person over
      // two lines and was untitled when the family name was empty.
      columns: ['full_name', 'title', 'email'],
      gallery: {
        coverField: 'avatar',
        coverFit: 'cover',
        cardSize: 'small',
        titleField: 'full_name',
        visibleFields: ['title', 'department', 'email', 'phone', 'crm_account'],
      },
    },

    primary_contacts: {
      name: 'primary_contacts',
      type: 'grid',
      label: 'Primary Contacts',
      userActions: { editInline: true },
      data: { provider: 'object', object: 'crm_contact' },
      columns: ['full_name', 'crm_account', 'title', 'email', 'phone'],
      filter: [{ field: 'is_primary', operator: 'equals', value: true }],
      sort: [{ field: 'crm_account', order: 'asc' }],
    },
  },
});
