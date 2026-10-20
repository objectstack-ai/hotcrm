# HotCRM full functional browser pass on ObjectStack 18.0.0 (draft, in progress)

Card: objectstack-ai/hotcrm#2207, track 1. Draft pushed as the pass runs; the final report replaces this file.

## Coverage (so far)

| Row | Verdict | Reason | Screenshot |
|---|---|---|---|
| LEA-001 | pass | Lead list for the manager (21 seeded + web and imported leads), field groups, 1–5 star score; the rep sees own leads only | shots/21-LEA-014-all-leads.png |
| LEA-002 | pass | Transition table holds at warning level (new→contacted→qualified saved 200). But Converted is still offered in Edit and Create — F-01 / #2189 still reproduces | shots/24-F01-lead-status-converted-in-edit.png |
| LEA-003 | pass | unqualified without reason → 400 "Disqualification reason is required…"; reason duplicate without survivor/confirmed → 400 | (REST) |
| LEA-004 | pass | Web lead (VP title, corporate email, phone, website, revenue) rating 4; forged rating 5 from a guest recomputed to 1 | (REST) |
| LEA-005 | pass | Three web leads round-robined na.rep → eu.rep → na.rep | (REST) |
| LEA-006 | pass | /forms/contact-us → 302 /_console/f/contact-us; anonymous browser submit 201; forged status/owner/is_converted/converted_account/duplicate_status/rating stripped | shots/20-LEA-006-web-to-lead-form.png, shots/20-LEA-006-web-to-lead-submitted.png |
| LEA-007 | pass | Guest lead with upper-case email of an existing lead stored lower-cased, flagged suspected, duplicate_of_lead = Pia Anand | shots/21-LEA-014-suspected-duplicates.png |
| LEA-008 | pass | Converted lead: title edit → 409 RECORD_LOCKED; description edit 200 | (REST) |
| LEA-009 | pass | na.rep set the web lead to Qualified → high task "Follow up with qualified lead: Wren Halvorsen…" due +2 days, owner na.rep | (REST) |
| LEA-010 | pass | na.rep converted Wren Halvorsen: screen names the new account ("creates a new account named BlueFjord Shipping AS", #2073 item 8 now fixed); amount required; account + contact + opportunity 64,000 prospecting created; operator notified | shots/26-LEA-010-convert-wizard-step1.png, shots/26-LEA-010-convert-wizard-filled.png, shots/26-LEA-010-convert-done.png |
| LEA-011 | pass | Rating-4 web lead → next_followup_date +1 day and warning "Hot lead — follow up within 24h"; rating-1 lead +3 days and "New lead assigned to you…" (#2073 item 7 wording now fixed) | (REST) |
| LEA-012 | pass | Schedule Follow-up screen flow: task "Send pricing deck" due 2026-10-27, lead next_followup_date synced; toast "Follow-up scheduled." | shots/27-LEA-012-schedule-followup-form.png, shots/27-LEA-012-schedule-followup-done.png |
| LEA-013 | pass | Marketing user: 2 rows on All Leads → bulk bar Add to Campaign → Cloud Migration Webinar → Run → "Succeeded 2 / 2" (2 dispatches). Sales manager has no campaign-member create right, so neither the bar nor the row menu offers it (as the row describes) | shots/28-LEA-013-mkt-add-to-campaign-step2.png, shots/28-LEA-013-mkt-add-to-campaign-result.png, shots/28-LEA-013-mgr-row-menu.png |
| LEA-014 | pass | All 8 tabs draw (All, My, Hot, High Priority, Suspected Duplicates, Pipeline kanban, Calendar, Cards) | shots/21-LEA-014-*.png |
| LEA-015 | pass | Default create form, edit form, conversion wizard and public form render. The other named form views have no UI entry; not separately driven | shots/25-LEA-015-new-lead-form.png |
| LEA-016 | pass | Detail: Convert Lead / Schedule Follow-up / Log a Call / Edit, highlights, 5-stage path, Details/Related/Activity/History | shots/23-LEA-016-lead-detail.png |
| LEA-017 | not reachable | AI skill; no AI service in this open-source boot (ADM-015: `ai` deliberately not required) | — |
| LEA-018 | pass | Console import with the shipped "Lead Import (CSV)" mapping now sends format csv: 3/3 created, synonyms applied (LinkedIn→social, Google Ads→paid_search), owner = importer. The mapping is offered but still not preselected (#2194 T1-U06) | shots/30-LEA-018-import-shipped-mapping.png, shots/30-LEA-018-import-after-1.png |
| LEA-019 | pass | Lead Inflow report (lead_metrics) answered 200 and drew — see *Extras* | shots/91-RPT-*.png |
| ACC-001 | pass | Account list, cards and detail render (tier, health score, segment, territory); attachments section on the record | shots/31-ACC-006-all-accounts.png, shots/33-ACC-008-account-detail.png |
| ACC-002 | pass | Exact duplicate "Acme Corporation" → 409 UNIQUE_VIOLATION; "QA  Brücken   GmbH" → name_normalized "qa brücken gmbh" | (REST) |
| ACC-003 | pass | billing_address.country " de " → billing_country "DE", territory "emea" | (REST) |
| ACC-004 | pass | ftp:// website → 400; negative revenue → 400 (manager); a rep gets 403 field-write on annual_revenue; delete Acme (customer, 3 opportunities) → 409 DELETE_RESTRICTED with the "mark inactive" hint | (REST) |
| ACC-005 | pass | See ACT-010 (held event and completed task bubble last_activity_date to the account); Send Email also stamped it | (REST) |
| ACC-006 | pass | 6 tabs draw; bulk bar Update Tier / Transfer Owner / Delete; Update Tier on 2 rows → "Succeeded 2 / 2" (bulk 405, per-row PATCH fallback; an Undo button is new). The confirm still prints raw {{count}} / {{tier}} — F-05 still reproduces. Map: 9 of 10 accounts now carry coordinates (#2060 item 15 no longer reproduces); the external tile host is blocked in this container | shots/31-ACC-006-*.png, shots/31-ACC-006-mass-tier-confirm.png |
| ACC-007 | pass | Account Workbench: curated grid with Industry / Type / Account Owner quick filters only | shots/32-ACC-007-workbench.png |
| ACC-008 | pass | Slotted detail: Log a Call / Log a Meeting / Schedule a Meeting / Edit; Details / Related (18) / Attachments; discussion feed | shots/33-ACC-008-account-detail.png |
| ACC-009 | pass | Contact detail renders; deleting a prospect account cascaded its contact (read back 0 rows) | shots/34-ACC-009-contact-detail.png |
| ACC-010 | pass | "Hal.Brook@Acme.example" stored lower-case; same email again → 409 DUPLICATE_VALUE; deleting a contact on an open opportunity → 409 DELETE_RESTRICTED with a clear message | (REST) |
| ACC-011 | pass | Record header More actions → Mark as Primary Contact → confirm → "Contact marked as primary!"; Hal primary, John demoted | shots/34-ACC-011-mark-primary-confirm.png, shots/34-ACC-011-mark-primary-done.png |
| ACC-012 | pass | Send Email (Subject / Body) → 200 emailId + activityId; contact last_contacted_date stamped. Toast is the generic "Action completed successfully" | shots/35-ACC-012-send-email-form.png |
| ACC-013 | pass | Rep-created contact → owner inbox "New contact: Hal Brook" (contact_welcome) | (REST) |
| ACC-014 | pass | All Contacts (grouped by account), People Directory, Primary Contacts draw | shots/36-ACC-014-*.png |
| ACC-015 | pass | Console import with the shipped "Account Import (CSV)" and "Contact Import (CSV)" mappings: 2/2 created each; re-import of the same accounts file → 2 updated (upsert) | shots/38-ACC-015-account-import-shipped-mapping.png, shots/38-ACC-015-contact-import-after-1.png |
| ACC-016 | not reachable | AI skill; no AI service in this boot | — |
| ACC-017 | not reachable | AI skill; no AI service in this boot | — |
