// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { defineMapping } from '@objectstack/spec/data';
import { LEAD_SOURCE_SYNONYMS } from './_shared';

/**
 * Contact import mapping — see `account_import.mapping.ts` for the shared
 * notes on strict projection and on `mode` / `upsertKey` acting as defaults.
 *
 * Contact-specific things to know:
 *
 * - **Accounts first.** `crm_contact.crm_account` is a REQUIRED master-detail
 *   link, so the "Account Name" column must name an account that already
 *   exists. Import accounts before contacts; a row whose account cannot be
 *   resolved fails with `reference_not_found` and nothing is written for it.
 * - **Email is the business key.** It is `required` + `unique` on the object,
 *   and `crm_contact`'s hook lowercases it and rejects a second contact with
 *   the same address — so `upsertKey: ['email']` matches how the object
 *   already behaves rather than inventing a second notion of identity.
 * - Address lands in the flat `mailing_*` text fields, which is why contacts
 *   (unlike accounts and leads) carry address columns in their template.
 */
export const ContactImportMapping = defineMapping({
  name: 'crm_contact_import',
  label: 'Contact Import (CSV)',
  targetObject: 'crm_contact',
  sourceFormat: 'csv',
  mode: 'upsert',
  upsertKey: ['email'],

  fieldMapping: [
    { source: 'Salutation', target: 'salutation' },
    { source: 'First Name', target: 'first_name' },
    { source: 'Last Name', target: 'last_name' },

    // Required master-detail parent; resolved by account name.
    { source: 'Account Name', target: 'crm_account', transform: 'lookup' },

    { source: 'Title', target: 'title' },
    { source: 'Department', target: 'department' },
    { source: 'Email', target: 'email' },
    { source: 'Phone', target: 'phone' },
    { source: 'Mobile', target: 'mobile' },

    { source: 'Mailing Street', target: 'mailing_street' },
    { source: 'Mailing City', target: 'mailing_city' },
    { source: 'Mailing State', target: 'mailing_state' },
    { source: 'Mailing Postal Code', target: 'mailing_postal_code' },
    { source: 'Mailing Country', target: 'mailing_country' },

    {
      source: 'Lead Source',
      target: 'lead_source',
      transform: 'map',
      params: { valueMap: LEAD_SOURCE_SYNONYMS },
    },

    { source: 'Description', target: 'description' },

    // Owner-email resolution, the blank-cell fallback, and why a filled cell
    // needs `allowTransfer`: see the long note in `account_import.mapping.ts`.
    { source: 'Contact Owner Email', target: 'owner_id', transform: 'lookup' },
  ],
});
