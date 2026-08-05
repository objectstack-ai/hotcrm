---
'hotcrm': patch
---

Complete the built-in flow table on the automation admin page, in all three
locales, and pin it to the compiled stack.

The table is the only route an admin has from a symptom ("something re-assigned
this case", "a task appeared on my list") to the automation behind it, and it was
listing fewer than half the flows: the header read `Built-in flows in HotCRM
(11)` on the English page and `(10 个)` / `(10 個)` on the Chinese ones, while the
app ships 24 flows. Contract auto-expiration, the contact welcome prompt, quote
and campaign expiry, the task reminders and the two insert-time approval twins
were all absent — so a reader sent to this table by the contracts page found
nothing and concluded the expiry sweep did not exist.

One row was also wrong rather than missing. `campaign_enrollment` was rewritten
from a Monday-9-AM schedule into a screen flow (a cron seeds no input variables,
so every run enrolled nothing or died on validation), but all three pages still
billed it as a scheduled sweep, and the prose below counted it among them.

What changed for readers:

- All 24 flows are listed, grouped by trigger surface, each row carrying the
  flow's own label — the name shown in Setup's process monitor and scheduled-job
  history, so a run can be looked up here verbatim.
- Each row states the real trigger, including the `insert` / `update` half of a
  record-change flow, and the real cron for the nine scheduled ones.
- The counted sentences follow: `(24)` in the header, and "the nine `Schedule`
  rows above" replacing "the five `Schedule` rows above (campaign enrollment,
  …)", whose hand-written roster was the part that expired.
- Two short paragraphs explain the `(on create)` twins and why `Demo Bootstrap`
  is listed despite being scaffolding rather than business automation.

`test/automation-docs-coverage.test.ts` now derives the table's row set, each
row's trigger cell, and both numerals from the compiled stack, so a flow added,
removed, renamed or re-triggered fails at PR time until all three pages agree.
The Chinese row labels stay authored per locale — flows carry no entry in the
locale packs, and no zh-Hant pack ships at all.
