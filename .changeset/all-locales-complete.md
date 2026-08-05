---
'hotcrm': patch
---

All four locales are now complete on every translatable surface, and the exemption ledger that tracked the gap is retired rather than emptied.

`objectstack lint` went from **723 warnings to 13**. Every one of the 710 removed was an i18n gap; the 13 that remain are unrelated (naming prefixes, a shadowed field group). `pnpm lint` runs with `--skip-i18n` and now reports the same 13 as a full run — the flag has nothing left to skip.

**ja-JP and es-ES were each missing 355 keys.** The `pages` group was absent from both bundles outright, so every page in the app rendered its nav label, breadcrumb and header in English regardless of locale. On top of that: 34 navigation nodes, 10 object descriptions, the 12 Sales-dashboard win/loss widget strings, 13 view labels and empty states, and 169 picklist option labels each.

**`en` was missing 133 keys and nothing could see them.** When a key is absent the resolver falls back to the English string in the metadata, so in the source locale a missing entry and a correct one are indistinguishable — invisible at runtime, invisible to the linter, invisible to a reviewer clicking through. It still mattered: every other bundle is authored by mirroring this one's shape, so a key with no slot here is a key the next translator has no place to put. That is precisely how three locales ended up with no `pages` group.

## Consistency is now structural rather than a copy discipline

Shared picklists in ja-JP are declared once and spread into each use site, mirroring the `activityActions` pattern already in the file and `_picklists.ts` on the metadata side. es-ES asserts the same relationships programmatically against the loaded bundle. The discipline they replace had already failed: `crm_lead.industry` read 業界 against `crm_account.industry` 業種 for the same 15-value shared set.

Drift the sweep exposed and fixed:

- `crm_account.owner` in ja-JP was 取引先責任者 — the **object label for `crm_contact`**. The "Account Owner" field rendered as the word "Contact".
- The `crm_account` lookup read アカウント on case/contract/quote/campaign-member screens while the object itself is 取引先; same field, different word depending on which page you opened. `crm_task.related_to_type` forces the fix anyway — its option values *are* object names.
- `crm_opportunity.stage` was フェーズ beside ステージ更新, ステージ開始日, 現ステージ滞在日数, and a dashboard showing ステージ × リードソース next to フェーズ別パイプライン.
- `crm_account.type.former` is `'Former Customer'` in `account.object.ts`, but the `en` bundle had truncated it to `'Former'` — and es-ES, mirroring that bundle, rendered a bare `'Anterior'`: an adjective with no noun, beside three option labels that are all nouns.

## The guard

`PENDING_SELECT_LABELS` is **deleted**, not emptied. It held 34 fields over 12 objects — 111 (locale, field) pairs, ~380 option labels — of debt that #631 could not fix without burying the field its PR was about. An empty ledger is an invitation to add a row; the two assertions that existed only to keep it honest (stale rows, ghost rows) go with it. What remains says unconditionally what the ledger was always converging on: every select field, every option value, every locale.

The surface guard is widened from zh-CN-only to all four locales, deriving the list from `localePacks` rather than hard-coding it, so a fifth locale is held to the bar the day it appears. Widening it is what surfaced the 105 invisible `en` gaps in the first place.

This suite is the only real gate: `objectstack lint` has rules that find these gaps and CI never runs them, because `pnpm lint` passes `--skip-i18n` and `objectstack lint` exits 0 on warnings regardless.

## Not addressed

View **tab** labels (#661) remain untranslatable in every locale: `tabs[].label` has no key in `ObjectTranslationDataSchema` and no resolver in `i18n-resolver.ts`, so the gap is upstream.

Several help strings in the object definitions read as developer shorthand and are now mirrored consistently into all four bundles — `crm_forecast.attainment_pct` ("Negative quota guarded"), `best_case_amount` / `commit_amount` (leaking raw `best_case` / `commit` option values where every neighbour uses display labels), `crm_opportunity_line_item.list_price` ("Auto-populated from product.list_price"). Fixing the English belongs in a change to the object definitions, not to a translation bundle.
