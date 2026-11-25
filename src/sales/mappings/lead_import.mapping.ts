// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { defineMapping } from '@objectstack/spec/data';
import { DISQUALIFICATION_REASON_SYNONYMS, INDUSTRY_SYNONYMS, LEAD_SOURCE_SYNONYMS } from './_shared';

/**
 * Lead import mapping — see `account_import.mapping.ts` for the shared notes
 * on strict projection and on `mode` / `upsertKey` acting as defaults.
 *
 * Lead-specific things to know:
 *
 * - **Email is the business key** (`required` on the object), so a re-run of
 *   the same file updates the existing lead instead of creating a twin.
 * - **`status` has a default of `new`** — leave the column blank and the lead
 *   lands as New. `crm_lead`'s state machine only accepts an initial status,
 *   so importing a mid-lifecycle status is a normal write here, not a
 *   transition.
 * - **Two statuses need their companion columns, because `crm_lead`'s own
 *   rules refuse the row without them** (#2780). Measured through the real
 *   import before this change: a `Disqualified` row was refused by
 *   `disqualification_reason_required`, and 8 of the template's own 50 rows
 *   (the `Qualified` ones) by `qualified_needs_qualification` — the mapping
 *   produced both statuses and had no column for what either rule asks.
 *     - Unqualified → "Disqualification Reason".
 *     - Qualified   → "Need Type" and "Estimated Amount".
 *   ⛔ Never default the reason (to `other`, say) when the cell is blank. The
 *   rule exists to capture why a lead was dropped, and a default would file a
 *   reason nobody gave; a row without one stays refused, and the file is
 *   where it is repaired.
 * - **Two values stay refused, by design, whatever the row carries.**
 *   `Converted` is written by the conversion flow only
 *   (`converted_only_by_conversion`). The reason `Duplicate` needs the
 *   surviving record named and confirmed
 *   (`duplicate_disqualification_requires_survivor`), which a person does on
 *   the lead by filling Duplicate Of and setting Duplicate Status to
 *   Confirmed, never a file.
 * - **A blank owner lands with the IMPORTER, not with auto-assignment.**
 *   `lead_intake_assignment` (the platform's assignment rule, ADR-0142 D5) only
 *   routes a lead whose `owner_id` is still empty after the beforeInsert hooks —
 *   and the import write carries the importer's own context, so the security
 *   middleware has ALREADY stamped `owner_id` to them (the guard is an
 *   operation middleware, outside the hook phase). Measured on a real import
 *   before #548: all 50 template rows landed owned by the importing user, none
 *   by the round-robin hook this app had then. Fill "Lead Owner Email" when the source file knows who
 *   owns the lead; otherwise reassign after the import.
 */
export const LeadImportMapping = defineMapping({
  name: 'crm_lead_import',
  label: 'Lead Import (CSV)',
  targetObject: 'crm_lead',
  sourceFormat: 'csv',
  mode: 'upsert',
  upsertKey: ['email'],

  fieldMapping: [
    { source: 'Salutation', target: 'salutation' },
    { source: 'First Name', target: 'first_name' },
    { source: 'Last Name', target: 'last_name' },
    { source: 'Company', target: 'company' },
    { source: 'Title', target: 'title' },

    {
      source: 'Industry',
      target: 'industry',
      transform: 'map',
      params: { valueMap: INDUSTRY_SYNONYMS },
    },

    { source: 'Email', target: 'email' },
    { source: 'Phone', target: 'phone' },
    { source: 'Mobile', target: 'mobile' },
    { source: 'Website', target: 'website' },

    {
      source: 'Lead Status',
      target: 'status',
      transform: 'map',
      params: {
        valueMap: {
          'Open': 'new',
          'Working': 'contacted',
          'In Progress': 'contacted',
          'Nurturing': 'contacted',
          'Disqualified': 'unqualified',
          'Closed - Not Converted': 'unqualified',
        },
      },
    },

    // The three companions of a status (see the header). Each is a plain
    // select / currency cell: HotCRM's own labels and codes are matched by the
    // platform, the reason additionally by the synonyms in `_shared.ts`.
    {
      source: 'Disqualification Reason',
      target: 'disqualification_reason',
      transform: 'map',
      params: { valueMap: DISQUALIFICATION_REASON_SYNONYMS },
    },
    { source: 'Need Type', target: 'need_type' },
    { source: 'Estimated Amount', target: 'estimated_amount' },

    {
      source: 'Lead Source',
      target: 'lead_source',
      transform: 'map',
      params: { valueMap: LEAD_SOURCE_SYNONYMS },
    },

    { source: 'Annual Revenue', target: 'annual_revenue' },
    { source: 'Employees', target: 'number_of_employees' },
    { source: 'Description', target: 'description' },

    // Owner-email resolution and the `allowTransfer` gate on a filled cell:
    // see the long note in `account_import.mapping.ts`. The blank-cell
    // behaviour differs — see the header comment above.
    { source: 'Lead Owner Email', target: 'owner_id', transform: 'lookup' },

    // NOT MAPPED — `crm_lead.address` is a structured (json-backed) `address`
    // field; the import path cannot compose one from separate street/city/
    // postcode columns, and a joined string is rejected per row. Same
    // reasoning, and the same measurement, as the account mapping.
  ],
});
