---
'hotcrm': patch
---

Field help text now names what the user sees on screen, instead of stored values, internal field paths, and implementation notes.

#679 completed all four locales, and completing them made a second problem legible: several help strings in the object definitions are developer shorthand, and translating them faithfully propagates the shorthand into four languages. Fixing the English is the only fix that reaches every locale.

**Raw stored values in user-facing prose.** `crm_forecast.best_case_amount` read "in the best_case or commit forecast category" — those are the `value`s of `crm_opportunity.forecast_category`, whose labels are "Best Case" and "Commit". A user reading the help text cannot match `best_case` to anything on screen. The zh-CN and es-ES translators had already silently corrected this ("最佳情况"或"承诺", `Mejor caso o Compromiso`); English and Japanese still leaked it.

**Implementation notes.** `attainment_pct` ended with "Negative quota guarded" — a remark about the `quota > 0 ?` ternary, meaningless to a rep and close to untranslatable. It is replaced with the behaviour that guard produces: "Reads 0% until a positive quota is set." Likewise `coverage_ratio` now states that it reads 0 once the quota is met, which is what the `(quota − closed) > 0 ?` branch does.

**Internal field paths.** `crm_opportunity_line_item.list_price` read "Auto-populated from product.list_price". zh-CN and ja-JP had already corrected it to the display label; es-ES still shipped the literal `product.list_price`.

**Widget descriptions instead of content descriptions.** `crm_lead.notes` read "Rich text notes with formatting" — that describes the editor, says the same thing twice, and tells the user nothing about what belongs in the field. All three translated locales had faithfully reproduced the redundancy.

## Labels that disagreed with their own metadata

Three cases where the bundles and the object definitions had drifted apart, resolved in whichever direction is right rather than uniformly:

- **`crm_contact.department.hr`** — object said `HR`, all four bundles said "Human Resources". Four independent translators reaching for the expanded form is the answer; the object definition is corrected.
- **`crm_forecast.closed_amount`** — object says `Closed Won`, the `en` bundle had truncated it to "Closed". Here the object is right: in a forecast table sitting next to Pipeline, Best Case and Commit, a bare "Closed" is ambiguous against Closed Lost. The bundle is corrected, and the prose in `attainment_pct` / `coverage_ratio` / `expected_amount` now names it consistently.
- The other three locales keep their own shorter forms (已成交金额 / クローズ / Cerrado) — each is internally consistent with its own prose, which is the bar that matters inside a bundle.

`expected_amount` also said "what the owner reasonably expects to **ship**" — a supply-chain verb for a sales forecast; now "land".

No behaviour changes: every edit is display text or help text. The four bundles stay at zero i18n warnings.
