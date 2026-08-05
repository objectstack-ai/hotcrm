# RC1ACC-W1 — HotCRM 17.0.0-rc.2 acceptance, WRITE phase

Executor: **W1**. Scope: full CRUD over all 17 CRM objects (REST primary, console UI secondary) plus
targeted checks C1–C6.

- Server: `http://localhost:4001` (already running; never restarted).
- Evidence: `results.json`, `results_phase2.json` (every REST call with status + body),
  `ui_forms_results.json`, `deletes.json`, `shots/*.png` (77 screenshots), `LEDGER.md`.
- Data isolation: every record prefixed `RC1ACC-W1-`. **0 leftovers**, **no seeded record touched**.

---

## 1. Per-object CRUD matrix

REST = `POST/GET/PATCH/DELETE /api/v1/data/<object>`. "UI form" = console New form.

| Object | POST | GET | PATCH | DELETE | UI form | Verdict | Evidence |
|---|---|---|---|---|---|---|---|
| crm_account | 201 | 200 | 200 | 200 | **201** | 通过 | `C0nPYZmo0VY1XZ1q`; UI create `xr_uuhWHBy20Yl-A`; 2nd UI attempt correctly 409 `UNIQUE_VIOLATION` on duplicate name |
| crm_contact | 201 | 200 | 200 | 200 | n/t | 通过 | `QpQV0XJFcR1WkU7A`; requires masterDetail parent `crm_account` (see NEW-4) |
| crm_lead | 201 | 200 | 200 | 200 | **failed** | 失败 (UI) / 通过 (REST) | REST `DAZbCqzw-wxQwV2T` clean; **UI New form cannot be submitted at all** → NEW-1 |
| crm_opportunity | 201 | 200 | 200 | 200 | **201** | 通过 | `x-OZsTliHqIUeSjh`; UI `M5zWCn0cfE7HgseX`; C1 + C4 both pass |
| crm_product | 201 | 200 | 200 | 200 | n/t | 通过 | `FC-tjJLj_3wvPLId` |
| crm_quote | 201 | 200 | 200 | 200 | n/t | 通过 | `61XYdhuseVfTikfL`; rollup verified (C5) |
| crm_contract | 201 | 200 | 200 | 200 | partial | 通过 (REST) / 阻塞 (UI) | `Jf7e0OOFRfm-g2gg`; UI create not completed — my driver failed to reach `Status` on the Parties tab. Validation + cross-tab behaviour fully captured (C2) |
| crm_case | 201 | 200 | 200 | 200 | **201** | 通过 | `XDtvf66Sf3ge5zZb`; UI `J2RCLvqD1bFUHv5w` |
| crm_campaign | 201 | 200 | 200 | 200 | n/t | 通过 | `KUTaiMnn-oYO9rcO` |
| crm_forecast | **400 → 201** | 200 | 200 | 200 | n/t | 通过 (with note) | First POST 400 `INVALID_FIELD` for `name` — correct, object has no `name` column (nameField is the `display_title` formula). Retry without `name` → 201 `HPj0OVb3sckgicFh`. See NEW-2 |
| crm_knowledge_article | 201 | 200 | 200 | 200 | n/t | 通过 | `eCH1gIWCmOpDDZZK` |
| crm_task | 201 | 200 | 200 | 200 | n/t | 通过 | `MI_idX5qwudf7xT2` |
| crm_event | 201 | 200 | 200 | 200 | **201** | 通过 | `5iaCvHN1DccFu0bG`; UI `jLfNMx5361zHbj_1`; C6 unblocks R1 |
| crm_event_attendee | 201 | 200 | 200 | 200 | n/t | 通过 | `oitrSpODtdT2xeLq` (EA-00001); C6 |
| crm_opportunity_line_item | 201 | 200 | 200 | 200 | n/t | 通过 | `AI0J0WMC_mc9h_5L`, `XJ1GzZGM-83omZBV`; rollup verified (C5) |
| crm_quote_line_item | 201 | 200 | 200 | 200 | n/t | 通过 | `N5F0MwLxnPObA1qC`; rollup verified (C5) |
| crm_campaign_member | 201 | 200 | 200 | 200 | n/t | 通过 | `_cDCxbMUxtUk716-` (CM-00001) |

**REST layer: 17/17 objects pass full C-R-U-D.** No object failed a REST create, read, update or delete
(the single forecast 400 was a correct rejection of a field that does not exist).

UI forms exercised: crm_account, crm_opportunity, crm_case, crm_event (all created successfully),
crm_lead (**blocked**, NEW-1), crm_contract (validation + tab behaviour captured; create not completed —
test-driver limitation, not a product failure).

---

## 2. Targeted checks

### C1 — opportunity hook derivation — 通过

| Step | Call | Result |
|---|---|---|
| Create `stage=proposal, amount=10000` | POST 201 | `probability=60`, `expected_revenue=6000`, `forecast_category=commit`, `stage_entry_date=2026-08-05` |
| Close **without** `win_reason` | PATCH **400** | `{"error":"Win Reason is required","code":"VALIDATION_FAILED","fields":[{"field":"win_reason","code":"required"}]}` |
| Close **with** `win_reason=best_fit` | PATCH 200 | `probability=100`, `expected_revenue=10000`, `forecast_category=closed`, `close_date=2026-08-05` (stamped) |

All derivations correct. The e2e suite's claim that an unreasoned close is rejected is confirmed at the
REST layer. Probability tracks stage as the single source of truth; `close_date` is stamped on
`closed_won` as documented in `opportunity.hook.ts`.

### C2 — multi-tab case form (#525 signal) — 通过, and the original repro is NOT constructible

**Current crm_case New-form layout** (tabs from `role=tab`, fields by visibility per tab):

| Tab | Fields | Required fields |
|---|---|---|
| **Case** (tab 1) | Case Number, Subject\*, Account\*, Contact, Status\*, Priority\*, Case Origin, Case Owner, Description\* | **all 5** |
| **SLA** (tab 2) | Created Date, First Response Date, SLA Due Date, Resolution Time (Hours), SLA Violated, Escalated, Escalation Reason, Parent Case | none |
| **Resolution** (tab 3) | Resolution, Internal Notes, Customer Satisfaction, Customer Feedback, Customer Signature, Closed Date, Is Closed | none |

**Every required field lives on tab 1.** This confirms the retest playbook's note that #515 moved
`description` to tab 1. A cross-tab required-field failure therefore **cannot be constructed on
crm_case** on current main — stated explicitly as instructed, rather than forced.

I still ran the value-preservation half of #525 on crm_case, and then found the **cross-tab layout does
still exist on crm_contract**, so I ran the real repro there:

**crm_contract New form** — required fields genuinely split across two tabs:

| Tab | Required fields |
|---|---|
| **Parties** (tab 1) | Account\*, Primary Contact\*, Status\* |
| **Terms** (tab 2) | Contract Term (Months)\*, Start Date\*, End Date\*, Contract Value\* |
| Signing & Documents | none |
| Notes | none |

Experiment (screenshots `uif2-contract-before-fail` → `uif2-contract-survival`):
1. Filled `Account` + `Primary Contact` on **Parties**.
2. Filled `Special Terms` sentinel on **Notes**.
3. Submitted with the **Terms** tab required fields empty.
4. → Blocked client-side. **Zero network writes fired.** Errors: `Status is required`,
   `Contract Term (Months) is required`, `Start Date is required`, `End Date is required`,
   `Contract Value is required`.
5. Switched back to other tabs and re-read every value.

**Answer to the #525 question: filled values on other tabs DO survive the failed submit — there is no
data loss.**
- `Special Terms` (text, Notes tab) = `"RC1ACC-W1-CROSSTAB-SENTINEL"` — survived.
- The same holds on crm_case: `Internal Notes` and `Resolution` both survived a failed submit
  (`c2d-05-survival-check`).
- The underlying **lookup values also survived** — proven by the second submit, which reported *only*
  `Status is required` and did **not** re-report `Account`/`Primary Contact`.

One display-level caveat is recorded as NEW-5: the lookup **buttons** re-render showing `"Select..."`
after the failed submit even though the value is retained.

### C3 — lead conversion — 通过 (rc.0 industry mismatch is FIXED)

Ran `convert_lead` end-to-end in the UI twice. Flow: `Convert Lead` button → `Confirm Action` dialog →
`POST /api/v1/automation/lead_conversion/trigger` 200 (`status:"paused"`, screen node
`Conversion Details`) → screen submit → `.../runs/<runId>/resume` 200.

**Run 1** — lead industry `nonprofit` (label "Non-profit" — label/value divergence, exercises #626
normalized-name matching), `createOpportunity` left false:

| Assertion | Result |
|---|---|
| Lead marked converted | `status=converted`, `is_converted=true`, `converted_date=2026-08-05T02:55:55.774Z` |
| Account created | `XnswVU4p3NRlVnMg` "RC1ACC-W1-Navy Systems Corp", **`industry=nonprofit`** |
| Contact created | `wFyQmEQI49uFyp9v` "RC1ACC-W1-Grace Hopper" |
| Opportunity | not created (checkbox false) — correct for the input |
| Flow summary | `acted:5, skipped:3`, no errors in devserver.log |

**Run 2** — lead industry `media` (label "Media & Entertainment"), `createOpportunity` **ticked**:

| Assertion | Result |
|---|---|
| Lead marked converted | `is_converted=true` |
| Account | `T0zMC76xUMvcD--T` "RC1ACC-W1-Bletchley Analytics", **`industry=media`** |
| Contact | `DLYEv33yitW1UPf0` "RC1ACC-W1-Alan Turing" |
| **Opportunity** | `8uv9Mk4OrC4n_cmN` "RC1ACC-W1-Converted Opp", `amount=42000`, `stage=prospecting` |
| Flow summary | `acted:6, skipped:3` |

**Industry mapping verdict: PASS.** Both `nonprofit` and `media` — values whose display labels differ
materially from the stored value — mapped cleanly from `crm_lead.industry` onto `crm_account.industry`
with no enum error. `crm_account` accepts the same `INDUSTRY_OPTIONS` picklist as `crm_lead`. The rc.0
failure mode did not recur, and `devserver.log` contains no `lead_conversion` or industry errors.

One new defect was found in the screen-flow UI along the way — see **NEW-6** (silent no-op submit).

### C4 — kanban drag — 通过 (drag verifiable and working), but the contract board does not exist

**Part 1 — there is no contract status board.** `crm_contract` offers exactly four visualizations in
the console: **Grid, Calendar, Gantt, Timeline** (`c4-01-contract-views`). `src/views/contract.view.ts`
declares `all_contracts`, `renewal_calendar`, `contract_gantt`, `contract_timeline` — no kanban.
`grep -rn "kanban" src/views/` shows boards only on **opportunity** (`pipeline_kanban`), **task**
(`task_board`), **quote** and **knowledge_article**. So the C4 premise is not constructible for
contracts on current main. Not a regression I can attribute — just an absent view.

**Part 2 — drag itself is verifiable and works.** Ran the equivalent test on
`crm_opportunity/view/pipeline_kanban` (same dnd library, status-grouped board), dragging **my own**
card only — never a seeded record — with Playwright's real mouse API (`mouse.move` → `mouse.down` →
30 interpolated `mouse.move` steps → `mouse.up`).

| Attempt | Target | PATCH fired? | Result |
|---|---|---|---|
| 1 | dropped over Closed Lost | **yes** | `PATCH /api/v1/data/crm_opportunity/M5zWCn0cfE7HgseX` **400** `{"error":"Loss Reason is required","code":"VALIDATION_FAILED"}` — server correctly refused an unreasoned close (mirrors C1) |
| 2 | Needs Analysis column | **yes** | `PATCH ...` **200** |

Post-drag read-back of attempt 2:
`stage=needs_analysis`, `probability=40`, `expected_revenue=10000` (25000 × 40%),
`forecast_category=best_case`, `stage_entry_date=2026-08-05`.

**Verdict: kanban drag-and-drop works, fires a real PATCH, and the opportunity hook re-derives every
dependent field correctly.** rc.0's observation stands: synthetic `dispatchEvent` is ignored by the dnd
library, but the real mouse API drives it correctly — so this **is** automatable, contrary to a
"not verifiable by automation" conclusion.

### C5 — line items on parents (`controlled_by_parent`, #547 grants) — 通过

Both line-item objects create, read, update and delete cleanly with the parent lookup supplied
(`crm_opportunity`/`crm_quote` + `crm_product`). No permission error — #547's grants hold.

**Quote rollup** (`quote_total_rollup`, afterInsert/afterUpdate/afterDelete):

| Step | Parent quote |
|---|---|
| QLI created qty=2 × 500 | `subtotal=1000`, `total_price=1000`, `discount_amount=0` |
| QLI updated qty=2→4 | `subtotal=2000`, `total_price=2000` |

**Opportunity rollup** (`opportunity_amount_rollup`) — tested on an **open** deal, since the hook
deliberately skips closed deals:

| Step | Parent opportunity |
|---|---|
| Created `amount=1`, stage `qualification` | `amount=1` |
| OLI created qty=4 × 250 | `amount=1000`, `expected_revenue=250` |
| OLI updated qty=4→10 | `amount=2500`, `expected_revenue=625` |

Both rollups are declared `async: true`, so a read issued immediately after the write can observe the
pre-rollup value; re-reading after a short delay shows the settled figure. That is documented intent,
not a defect — worth knowing for other executors writing assertions.

Adding a line item to a **closed** opportunity correctly leaves `amount` untouched (the hook's
"a closed deal's value is settled" guard) — observed and confirmed against the hook source.

### C6 — crm_event / crm_event_attendee — 通过 (R1's 阻塞 is now unblocked)

Both objects had **zero** rows at start (confirms #671). Created via REST:
- `crm_event` `5iaCvHN1DccFu0bG` "RC1ACC-W1-Discovery Call" (POST 201)
- `crm_event_attendee` `oitrSpODtdT2xeLq` EA-00001 (POST 201), linked to the event + a contact

Both **detail pages render correctly**:
- `shots/c6-02-event-detail.png` — title, Event Type / Status / Start / Assigned To highlight strip,
  a working status path control (Planned → Held → Cancelled → No Show), Details + Related(1) tabs,
  Event Information, Schedule, Related Records (resolved to "ACC-000002 - RC1ACC-W1-Acme Industrial"),
  Owner, and the Discussion feed.
- `shots/c6-04-attendee-detail.png` — EA-00001, Event / Attendee Type / Response / Organizer strip,
  Attendee panel with the contact resolved to "RC1ACC-W1-Ada Lovelace", and a Discussion feed showing
  the field-history entry `Response: No Response → Accepted`.

List pages for both objects also render (`c6-01`, `c6-03`). A `crm_event` record was additionally
created through the console **New form** (`jLfNMx5361zHbj_1`, POST 201) — the event UI form works.

**R1 should re-run its event/event_attendee detail-page checks: the pages are sound; the blocker was
purely the absence of seed rows (#671), not a page defect.** Note both objects are back to 0 rows after
my cleanup, so R1 will need to create a row again (or #671 should be fixed with seeds).

---

## 3. Suspected NEW findings

### NEW-1 — `visibleOn` is ignored on console form fields, making crm_lead impossible to create in the UI — **HIGH**

**Reproduction**
1. Console → HotCRM → Leads → **New**.
2. Fill First Name, Last Name, Company, Email; set Status = New.
3. Click **Create**.

**Observed** — submit is blocked with five errors for fields that should not apply to a brand-new lead:
`Disqualification Reason is required`, `Duplicate Of is required`, `Duplicate Of Lead is required`,
`Duplicate Of Contact is required`, `Duplicate Status is required`. All five render on the form with a
red required asterisk. Screenshot: `shots/uif-crm_lead-02-after-submit.png`. Zero network writes fire.
The form even prints its own helper text **"Required when status is Unqualified"** directly above the
error **"Disqualification Reason is required"** — self-contradictory on screen.

**There is no way to satisfy the form**: it demands the new lead be declared a duplicate of *both* an
existing lead *and* an existing contact simultaneously — mutually exclusive by design
(`duplicate_of_lead` and `duplicate_of_contact` are gated on `duplicate_of_type` being one or the other).
**crm_lead cannot be created through the console at all.** REST creation is unaffected (201).

**Attribution: PLATFORM (console form renderer).** The CRM metadata is correct. Every one of the five
fields is declared in `src/views/lead.view.ts` with a `visibleOn` predicate that is false for a new lead:

```ts
// src/views/lead.view.ts
{ field: 'disqualification_reason', required: true, visibleOn: 'status == "unqualified"' },
// DUPLICATE_LINK_FIELDS:
{ field: 'duplicate_of_type',    required: true, visibleOn: 'disqualification_reason == "duplicate"' },
{ field: 'duplicate_of_lead',    required: true, visibleOn: 'duplicate_of_type == "crm_lead"' },
{ field: 'duplicate_of_contact', required: true, visibleOn: 'duplicate_of_type == "crm_contact"' },
{ field: 'duplicate_status',     required: true, visibleOn: 'disqualification_reason == "duplicate"' },
```

The renderer displays these fields when their `visibleOn` is false **and** enforces their `required: true`.
The object-level counterparts use `requiredWhen` predicates (`lead.object.ts:369,375`) and are correctly
*not* enforced by the server. So: server honours the condition, form does not.

Likely the single highest-impact UI defect in this run — it blocks the primary "new lead" path, which is
the app's headline demo flow.

### NEW-2 — `crm_forecast.display_title` (the object's own `nameField`) evaluates to `null` for every row — **MEDIUM**

**Reproduction**
```
GET /api/v1/data/crm_forecast
```
Every row — my created row **and all 8 seeded rows** — returns `display_title: null`, while
`period_label` and `period_start` are both populated:
```
{'id':'-kN4v3de7J32S1B0','period_label':'Q3 2026','period_start':'2026-07-01','display_title':None}
{'id':'CJpIhxXM5hq7-Dbq','period_label':'Aug 2026','period_start':'2026-08-01','display_title':None}
```
Mine: `period_label='RC1ACC-W1-Q3 2026'`, `period_start='2026-08-05'` → `display_title=None`.

`forecast.object.ts` sets `nameField: 'display_title'` with
``expression: F`record.period_label + " (" + text(record.period_start) + ")"` ``.

**Contrast** — other formula fields evaluate fine:
`crm_contact.full_name` = `"RC1ACC-W1-Ada Lovelace"`, `crm_lead.full_name` = `"RC1ACC-W1-Grace Hopper"`,
`crm_opportunity.days_in_stage` = `0`.

The distinguishing feature of the failing expression is the **`text()` coercion of a `date` field**;
the working ones concatenate text or compute numerics. Suspected: `text()` over a date returns
null/undefined and poisons the whole concatenation.

**Attribution: likely PLATFORM (formula engine `text()` on a date operand).** Consequence is
user-visible — forecast records have no resolvable record title anywhere the nameField is used.
Not fully isolated; a one-line formula unit test would settle it.

### NEW-3 — misleading error text and object name when a cascade-blocked delete fails — **LOW**

**Reproduction** (converted-lead chain still intact)
1. `DELETE /api/v1/data/crm_opportunity/<converted opportunity id>` →
   **400** `"Cannot edit a converted lead (attempted: converted_opportunity). Make changes on the converted record…"`
   — deleting an *opportunity* reports a *lead* edit error.
2. `DELETE /api/v1/data/crm_account/<converted account id>` →
   **400** `"Cannot delete contact: still referenced by 1 open opportunity(ies), 0 active quote(s), 0 active contract(s)"`
   — deleting an **account** reports **"Cannot delete contact"**. The object name in the message is
   simply wrong (it is the cascade child's guard message surfacing unmodified).

All three succeeded on retry once the chain was torn down in the right order, so this is cosmetic —
but the account message names the wrong object, which will send people down the wrong path.
**Attribution: CRM (hook/guard messages in `lead.hook.ts` / `contact.hook.ts`) surfaced verbatim by the
platform's cascade layer.**

### NEW-4 — missing required master-detail parent returns 403 PERMISSION_DENIED, not a 400 required-field error — **LOW**

**Reproduction**
```
POST /api/v1/data/crm_contact {"first_name":"X","last_name":"Y","email":"x@example.com"}
```
→ **403** `{"error":"[Security] Access denied: insert on 'crm_contact' requires edit access to its master record (detail record has no master reference)","code":"PERMISSION_DENIED"}`

`crm_contact.crm_account` is `Field.masterDetail('crm_account', { required: true, … })`, so the record is
genuinely invalid — but the response presents a **validation** problem as a **security** problem.
Every other missing-required-field case in this run returned a clean
`400 VALIDATION_FAILED` with a `fields[]` array (e.g. win_reason in C1, `name` on forecast).
A UI or integration mapping 403 → "you lack permission" will mislead the user.
**Attribution: PLATFORM (master-detail insert guard runs before required-field validation).**

### NEW-5 — lookup fields re-render as "Select..." after a failed form submit although the value is retained — **LOW/MEDIUM (cosmetic but alarming)**

**Reproduction**
1. Console → Contracts → **New**.
2. On **Parties**, pick Account and Primary Contact via the lookup pickers.
3. Fill something on another tab; submit with the **Terms** tab required fields empty → validation fails.
4. Return to **Parties**.

**Observed** — both lookup buttons display `"Select..."` as if cleared
(`shots/uif2-contract-survival.png`), while plain text fields on other tabs keep their values.

**The data is NOT lost** — the very next submit reported only `Status is required` and did **not**
re-report `Account`/`Primary Contact`, proving the form state still held both references. So this is a
**display regression in the lookup control after re-mount**, not data loss. It nonetheless reads as data
loss to a user, who will re-pick the values.
**Attribution: PLATFORM (console lookup widget loses its display label on re-mount; value survives).**

### NEW-6 — screen-flow submit is a silent no-op when a conditionally-revealed required field is empty — **MEDIUM**

**Reproduction**
1. Open any qualified lead → **Convert Lead** → **Continue**.
2. On the `Conversion Details` screen, tick **Create Opportunity?**. This reveals two new fields:
   **Opportunity Name \*** (required) and **Opportunity Amount**.
3. Leave **Opportunity Name** empty and click **Submit**.

**Observed** — nothing happens. Measured over 15 s: **0 `resume` requests**, **0 visible error messages**
(`c3f-03-silent-noop.png`), dialog stays open, no field highlight, no toast. The user has no indication
why Submit does nothing. Filling Opportunity Name and resubmitting works immediately
(`POST .../runs/<id>/resume` **200**, `acted:6`).

This cost real diagnosis time — my first two conversion attempts appeared to "hang" and the lead stayed
unconverted with no error anywhere, including the server log.
**Attribution: PLATFORM (screen-flow renderer suppresses required-field validation feedback).**
Distinct from NEW-1: here the conditional reveal works correctly, but the validation message is missing.

---

## 4. Known open issues — behaviour observed

| Issue | Match? | Note |
|---|---|---|
| **#620** `owner` `cel os.user.id` default fails to evaluate | matches | Warnings present throughout the run; `owner` still resolved to the acting user on every object I created, so no functional impact observed in this phase |
| **#617** hooks run over seed rows | matches | `case_escalation` `runAs:'user'` REFUSED errors are in the log from boot, unrelated to my writes |
| **#650** decision-node singular condition inert | not exercised | The lead_conversion flow's decision path behaved correctly for both branches (opportunity created only when requested) |
| **#664** address fields render as raw JSON | matches | `billing_address` returns as a JSON blob; contract form exposes flattened Street/City/State/ZIP/Country alongside a "Billing Address" field |
| **#671** crm_event has no seeds | **confirmed** | `crm_event` and `crm_event_attendee` both had 0 rows at start. C6 created rows, proved the pages work, then removed them — **so the condition is back**. Recommend seeding both objects |

Not re-filed, per instructions.

## 5. Notes for other executors

- Account **name uniqueness IS enforced** (`409 UNIQUE_VIOLATION` on a duplicate name), despite the
  comment in `account.object.ts` saying `account_name_unique` was removed in 7.6 — a normalized-name
  unique index (`name_normalized`) appears to still be live. Behaviour is correct; only the comment is stale.
- Both line-item rollups are **async** — do not assert parent totals in the same tick as the child write.
- The console SPA needs ~8–10 s on first navigation; shorter waits produce a false
  "no New button on the list page" reading. I hit this and it was a test artifact, not a defect.
- The console form dialog is itself `[role="dialog"]`; lookup pickers open as a **second** dialog.
  Target `.last()`.
