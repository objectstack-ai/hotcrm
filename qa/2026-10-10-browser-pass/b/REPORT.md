# QA browser pass — group B (revenue and service) — HotCRM 4.0.1

Card: objectstack-ai/hotcrm#2058 · Tester: group B session · Evidence only, never merged.

## Header

| | |
|---|---|
| Base sha | `1d7148bf` (`chore(release): 4.0.1 (#2056)`) on `main` |
| Install / build | `pnpm install --frozen-lockfile` ✅ · `pnpm build` exit 0 (`dist/objectstack.json` 2343.6 KB) |
| Server | `nohup pnpm dev > /tmp/dev.log` (`objectstack dev -p 4001`), fresh `.objectstack/data`, health 200 after ~36 s; seed `app.objectstack.hotcrm 354 rows` |
| `NODE_MODULE_VERSION` flood | none |
| Admin login | `admin@objectos.ai` / `admin123` through the real login form ✅ |
| `pnpm demo:staff` | **exit 0** — 5 personas, 21 rule-materialised shares; `case_escalation_sharing matched=8 granted=8` |
| Personas used | admin · `na.rep@objectos.ai` (Nina Reyes, sales rep) · `sales.manager@objectos.ai` (Marta Quinn) · `service.agent@objectos.ai` (Priya Raman) · `service.manager@objectos.ai` (Tomas Okafor) · anonymous (logged out) |
| Browser | Playwright (repo `node_modules/playwright`) + preinstalled Chromium **141.0.7390.37** (`/opt/pw-browsers/chromium`), viewport 1440×900 |
| Start / end | 2026-10-10 17:54 UTC → 18:40 UTC |
| Data created | every name prefixed `QA-B ` (quotes QTE-0007…0011, contracts CTR-0005…0007 incl. auto-drafted, product PRD-0014, cases CASE-00039…00044, article KA-0005) |

Method: each row was driven through the console (list → record → form/action/flow). Every defect below was confirmed by a
settled screenshot **and** the server's own answer (REST record, `/api/v1/meta/...`, `POST /api/v1/security/explain`,
`POST /api/v1/analytics/dataset/query`, or the server log). Scheduled flows have no UI trigger; they were fired with
`POST /api/v1/automation/<flow>/trigger` as admin and the result read back through REST.

## Coverage

Totals: **45 rows — 30 pass · 9 fail · 4 not reachable (scheduled flows; behaviour verified through the trigger API, all correct) · 1 not tested · 1 removed row (n/a)**.

| inventory id | result | note |
|---|---|---|
| QUO-001 | pass | QTE-{0000} numbering (QTE-0007…), pricing group, terms, addresses (collapsed), Attachments tab on the record page (`overview-quote-record.png`). |
| QUO-002 | fail | Transitions are `severity: 'warning'`: draft→presented and presented→draft both saved with only "Quote updated successfully"; the warning reaches only the server log → **B-10**. Doc's "typical journey Draft → Presented" is itself a flagged jump. Terminal freeze holds (QUO-003). |
| QUO-003 | fail | Freeze passes: name edit on accepted QTE-0007 → 409 `RECORD_LOCKED` "only internal_notes may be edited", internal notes saved. Default +30 days works over REST (QTE-0008: 2026-10-10 → 2026-11-09) but is **unreachable from the UI** because the form requires Expiration Date → **B-11**. Line items still writable on a frozen quote → **B-09**. |
| QUO-004 | pass | As na.rep on *Vertex Analytics Expansion* (qualification, $79,000): dialog Quote Name / Valid For (Days) / Discount % (≤ 60); QTE-0007 draft, subtotal 79,000, discount 10 → 7,900, total 71,100, expires +30, net_30; deal advanced to Proposal. Second run on a negotiation deal kept the stage (keep-stage branch). Rail not refreshed → **B-14**. |
| QUO-005 | pass | Rep moved QTE-0007 draft→in_review→presented→accepted via Edit; CTR-0005 drafted: draft, subscription, 12 months 2026-10-10→2027-10-10, value 17,100, contact + opportunity carried, owner = rep. |
| QUO-006 | pass | Same save set *Vertex Analytics Expansion* to closed_won, close_date 2026-10-10, `win_reason='quote_accepted'`, probability 100. |
| QUO-007 | fail | Line added through the Related tab (product picker, qty 2 × 10,000, 5 % line discount, 8 % tax): line subtotal 19,000 / total 20,520, quote subtotal 19,000 → total 17,100 ✅; price fill from list price ✅ (25,000); line discount 70 → "Line discount cannot exceed 60%" ✅; cascade delete ✅ (QTE-0008 deleted → its line 404). Fails on **B-09** (lines on accepted quote); cosmetic **B-15**. |
| QUO-008 | not reachable (API: pass) | No UI path for a schedule. Triggered `quote_expiration`: selected 1, acted 1; QA-B Past Due Quote (exp 2026-09-20) → expired; accepted QTE-0002 untouched. |
| QUO-009 | fail | Grid with Subtotal/Tax/Total sums ✅, calendar spans quote_date→expiration ✅, kanban by status ✅ but the `summarizeField: total_price` sum is not drawn → **B-12**. |
| QUO-010 | pass | PRD-{0000} (PRD-0014 created), SKU unique (dup → `UNIQUE_VIOLATION`), category/family, list price/cost; rep can read the catalog. |
| QUO-011 | pass | list_price 100 < cost 200 refused with "List Price (100) must be greater than or equal to Cost (200)."; `qa-b-wid-1` stored `QA-B-WID-1`; delete of referenced PRD-0009 refused (409 `DELETE_RESTRICTED`). Message wording → **B-16**. |
| QUO-012 | pass | All Products grouped by Category, Product Catalog gallery. No seeded product has an `image`, so the cover could not be seen (not a defect). |
| QUO-013 | pass | CRM Overview › Top Products bar drew (17 recharts shapes); `product_metrics` query 200 with 4 category rows. |
| CON-001 | pass | CTR-{0000} title, required parties/term/dates/value, Attachments tab; private (rep reads, cannot edit). |
| CON-002 | pass (as documented) | Legal path draft→in_approval→activated works. Illegal expired→activated on CTR-0003 is saved (warning only) — `content/docs/revenue/contracts.mdx:147` states exactly this, so not filed separately; it is part of **B-10**. |
| CON-003 | pass | End date 2027-04-10 on a 12-month contract → "Contract term (12 months) does not match date range (6 months …)"; shrinking an activated end date → 409 "Cannot shrink end_date … after activation". |
| CON-004 | pass | CTR-0004 activated by admin: `signed_date` 2026-10-10 stamped, Stark Medical type partner → customer. (A sales manager cannot do this in the UI → **B-01**.) |
| CON-005 | not reachable (API: pass) | `contract_expiration`: QA-B past-end CTR-0006 → expired; `contract_expired` notification created. |
| CON-006 | not reachable (API: pass) | `contract_renewal`: task "Renewal due: contract CTR-0007" + opportunity "Renewal — CTR-0007" (proposal, 5,000); second run created nothing (idempotent). |
| CON-007 | fail | Renewal calendar on end_date ✅ (CTR-0003 on Sep 5), list sorted by soonest end ✅, gantt ✅ (dates ambiguous → **B-20**), **timeline grouped under "[OBJECT OBJECT]"** → **B-06**. |
| SVC-001 | pass | CASE-{00000} (CASE-00039…00044), four priorities, statuses, origin, parent, attachments. The row's "客户签名/五星评分/反馈" fields do not exist → inventory drift in **B-18**. |
| SVC-002 | pass | Close without resolution → "Resolution is required when closing a case"; closed → in_progress reopen saved, `is_closed` back to false. |
| SVC-003 | pass | High/no-tier web case due +8 h; critical case due +4 h; low web case +168 h; medium +48 h. |
| SVC-004 | pass | priority_rank 4/3/2/1 observed for critical/high/medium/low. |
| SVC-005 | fail | Anonymous form works at `/_console/f/support` (CASE-00039/41 created, origin web, injected status/owner/escalation/internal notes stripped, unset priority → low). But the published link `/forms/support` is dead → **B-07**; heading shows `crm_case` → **B-08**; never routed to the staffed pool → **B-02**; submit echo → **B-21**. |
| SVC-006 | pass | Close Case flow on CASE-00040: closed_date stamped, resolution_time_hours 0 (1.5 min), is_closed true. |
| SVC-007 | pass | Agent-created Critical CASE-00040 → escalated, is_escalated, escalated_date, critical notification. Note the row says "只标记不改派" but the case is reassigned to the service manager pool (B-18), and the creator loses it → **B-04**. |
| SVC-008 | not reachable (API: pass) | `case_sla_monitor`: selected 32, acted 16; all 20 overdue open cases now `is_sla_violated` + escalated; 16 `case_sla_breach` notifications. |
| SVC-009 | pass | Escalating CASE-00039 created "Escalated: CASE-00039 …" urgent task due next day for the account owner. |
| SVC-010 | pass | Escalate Case (confirm → reason required) set critical + escalated; Close Case requires Resolution (+ optional "Resolved by Article"). |
| SVC-011 | n/a (removed #1428) | Confirmed: `customer_rating` / `customer_feedback` absent from `/api/v1/meta/object/crm_case`. |
| SVC-012 | pass | Log a Call on CASE-00039 → held call event, `first_response_date` 2026-10-10T18:29:00Z. |
| SVC-013 | pass | 8 views (4 tabs + "4 more"): All Cases, Service Workflow (card opens a drawer), SLA Calendar, Case Timeline, My Open Cases, Unassigned — triage, Escalated Cases, ⏰ SLA at Risk. |
| SVC-014 | pass | Highlights (status, priority, SLA due, violated, owner, account), 6-stage path, Escalate/Close/Log a Call, activity timeline with comment composer + @mention (`overview-case-record-escalated.png`). |
| SVC-015 | pass | service.manager reads/edits 7 open critical cases he does not own; resolved critical stays shared (documented deliberate choice). |
| SVC-016 | fail | Server writes "Case escalated/resolved/closed" to `sys_activity`, the console timeline shows only the escalated one → **B-05**. |
| SVC-017 | not tested | `GET /api/v1/ai/agents` → `{"agents":[]}`; no AI agent/LLM provider in this container. |
| SVC-018 | pass | Service dashboard: 12 chart shapes; Open 18 / Critical 9 / SLA violations 15 match `case_metrics` queries (200) and REST counts for service.manager; 3 reports render (status×priority matrix totals 40 = admin's 40 cases). |
| KB-001 | pass | KA-0005 created by agent: category, tags, audience, language, Source Case lookup; rep can read. |
| KB-002 | pass | draft→in_review→published→archived→published by the agent. |
| KB-003 | fail | Publish without body refused ("Articles cannot be published without a body.") ✅; publish without summary gives **no** warning to the user (server log only) → **B-10**. |
| KB-004 | fail | First publish stamped published_at/last_reviewed_at, re-publish kept published_at ✅; but a reader's Helpful vote also moved last_reviewed_at → **B-17**. |
| KB-005 | pass | helpful/not_helpful read-only (disabled in the form), recount idempotent per reader (2 clicks → 1). `view_count` no longer exists (#601) → inventory/doc drift **B-18**. |
| KB-006 | pass | Published (sorted by helpful_count, not views — B-18), My Drafts, All grouped by category. |
| KB-007 | pass | Agent creates/edits, DELETE → `PERMISSION_DENIED`; rep PATCH → `PERMISSION_DENIED`, no Edit button; anonymous REST → `UNAUTHENTICATED`. Global search "MFA" finds KA-0005. |

"not reachable": QUO-008, CON-005, CON-006 and SVC-008 are schedule-only flows with no UI trigger; each was fired with
`POST /api/v1/automation/<flow>/trigger` as admin and its effect read back through REST — all four behaved as the row promises.

## Findings

### B-01 — Sales manager gets no Edit/Delete on quotes and contracts they do not own, although the server allows it
- Inventory: CON-002, CON-004, QUO-002 · Persona: sales.manager · URL: `/_console/apps/app.objectstack.hotcrm/crm_contract/record/IhGHc1olTmrNDHJP` (CTR-0005), also `crm_quote/record/ByzuqkfK_7UPHvbQ` (QTE-0005)
- **Steps:** 1. Log in as sales.manager@objectos.ai. 2. Open CTR-0005 (owner Nina Reyes) or any contract/quote. 3. Look for Edit in the header and in the "…" menu.
- **Expected:** Edit available. `content/docs/revenue/contracts.mdx:130,157,168` — "Sales Manager and System Administrator hold it … the manager changes it because they can edit its account"; `src/sales/profiles/sales-manager.profile.ts:34` grants `crm_contract.allowEdit`; `crm_quote` has `modifyAllRecords: true`.
- **Actual:** no Edit button; the "…" menu holds only **Share**. Same on QTE-0005. On a `private` object (account, opportunity, lead) the manager does get Edit.
- **Evidence:** `B-01-mgr-contract-no-edit.png`. The page's own `POST /api/v1/security/explain` → `{"allowed":true,"object":"crm_contract","operation":"update"}` (and for crm_quote update + delete allowed). `GET /api/v1/auth/me/permissions` → `crm_contract: allowEdit true`. `PATCH /api/v1/data/crm_contract/IhGHc1olTmrNDHJP` as the manager → 200.
- **Owner:** console (objectui) — the record header decides edit/delete without honouring `controlled_by_parent` (both affected objects are `controlled_by_parent`; both working ones are `private`) even though its own explain call says allowed.
- **Severity guess:** p1 — the documented contract owner (manager) cannot activate/terminate a contract in the UI; only the admin can.
- **Dedupe words:** `controlled_by_parent`, `security/explain`, `crm_contract`, `Edit button missing`, `sales_manager`

### B-02 — Web-to-case submissions are never routed to the staffed service-agent pool
- Inventory: SVC-005 (and the routing promise in setup docs) · Persona: anonymous → service.agent · URL: `/_console/f/support`, then `/_console/apps/app.objectstack.hotcrm/crm_case/view/crm_case.unassigned_triage`
- **Steps:** 1. Run `pnpm demo:staff` (service.agent holds `service_agent`). 2. Log out, submit the public support form. 3. Read the case.
- **Expected:** `content/docs/administration/setup.mdx:116` "staffing the position [is] a behaviour change in itself: new cases stop arriving ownerless"; `content/docs/service/cases.mdx:146,181` "a web-to-case submission that landed while nobody held the Service Agent position"; `src/sales/sharing/demo-staffing.ts` header "the service AGENT is the case INTAKE POOL … a web-to-case submission".
- **Actual:** all five anonymous submissions (CASE-00039, 00041, 00042, 00043, 00044) have `owner_id: null` and sit in *Unassigned — triage* while Priya Raman holds the position. The same setup.mdx paragraph also says the anonymous form "cannot read the pool", so the page contradicts itself.
- **Evidence:** `B-02-web-cases-unassigned.png`; `GET /api/v1/data/crm_case/YQ8_IWnj12xboU_R` → `"owner_id": null, "origin": "web"` immediately after submit.
- **Owner:** hotcrm `src/service/objects/_case-assignment.ts:187-229` (`case_auto_assign` reads `sys_user_position` in the guest context and swallows the denial) plus the docs above. The pool read under a guest principal is a platform capability question (elevated lookup), so the doc should not promise it until there is one.
- **Severity guess:** p2 — triage workaround exists (claim from the tab), but the routing every doc describes never happens for the main intake channel.
- **Dedupe words:** `case_auto_assign`, `web-to-case`, `owner_id null`, `Unassigned — triage`, `service_agent`

### B-03 — Agent case form requires Account, so an anonymous web case cannot be claimed as-is
- Inventory: SVC-005, SVC-002 · Persona: service.agent · URL: `/_console/apps/app.objectstack.hotcrm/crm_case/record/YQ8_IWnj12xboU_R`
- **Steps:** 1. As service.agent open a web case from *Unassigned — triage*. 2. "…" → Edit → Status *In Progress* → Update.
- **Expected:** `content/docs/service/cases.mdx:148` "Move an unowned case to In Progress … and it becomes yours". `crm_case.crm_account` is optional in metadata (`required: false`) because web submissions have none.
- **Actual:** toast "Please check the highlighted fields: Account"; the save is blocked until the agent picks some account. The stage path is display-only, so there is no other claim gesture. With an account picked, the claim works (owner → Priya).
- **Evidence:** `B-03-case-form-requires-account.png`; `GET /api/v1/meta/object/crm_case` → `crm_account: {"required": false}`.
- **Owner:** hotcrm `src/service/views/case.view.ts:424` (`{ field: 'crm_account', required: true }` in the agent form).
- **Severity guess:** p2
- **Dedupe words:** `crm_account required`, `case.view.ts`, `Please check the highlighted fields: Account`, `claim`, `In Progress`

### B-04 — An agent who creates (or escalates) a Critical case is shown "Record not found" right after "Case created successfully"
- Inventory: SVC-007, SVC-010 · Persona: service.agent · URL: `/_console/apps/app.objectstack.hotcrm/crm_case/record/VmDrSSH_arUcANZW` (CASE-00040)
- **Steps:** 1. As service.agent: Cases → New, priority Critical, account Globex → Create. (Also: Escalate Case on a case you own.)
- **Expected:** the person who logged the case can still see it, or at least is told it moved; not "may have been deleted".
- **Actual:** toast "Case created successfully" over an empty page "Record not found — The record you are looking for does not exist or may have been deleted." The case exists: escalated by `case_escalation_on_create`, reassigned to Tomas Okafor (service_manager pool), and the agent's `crm_case` read scope is `own`. Same after the Escalate Case flow on CASE-00039.
- **Evidence:** `B-04-critical-case-record-not-found.png`, `B-04-escalate-then-record-not-found.png`; REST: `CASE-00040 status escalated, owner_id 71cPihUj… (Tomas), created_by 51LlVSIH… (Priya)`.
- **Owner:** hotcrm — `src/service/objects/_case-assignment.ts` (escalation reassign) with `src/sales/profiles/service-agent.profile.ts:25` (`readScope: 'own'`) and no sharing rule for the creator/previous owner in `src/service/sharing/case.sharing.ts`. The generic "may have been deleted" text is the console's.
- **Severity guess:** p2
- **Dedupe words:** `Record not found`, `may have been deleted`, `case_escalation_reassign`, `Critical`, `readScope own`

### B-05 — Case activity timeline drops the "resolved" and "closed" milestones the server records
- Inventory: SVC-016, SVC-014 · Persona: service.manager · URL: `/_console/apps/app.objectstack.hotcrm/crm_case/record/VmDrSSH_arUcANZW` → Activity
- **Steps:** 1. Close CASE-00040 via Close Case; reopen; set Resolved; set Closed. 2. Reload, open the Activity tab.
- **Expected:** `src/service/objects/case.object.ts:410-414` `activityMilestones` for escalated / resolved / closed.
- **Actual:** the timeline shows "Created Case", "Case escalated" and "Status: Closed → In Progress" only.
- **Evidence:** `B-05-timeline-missing-closed-milestone.png`. The page's own request `GET /api/v1/data/sys_activity?…filter=[record_id = VmDrSSH_arUcANZW]` returns 6 rows including `completed:Case closed — …` (×2) and `completed:Case resolved — …`; every dropped row has `type: "completed"`.
- **Owner:** console (objectui) — the activity feed filters out `type: 'completed'` entries that the server returns.
- **Severity guess:** p2
- **Dedupe words:** `activityMilestones`, `sys_activity`, `type completed`, `Case closed`, `Case resolved`

### B-06 — Contract Timeline groups every contract under "[OBJECT OBJECT]"
- Inventory: CON-007 · Persona: sales.manager (same for admin) · URL: `/_console/apps/app.objectstack.hotcrm/crm_contract/view/crm_contract.contract_timeline`
- **Steps:** 1. Contracts → Contract Timeline tab.
- **Expected:** "按客户分组的季度 timeline" — one group per account (`groupByField: 'crm_account'`, `scale: 'quarter'`).
- **Actual:** a single group header "[OBJECT OBJECT] 5" holding all five contracts (4 different accounts); no quarter scale.
- **Evidence:** `B-06-contract-timeline-object-object.png`; `GET /api/v1/meta/views/crm_contract.contract_timeline` → `timeline: {"groupByField":"crm_account","scale":"quarter",…}` (metadata correct).
- **Owner:** console (objectui) — timeline grouping stringifies the expanded lookup object instead of its display name.
- **Severity guess:** p2
- **Dedupe words:** `[object Object]`, `contract_timeline`, `groupByField`, `crm_account`, `timeline`

### B-07 — The published support-form link `/forms/support` is dead for anonymous visitors
- Inventory: SVC-005 · Persona: anonymous · URL: `http://localhost:4001/forms/support`, `/_console/forms/support`
- **Steps:** 1. Logged out, open `/forms/support` → 404 JSON `ENDPOINT_NOT_FOUND`. 2. Open `/_console/forms/support` → redirected to `/_console/login?redirect=%2Fforms%2Fsupport`.
- **Expected:** inventory SVC-005 "匿名表单 `/forms/support`"; `content/docs/service/cases.mdx:96`; view `sharing.publicLink: '/forms/support'`, `allowAnonymous: true` (`src/service/views/case.view.ts:482-486`).
- **Actual:** only `/_console/f/support` renders the form without a session (found in the console router: `/f/:slug` is the public route, `/forms/:name` sits behind the auth guard).
- **Evidence:** `B-07-forms-support-redirects-to-login.png`; `curl /forms/support` → `{"success":false,"error":{"code":"ENDPOINT_NOT_FOUND"}}`; `GET /api/v1/forms/support` → 200 with the form spec.
- **Owner:** console (objectui) — `publicLink` `/forms/<slug>` (which the console's own "publish form" UI writes) maps to the guarded route; the docs then repeat that link.
- **Severity guess:** p2 — the customer-facing intake URL the docs give is unusable.
- **Dedupe words:** `/forms/support`, `/f/:slug`, `publicLink`, `allowAnonymous`, `login?redirect`

### B-08 — Public support form is headed with the API name `crm_case` and shows editor jargon to customers
- Inventory: SVC-005 · Persona: anonymous · URL: `/_console/f/support`
- **Steps:** 1. Open the form logged out.
- **Expected:** a customer-facing title (object label "Case" or a form label), no authoring hints.
- **Actual:** page title "crm_case"; above Description: "Format: markdown" and "Rich text editor (basic)".
- **Evidence:** `B-08-public-form-title-crm_case.png`; `GET /api/v1/forms/support` → form has no `label`; object label is "Case".
- **Owner:** console (objectui) — falls back to the object API name instead of its label; hotcrm could also give `web_to_case` a label (`src/service/views/case.view.ts:452`).
- **Severity guess:** p3
- **Dedupe words:** `crm_case`, `web_to_case`, `Format: markdown`, `Rich text editor (basic)`

### B-09 — An accepted (frozen) quote still accepts new line items, and its totals silently stop matching its lines
- Inventory: QUO-003, QUO-007 · Persona: sales rep · URL: `/_console/apps/app.objectstack.hotcrm/crm_quote/record/RQbrMjgfP7V4Y937` (QTE-0007) → Related
- **Steps:** 1. Accept QTE-0007 (one line, subtotal 19,000). 2. Add a second line (1 × 5,000) — the Related tab still offers **New**; REST create also 200.
- **Expected:** `content/docs/sales/quotes.mdx:120` "From then on the quote is frozen: a change to any field except Internal Notes is refused"; quotes.mdx:49 "Anything you change in the line items … the totals update automatically".
- **Actual:** line saved; quote keeps subtotal 19,000 / total 17,100 while its lines now sum to 24,000; the drafted contract CTR-0005 still says 17,100.
- **Evidence:** `B-09-accepted-quote-new-line-totals-frozen.png`; `POST /api/v1/data/crm_quote_line_item` (crm_quote RQbrMjgfP7V4Y937) → 200 `id cvb3LbiQrRmYq7Xz`; `GET crm_quote/RQbrMjgfP7V4Y937` → `accepted 19000 1900 17100`.
- **Owner:** hotcrm `src/revenue/objects/quote_line_item.hook.ts` — `quote_total_rollup` skips settled quotes but nothing refuses a line write on an accepted/expired parent.
- **Severity guess:** p2 — the record of what the customer signed can be changed.
- **Dedupe words:** `quote_total_rollup`, `accepted quote`, `crm_quote_line_item`, `frozen`, `quote_pricing_guard`

### B-10 — Warning-severity rules never reach the person saving (quote status jumps, publish without summary)
- Inventory: QUO-002, KB-003 (CON-002 the same mechanism, documented) · Persona: admin, service.agent · URL: QTE-0005 Edit; KA-0005 Edit
- **Steps:** 1. Edit QTE-0005 Draft → Presented → Update. 2. Publish KA-0005 with no Summary.
- **Expected:** KB-003 "无摘要发布告警"; `src/revenue/objects/quote.object.ts:338-344` "it flags the jump on the record without blocking".
- **Actual:** only "Quote updated successfully" / "Knowledge Article updated successfully"; nothing on the record. The PATCH body is `{object,id,record}` with no warnings key. Server log: `WARN Validation rule 'quote_status_progression' (warning): Invalid quote status transition` and `WARN Validation rule 'published_requires_summary' (warning): …`. Also `content/docs/sales/quotes.mdx:21` advertises "A typical journey: Draft → Presented → Accepted", and Draft → Presented is one of the jumps the rule flags.
- **Evidence:** `B-10-illegal-quote-transition-saved-silently.png`, `B-10-kb-published-no-summary-no-warning.png`, `/tmp/dev.log` lines at 18:02:59, 18:03:08, 18:31:37, 18:32:27 UTC.
- **Owner:** platform: `@objectstack/objectql`/`@objectstack/rest` (warning results are logged, not returned) + console (nothing to render); doc line is hotcrm `content/docs/sales/quotes.mdx:21`.
- **Severity guess:** p3
- **Dedupe words:** `severity: 'warning'`, `quote_status_progression`, `published_requires_summary`, `Invalid quote status transition`, `Draft → Presented`

### B-11 — New-record forms ignore declared defaults; Expiration Date is forced, so the +30-day default is unreachable from the UI
- Inventory: QUO-003, QUO-001, KB-001 · Persona: sales rep, service.agent · URL: Quotes → New; Knowledge → New
- **Steps:** 1. Quotes → New, fill name and account only → Create.
- **Expected:** Status prefilled Draft (option `default: true`), Quote Date today (`defaultValue: cel today()`), and an empty Expiration Date accepted (QUO-003: `quote.hook.ts:90-92` defaults it to quote_date + 30).
- **Actual:** "Please check the highlighted fields: Status, Expiration Date"; Status "Select an option", Quote Date empty. Knowledge → New shows Status "Select an option" too. Over REST the same quote saves with status/expiry defaulted (QTE-0008: 2026-11-09).
- **Evidence:** `B-11-new-quote-status-not-defaulted.png`, `B-11-new-article-status-not-defaulted.png`; `GET /api/v1/meta/object/crm_quote` → `status.options[draft].default: true`, `quote_date.defaultValue {cel today()}`, `expiration_date.required: true`.
- **Owner:** console (objectui) — form does not apply option-level `default` or CEL `defaultValue`; hotcrm `src/revenue/objects/quote.object.ts:171-176` — `required: true` on `expiration_date` contradicts the hook default.
- **Severity guess:** p3
- **Dedupe words:** `default: true`, `Select an option`, `expiration_date required`, `quote_date + 30`, `defaultValue`

### B-12 — Kanban column sums (`summarizeField`) are not drawn
- Inventory: QUO-009 · Persona: admin · URL: `/_console/apps/app.objectstack.hotcrm/crm_quote/view/crm_quote.quote_pipeline`
- **Steps:** 1. Quotes → Quote Pipeline.
- **Expected:** "状态看板(按 total_price 汇总)"; spec describes `summarizeField` as "Field to sum at top of column".
- **Actual:** column headers show only the record count ("DRAFT 1"); no total.
- **Evidence:** `B-12-quote-kanban-no-column-sum.png`; `GET /api/v1/meta/views/crm_quote.quote_pipeline` → `kanban: {"groupByField":"status","summarizeField":"total_price",…}`. In the console bundle `summarizeField` is only used to project fields. Same key in `opportunity.view.ts:159`, `lead.view.ts:543`.
- **Owner:** console (objectui)
- **Severity guess:** p3
- **Dedupe words:** `summarizeField`, `kanban`, `quote_pipeline`, `column sum`, `total_price`

### B-13 — Opportunity reference rail lists line items by raw record id
- Inventory: QUO-004 (opportunity record used to generate quotes) · Persona: sales rep · URL: `/_console/apps/app.objectstack.hotcrm/crm_opportunity/record/H3np2_kr9VQbQI3F`
- **Steps:** 1. Open any opportunity with products.
- **Expected:** a readable line label (product or description).
- **Actual:** "Opportunity Line Item 3 · BYCx0vNpx18u4tjy · XOaHTGhj0RVeFO-O · Y1zSH188Xkx37aT_".
- **Evidence:** `B-13-line-item-rail-raw-ids.png`; `GET /api/v1/meta/object/crm_opportunity_line_item` → `nameField: "description"`, and the three rows have descriptions ("Analytics for the sales and marketing teams." …).
- **Owner:** console (objectui) — the `record:reference_rail` ignores `nameField`. (hotcrm could add a display field, but the server already names one.)
- **Severity guess:** p3
- **Dedupe words:** `reference_rail`, `Opportunity Line Item`, `nameField`, `raw id`

### B-14 — After Generate Quote the opportunity rail still says "+ 2 empty (Quote · Task)"
- Inventory: QUO-004 · Persona: sales rep, admin · URL: opportunity record pages (reproduced twice: *Vertex Analytics Expansion*, *Vertex Enterprise Rollout*)
- **Steps:** 1. Generate Quote → Submit. 2. Look at the right rail without reloading.
- **Expected:** `generate_quote` declares `refreshAfter: true` (`src/sales/actions/opportunity.actions.ts:223`); the new quote should show in the rail.
- **Actual:** stage and the Related tab count refresh, the rail keeps "+ 2 empty (Quote · Task)" until a reload (after reload: "Quote 1 · QA-B Vertex Expansion Quote").
- **Evidence:** `B-14-rail-not-refreshed-after-generate-quote.png`; REST shows QTE-0007/QTE-0011 created with `crm_opportunity` set.
- **Owner:** console (objectui) — `refreshAfter` does not refresh the reference rail.
- **Severity guess:** p3
- **Dedupe words:** `refreshAfter`, `+ 2 empty`, `Generate Quote`, `reference_rail`

### B-15 — Quote line Subtotal/Total columns are unformatted (19000 next to 10,000.00)
- Inventory: QUO-007 · Persona: sales rep · URL: QTE-0007 → Related
- **Expected:** currency formatting like Sales Price.
- **Actual:** "10,000.00 | 19000 | 20520".
- **Evidence:** `B-09-accepted-quote-new-line-totals-frozen.png` (same table); meta for `subtotal`/`total_price`: `type: formula`, no `returnType`/scale. Spec's formula `returnType` enum is `number|text|boolean|date` — no currency.
- **Owner:** platform: `@objectstack/spec` (no currency return type for formulas) + console (no number formatting for formula values); hotcrm `src/revenue/objects/quote_line_item.object.ts:149-173` sets no `returnType`.
- **Severity guess:** p3
- **Dedupe words:** `Field.formula`, `returnType`, `19000`, `quote_line_item`, `subtotal`

### B-16 — Product delete refusal counts quote lines as quotes
- Inventory: QUO-011 · Persona: admin · URL: `/_console/apps/app.objectstack.hotcrm/crm_product/record/1XMOr5D8H9zVuOCb` → … → Delete → Continue
- **Actual:** "Cannot delete product: referenced by 5 opportunity(ies) and 5 quote(s)." — the 5 quote lines sit on 4 quotes (QTE-0007 has two).
- **Evidence:** `B-16-product-delete-counts-lines-as-quotes.png`; REST count: `crm_quote_line_item 5 rows, 4 distinct crm_quote`.
- **Owner:** hotcrm `src/revenue/objects/product.hook.ts:70` (message uses line counts).
- **Severity guess:** p3
- **Dedupe words:** `Cannot delete product`, `quote(s)`, `DELETE_RESTRICTED`, `product.hook.ts`

### B-17 — A reader's Helpful vote refreshes the article's "Last Reviewed" date
- Inventory: KB-004 · Persona: sales rep (reader) · URL: KA-0005
- **Steps:** 1. Published KA-0005 at 18:32:27. 2. As na.rep click **Helpful**.
- **Expected:** `content/docs/service/knowledge-base.mdx:63` "refreshes the review date on every later edit, so that date reflects real attention".
- **Actual:** `last_reviewed_at` moved to 18:33:16 (the feedback recount write), with no editor involved.
- **Evidence:** `B-17-helpful-vote-bumps-last-reviewed.png`; REST before `last_reviewed_at 18:32:27.706Z`, after `{'helpful_count': 1, 'last_reviewed_at': '2026-10-10T18:33:16.673Z'}`.
- **Owner:** hotcrm `src/service/objects/knowledge_article.hook.ts:119` (stamps on every write while published, including the counter recount from `article_feedback.hook.ts`).
- **Severity guess:** p3
- **Dedupe words:** `last_reviewed_at`, `helpful_count`, `knowledge_article_publish_timestamps`, `Helpful`

### B-18 — Docs and inventory describe knowledge/case fields that no longer exist
- Inventory: KB-005, KB-006, SVC-001, SVC-007 · Persona: n/a
- **Actual vs text:**
  - `content/docs/service/knowledge-base.mdx:33` "Published — published articles only, most-viewed first": `view_count` was removed (#601); the view sorts by `helpful_count` (`src/service/views/knowledge_article.view.ts:64`).
  - `docs/feature-inventory.md:170` KB-005 lists `view_count`; `:171` KB-006 "已发布按浏览量".
  - `docs/feature-inventory.md:143` SVC-001 "客户签名/五星评分/反馈": no signature, rating or feedback field on `crm_case` (meta has none; SVC-011 retired two of them).
  - `docs/feature-inventory.md:149` SVC-007 "只标记不改派": an escalated case is handed to the service_manager pool (CASE-00039, CASE-00040 → Tomas Okafor).
- **Evidence:** `GET /api/v1/meta/object/crm_knowledge_article` (no `view_count`), `GET /api/v1/meta/object/crm_case`.
- **Owner:** hotcrm docs (`content/docs/service/knowledge-base.mdx:33`, `docs/feature-inventory.md` rows above).
- **Severity guess:** p3
- **Dedupe words:** `view_count`, `most-viewed first`, `五星评分`, `只标记不改派`

### B-19 — Service agent lands on Executive Overview full of "You don't have access" tiles
- Inventory: SVC-018 (persona experience) · Persona: service.agent · URL: `/_console/apps/app.objectstack.hotcrm` → `/dashboard/executive_dashboard`
- **Actual:** revenue tiles read "You don't have access"; four `POST /api/v1/analytics/dataset/query` (`opportunity_metrics`) → 403 `[Analytics] Access denied: reading "crm_opportunity" is not permitted`.
- **Expected:** a landing page the persona can read (e.g. Service Overview), or no inaccessible tiles.
- **Evidence:** `B-19-agent-home-no-access-tiles.png`.
- **Owner:** hotcrm `src/sales/apps/crm.app.ts:97-103` (one `nav_home` → `executive_dashboard` for every persona). Per-persona home may be a platform capability; if none exists it is an upstream ask.
- **Severity guess:** p3
- **Dedupe words:** `executive_dashboard`, `You don't have access`, `opportunity_metrics`, `PERMISSION_DENIED`, `service agent home`

### B-20 — Contract Terms gantt shows Start/End without the year (a 12-month contract reads 9/5 → 9/5)
- Inventory: CON-007 · Persona: sales.manager · URL: `/_console/apps/app.objectstack.hotcrm/crm_contract/view/crm_contract.contract_gantt`
- **Actual:** CTR-0003 "9/5 | 9/5", CTR-0002 "10/24 | 10/23" (really 2025→2026 and 2026→2029).
- **Evidence:** `B-20-gantt-dates-without-year.png`; REST `CTR-0003 start 2025-09-05 end 2026-09-05`.
- **Owner:** console (objectui) gantt grid date format.
- **Severity guess:** p3
- **Dedupe words:** `contract_gantt`, `Contract Terms`, `9/5`, `gantt date format`

### B-21 — Anonymous form submit echoes the whole stored case back to the visitor
- Inventory: SVC-005, KB-007 (guest boundary) · Persona: anonymous · URL: `POST /api/v1/forms/support/submit`
- **Actual:** 200 with `record` containing every column: `organization_id`, `owner_id`, `internal_notes`, `sla_due_date`, `is_sla_violated`, `resolution`, … (CASE-00044). The guest profile denies read on `crm_case`, so the visitor is shown more than it can ever read.
- **Expected:** an acknowledgement (id/number at most).
- **Evidence:** `curl -X POST … /api/v1/forms/support/submit` response body excerpt: `"organization_id": "org_mv2p2e71o3vkw0w4", … "internal_notes": null, "is_closed": false`.
- **Owner:** platform: the forms submit endpoint (`@objectstack/rest` / runtime public forms).
- **Severity guess:** p3 (no other customer's data is exposed; it reveals internal schema and tenant id)
- **Dedupe words:** `forms/support/submit`, `allowAnonymous`, `organization_id`, `guest_portal`

## Not defects but worth knowing

- **Business rejections are logged as `ERROR [BodyRunner] sandboxed hook threw` with a stack** (product price < cost, product delete, contract term) — expected refusals look like crashes in the server log.
- **`WARN [notify] no organization in scope for topic 'case_escalated' / 'urgent_task'`** floods the log during seed — the log says it is expected on single-org installs.
- **Service agent sees one case on a fresh demo** (`crm_case` `readScope: 'own'`; all 38 seeded cases belong to the dev admin) — by design, but the agent persona's lists are near-empty until it claims work.
- **The SLA sweep hands every breached case to the one service manager** (16 cases → Tomas Okafor in one run) — consistent with docs, worth knowing for demos.
- **SLA Performance report shows 0.0 % violations** because it filters `is_closed: true` (by design, `src/service/reports/case.report.ts:27`), while 20 open cases are violated.
- **Kanban/path**: the case path ticks New/In Progress/Waiting as done for a case that jumped New → Escalated (cosmetic, standard path behaviour).
- **Grouped product grid** clips the Cost and Active columns at 1440 px (horizontal scroll inside groups).
- **Agent can archive articles** — the inventory's "归档留给管理员" reads ambiguously; I treated "no delete" as the rule (see Open questions).
- Page timings (admin, after login): list views ~1.5–2.5 s to settle; dashboards 2–4 s to draw charts; flows (Generate Quote, Escalate, Close) answered in < 2 s.
- No flaky behaviour seen: B-14 was reproduced twice; every other finding is deterministic.

## Open questions (choices I made)

1. Scheduled flows (QUO-008, CON-005, CON-006, SVC-008) have no UI path; I recorded them as *not reachable* and verified their behaviour through `POST /api/v1/automation/<flow>/trigger` as admin (all correct).
2. B-01 rated p1 because the documented contract editor persona is blocked in the UI; admin and the REST API still work — a reviewer may prefer p2.
3. B-10: contract state machine warnings are already disclosed in `contracts.mdx:147`, so I did not file CON-002 as failed; quote and KB pages disclose nothing, so QUO-002 and KB-003 are failed.
4. The manager edit gap (B-01) was measured on `crm_quote` and `crm_contract` only; other `controlled_by_parent` objects were not walked.
5. KB-007 "归档留给管理员" read as "deletion is not the agent's; archive is the retirement path" — the agent archiving was not filed.
6. Body text I typed into KA-0005 contains literal `\n` (my input), not a rendering defect.
7. I did not test with a second service agent, so least-loaded selection between two agents was not observed.
