---
"hotcrm": patch
---

Forecasts: the current quarter now has exactly one writer, so re-seeded orgs stop growing a phantom ownerless row

On every boot the demo seeds are replayed, and until now they included a
current-quarter `crm_forecast` row. Seeded rows arrive with no owner — a seed
cannot name a user — while the nightly `forecast_snapshot` sweep looks for the
current-quarter row **by owner**. The sweep therefore never saw the seeded row,
concluded the period was missing, and opened a second row spanning the same
quarter. Anything that groups forecasts by owner — the Sales dashboard's *Quota
Attainment by Rep* table above all — then showed a duplicate current-quarter
entry with a blank Owner, after every re-seeded boot.

The seeds now stop at that window's edge: they ship **settled quarters only**,
plus the current month, which no automation writes. The current quarter belongs
to `forecast_snapshot` alone — one producer per window, whichever order the two
scheduled sweeps happen to run in.

`demo_bootstrap` additionally claims `crm_forecast`, the one owner-scoped seeded
object it had been skipping. Forecasts are `private` and sales reps read only
their own, so an ownerless snapshot was not merely blank on the owner axis — it
was invisible to every rep and editable by nobody. Settled demo snapshots now
belong to the first user, like every other seeded record.

What this changes for a demo org: on a freshly seeded database the *Quota
Attainment by Rep* table is empty until the 03:00 sweep opens the quarter's
rows, and their **Quota** stays blank until someone sets one. Quota has no
automated writer by design — it is the hand-maintained denominator of
attainment — and an empty table is the same honest state that widget already
shows at a quarter boundary. What it replaces is a row attributed to nobody,
carrying a quota no rep was on the hook for.

Existing databases: run `pnpm demo:reset` to drop the stale demo row, or delete
the ownerless current-quarter forecast by hand. No user-authored data changes.
