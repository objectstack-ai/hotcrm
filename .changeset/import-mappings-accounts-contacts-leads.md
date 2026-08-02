---
'hotcrm': minor
---

Bring your own data: import mappings and starter spreadsheets for accounts,
contacts and leads.

HotCRM now ships three reusable import mappings — `crm_account_import`,
`crm_contact_import` and `crm_lead_import` — plus a 50-row template CSV for each
under `assets/import-templates/`. Name the mapping in the import request
(`mappingName: 'crm_account_import'`) and the columns a normal spreadsheet export
carries land without any per-column mapping: names, phone, website, revenue,
headcount, industry, lead source, contact mailing address, and an owner-email
column resolved to the matching user. Foreign vocabulary is translated on the way
in (*SaaS* → Software / SaaS, *Trade Show* → Event / Trade Show, *Working* →
Contacted); anything still unrecognised fails its row instead of being silently
dropped.

All three write in `upsert` mode — accounts keyed on name, contacts and leads on
email — so re-running a corrected file updates rather than duplicates. Leave the
owner column blank and the importing user owns the records; an owner email that
matches no user fails that row rather than guessing.

The new guide **Guides → Import your own data** walks through a dry run
(`dryRun: true`, plus `runAutomations: false` for the strict required-field
report), the background job endpoint, and rolling a bad import back with
`data.undoImportJob`. Addresses land for contacts only — accounts and leads store
one structured address field that cannot be assembled from separate spreadsheet
columns, which the guide states.
