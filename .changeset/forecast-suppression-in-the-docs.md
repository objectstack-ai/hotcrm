---
'hotcrm': patch
---

Document that a manual (or AI) forecast stands the nightly Forecast Snapshot
sweep down for that owner and period.

The behaviour shipped earlier: at 03:00 the sweep now asks two questions
through two filters. *Has this period been handled?* reads the owner's whole
current-quarter window and is deliberately source-blind — any row answers it.
*Which row is mine to write?* matches only rows whose **Source** is
`Scheduled snapshot`. So a row a person or an agent put in that window is
never adopted, overwritten or re-stamped, and no second row is opened beside
it. Deleting the row hands the period back to automation.

The forecasting guide had not been told. One sentence was actively wrong
rather than merely incomplete: *"Re-running it refreshes the same row"* reads
as "it refreshes whatever row is in the window" — precisely the behaviour that
was removed. A manager who set **Source** to *Manual entry* and expected the
nightly job to keep updating the row was following the page correctly and
would have been wrong. The same implication sat, unqualified, in the FAQ
answer about rolling up from opportunities automatically.

`content/docs/sales/forecasting.mdx` now says, in all three locales:

- the **Source** table row flags that `manual` and `ai` are load-bearing, not
  just provenance labels;
- the **Scheduled** entry says the sweep refreshes *the row it wrote itself*;
- the current-quarter section carries the suppression rule, its escape hatch
  (delete the row — and who can: deleting a forecast is an admin action, a
  sales manager can create and edit but not delete), and the cases that are
  **not** suppression — a
  `Scheduled snapshot` row is still refreshed in place, an empty window is
  still the sweep's to open, and a manual row added *beside* a scheduled one
  suppresses nothing;
- the automatic-roll-up FAQ answer is qualified the same way.

`content/docs/administration/profiles.mdx` loses a claim that was already
inaccurate before any of this: forecast snapshots were said to be written by
the nightly job *"never by hand"*. A sales rep indeed never writes one — that
is what the bullet is about — but managers and sales ops do, and now that hand
entry has a defined effect on the nightly job, the parenthetical was teaching
the opposite of the rule.

Documentation only. No metadata changed.
