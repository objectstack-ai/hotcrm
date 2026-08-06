---
'hotcrm': patch
---

Clear the remaining dangling in-site anchors under `content/docs`, so every
anchored link lands on the section it promises instead of the top of the page.
Thirteen links were left after PR #868; a full rescan of all three locales now
reports zero.

Two English links keep their anchor, and the section they point at gained an
explicit heading id so the anchor is stable against future title edits:

- `ai-copilot/skills` — `### 🚦 Case Triage` is now
  `### 🚦 Case Triage [#case-triage]`. Without it, the leading emoji makes the
  generated id `-case-triage` (the emoji is dropped, the space after it is not),
  so the obvious spelling could never have resolved.
- `guides/import-and-export` — `### Scheduled export to a warehouse (not
  shipped yet)` is now `… [#scheduled-export]`, which is the anchor
  `reference/performance-and-limits` has always used. The heading grew its
  "(not shipped yet)" qualifier after the link was written.

The explicit-id spelling is `[#id]`, not `{#id}`: the latter is read as a JSX
expression in `.mdx` and fails the parse outright.

Every Chinese link now points at the page with no anchor, which is the form
already used for cross-locale links elsewhere in the docs — the target headings
are translated, so an English anchor cannot resolve on them:

- `service/sla-and-escalation` → `ai-copilot/skills`
- `reference/performance-and-limits` → `guides/import-and-export`
- `marketing/campaign-members` → `marketing/campaigns`
- `sales/opportunities` → `sales/quotes`

`index` in all three locales linked the sales manager's starting point at
`/docs/analytics/dashboards#sales-dashboard`. No dashboards page in any locale
has a *Sales Dashboard* heading — the dashboard ships with the label *Sales
Performance* (`sales_dashboard` is its metadata name, which is what the anchor
was spelled from). All three now link the dashboards page itself, whose opening
table lists all five dashboards.
