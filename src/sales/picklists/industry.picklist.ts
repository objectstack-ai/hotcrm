// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { definePicklist } from '@objectstack/spec/data';

/**
 * Industry — `crm_lead.industry` and `crm_account.industry`.
 *
 * One list, referenced by name from both fields, because `lead_conversion`
 * copies `leadRecord.industry` onto the account it creates: the account MUST
 * accept every lead value (#490). Before the two were unified the lead offered
 * fifteen values and the account six, so a converted `logistics` lead wrote an
 * illegal value onto its account.
 *
 * The import mapping's foreign spellings (`src/sales/mappings/_shared.ts`) map
 * onto these values. Option labels translate once, under `picklists.industry`
 * in each locale pack.
 */
export const IndustryPicklist = definePicklist({
  name: 'industry',
  label: 'Industry',
  description: 'The industry a company operates in — shared by leads and accounts.',
  options: [
    { label: 'Technology',          value: 'technology' },
    { label: 'Software / SaaS',     value: 'software' },
    { label: 'Finance',             value: 'finance' },
    { label: 'Healthcare',          value: 'healthcare' },
    { label: 'Retail',              value: 'retail' },
    { label: 'Manufacturing',       value: 'manufacturing' },
    { label: 'Education',           value: 'education' },
    { label: 'Real Estate',         value: 'real_estate' },
    { label: 'Media & Entertainment', value: 'media' },
    { label: 'Logistics',           value: 'logistics' },
    { label: 'Hospitality',         value: 'hospitality' },
    { label: 'Energy & Utilities',  value: 'energy' },
    { label: 'Government',          value: 'government' },
    { label: 'Non-profit',          value: 'nonprofit' },
    { label: 'Other',               value: 'other' },
  ],
});
