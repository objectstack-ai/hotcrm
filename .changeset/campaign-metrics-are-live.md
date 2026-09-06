---
'hotcrm': patch
---

Stop telling readers a campaign's metrics snapshot when it completes. They have
been live since #597, and the docs were describing the behaviour that card
removed.

`campaign_snapshot_metrics` fired on `→ completed` and nothing else, so a
campaign reported zeros for its entire useful life and became accurate on the
day everybody stopped looking at it. Four refresh hooks replaced it —
`campaign_metrics_refresh`, `campaign_attribution_refresh` and
`campaign_lead_conversion_refresh` (`campaign.hook.ts`), plus
`campaign_member_metrics_refresh` (`campaign_member.hook.ts`). Every input a
campaign metric derives from now has a trigger that refreshes the metric when it
changes: the numbers move as members are enrolled, as members respond, as their
leads convert and as opportunities are attributed. Completion is simply one more
`status` transition over numbers that were already current, which is what
`campaign-completion.flow.ts`'s header has said since #1668.

The harm was directional, not just factual. A reader following these pages would
expect an in-progress campaign to report zeros, and would therefore **distrust
the live dashboard numbers** — the docs talked them out of a feature that works.
So each page now states the live behaviour positively, in its own bullet, rather
than only dropping the false claim: an in-flight campaign reports real numbers
you can act on today.

Three lines were wrong per locale face, not the two the finding listed:

- `marketing/campaigns.mdx` status table — *"Completed | Finished — metrics are
  final, ROI is calculated"*. Both halves were stale. Metrics are not final (a
  completed campaign's numbers still move — enrolling a member into one is
  exactly the case `flow-campaign-enrollment` guards against), and `roi` is a
  **formula** over `actual_cost` / `actual_revenue`, evaluated on read. It is
  never "calculated" at a moment; it has always had a value.
- `marketing/campaigns.mdx` auto-complete bullet — the 2 AM sweep flips the
  status and only the status.
- `marketing/index.mdx` lifecycle step 4 — *"metrics are snapshotted"*.

⚠️ The status-table row is the one worth remembering. It carries the retired
model **without containing the word `snapshot`**, which is why #1668's audit
could not see it and why the finding that produced this change listed only two
lines. A keyword search for `snapshot` finds the other two and stops one row
short of the same claim on the same page. Searching by *behaviour description*
— "metrics are final", 「指标最终确定」 — is what surfaced it.

`marketing/campaign-members.mdx` was checked and needed nothing: it already said
the campaign-level metrics are "always live", so the two corrected pages had
been contradicting their own sibling. Its wording is the vocabulary the fixes
adopt, in all three faces.

All three locale faces are corrected together, each written rather than
translated, reusing the vocabulary already on these pages (发送/响应/转化,
傳送/回應/轉化) and the 实时 / 即時 register `campaign-members` established.
