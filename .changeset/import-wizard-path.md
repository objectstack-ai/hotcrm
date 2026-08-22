---
'hotcrm': patch
---

Docs: tell the reader of `guides/importing-your-data` that the import wizard
exists. The page loads your own accounts, contacts and leads — and its only
instruction was to write curl, for an action that takes three clicks on a list
view.

The wizard is real and it is the other end of the very mechanism this page
documents: it reads HotCRM's saved mappings by target object, so the three the
page tabulates — `crm_account_import`, `crm_contact_import`, `crm_lead_import` —
appear under **Saved mapping** on exactly the Accounts, Contacts and Leads list
views, where the renames, value transforms and type coercion then run on the
server and the column mapping goes read-only. That is also what the page's own
opening promise — "no column-by-column mapping" — is describing, and it had
only ever been said in an API context.

Added, in all three locales:

- **A fork at the top** — wizard for a one-off file you want to eyeball before
  it writes, API for a scripted or repeatable load with the strict dry-run
  report, the per-row error codes and the undo call. Steps 1–4 are now named as
  the API route.
- **One short section on the in-app route** — the **Import** toolbar button, the
  three steps Upload / Mapping / Preview, the saved mappings turning up there,
  and the mapping from the wizard's buttons back to this page's steps:
  **Validate data** is Step 2's dry run, a large file is Step 3's background
  job, **History** → **Undo import** is Step 4 with the same undo window.

The click-by-click steps stay in `guides/import-and-export` and are linked, not
repeated — the two pages divide the work rather than each describing the wizard
in its own words: `import-and-export` carries the in-app route and the export
picture, `importing-your-data` carries the API detail and the known limits. The
API content is untouched: `runAutomations: false`, the per-row error codes, the
50,000-row job ceiling and the 5,000-row undo ceiling are all things the wizard
never shows, so none of it is duplicated either. Refs #799.
