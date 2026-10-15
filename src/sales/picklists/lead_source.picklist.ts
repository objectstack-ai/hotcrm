// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { definePicklist } from '@objectstack/spec/data';

/**
 * Lead Source — `crm_lead.lead_source`, `crm_contact.lead_source` and
 * `crm_opportunity.lead_source`.
 *
 * One list, referenced by name from all three fields, because
 * `lead_conversion` copies `leadRecord.lead_source` onto the opportunity it
 * creates, and a converted lead's source must stay representable on its
 * contact (#490). Before the three were unified they offered 12, 5 and 6
 * values, so a converted `webinar` lead wrote an illegal value downstream.
 *
 * Two non-field readers take the roster from here rather than from a copy: the
 * executive dashboard's `lead_source` filter
 * (`src/sales/dashboards/executive.dashboard.ts`) and the import mapping's
 * foreign spellings (`src/sales/mappings/_shared.ts`). Option labels translate
 * once, under `picklists.lead_source` in each locale pack.
 */
export const LeadSourcePicklist = definePicklist({
  name: 'lead_source',
  label: 'Lead Source',
  description: 'The channel a prospect arrived through — shared by leads, contacts and opportunities.',
  options: [
    { label: 'Web',             value: 'web' },
    { label: 'Referral',        value: 'referral' },
    { label: 'Event / Trade Show', value: 'event' },
    { label: 'Webinar',         value: 'webinar' },
    { label: 'Partner',         value: 'partner' },
    { label: 'Advertisement',   value: 'advertisement' },
    { label: 'Paid Search',     value: 'paid_search' },
    { label: 'Social Media',    value: 'social' },
    { label: 'Content / Blog',  value: 'content' },
    { label: 'Cold Call',       value: 'cold_call' },
    { label: 'Email Campaign',  value: 'email_campaign' },
    { label: 'Other',           value: 'other' },
  ],
});
