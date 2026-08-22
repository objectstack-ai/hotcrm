---
'hotcrm': patch
---

Rewrite the Opportunities documentation's list-view section against the views the
app actually ships.

`content/docs/sales/opportunities.mdx` (and its zh-Hans / zh-Hant siblings) listed
six "standard list views", and five of them do not exist: **My Opportunities**,
**Closing This Month**, **At Risk**, **Top Deals by Amount**, and **Pipeline
Kanban**. The sixth introduced a **third** name for a view everything else agrees
on — the docs called it *Pipeline This Quarter*, while the metadata label and all
four locale bundles say **Closing This Quarter** / 本季度待成交商机 / Cierres de
Este Trimestre / 今四半期にクローズ予定. A reader looking for any of those names
in the product found nothing under it.

The section is now the real roster of nine saved views — Open Deals (the landing
view), My Open Deals, Sales Pipeline, All Opportunities, Forecast Calendar, Deal
Timeline, Deal Cards, ⚠️ Stale Opportunities · Longest in Stage First, and
Closing This Quarter — each with what it filters, how it sorts, and where it is
reached from. Two consequences worth calling out:

- **Closing This Quarter is documented as it behaves after #743/#746**: open
  Commit and Best Case deals whose **close date falls inside the current
  quarter**, with both quarter bounds computed each time the list runs. Summing
  the Amount column is therefore this quarter's commit, and a deal closing next
  March waits on Open Deals. The page also says that an empty list here is a real
  answer — the view explains itself in place of the grid — so a quarter whose
  commit has slipped out does not read as a broken view.
- **The rep tip no longer points at a view that does not exist.** "Don't move the
  close date — the **At Risk** view surfaces slippage" now says what really
  surfaces a stalled deal: time in the current stage, on **Stale Opportunities**,
  with the daily Stalled Deal Alert acting on it at 14 days.

Also corrected: the kanban board's sidebar entry is **Pipeline** (the English
label on the navigation item), not "Sales Pipeline" — that is the view's own
name.

Fixes #752.
