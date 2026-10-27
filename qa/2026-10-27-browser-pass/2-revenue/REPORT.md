# #2320 track 2 — CRM · Revenue browser pass

- **Tested sha:** hotcrm `main` `afdf9a0` (`@objectstack/*` 18.2.0; includes #2323 contract move and #2324 price books).
- **Install:** fresh `pnpm dev` DB, dev admin, `pnpm demo:staff` exit 0. Playwright on the preinstalled Chromium, 1440×900 (dashboards 1440×2600).
- **Personas:** dev admin, `na.rep` (Nina Reyes), `sales.manager` (Marta Quinn), `service.agent` (reports nav only).
- **Two sittings:** part 1 stopped at 14:08Z for the maintainer's usage limit (report comment 6444188882). Part 2 resumed at 18:13Z on `main` `ea567f2` (#2333, a contract signed_date fix, landed in between) with a fresh DB and `demo:staff` exit 0, and covers APR-001..005, the other approval gates, FCT-006 and the 390×844 pass.
- Screenshots sit beside this file, and also in project files `qa-2320/2-revenue/`.

## Coverage

| Row | Verdict | Evidence / reason |
|---|---|---|
| QUO-001 quote object | pass | `quo-50..52`: New quote as rep, QTE-0008 numbered, pricing/terms/addresses tabs in the form, Attachments tab on the record (`quo-02`). |
| QUO-002 status machine | pass | draft→presented skips in_review and saves "with warnings: Invalid quote status transition" (`quo-33`, warning severity as authored); in_review→rejected→draft clean (`quo-53..55`); accepted is terminal (`quo-35`). |
| QUO-003 defaults and freeze | pass | blank expiration became quote_date+30 (10-27→11-26); accepted quote refuses a discount edit (409, `quo-35`), saves internal notes (`quo-36`), refuses a new line (`quo-37`). Copy defect D3. |
| QUO-004 generate from opportunity | pass | Generate Quote dialog (`quo-11`); 75 % refused (`quo-12`, defect D1); 10 % made QTE-0007 seeded at 60,000 / 6,000 / 54,000 and moved the deal qualification→proposal (`quo-13`). |
| QUO-005 accept → contract draft | pass | rep accepted QTE-0007: CTR-0005 draft, 12 months 2026-10-27→2027-10-27, value 37,800 = total, contact John Smith, owner the rep (`quo-34`, `con-02`). |
| QUO-006 accept → closed won | pass | the deal went closed_won, close_date today, win_reason quote_accepted. |
| QUO-007 lines and rollup | pass with defect | price fills from the product (18,000), line discount 25 % → 6,000; quote subtotal 42,000, discount 4,200, total 37,800 (`quo-22`, `quo-23`). Header total stays stale until reload (D2). |
| QUO-008 nightly expiry | not reachable | scheduled flow, "Not running here" (`OS_AUTOMATION_SCHEDULED_WORK_ENABLED` off, `quo-40`); `POST /automation/quote_expiration/trigger` answers 403 by design. QTE-0008 was back-dated as a fixture and left draft. |
| QUO-009 quote views | pass | All Quotes with total sum, Quote Pipeline kanban with column sums, Quote Calendar spans (`quo-05-*`). |
| QUO-010 product object | pass | PRD-0014 created by the manager, SKU stored upper-case (`prd-11`). |
| QUO-011 product protection | pass | list price < cost refused (`prd-10`); delete of a referenced product refused naming 1 opportunity line and 1 quote line (`prd-13`); duplicate SKU refused (D4 copy). |
| QUO-012 product views | pass | grouped by category, catalog gallery (`prd-01-*`); no seeded images, so the gallery has no covers (S11). |
| QUO-013 product_metrics | pass | CRM Overview "Top Products" draws from it (`fct-20-crm_overview_dashboard-admin`). |
| Price books (#2324) | pass | rep: list only, no New (`pb-01`); manager: Partner book created (`pb-13`), second Standard refused (`pb-11`), backwards window refused (`pb-12`), entry 40,000 saved (`pb-14`), duplicate refused naming book and product (`pb-15`), negative price refused (`pb-16`); admin: Standard cannot be turned off (`pb-20`) or deleted (`pb-21`); Partner deleted with its entry (14→13 entries, `pb-24`). |
| CON-001 contract object | pass (docs drift D5) | CTR-0006 created by the manager (`con-12`); rep is read-only on contracts, by the permission set. |
| CON-002 state machine | pass | draft offers only Draft / In Approval / Terminated (`con-16`); draft→in_approval→activated→terminated; terminated offers only Terminated (`con-21`). |
| CON-003 term consistency | pass | 12 months vs 1-month range refused (`con-11`); shrinking end_date after activation refused (`con-17`, copy D3). |
| CON-004 activation | pass | signed_date stamped 2026-10-27; Globex Industries went prospect→customer (`con-19`). |
| CON-005 nightly expiry | not reachable | scheduled flow, same gate as QUO-008. |
| CON-006 renewal reminders | not reachable | scheduled flow, same gate as QUO-008. |
| CON-007 contract views | pass | list sorted by soonest end date, Renewal Calendar, Contract Terms gantt, Contract Timeline grouped by account (`con-01-*`). |
| FCT-001 forecast object | pass | Q4 2026 forecast for the rep: attainment 20, coverage 1.67, expected 150,000, all correct (`fct-13`). |
| FCT-002 period derivation | pass | Oct 15 refused (first day of the period, and the quarter boundary), Oct 1 derived period_end 12-31, label "Q4 2026", snapshot_date today (`fct-11`, `fct-12`). |
| FCT-003 nightly snapshot | not reachable | scheduled flow, same gate as QUO-008. |
| FCT-004 category buckets | pass | opportunity stage→forecast_category consistent across 17 rows (e.g. negotiation→commit, needs_analysis→best_case); the dashboard's category tile uses the same buckets. |
| FCT-005 forecast views | pass | All (grouped by period), This Quarter (empty state, then the Q4 row), My Forecast (rep sees only their own) (`fct-01-*`, `fct-14-*`). |
| FCT-006 AI forecasting skill | not reachable | the skill is authored (`revenue_forecasting`), but the console offers no assistant control on Forecasts or in the header, and the command palette finds only objects and articles (`fct-40`); same cause as track 5 D9. |
| FCT-007 Sales Performance | pass | admin, manager and rep: every dataset query 200, 17–20 chart marks drawn, no no-access tile (`fct-20`, `fct-21`). |
| FCT-008 Executive and CRM Overview | pass | same probe for both dashboards × 3 personas. |
| FCT-009 forecast_metrics | pass | Quota Attainment by Rep shows the current quarter only (`fct-20-sales_dashboard-admin`). |
| FCT-010 reports nav | pass | Reports group collapsed by default; admin 10 entries, rep 7 (no case reports), service agent 6 (no opportunity reports) (`fct-30-*`). |
| APR-001 large-deal two tiers | pass | rep saved a 150,000 deal → "Large Deal Approval (on create) · Sales Manager Review" waiting on the manager (`apr-11`, `apr-12`); a 600,000 deal, once the manager approved, moved to "Sales Director Sign-off" (`apr-20..22`). |
| APR-002 behaviour | pass | first response decides; the record shows "Locked for approval", Edit disabled, Recall/Reply for the submitter (`apr-11`); approval_status mirrors pending → approved / rejected. |
| APR-003 outcomes | pass with defect | approve: approved_date stamped, owner gets "Deal approved" (`apr-13`, `apr-14`); reject: approval_status rejected, owner gets the warning "Review and revise before resubmitting" (`apr-24`, `apr-25`). Resubmitting does not exist (D6). |
| APR-004 empty bench | pass | no one holds Sales Director, so the step went to the dev admin as rescue approver and appeared in the admin's inbox (`apr-22`); the admin's decision resolved it. |
| APR-005 inbox | pass | My Work → Inbox opens the approvals inbox for rep, manager and admin; My Pending / Submitted by me / All, approve and reject dialogs with comment and attachments (`apr-12`, `apr-13-*-dialog`, `apr-28`). |
| Account approval (not an inventory row) | pass | a rep's new account was born pending, the manager approved it from the inbox, the owner was notified (`apr-40..42`). |
| Lead conversion, qualification and status-change gates | inert as shipped | each verdict field ships `not_required` and the request control is disabled (`apr-26`); arming needs a field-default change, which no console screen offers on a HotCRM object (track 6 D2). |
| Phone width 390×844 | pass | 11 revenue screens as the rep: quote list, pipeline, record, related; product catalog; price books; contracts and timeline; forecasts; Sales Performance; inbox. No page or main-pane horizontal overflow (`phone-01..11`). Suggestions S22. |

## Defects

**D1 — platform console (screen-flow runner): a refused submit removes Submit.** As `na.rep`, opportunity "QA-2320 Revenue Journey" → Generate Quote → Discount 75 → Submit. Expected: the error shows and the user can correct the field and submit again (the field label itself says "≤ 60"). Actual: the error "Discount cannot exceed 60%" shows, and the footer keeps only **Close**; the user must close, reopen and retype every field. Evidence `quo-12-generate-discount-75.png`. Dedupe: screen flow error submit button disappears, flow dialog retry after validation error.

**D2 — platform console (record page): parent header goes stale after a related-list create.** As `na.rep` on QTE-0007, Related → Quote Line Items → New → Create. Expected: the header Total Price reflects the rollup the hook just wrote. Actual: the header still shows 32,400 after the second line; the server holds 37,800, and a reload shows it. Evidence `quo-23-li2-after.png` vs `quo-30-draft-to-presented.png`. Dedupe: record header not refreshed after related create, rollup stale header.

**D3 — HotCRM (`src/revenue/objects/quote.hook.ts:224`, `src/sales/objects/contract.hook.ts`): refusal copy shows API names.** Editing the discount of an accepted quote says "Quote QTE-0007 - … is accepted; only internal_notes may be edited. Attempted: discount." Shrinking an activated contract says "Cannot shrink end_date (…) after activation." Expected: the field labels the user sees (Internal Notes, Discount %, End Date). Evidence `quo-35`, `con-17`. Dedupe: refusal message api field name, internal_notes may be edited.

**D4 — platform (unique-index refusal): the duplicate message does not name the field.** As the manager, New Product with SKU `QA-2320-SKU` when that SKU exists → "A record with this value already exists", with no field highlighted. Evidence `prd-12-create-dup-sku.png`. Dedupe: unique constraint message field name, record with this value already exists.

**D5 — HotCRM docs (`docs/feature-inventory.md` CON-001): the row says 私有共享 (private).** `src/sales/objects/contract.object.ts:20` is `controlled_by_parent` (reach follows the account). Dedupe: contract sharing private controlled_by_parent inventory.

**D6 — HotCRM (`src/sales/flows/opportunity-approval.flow.ts:90`, `content/docs/revenue/approvals.mdx:63,128`): a rejected large deal can never be resubmitted, and closes won without approval.** As `na.rep`: save a 600,000 deal; the manager approves; the admin (rescue) rejects. The rejection notice says "Review and revise before resubmitting", and the docs say "revise and save again to re-submit". Actual: changing the amount to 550,000 and saving leaves approval_status `rejected` and opens no request (the flow starts only from `not_required` or null); there is no Resubmit control on the record or in "Submitted by me" (`apr-26..29`). The rep then moved the deal to Negotiation and Closed Won (550,000, win reason Better Product), and it saved with the "Large deal won" toast (`apr-31`, `apr-32`): a deal whose approval was rejected closed won with no approval. Dedupe: rejected opportunity resubmit approval, approval_status rejected closed won.

## UI / UX suggestions

| # | Where | What a user meets today | Proposed change | Who benefits | Screenshot |
|---|---|---|---|---|---|
| S1 | Quote list | Discount % drawn as a progress bar; the account column truncates "ACC-000003 - Initech Solu…"; dates have no year | plain percent; account name without the number; year on dates outside this year | reps scanning quotes | `quo-01-list` |
| S2 | Quote record | the highlights repeat the number and name from the title; the Pricing section has no Total | drop the duplicates; put Total Price in Pricing | everyone reading a quote | `quo-02-record-draft` |
| S3 | Quote status path | read-only; status moves only through Edit → Status select; after draft→presented the path ticks "In Review" though it was skipped, and lays Rejected/Expired out as later steps | clickable path or lifecycle actions (Submit for review, Mark presented, Accept); show branch states apart | reps | `quo-30`, `quo-34` |
| S4 | Generate Quote | the user stays on the opportunity after submit | open the new quote, or toast with a link | reps | `quo-13` |
| S5 | Quote line form | the product picker shows no price; Sales Price stays "0.00" until save | show and prefill the list price (Standard book) when a product is picked | reps | `quo-22-li1-picker` |
| S6 | Quote line related list | Subtotal and Total carry the same number, in a different number format (36,000 vs 18,000.00); no discount column | one amount column with currency format, plus Discount % | reps, approvers | `quo-23-li2-after` |
| S7 | Accepted quote | New line and every Edit field are still offered, then refused | hide New and lock the frozen fields | reps | `quo-37` |
| S8 | Accepted quote | nothing says a contract was drafted; the quote has no link to CTR-0005 (the contract's description names the quote) | toast "Contract CTR-0005 drafted" and a related link | reps, contract admins | `quo-34`, `con-02` |
| S9 | Quote warning | "Invalid quote status transition" names neither the move nor the allowed ones | name from→to and the allowed moves, as the contract message already does | reps | `quo-33` |
| S10 | New quote form | Status offers Accepted / Rejected / Expired at creation | start at Draft only | reps | `quo-50` |
| S11 | Product catalog gallery | no covers on any seeded product | placeholder icon per category, or seed images | sales | `prd-01-view2-product_catalog` |
| S12 | Price books | default list shows only name / Standard / Active; Valid From reads "In 5 days" | add description and validity window; absolute dates for validity | managers | `pb-01`, `pb-13` |
| S13 | Record pages (quote, product, price book) | admin's More actions has no Delete; delete only from the list row menu | Delete in More actions for those allowed | admins | `pb-22-*` |
| S14 | Setup → Packaged Automation | scheduled flows can't be run on demand, so an admin cannot check quote/contract expiry or the forecast snapshot | a "Run now" for admins | admins, testers | `quo-40` |
| S15 | Price book entry form | no reference to the catalogue price | show the product's list price beside the entry price | managers | `pb-14-partner-entry-filled` |
| S16 | Contracts | gantt opens at Day zoom with multi-year terms and a "Task Name" column; Renewal Calendar opens on an empty month; title is the bare number "CTR-0005" | Month/Quarter zoom and "Contract" column; open on the next renewal; title with the account name | contract admins | `con-01-view2..3`, `con-02` |
| S17 | Forecast list | double grouping (Period Start "Oct 1" then "Oct 2026"), each with one row; new manual forecast defaults Source "Scheduled snapshot"; validation messages joined as "….; …" | group by period label only; default Source Manual entry for a person; separate messages | managers | `fct-01-mgr-view1`, `fct-10`, `fct-11` |
| S18 | Dashboards | Win/Loss tables cut the last column; the tallest Top Products bar loses its value label; bar labels unformatted (174000); "Top Products" says revenue but sums catalogue list prices; Revenue Trend skips months with no revenue | fit tables; format labels; retitle the tile "List price by category"; plot empty months as 0 | managers, executives | `fct-20-*` |

| S19 | Opportunity under approval | Generate Quote stays the primary button while the record is locked; Recall / Reply float in a bar above the title | demote actions that cannot run while locked; put Recall / Reply beside the lock badge | reps | `apr-11` |
| S20 | Rescue approver | the admin's inbox row and notice look like any other request; nothing says the Sales Director bench is empty | label rescue requests ("no one holds Sales Director") with a link to the position | admins | `apr-22`, `apr-23` |
| S21 | Decision notices | each decision sends two notices (the platform's "Request approved" and the flow's "Deal approved") | keep one | reps | `apr-14`, `apr-25` |
| S22 | Phone width | quote cards show no Total Price; record titles clip mid-word without an ellipsis; dashboard axis labels truncate ("Prospect…") | add total to the card; wrap or ellipsize titles; shorter axis labels | reps on phones | `phone-01`, `phone-03`, `phone-10` |

## Data left by the pass

Part 1 data went with the part 1 DB (part 2 booted a fresh DB). Part 2 leaves: opportunities "QA-2320 APR Manager Tier" (approved) and "QA-2320 APR Director Tier" (rejected, then closed won by D6), account ACC-000010 "QA-2320 Approval Test Co" (approved). Part 1 had left, before the DB was replaced: opportunity "QA-2320 Revenue Journey" (closed won), quotes QTE-0007 (accepted) and QTE-0008 (draft, back-dated), contracts CTR-0005 (draft) and CTR-0006 (terminated), forecast "Q4 2026" for Nina Reyes, Globex Industries type changed prospect→customer by CTR-0006's activation. Removed: product PRD-0014, price book "QA-2320 Partner" and its entry. All on the local dev DB only.
