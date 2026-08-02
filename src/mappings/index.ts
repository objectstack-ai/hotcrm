// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Import mapping barrel.
 *
 * Each entry is a reusable, governed column→field projection referenced by
 * name from the import endpoint (`mappingName: 'crm_account_import'`), so a
 * customer loading their own spreadsheet never has to map columns by hand.
 * Templates with the matching headers live in `assets/import-templates/`, and
 * the business-facing walkthrough is
 * `content/docs/guides/importing-your-data.mdx`.
 */
export { AccountImportMapping } from './account_import.mapping';
export { ContactImportMapping } from './contact_import.mapping';
export { LeadImportMapping } from './lead_import.mapping';
