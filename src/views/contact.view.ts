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
    data: { provider: 'object', object: 'crm_contact' },
    columns: [
      { field: 'avatar', width: 64, align: 'center' },
      { field: 'first_name', width: 140, sortable: true, link: true },
      { field: 'last_name', width: 140, sortable: true },
      { field: 'crm_account', width: 200 },
      { field: 'title', width: 180 },
      { field: 'department', width: 140 },
      { field: 'email', width: 220 },
      { field: 'phone', width: 150 },
      { field: 'owner_id', width: 150 },
    ],
    sort: [{ field: 'last_name', order: 'asc' }],
    grouping: { fields: [{ field: 'crm_account', order: 'asc', collapsed: true }] },
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
      columns: ['first_name', 'last_name', 'title', 'email'],
      gallery: {
        coverField: 'avatar',
        coverFit: 'cover',
        cardSize: 'small',
        titleField: 'last_name',
        visibleFields: ['first_name', 'title', 'department', 'email', 'phone', 'crm_account'],
      },
    },

    primary_contacts: {
      name: 'primary_contacts',
      type: 'grid',
      label: 'Primary Contacts',
      data: { provider: 'object', object: 'crm_contact' },
      columns: ['first_name', 'last_name', 'crm_account', 'title', 'email', 'phone'],
      filter: [{ field: 'is_primary', operator: 'equals', value: true }],
      sort: [{ field: 'crm_account', order: 'asc' }],
    },
  },

  form: {
    type: 'tabbed',
    sections: [
      {
        name: 'identity',
        label: 'Identity',
        columns: 2,
        fields: [
          'salutation',
          { field: 'first_name', required: true },
          { field: 'last_name', required: true, span: 'full' },
          { field: 'crm_account', required: true },
          'title',
          'department',
          'owner_id',
        ],
      },
      {
        // Named `contact_details`, not `contact_info` — `contact_info` is
        // already a distinct fieldGroup key on `crm_contact` ("Contact
        // Information"), and reusing it here would make this section's
        // translated heading follow that group's wording instead of its own
        // "Contact Info".
        name: 'contact_details',
        label: 'Contact Info',
        columns: 2,
        fields: ['email', 'phone', 'mobile', 'avatar'],
      },
      {
        // Named `mailing_address` — deliberately the SAME key as the
        // `mailing_address` fieldGroup on `crm_contact`, which is the opposite
        // call from the two sections either side of it and for the same
        // reason. Reusing a group key makes the section's translated heading
        // follow that group's wording; `contact_details` and
        // `comm_preferences` wanted their own shorter wording, so they had to
        // avoid the collision. This section wants exactly the group's wording
        // ("Mailing Address"), which every locale already carries under
        // `objects.crm_contact._sections.mailing_address`, so the collision is
        // the feature: one heading, one translation, four locales, no new row.
        //
        // Why the section exists at all: an authored `sections` array wins
        // outright over the renderer's `fieldGroups` auto-derivation (the
        // mechanism is written up at length in `case.view.ts`), and this form
        // is also the CREATE dialog. The five `mailing_*` fields were
        // therefore readable on the SYNTHESIZED detail page — which does
        // derive from `fieldGroups` — while no form in the app could enter or
        // edit them, even though `contact_import.mapping.ts` writes all five
        // from the shipped CSV template. Address entry only existed on the
        // import path; this tab is the authoring half of it.
        name: 'mailing_address',
        label: 'Mailing Address',
        columns: 2,
        fields: [
          // `mailing_street` is a textarea — full width, like `last_name`
          // above, so the two-column grid holds the four short fields.
          { field: 'mailing_street', span: 'full' },
          'mailing_city',
          'mailing_state',
          'mailing_postal_code',
          'mailing_country',
        ],
      },
      {
        // Named `comm_preferences`, not `preferences` — `preferences` is
        // already a distinct fieldGroup key on `crm_contact` ("Communication
        // Preferences"), and reusing it here would make this section's
        // translated heading follow that group's wording instead of its own
        // "Preferences".
        name: 'comm_preferences',
        label: 'Preferences',
        columns: 2,
        fields: ['lead_source', 'is_primary', 'do_not_call', 'email_opt_out'],
      },
    ],
  },
});
