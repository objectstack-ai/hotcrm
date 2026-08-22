---
'hotcrm': patch
---

Filled the last 25 missing `ja-JP` page-component translation keys, closing out the i18n coverage gate that #1060 opened.

`objectstack lint` (run without `--skip-i18n` since #1080) reported 25
`i18n/missing-page` warnings, all `ja-JP`: page-component `label`/`title`/
`description` strings on `app_launcher_page`, `case_detail_page`,
`lead_detail_page`, `opportunity_detail_page`, `sales_home_page` and
`utility_bar_page` that were defined in `src/pages/*.page.ts` and never
mirrored into `src/translations/ja-JP.ts`. #1080 filled the same 25 keys for
`es-ES`/`zh-CN` but deliberately left `ja-JP.ts` untouched — it was claimed by
#858 (a verb-terminology pass) in the same batch. That claim is now merged, so
this PR fills the remaining third.

Translated each string against its English source in `src/pages/*.page.ts`,
matching the nesting shape and register #1080 already established for
`es-ES`/`zh-CN` (`pages.<page>.components.<component>.<label|title|description>`).
Only additions — no existing `ja-JP.ts` lines were reordered or reformatted, to
avoid manufacturing a conflict for #1061, which is queued behind this file for
the `crm_opportunity` competitors options.

Result: `objectstack lint` now reports **zero** `i18n/missing-page` warnings
(down from 25; total warning count 178 → 153), across all three locales this
card and #1080 together completed. `es-ES` and `zh-CN` were already clean and
are untouched by this PR.
