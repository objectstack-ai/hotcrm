---
"hotcrm": patch
---

Knowledge base: the Review Queue tab no longer claims a 180-day window it never applied.

In English, Chinese, Spanish and Japanese the knowledge-article review tab was named
"Stale (>180d)" (过期 (>180 天) / Obsoletos (>180d) / 古い (>180日)), but its filter
selected only `status = published`. The tab therefore returned **every** published
article — including one reviewed minutes ago, merely sorted to the bottom — under a
heading that promised a six-month cut. Anyone who read the tab as a worklist was
reading a list of the whole knowledge base.

The four names now match the view's own metadata label, "Review Queue · Oldest First",
which is what the view actually does: every published article, least-recently-reviewed
first. Which rows the tab returns is unchanged.

The 180-day window was measured before being ruled out rather than assumed impossible.
The date macro does resolve on the read path now, and lands on the start of the calendar
day 180 days back — but a comparison against it does not match articles that have never
been reviewed at all, and those are exactly the rows a review queue most needs to show.
Saying "older than 180 days **or** never reviewed" needs a disjunction, and a view filter
is a flat list of conditions combined with AND, so the honest window cannot currently be
written. Whether this queue should become a cut is now a separate, open product question.

The house-rule guard that catches this defect class (a view name promising a time scope
its filter does not express) previously recognised only current-calendar-period phrases
like "This Quarter", so it could not see "> 180d". It now also reads parameterised day
windows in all four locales.
