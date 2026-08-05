---
'hotcrm': patch
---

Docs: restate the Import & Export guide against what the app actually does, and
make it agree with `importing-your-data.mdx` instead of contradicting it.

The page routed almost every step through a `Setup → Data → …` menu path. The
Setup app's groups are Overview, Apps, People & Organization, Access Control,
Approvals, Configuration, Diagnostics, Integrations and Advanced — there is no
**Data** group and no **Privacy** group, so `Setup → Data → Import Wizard`,
`→ Migrate from Salesforce`, `→ Migrate from HubSpot`, `→ Scheduled Exports` and
`Setup → Privacy → Data Subject Requests` all sent the reader looking for
screens that do not exist.

Measured, and restated:

- **The import wizard is real — it just lives somewhere else.** It is on the
  object's own list view (**Import** in the toolbar): Upload → Mapping →
  Preview, with drag-and-drop CSV / Excel or paste, a generated column template,
  auto-matched columns with a confidence reading, write mode (*Always create
  new* / *Update existing (skip if no match)* / *Update if matched, else
  create*) plus **Match on**, a **Validate data** pass that writes nothing, a
  background job with progress for large files, and **History** with **Undo
  import**. It reads HotCRM's own saved mappings — the wizard lists the mappings
  whose `targetObject` is the object you are on, so `crm_account_import`,
  `crm_contact_import` and `crm_lead_import` are the same three the API path in
  the `guides/importing-your-data` page names. The two pages
  now describe one feature from two ends and link to each other.
- **No completion email.** Progress is on screen and the run lands in History;
  the platform email service is outbound-only and delivers nothing until a
  deployment configures a transport.
- **External IDs replaced by matching keys.** No HotCRM object carries an
  `external_id` field, and a named mapping is a strict projection that drops
  every column it does not declare, so the advice to add one was inert. The
  idempotency it promised is real and comes from each mapping's business key
  (Account Name, Email, Email). Also corrected: *Update only* skips rather than
  fails, matching is on fields you choose rather than "Email / External ID",
  and the 50 MB upload cap does not exist (the real ceiling is 50,000 rows per
  job).
- **Salesforce migration marked *(not shipped yet)***, design intent and object
  map kept. There is no migration wizard, no connector, and no action that
  reads Salesforce — every mention of Salesforce in `src/` is a comment citing
  it as a design reference. There is no outbound OAuth either: Setup's **OAuth
  Applications** registers clients calling *into* ObjectStack, the opposite
  direction. Noted honestly that Salesforce migration is not on the roadmap,
  while **HubSpot import is** a named roadmap item — the two are not in the
  same state.
- **Export restated on measurement**: the account, contact, lead and opportunity
  list views declare `exportOptions: ['csv', 'xlsx']`, the export carries the
  view's filter / sort / columns, and the same route is callable directly.
  `allowExport` is the opt-in gate (unset denies; `viewAllRecords` /
  `modifyAllRecords` do not substitute), with the per-role grants tabulated.
  Cases hold an export grant with no list-view surface behind it, which is
  called out rather than papered over. Scheduled warehouse export marked
  *(not shipped yet)*.
- **GDPR section marked *(not shipped yet)*** and replaced with what can be done
  today — delete the contact (attendee rows go, meetings stay), delete the
  account (contacts cascade), clear identifying fields by hand. No Privacy
  group, no data-subject-request object, no anonymise action, no audit
  certificate (the audit capability is not among the ones this app enables).

zh-Hans and zh-Hant pages updated with the same content.
