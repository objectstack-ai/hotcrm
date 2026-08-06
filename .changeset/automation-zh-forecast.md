---
'hotcrm': patch
---

The Chinese automation pages regain the paragraph that says which half of the
forecast pipeline owns what, and both they and the Chinese Opportunities pages
name the `best_case` forecast category the way the shipped locale pack does.

**The missing paragraph.** `## Scheduled automation` in
`content/docs/administration/automation.mdx` has carried three paragraphs since
#615 landed `forecast_snapshot`; the two Chinese copies had two. The one they
lacked is the only place on the page that gives the *criterion* for splitting
work between a flow and an object hook — the **Forecast Snapshot** flow decides
who gets a snapshot and what the totals are, while the forecast object's hook
decides which calendar period the snapshot belongs to, because a cron schedule
can say "every night" but not "the first day of this quarter". Without it a
Chinese reader got the preceding paragraph's conclusion (date-driven field logic
that needs no orchestration lives in object hooks) with none of the reasoning,
and the English text explicitly calls this "the pattern to copy". Both
`automation.zh-Hans.mdx` and `automation.zh-Hant.mdx` now carry it, using each
page's own established vocabulary (计划类流程 / 排程類流程, 对象钩子 / 物件鉤子,
日历周期 / 日曆週期, 写入方 / 寫入方).

The rest of the page was swept the same way while the file was open — every
other section already matches the English one paragraph for paragraph, and no
further gap was found.

**One picklist value, three spellings.** `src/translations/zh-CN.ts` ships
`crm_opportunity.fields.forecast_category.options.best_case` as 「最佳情况」, and
that is what the *Forecast Category* dropdown shows. The Chinese docs used three
different words for it: 最佳情况 on the Forecasting, Sales index, glossary,
Copilot and cubes pages (right), 最佳可能 on the Opportunities pages, and 最好情况
on the automation pages. Both wrong spellings are gone. The two Opportunities
occurrences per locale sit in the same sentence as 「承诺（Commit）」, which was
already correct, so the *This Quarter's Closing* view described its own filter
with one term a reader can find in the UI and one they cannot.

The same automation table row named the fourth forecast total 「赢单合计」, a word
the pack ships nowhere; `crm_forecast.closed_amount` is labelled 「已成交金额」,
which is also what the Forecasting page already used. That row now agrees with
both.

Documentation only — the locale pack is the contract, so nothing under `src/`
changed, and the English pages (which already match the pack) are untouched.

Fixes #836. Fixes #845. Follows #829.
