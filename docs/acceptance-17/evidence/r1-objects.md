# HotCRM 17.0.0-rc.2 Acceptance — Executor R1

Run: 2026-08-05 · Server http://localhost:4001 · Console `/_console/apps/app.objectstack.hotcrm/` · Auth: admin@objectos.ai (Bearer)
Routes verified: list = `/_console/apps/app.objectstack.hotcrm/<object>`, detail = `.../<object>/record/<id>`.
Screenshots in this directory (`/tmp/claude-0/-home-user/f9de7acc-06e5-5667-b535-06e82c336458/scratchpad/r1/`). Raw data: `raw-results.json`.

## Environment-wide console noise (present on every page, NOT app defects)

- `console.error: Failed to load resource: net::ERR_TUNNEL_CONNECTION_FAILED` — Sentry telemetry (`o4510356161757184.ingest.us.sentry.io/.../envelope/`) blocked by the sandbox agent proxy. Environment artifact.
- `console.error: Failed to load resource: 404` on first load only — `GET /assets/crm-favicon.ico` → 404. Minor packaging nit: the favicon declared in app branding is not served. No functional impact.

No other console.error and zero `pageerror` across all 17 objects' list + detail pages.

## Main objects (14)

| object | REST status/rows (limit=5) | list render | detail render | console errors (deduped) | verdict |
|---|---|---|---|---|---|
| crm_account | 200 / 5 (total 9) | PASS, 9 rows grid + footer "9 records" (`crm_account-list.png`) | PASS — Details/Related/Attachments/Activity tabs, field groups Basic Info/Financials/Contact Info (`crm_account-detail.png`) | env noise only | 通过 — fully healthy |
| crm_contact | 200 / 5 (total 9) | PASS, grouped-by-Account grid, 9 accounts groups, footer "9 records" (`crm_contact-list.png`) | PASS — Details/Related(3)/Attachments tabs, Identity/Account & Role/Comm-Prefs groups (`crm_contact-detail.png`) | env noise only | 通过 — default view groups by account (by design) |
| crm_lead | 200 / 5 (total 21) | PASS, 21 rows (`crm_lead-list.png`) | PASS — Details/Related/Activity (`crm_lead-detail.png`) | env noise only | 通过 |
| crm_opportunity | 200 / 5 (total 23) | PASS, 10 rows — default "Open Deals" filtered view, footer "10 records" (`crm_opportunity-list.png`) | PASS — stage path, Details/Related(3)/Activity, Products side panel (`crm_opportunity-detail.png`) | env noise only | 通过 — filtered default view is intentional |
| crm_product | 200 / 5 (total 13) | PASS, 13 rows (`crm_product-list.png`) | PASS — Details/Related (`crm_product-detail.png`) | env noise only | 通过 |
| crm_quote | 200 / 5 (total 5) | PASS, 5 rows (`crm_quote-list.png`) | PASS — status path Draft→Accepted, Details/Related(3)/Attachments (`crm_quote-detail.png`) | env noise only | 通过 |
| crm_contract | 200 / 4 (total 4) | PASS, 4 rows (`crm_contract-list.png`) | PASS — status path, Details/Attachments, Contract Info/Parties/Terms & Dates groups; no Related tab (layout choice) (`crm_contract-detail.png`) | env noise only | 通过 |
| crm_case | 200 / 5 (total 38) | PASS, 38 rows, All Cases + Service Workflow/SLA Calendar/Timeline views listed (`crm_case-list.png`) | PASS — Details/Related/Activity (`crm_case-detail.png`) | env noise only | 通过 |
| crm_campaign | 200 / 5 (total 7) | PASS, 7 rows (`crm_campaign-list.png`) | PASS — status path Planning→In Progress, Details/Related(14) (`crm_campaign-detail.png`) | env noise only | 通过 |
| crm_forecast | 200 / 5 (total 8) | PASS, 8 rows (`crm_forecast-list.png`) | PASS — tab-less layout: Snapshot/Amounts/Source groups + Discussion timeline (`crm_forecast-detail.png`) | env noise only | 通过 |
| crm_knowledge_article | 200 / 4 (total 4) | PASS, 4 rows (`crm_knowledge_article-list.png`) | PASS — status path Draft→Published, Article Information + rendered rich-text Content (`crm_knowledge_article-detail.png`) | env noise only | 通过 |
| crm_task | 200 / 5 (total 7) | PASS, 7 rows (`crm_task-list.png`) | PASS — status path, Related Records/Recurrence/Progress & Effort/System groups (`crm_task-detail.png`) | env noise only | 通过 |
| crm_event | 200 / 0 (total 0) | PASS — view renders, clean "Nothing here yet" empty state; Grid/Calendar/Timeline/Kanban view tabs present (`crm_event-list.png`) | 阻塞 — no seed record to open | env noise only | 阻塞 — UI healthy, seed data absent (0 rows); detail untestable |
| crm_event_attendee | 200 / 0 (total 0) | PASS — renders empty state "Nothing here yet" (`crm_event_attendee-list.png`) | 阻塞 — no seed record to open | env noise only | 阻塞 — UI healthy, seed data absent (0 rows); detail untestable |

## Child objects (3) — REST + parent related list

| object | REST status/rows | parent related-list check | verdict |
|---|---|---|---|
| crm_opportunity_line_item | 200 / 5 (total 74) | Opportunity "Wayne Q1 Expansion" (UNGq93kVo03CO3nk) → Related → Products: "Opportunity Line Item 3" table with product names/qty/price/total (`opportunity_related_expanded.png`; collapsed state `opportunity_related.png`) | 通过 — note: right-hand "Products" summary side panel lists raw record IDs (e.g. `-PBylY-NARjgK6dS`) instead of display names — cosmetic |
| crm_quote_line_item | 200 / 5 (total 16) | Quote QTE-0001 (76ZW4qQ9oTHG97_Y) → Related: "Quote Line Item 3" table, product names + qty + price + total (`quote_related.png`) | 通过 |
| crm_campaign_member | 200 / 5 (total 51) | Campaign CPG-0001 (YyaCORMnaaoQ91Qd) → Related: "Campaign Member 12", Lead/Contact/Status/Response Date columns, paginated Page 1 of 3 (`campaign_related.png`) | 通过 |

Note: the tested opportunity has no quotes attached (its "Quotes" related section is legitimately empty — REST confirms no crm_quote rows point at UNGq93kVo03CO3nk); "Open Tasks" expands to "Task 0 — No related records found", correct.

## Summary

- 15/17 objects 通过; crm_event and crm_event_attendee 阻塞 for detail-page testing only because the seed ships 0 rows (REST 200, empty-state list view renders correctly).
- Zero application console errors or page errors anywhere. Only environment noise: proxy-blocked Sentry telemetry and a 404 on `/assets/crm-favicon.ico` (minor packaging nit worth a look).
- Minor cosmetic finding: opportunity detail "Products" side-panel widget renders raw line-item record IDs instead of display labels.
