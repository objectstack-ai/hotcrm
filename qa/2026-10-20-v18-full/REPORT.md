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
