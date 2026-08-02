// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { defineMapping } from '@objectstack/spec/data';
import { INDUSTRY_SYNONYMS } from './_shared';

/**
 * Account import mapping — "here is my accounts spreadsheet, load it".
 *
 * Used by passing `mappingName: 'crm_account_import'` to the import endpoint
 * (`POST /api/v1/data/crm_account/import/jobs`) instead of hand-building a
 * per-column mapping in the request. The columns below are the ones a normal
 * CRM/spreadsheet export carries; `assets/import-templates/accounts.csv` is a
 * ready-made sheet with exactly these headers.
 *
 * Behaviour worth knowing before changing anything here:
 *
 * - **Strict projection.** A named mapping emits ONLY the targets listed
 *   below — every other column in the customer's file is dropped rather than
 *   passed through (`packages/rest/src/import-mapping.ts`). That is the point:
 *   an export from another system carries dozens of columns that must not
 *   reach the write path. It also means a field that is not listed here can
 *   never be imported through this mapping.
 * - **Upsert key.** `crm_account.name` carries a unique index, so it is the
 *   natural business key: re-running the same file updates rather than
 *   duplicates. Source names are matched verbatim — the import path has no
 *   case/whitespace normalisation step, so "Acme Corp" and "ACME Corp" are two
 *   accounts. `trimWhitespace` (on by default) removes padding only.
 * - **`mode` / `upsertKey` are DEFAULTS.** An explicit `writeMode` /
 *   `matchFields` in the request still wins.
 */
export const AccountImportMapping = defineMapping({
  name: 'crm_account_import',
  label: 'Account Import (CSV)',
  targetObject: 'crm_account',
  sourceFormat: 'csv', // also accepted for .xlsx uploads — both are tabular
  mode: 'upsert',
  upsertKey: ['name'],

  fieldMapping: [
    { source: 'Account Name', target: 'name' },

    {
      source: 'Account Type',
      target: 'type',
      transform: 'map',
      params: {
        valueMap: {
          'Client': 'customer',
          'Reseller': 'partner',
          'Churned': 'former',
          'Lost Customer': 'former',
        },
      },
    },

    {
      source: 'Industry',
      target: 'industry',
      transform: 'map',
      params: { valueMap: INDUSTRY_SYNONYMS },
    },

    // The account hook rejects a website that is not http(s) — keep full URLs
    // in the source sheet (see `src/objects/account.hook.ts`).
    { source: 'Website', target: 'website' },
    { source: 'Phone', target: 'phone' },
    { source: 'Annual Revenue', target: 'annual_revenue' },
    { source: 'Employees', target: 'number_of_employees' },
    { source: 'Description', target: 'description' },

    // Owner resolution. VERIFIED against the platform import path
    // (`packages/rest/src/import-runner.ts` → `resolveRef`): a reference cell
    // is resolved against the referenced object by `id`, the field's
    // `displayField`, then `name` / `title` / `label` / `full_name` / `email` /
    // `username`. `sys_user` has an `email` column, so an owner-email cell
    // resolves to that user's id — no separate resolution step is needed here.
    // An address that matches no user FAILS the row (`reference_not_found`);
    // leaving the cell BLANK is the supported fallback — the field's
    // `defaultValue: os.user.id` then makes the importing user the owner.
    //
    // Tracked on #548: this targets the app-authored `owner` lookup, which is
    // what the objects carry today. When #548 replaces it with the platform's
    // `owner_id`, retarget this entry (and the sibling contact/lead mappings).
    { source: 'Account Owner Email', target: 'owner', transform: 'lookup' },

    // Self-reference: a parent named later in the same file still resolves —
    // the runner flushes buffered creates and retries once (framework#3148).
    { source: 'Parent Account', target: 'parent_account', transform: 'lookup' },

    // NOT MAPPED — `billing_address` / `office_location` are structured
    // (json-backed `address` / `location`) fields. Neither the mapping spec nor
    // the import coercion can compose an object out of separate street/city/
    // postcode columns, and writing the joined string into a json column would
    // store something the address widget cannot read. Address columns are
    // therefore left out of the account template on purpose; flat address text
    // does land for contacts, which have real `mailing_*` text fields.
  ],
});
