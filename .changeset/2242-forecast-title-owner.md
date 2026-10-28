---
"hotcrm": minor
---

Clause-②: no
Metadata-protocol: none

**A forecast is titled by its period and its owner: "Q4 2026 · Nina Reyes" (#2242).** A forecast is one row per owner and period, but its title named the period only ("Q4 2026 (2026-10-01)"), so two reps' forecasts for the same quarter read the same on the record, in Recent items and in a lookup. The title now names the owner after the period label. The name is read from the forecast's **Owner**, so a forecast handed to another owner is re-titled by that save. A forecast with no owner is titled by its period label alone ("Q4 2026").

The owner's name is copied into the title when the forecast is saved, so renaming a user re-titles their forecasts at each forecast's next save, not at once.

**FROM → TO.** "Q4 2026 (2026-10-01)" → "Q4 2026 · Nina Reyes". No step is needed on upgrade: forecasts saved before the stored record titles of #2230 have no title yet, and `scripts/backfill-record-titles.ts` (described there) titles them in the new form. A development database created since #2230 keeps the old form on each forecast until it is next saved; `pnpm demo:reset` re-seeds it.
