---
'hotcrm': patch
---

Drop `--skip-i18n` from the `lint` script so translation coverage is enforced
continuously instead of being silently skipped.

Running `objectstack lint` without the flag at the current `17.0.0-rc.6` pin
surfaced 75 real `i18n/missing-page` warnings — three page-scoped translation
keys per locale, times 25 UI-component labels/titles that were never added to
the `es-ES`, `ja-JP` and `zh-CN` bundles for `app_launcher_page`,
`case_detail_page`, `lead_detail_page`, `opportunity_detail_page`,
`sales_home_page` and `utility_bar_page`. Filled in the 50 keys for `es-ES`
and `zh-CN` here (labels/titles for components like `key_metrics`,
`ai_briefing`, `quick_create`, `notifications_panel`, etc., matching the
English source in `src/pages/*.page.ts`). Previously these fell back to the
raw English source string in the Spanish and Chinese UI.

The 25 `ja-JP` keys are intentionally left out of this change: `ja-JP.ts` is
being edited by a concurrent PR (#858) in the same batch, so touching it here
would race that work. Those keys are enumerated in the linked issue for a
follow-up.
