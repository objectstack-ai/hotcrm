# Module split — the hard-edge ledger

Every reference from the app package (`src/sales/`, `objectstack.composition.ts`) to an item a module
package owns, each measured on a booted stack with that module absent. This is unlock condition (c) of
`module-split-plan.md` item 13: "the hard-edge ledger — every app → module reference listed with its
destination, measured on a booted stack with the module absent, platform refusals filed upstream (⛔ no
existence guard, try/catch or copied dataset in this repository)." It is what #2271 (revenue leaves the
artifact) and the marketing carve-out read before they move anything.

Measured 2026-10-27 on `main` `ea567f2` (revenue also on `afdf9a0`), `@objectstack/*` 18.2.0, a fresh
database for every boot (`objectstack dev --fresh`), dev admin.

## The headline

**A module-absent install does not boot today, for any of the three modules.** The dispatch assumed
removing one module stack from the composition would still let `pnpm dev` start (#2311 mechanism
assumption 1). It does not: `objectstack dev` compiles first, and the compile stops at two gates before
any server starts —

1. **G1 · `defineStack` cross-reference** — every app permission set that grants on a module object
   ("Permission 'sales_rep' grants on object 'crm_quote' which is not defined in objects."), plus, once
   the app-registered module flows go with their module, every `type: 'flow'` action that launches one.
2. **G2 · author-time rules** (`os validate`, which `objectstack dev` also runs; "✗ Compile failed —
   fix errors above before starting dev server") — `translation-target-unknown` on the app's whole
   locale packs, and `object-reference-unknown` / `widget-dataset-unknown` / `action-name-undefined` on
   lookups, action params, datasets, dashboard widgets and action menus that name module items.

Behind those gates sit the runtime rows: once the scratch tree peels the G1/G2 referrers away, all three
shapes boot and seed, and the app's hooks, flows and record pages meet the absent module at run time.

## How a row was measured

Nothing in this file required a change under `src/`. A **local scratch commit, never pushed**, adds an
absence knob to `objectstack.composition.ts` (the patch is kept outside the repository, in the project's
shared files as `issue-2311-ledger/scratch-knob.patch`):

| Knob | Effect |
|---|---|
| `HOTCRM_ABSENT=<revenue\|marketing\|service>` | drops that module stack from `moduleStacks`, so from `packageStacks` and from the app's `artifactObjects` |
| `HOTCRM_ABSENT_ITEMS=1` | also drops that module's entries from `appRegisteredModuleItems` |

Two shapes per module: **A** = the module stack absent, `appRegisteredModuleItems` as today; **B** = the
module stack absent together with its app-registered items (the shape after objectstack#25514 sends
them home). Revenue and marketing were run in both; service has no app-registered item. Since #2276 the
four items register with their module and `appRegisteredModuleItems` is gone, so **B** is the shape of
`main`; the shape-A rows stay as measured.

A gate reports everything at its own level and nothing beyond, so later rows are reached by **peeling**:
the scratch tree removes the referrers whose refusal is already recorded, and the next gate shows. Each
row names the peel that made it reachable.

| Peel | What the scratch tree removes | Unmasks |
|---|---|---|
| P0 | nothing | G1 |
| P1 `perms` | grants (object and field level) on the absent module's objects | G2 |
| P2 `i18n` | locale-pack keys under `objects`/`flows`/`dashboards`/`reports` naming absent items, and `apps.crm_enterprise.navigation` keys the absent module contributes | the non-translation G2 rows |
| P3 `refs` | actions whose flow target or `objectOverride` is absent, datasets on an absent object, widgets on a dropped dataset, those actions' names in page/view action menus and their locale keys; a lookup to an absent object is **demoted to a text column** (so the validations, hooks and labels naming the field stay resolvable) | G4, the boot |

Commands, all from the scratch worktree:

```sh
HOTCRM_ABSENT=revenue HOTCRM_ABSENT_ITEMS=0 HOTCRM_PEEL=perms,i18n pnpm validate      # one gate at a time
HOTCRM_ABSENT=revenue HOTCRM_ABSENT_ITEMS=0 HOTCRM_PEEL=perms,i18n,refs \
  npx objectstack dev -p 4001 --no-watch --fresh                                      # the boot
curl -c jar -X POST localhost:4001/api/v1/auth/sign-in/email \
  -d '{"email":"admin@objectos.ai","password":"admin123"}' -H 'content-type: application/json'
```

Run-time rows were then probed over `/api/v1/…` with that cookie and in the console with Playwright
(Chromium, 1440×1000). A screen-flow action runs as `POST /api/v1/actions/OBJECT/ACTION/ID` (returns the
paused screen) followed by `POST /api/v1/automation/FLOW/runs/RUN/resume` with `{"inputs":{…}}`.

**Control leg** (no module absent, same tree, fresh DB): `pnpm validate` exit 0; the boot log carries no
"Object '…' not found" line and no `campaign_attribution_refresh` error; deleting a fresh contact answers
`200 {"success":true}`; closing *Lattice Student Success Platform* as won runs
`billing_handoff_closed_won` to `completed`. Every failure below is therefore the absence, not the tree.

## Gate summary

| Shape | G1 (P0) | G2 (P1) | after P2 | after P3 | Boot |
|---|---|---|---|---|---|
| revenue A | exit 1, 20 issues | exit 1, 34 | exit 1, 1 (`product_metrics`) | exit 0 | boots, seeds |
| revenue B | exit 1, 21 | — (G1 holds: `generate_quote`) | — | exit 0 | — |
| marketing A | exit 1, 9 | exit 1, 19 | exit 1, 5 | exit 0 | boots, seeds |
| marketing B | exit 1, 11 | — (G1 holds: two enroll actions) | — | exit 0 | — |
| service | exit 1, 16 | exit 1, 57 | exit 1, 2 | exit 0 | boots, seeds |

## Resolution vocabulary

- **move** — fixed inside this repository by moving or re-registering an item into the package that owns
  its target. No platform change needed.
- **#25514** — already covered: the app-registered module items return to their module once a published
  platform release carries objectstack#25514. **resolved (#2276)** marks a row that card closed: 18.2.0
  carries the fix and the items register with their module.
- **platform** — the platform refuses or breaks, and nothing this repository may write (no guard, no
  try/catch, no copy) fixes it. The letter names the upstream finding listed at the end; the seat files
  it, and it gates #2271 with a `Blocked-by:` line where marked.
- **tolerated** — the platform copes; the row stays, with what a user sees.
- **dormant** — the code path cannot be reached once the gating row's resolution lands.
- **resolved by move** — same-package since an earlier card.

## Rows — revenue absent

| # | Reference | Target | Peel | Measured with revenue absent | Resolution |
|---|---|---|---|---|---|
| R1 | `src/sales/profiles/sales-rep.profile.ts:60…` | `crm_quote`, `crm_product`, `crm_price_book`, `crm_price_book_entry`, `crm_opportunity_line_item`, `crm_quote_line_item` | P0 | G1: "Permission 'sales_rep' grants on object 'crm_quote' which is not defined in objects." ×6 | platform **F1** (gates #2271) |
| R2 | `src/sales/profiles/sales-manager.profile.ts` | the same six | P0 | G1 ×6 | platform **F1** |
| R3 | `src/sales/profiles/system-admin.profile.ts` | the same six | P0 | G1 ×6 | platform **F1** |
| R4 | `src/sales/profiles/crm-user.profile.ts` | `crm_product` | P0 | G1 ×1 | platform **F1** |
| R5 | `src/sales/profiles/service-agent.profile.ts` | `crm_product` | P0 | G1 ×1 | platform **F1** |
| R6 | `src/sales/translations/{en,zh-CN,es-ES,ja-JP}.ts:66–69,76–77` → `*/objects.commerce.ts`, `*/objects.pipeline.ts` | the six revenue objects | P1 | G2 `translation-target-unknown` at `translations[0].LOCALE.objects.crm_quote` …, 6 objects × 4 locales = 24 | **move** — the per-domain object packs register with the revenue package |
| R7 | `src/sales/translations/zh-CN/app.ts:49–52` (and the es-ES, ja-JP twins) | contributed nav ids `nav_quote`, `nav_product`, `nav_price_book` | P1 | G2 `translation-target-unknown` at `apps.crm_enterprise.navigation.nav_quote` …, 3 ids × 3 locales = 9 | **move** — a contributing package translates its own contributed ids (`os explain translation-target-unknown`) |
| R8 | `objectstack.composition.ts:201` `appRegisteredModuleItems.datasets` → `ProductDataset` | dataset `product_metrics` on `crm_product` | A, P2 | G2 `object-reference-unknown` at `datasets[7].object`: "dataset base object "crm_product" resolves to no object defined in this stack" | **resolved (#2276)** — `product_metrics` registers with revenue and leaves with it; R9 remains |
| R9 | `src/sales/dashboards/crm.dashboard.ts:150` `top_products` widget | dataset `product_metrics` | B (or A, P3) | G2 `widget-dataset-unknown` at `dashboards[1].widgets[7]`: "dataset "product_metrics" does not resolve to a declared dataset" | platform **F4** (gates #2271) |
| R10 | `src/sales/translations/*/app.ts` `dashboards.crm_overview_dashboard.widgets.top_products` (en `:88`, zh-CN `:142`) | the widget above | A/B, P3 | G2 `translation-target-unknown` ×4 once the widget is gone | follows R9 |
| R11 | `src/sales/actions/opportunity.actions.ts:234` `generate_quote` (`type: 'flow'`) | flow `quote_generation` | B, P1 | G1: "Action 'generate_quote' references flow 'quote_generation' which is not defined in flows." | platform **F3** (gates #2271) |
| R12 | the same action, shape A | `quote_generation` still app-registered, writes `crm_quote` | A, P3 | boots; the *Generate Quote* header button draws on an open opportunity; `POST /api/v1/actions/crm_opportunity/generate_quote/ID` → 200 paused on *Quote Details*; resume → **400** `FLOW_FAILED` "Node 'create_quote' failed: create_record(crm_quote) failed: Object 'crm_quote' not found" | **resolved (#2276)** — `quote_generation` registers with revenue, so with revenue absent the action meets R11 |
| R13 | `src/sales/pages/opportunity_detail.page.ts:64` header action list | action `generate_quote` | B, P3 | G2 `action-name-undefined` at `pages[3]…properties.actions[0]`: "names action "generate_quote", which no action in this stack defines" | follows R11 |
| R14 | `src/sales/translations/*` `objects.crm_opportunity._actions.generate_quote`, `flows.quote_generation` (zh-CN `app.ts:780`) | the action and flow | B, P3 | G2 `translation-target-unknown` ×7 | follows R11 / **move** |
| R15 | `src/sales/objects/contact.hook.ts:146` `beforeDelete` counts open `crm_quote` | `crm_quote` | A, P3 | **every** `DELETE /api/v1/data/crm_contact/ID` → **404** `OBJECT_NOT_FOUND` "Object 'crm_quote' not found"; the contact stays. Control: 200 | platform **F5** (gates #2271) |
| R16 | `src/sales/flows/billing-handoff-closed-won.flow.ts:132` `load_line_items` | `crm_opportunity_line_item` | A, P3 | `PATCH crm_opportunity` to `closed_won` → 200; the run **fails**: "get_record(crm_opportunity_line_item) failed: Object 'crm_opportunity_line_item' not found"; boot log `ERROR Trigger-fired run … failed … nothing retries the run`; no hand-off sent. Control: `completed` | platform **F6** (gates #2271) |
| R17 | `src/sales/flows/billing-handoff-contract-activated.flow.ts:132` `load_line_items` | `crm_opportunity_line_item` | A, P3 | `PATCH crm_contract` CTR-0002 to `activated` → 200; the run **fails** with the same message | platform **F6** |
| R18 | `src/sales/pages/opportunity_detail.page.ts:250` (`opp_quotes`), `:265` (`opp_products`, picker `crm_product` `:335`), `:491–496` (rail) | `crm_quote`, `crm_opportunity_line_item`, `crm_product` | A, P3 | the page renders; *Related* shows **"Crm Quote 0 — No related records found"**; the rail reads **"+3 empty (Crm Quote · Crm Opportunity Lin…)"**; 8× 404 on `/api/v1/meta/object/…` and `/api/v1/data/…` | **tolerated**; the humanized raw names are platform **F8** |
| R19 | `src/sales/objects/account.hook.ts:242`, `contact.hook.ts:149` `crm_contract` counts | `crm_contract` | — | same package since #2310 (#2323) | **resolved by move** |
| R20 | `src/sales/flows/_billing-endpoint.ts:116,121` `'crm_product'`, `'discount'` | payload field names of R16/R17 | — | part of the payload R16/R17 never reach | **dormant** behind R16 |

## Rows — marketing absent

| # | Reference | Target | Peel | Measured with marketing absent | Resolution |
|---|---|---|---|---|---|
| M1 | `src/sales/profiles/{marketing-user,sales-manager,sales-rep,system-admin}.profile.ts` | `crm_campaign`, `crm_campaign_member` | P0 | G1 ×8 | platform **F1** |
| M2 | `src/sales/profiles/crm-user.profile.ts` | `crm_campaign` | P0 | G1 ×1 | platform **F1** |
| M3 | `src/sales/translations/*.ts:71,75` → `*/objects.marketing.ts:20…` | `crm_campaign`, `crm_campaign_member` | P1 | G2 `translation-target-unknown` ×8 | **move** |
| M4 | `src/sales/translations/*/app.ts` `navigation.nav_campaign` (zh-CN `:63`), `flows.campaign_enrollment` (es-ES `:658`) | contributed nav id, marketing flow | P1 | G2 ×6 | **move** |
| M5 | `src/sales/objects/opportunity.object.ts:360` `crm_campaign: Field.lookup('crm_campaign')` | `crm_campaign` | P2 | G2 `object-reference-unknown` at `objects[7].fields.crm_campaign.reference` | platform **F2** |
| M6 | `src/sales/actions/lead.actions.ts:215`, `contact.actions.ts:102` `objectOverride: 'crm_campaign_member'` (stack actions and their object-embedded copies) | `crm_campaign_member` | A, P2 | G2 `object-reference-unknown` at `actions[3]…objectOverride`, `actions[10]…`, `objects[1].actions[0]…`, `objects[6].actions[1]…` ×4 | platform **F3** |
| M7 | `src/sales/actions/lead.actions.ts:184` `create_campaign`, `contact.actions.ts:82` `add_contact_to_campaign` (`type: 'flow'`) | flows `campaign_lead_member_enroll`, `campaign_contact_member_enroll` | B, P1 | G1: "Action 'create_campaign' references flow 'campaign_lead_member_enroll' which is not defined in flows." ×2 | platform **F3** |
| M8 | `src/sales/views/lead.view.ts:223`, `contact.view.ts:50` `bulkActions` | the two actions | P3 | G2 `action-name-undefined` at `views[6].list.bulkActions[0]`, `views[1]…`: "the button does nothing when clicked" | follows M6/M7 |
| M9 | `src/sales/translations/*` `objects.crm_lead._actions.create_campaign`, `objects.crm_contact._actions.add_contact_to_campaign`, `objects.crm_opportunity.fields.crm_campaign` (en `objects.pipeline.ts:233`) | the actions and the lookup | P3 | G2 `translation-target-unknown` ×12 | follows M5–M7 |
| M10 | `src/sales/objects/opportunity.campaign-metrics.hook.ts:81,98` `campaign_attribution_refresh` (afterInsert/Update/Delete on `crm_opportunity`) | `crm_campaign_member`, `crm_campaign` | A, P3 | **every** opportunity write logs `ERROR [hook] handler failed (onError=log; suppressing) … Object 'crm_campaign_member' not found` — 11 times during the seed alone; `PATCH crm_opportunity` (`next_step`) → **200**, the error logged again. Control: none | platform **F5** |
| M11 | `src/sales/objects/lead.campaign-metrics.hook.ts:86,93,120` `campaign_lead_conversion_refresh` (afterUpdate, on conversion) | `crm_campaign_member`, `crm_campaign` | A, P3 | *Convert Lead* on CloudFirst Inc (`POST …/actions/crm_lead/convert_lead/ID`, resume `createOpportunity: false`) → **200**, lead `converted`; boot log `ERROR … 'campaign_lead_conversion_refresh' threw: Error: Object 'crm_campaign_member' not found` | platform **F5** |
| M12 | `src/sales/pages/lead_detail.page.ts:548` related list | `crm_campaign_member` | A, P3 | the lead page renders; *Related* → *Campaign Members* shows **"Crm Campaign Member 0 — No related records found"**; 5× 404 and a console error `[useSettledSchema] getObjectSchema failed for crm_campaign_member MetadataNotFoundError` | **tolerated**; label is platform **F8** |
| M13 | `src/sales/data/sales.seed.ts:1032,1048,1064,1212,1258` `crm_campaign` natural keys; `src/sales/actions/opportunity.actions.ts:58` clone copies `crm_campaign`; `src/sales/views/opportunity.view.ts:416` column; `src/sales/objects/opportunity.hook.ts:235` reference-field set | the M5 lookup | P3 | not reachable on a real install: M5 refuses first; under the P3 demotion the seed stores the campaign's name as text | **dormant** behind M5 |

## Rows — service absent

| # | Reference | Target | Peel | Measured with service absent | Resolution |
|---|---|---|---|---|---|
| S1 | `src/sales/profiles/{sales-manager,sales-rep,service-agent,system-admin}.profile.ts` | `crm_case`, `crm_article_feedback`, `crm_knowledge_article` | P0 | G1 ×12 | platform **F1** |
| S2 | `src/sales/profiles/{crm-user,guest-portal,marketing-user}.profile.ts` | `crm_knowledge_article`; `crm_case`; `crm_article_feedback` + `crm_knowledge_article` | P0 | G1 ×4 | platform **F1** |
| S3 | `src/sales/translations/*.ts:60,64,74` → `*/objects.service.ts:22…` | the three service objects | P1 | G2 `translation-target-unknown` ×12 | **move** |
| S4 | `src/sales/translations/*/app.ts` `navigation.nav_case/nav_knowledge/nav_my_cases/nav_service_dashboard/nav_report_*` (zh-CN `:59–83`), `dashboards.service_dashboard`, `reports.cases_by_status_priority/sla_performance/cases_opened_by_day_priority` (zh-CN `:868–872`), `flows.claim_case/close_case/escalate_case` (zh-CN `:696–708`) | service nav ids, dashboard, reports, flows | P1 | G2 `translation-target-unknown` ×36 | **move** |
| S5 | `src/sales/objects/task.object.ts:178`, `event.object.ts:199` `related_to_case: Field.lookup('crm_case')` | `crm_case` | P2 | G2 `object-reference-unknown` at `objects[3].fields.related_to_case.reference`, `objects[8]…` | platform **F2** |
| S6 | `crm_task` / `crm_event` `validations[related_to_required]` (reads `record.related_to_case`) | the S5 field | P3 | G2 `expression-invalid`: "unknown field `related_to_case` on `crm_event`" — only when the field is removed rather than demoted | follows S5 |
| S7 | `src/sales/translations/*` `objects.crm_task.fields.related_to_case`, `objects.crm_event.fields.related_to_case` | the S5 field | P3 | G2 `translation-target-unknown` ×8 once the field is removed | follows S5 |
| S8 | `src/sales/objects/event.hook.ts:169,246,253`, `task.hook.ts:355` (`related_to_case` → `crm_case` reads and the first-response stamp) | `crm_case` | P3 | not reachable: every path is gated on a `related_to_case` value, which no install without service can hold (S5) | **dormant** behind S5 |
| S9 | `src/sales/data/activity.seed.ts:86,188,279,326` case-linked tasks and events | `crm_case` natural keys | P3 | seeds load (7 tasks, 29 events, as with service present); under the P3 demotion the case title is stored as text, so a real install meets S5 first | **dormant** behind S5 |
| S10 | `src/sales/picklists/related_to_type.picklist.ts:29` option `crm_case` | value only | P3 | the task page shows *Related To Type* **Case**; the option is still offered with no case to link | **tolerated** (an inert option) |
| S11 | `src/sales/actions/activity-actions.ts:102` host map entry `crm_case: 'related_to_case'` | `crm_case` | P3 | the case-scoped triple is built and registered by service; with service absent nothing reads this entry | **dormant** |
| S12 | `src/sales/skills/customer-360.skill.ts:42,47` instructions name `crm_case`, `crm_knowledge_article` | the objects | P3 | the skill registers and the boot is clean; the read it tells the agent to make answers `GET /api/v1/data/crm_case` → **404** `OBJECT_NOT_FOUND` (the agent tool path itself not driven) | **tolerated** (prose; the skill says "If a section has no records, say so plainly") |
| S13 | `src/sales/apps/crm.app.ts:209` `group_service` — an empty container the module fills | service `navigationContributions` | P3 | the console sidebar draws no *Service* group at all (empty groups are not drawn); no warning | **tolerated** |

## Upstream findings (the seat files them)

Each is a platform refusal or breakage measured above. ⛔ None is worked around in this repository.

- **F1 · A module cannot add grants to the app's permission sets.** The sets are whole in the app package
  (ADR-0130 addendum 2026-09-02) and `defineStack` refuses a grant on an object the artifact does not
  carry. Rows R1–R5, M1–M2, S1–S2 (45 refusals). Needed: a module-side contribution of grants into an
  app-declared set (the permission analogue of `navigationContributions`), or grants that bind when the
  object is installed.
- **F2 · An app object cannot carry a lookup to an optional module's object.** `object-reference-unknown`
  refuses it at author time. Rows M5, S5. Needed: a module contributing a field onto an app object it
  depends on, or a lookup declared optional on its target package.
- **F3 · An app action cannot launch a module flow or create a module record.** `type: 'flow'` targets are
  checked against the app's own flows (G1) and `objectOverride` against its objects (G2). Rows R11, M6,
  M7. objectstack#25514 removes the cross-package refusal while both packages are installed; nothing yet
  covers the module being absent. Needed: module-contributed actions on app objects, or an action that
  binds only when its target is installed.
- **F4 · A dashboard widget cannot bind a module dataset.** `widget-dataset-unknown` (G2). Row R9.
  Needed: module-contributed widgets on an app dashboard, or optional widgets.
- **F5 · A guard or rollup that belongs to a module but fires on an app object has no legal home.** A hook
  may not attach to another package's object (ADR-0130 R4), so the module's checks live in app hooks
  that query module objects — and an absent object is a thrown `OBJECT_NOT_FOUND`: contact delete is
  refused outright (R15, 404) and every opportunity write and lead conversion logs a hook ERROR
  (M10, M11). Needed: a module may attach hooks to objects of the packages it depends on (the edge points
  downward), or a declarative conditional delete restriction the module states on its own lookup.
- **F6 · An app record-change flow that reads a module object fails at run time, silently to the user.**
  The write answers 200 and the run fails with no retry (R16, R17). Needed: the same answer as F5 for
  flows (a module flow on an app trigger object), or a node that skips when its object is not installed.
- **F8 · Related lists and rail entries bound to an uninstalled object draw a humanized raw name.**
  "Crm Quote", "Crm Campaign Member", "+3 empty (Crm Quote · …)" (R18, M12). The page works; the list is
  noise. Needed (objectui): hide or label the list when its object is not installed.

F7 is deliberately unused so that the letters stay stable if a finding is merged.

## What this means for #2271 and the marketing carve-out

The app cannot ship without revenue (or marketing, or service) until F1–F6 are answered on the
platform; the **move** rows (R6, R7, R14, M3, M4, S3, S4 — the per-domain locale files moving to the
package that owns their objects) are this repository's own work and can be carded now. F8 is cosmetic.
