# Module split — hard-edge ledger (DRAFT, measurement in progress)

> **Status: work in progress (#2311).** Rows marked **NOT MEASURED** have not been run yet. Do not read
> this file as complete until this banner is gone.

Every reference from the app package (`src/sales/`, `objectstack.composition.ts`) to an item a module
package owns, with what the platform does when that module is absent. Governing text:
`module-split-plan.md` item 13 (c). ⛔ No existence guard, try/catch or copied dataset in this repository:
a refusal is resolved by a move inside this repo or by a platform card.

Measured on `main` `afdf9a0`, `@objectstack/*` 18.2.0, fresh DB per boot.

## How each row was measured

A local scratch commit (never pushed) adds an absence knob to `objectstack.composition.ts`:
`HOTCRM_ABSENT=<module>` drops that module stack from `moduleStacks` (so from `packageStacks` and
`artifactObjects`); `HOTCRM_ABSENT_ITEMS=1` also drops that module's entries from
`appRegisteredModuleItems` (the shape after objectstack#25514 moves them back). Two shapes per module:

- **A** — module stack absent, `appRegisteredModuleItems` unchanged (today's registration).
- **B** — module stack absent together with its app-registered items.

The absence refuses at `defineStack` / author time, so later rows are reached by **peeling**: each
peel removes, in the scratch tree only, the referrers whose refusal is already recorded, so the
next gate becomes visible. `HOTCRM_PEEL=perms` strips grants on absent objects; `i18n` strips
locale-pack keys naming absent items; `refs` drops actions/datasets/widgets whose reference is
refused and demotes a lookup to an absent object to a text column. The patch is kept in the
project files as `issue-2311-ledger/scratch-knob.patch`.

Commands: `HOTCRM_ABSENT=… HOTCRM_ABSENT_ITEMS=… HOTCRM_PEEL=… pnpm validate`, then the same env with
`objectstack dev -p 4001 --no-watch --fresh`, probed over `/api/v1/…` as the dev admin and in the
console with Playwright.

## Gate order (what a module-absent boot hits first)

| # | Gate | Measured with | Result |
|---|---|---|---|
| G1 | `defineStack` cross-reference (app stack) | each module absent, no peel | exit 1 — revenue 20 issues (A) / 21 (B), marketing 9 / 11, service 16; all permission-set grants, plus the `type: 'flow'` action targets in B |
| G2 | author-time rules (`os validate`, also run by `objectstack dev` compile) | `PEEL=perms` | exit 1 — `translation-target-unknown` on the app locale packs; `object-reference-unknown` on lookups, `objectOverride`, dataset base object |
| G3 | second-order author-time rules | `PEEL=perms,i18n,refs` | exit 0 for every shape |
| G4 | boot | `PEEL=perms,i18n,refs` | boots; seeds load |

Mechanism assumption 1 of the dispatch ("removing a module stack still lets `pnpm dev` boot") is
**false**: `objectstack dev` stops at G1/G2 with "Compile failed — fix errors above before starting
dev server".

## Rows — revenue absent

| Ref (file:line) | Target (revenue) | Measured behaviour, module absent | Resolution |
|---|---|---|---|
| `src/sales/profiles/{crm-user,sales-manager,sales-rep,service-agent,system-admin}.profile.ts` grants | `crm_product`, `crm_quote`, `crm_quote_line_item`, `crm_opportunity_line_item`, `crm_price_book`, `crm_price_book_entry` | G1: "Permission 'sales_rep' grants on object 'crm_quote' which is not defined in objects." ×20; validate and dev refuse | platform card candidate (a module cannot contribute grants to an app permission set) — seat files |
| `src/sales/translations/*` `objects.crm_product …` (6 objects × 4 locales) and `apps.crm_enterprise.navigation.nav_quote/nav_product/nav_price_book` (3 locales) | revenue objects and nav contributions | G2: `translation-target-unknown` ×33 | NOT RESOLVED YET — move to a module-owned locale pack, or platform card (to decide) |
| `objectstack.composition.ts` `appRegisteredModuleItems.datasets` → `ProductDataset` | `product_metrics` on `crm_product` | A: G2 `object-reference-unknown` at `datasets[7].object` | moves back with the module after objectstack#25514 |
| `src/sales/dashboards/crm.dashboard.ts:150` `top_products` | dataset `product_metrics` | B: G2 `widget-dataset-unknown` — "dataset "product_metrics" does not resolve to a declared dataset" | platform card candidate (optional widget) — seat files |
| `src/sales/actions/opportunity.actions.ts:234` `generate_quote` | flow `quote_generation` | A: boots; button draws; `POST /api/v1/actions/crm_opportunity/generate_quote/ID` → 200 paused on screen; resume → **400 FLOW_FAILED** "create_record(crm_quote) failed: Object 'crm_quote' not found". B: G1 "Action 'generate_quote' references flow 'quote_generation' which is not defined in flows." | platform card candidate — seat files |
| `src/sales/pages/opportunity_detail.page.ts:64` page-header action `generate_quote` | action above | B (after peel): G2 `action-name-undefined` | follows the action row |
| `src/sales/objects/contact.hook.ts:146` `beforeDelete` counts open `crm_quote` | `crm_quote` | **every** `DELETE /api/v1/data/crm_contact/ID` → **404 OBJECT_NOT_FOUND** "Object 'crm_quote' not found"; contact survives | platform card candidate (conditional delete restriction declared by the module on its own lookup) — seat files |
| `src/sales/flows/billing-handoff-closed-won.flow.ts:132` `load_line_items` | `crm_opportunity_line_item` | opportunity `PATCH stage=closed_won` → 200; run **failed** "get_record(crm_opportunity_line_item) failed: Object 'crm_opportunity_line_item' not found", ERROR in boot log, no handoff sent | platform card candidate — seat files |
| `src/sales/flows/billing-handoff-contract-activated.flow.ts:132` `load_line_items` | `crm_opportunity_line_item` | contract `PATCH status=activated` → 200; run **failed**, same message | same as above |
| `src/sales/pages/opportunity_detail.page.ts:250,265,335,491,496` related lists, line-item picker, rail entries | `crm_quote`, `crm_opportunity_line_item`, `crm_product` | page renders; Related tab shows "Crm Quote 0 — No related records found"; rail "+3 empty (Crm Quote · Crm Opportunity Lin…)"; 8× 404 on `/api/v1/meta/object/…` and `/api/v1/data/…` | tolerated (renders empty, humanized raw names) — UX note |
| `src/sales/objects/account.hook.ts:242`, `contact.hook.ts:149` `crm_contract` counts | `crm_contract` | same package since #2310 | resolved by the move |

## Rows — marketing absent

| Ref | Target (marketing) | Measured behaviour, module absent | Resolution |
|---|---|---|---|
| profiles grants | `crm_campaign`, `crm_campaign_member` | G1 ×9 | as revenue |
| locale packs `objects.crm_campaign/_member`, `flows.campaign_enrollment`, `navigation.nav_campaign` | marketing items | G2 `translation-target-unknown` | as revenue |
| `src/sales/objects/opportunity.object.ts:360` `crm_campaign` lookup | `crm_campaign` | G2 `object-reference-unknown` at `objects[7].fields.crm_campaign.reference` | NOT RESOLVED YET |
| `src/sales/actions/lead.actions.ts:184,214`, `contact.actions.ts:82,101` (`create_campaign`, `add_contact_to_campaign`) | flows `campaign_*_member_enroll`, `objectOverride: crm_campaign_member` | A: G2 `object-reference-unknown` on `objectOverride` ×4; B: G1 flow-target refusal ×2 | platform card candidate |
| `src/sales/views/lead.view.ts:223`, `contact.view.ts:50` `bulkActions` | the two actions | after peel: G2 `action-name-undefined` | follows the action rows |
| `src/sales/objects/opportunity.campaign-metrics.hook.ts:81` `campaign_attribution_refresh` | `crm_campaign_member`, `crm_campaign` | boot: seed inserts and updates of opportunities log **ERROR** "hook 'campaign_attribution_refresh' threw: Error: Object 'crm_campaign_member' not found" (onError=log, write not blocked) | NOT MEASURED at a public door yet |
| `src/sales/objects/lead.campaign-metrics.hook.ts:86` | `crm_campaign_member`, `crm_campaign` | **NOT MEASURED** | — |
| `src/sales/pages/lead_detail.page.ts:548` related list | `crm_campaign_member` | **NOT MEASURED** | — |
| `src/sales/data/sales.seed.ts:1032…` `crm_campaign` natural keys; `opportunity.actions.ts:58` clone copies `crm_campaign` | `crm_campaign` | masked behind the lookup row (field demoted by the peel) | follows the lookup row |

## Rows — service absent

| Ref | Target (service) | Measured behaviour, module absent | Resolution |
|---|---|---|---|
| profiles grants | `crm_case`, `crm_knowledge_article`, `crm_article_feedback` | G1 ×16 | as revenue |
| locale packs (objects, flows, reports, dashboard, 7 nav ids) | service items | G2 `translation-target-unknown` | as revenue |
| `src/sales/objects/task.object.ts:178`, `event.object.ts:199` `related_to_case` lookups | `crm_case` | G2 `object-reference-unknown` ×2; after peel, `related_to_required` validations go `expression-invalid` | NOT RESOLVED YET |
| `event.hook.ts:169,246`, `task.hook.ts:355`, `activity-actions.ts:102`, `activity.seed.ts`, `related_to_type.picklist.ts:29` | `crm_case` | **NOT MEASURED** (boot not run) | — |
| `src/sales/skills/customer-360.skill.ts:42,47` prose | `crm_case`, `crm_knowledge_article` | **NOT MEASURED** | — |
| `src/sales/apps/crm.app.ts` `group_service` (empty container) | service nav contributions | **NOT MEASURED** | — |
