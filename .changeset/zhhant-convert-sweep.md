---
'hotcrm': patch
---

The lead **convert** verb now reads 转化 / 轉化 on every Chinese page, not just
the Simplified ones.

`src/translations/zh-CN.ts` is the contract: `convert_lead.label` is 「转化线索」
and `is_converted` is 「已转化」, so the docs say 转化 (#801/#825/#829). Two
distinct gaps were left after those passes, and both showed up as a reader
seeing a word the product never displays:

- **The Traditional twin never moved.** Seventeen places across
  `content/docs/marketing/campaign-members.zh-Hant.mdx`,
  `content/docs/marketing/campaigns.zh-Hant.mdx`,
  `content/docs/marketing/index.zh-Hant.mdx`,
  `content/docs/analytics/cubes.zh-Hant.mdx`,
  `content/docs/analytics/dashboards.zh-Hant.mdx`,
  `content/docs/analytics/reports.zh-Hant.mdx`,
  `content/docs/reference/glossary.zh-Hant.mdx` and
  `content/docs/guides/files-and-comments.zh-Hant.mdx` still said 轉換 while the
  Simplified line beside them already said 转化 — same sentence, same table row,
  two different verbs. Neither page can be used as the other's proofreading
  baseline.
- **Five pages no pass had reached at all**, in both scripts:
  `content/docs/sales/index`, `content/docs/administration/setup`,
  `content/docs/administration/sandbox-and-releases`,
  `content/docs/administration/state-machines` and
  `content/docs/administration/automation`. The two go-live smoke-test
  checklists walked an admin through 「潜在客户 → 转换 → 商机」, naming a step the
  Convert button does not call itself.

On `content/docs/administration/automation` the flow row is now
「线索转化流程 / 線索轉化流程」 and its description follows. That page's row labels
are pinned in `test/automation-docs-coverage.test.ts` — flows carry no locale-pack
entry, so the ledger is where the Chinese spelling lives — and the entry moves in
the same commit, not after it.

**状态转换 is untouched, and that is the point on the state-machine page.**
「转换」 there names the state-machine mechanism (state transition), a different
word that happens to share a spelling with the old convert translation. Only the
three lead-convert sentences changed on that page — the Convert wizard row, the
Copilot suggestion, and the wizard-testing tip — while the ten mechanism
sentences around them keep 转换. The same reading spares the contract-activation
sentence on `content/docs/revenue/contracts`, the datetime-filter note on
`content/docs/analytics/dashboards`, and the type-coercion prose on
`content/docs/guides/import-and-export` and
`content/docs/guides/importing-your-data`.

Documentation only, Chinese pages only — the locale pack is the contract, so
nothing under `src/` changed and the English pages, which say "convert"
throughout, were already right.

Fixes #844.
