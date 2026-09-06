---
'hotcrm': patch
---

Stop denying a shipped control. The Dashboards page said twice that Customer
Service has **no** date-range picker; the dashboard has carried one since #1157
restored it — over the date a case was created, defaulting to the last 90 days.
A reader who believed the page read every number on that dashboard as
unwindowed, when all of them were bounded by a window they had been told did not
exist.

The two claims are now written from the declarations rather than from memory.
Every `src/dashboards/*.ts` `dateRange` was read for this, and the blanket
sentence under **What you can change** turned out to be wrong in a second way as
well: it described *every* picker as windowing the opportunity close date and
defaulting to this quarter, which is true of CRM Overview, Sales Performance and
Executive Overview but not of Customer Service. Four of the five dashboards
carry a picker and all four accept a custom range; Sales Activity, which
declares none, is now named as the single exception instead of one of two.

The **reason** the page gave is corrected too, not just the conclusion. Both
sections invoked a platform defect — a datetime filter coercion that zeroed
every widget when a range was applied — as a live cause. That defect is fixed
and released: `@objectstack/driver-sql` and `@objectstack/service-analytics`
17.0.0 carry objectstack#3912 (one UTC storage form per dialect) and
objectstack#3777 (a bare-day upper bound covering the whole day), and this repo
is pinned to 17.3.0. Repeating a closed defect as a current reason is what let
the contradiction survive #1157 in the first place, so the Sales Activity
section now states what is actually true of it: it carries time on an axis
instead — Activity Volume by Week buckets by week, and the quiet-account tiles
window their own 30 / 60 / 90-day thresholds.

Two facts the page had right are kept and made reachable rather than rewritten.
Daily Case Volume really does opt out of the picker (`filterBindings:
{ dateRange: false }`) and keeps the 30-day window its title names — now stated
as an opt-out from a picker that exists, which is what a reader needs in order to
read that chart beside a 90-day case load. And the UTC calendar-day rule added by
#1640 is untouched: it still explains what any of these windows means.

No metadata changed. No dashboard, dataset or object was touched — the product
is right and the prose was wrong, in all three locales (`en`, `zh-Hans`,
`zh-Hant`).
