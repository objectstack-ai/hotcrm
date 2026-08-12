---
'hotcrm': patch
---

Stop the nightly Forecast Snapshot from overwriting a forecast someone entered
by hand. A manual forecast for a period now **suppresses** the automated
snapshot for that period.

Before, the 3 AM sweep picked "this owner's current-quarter row" purely by
window containment — and a manager's hand-entered row (**Source: Manual entry**,
typed into the Snapshot block of the forecast form) sits in exactly that window.
Since the period boundaries were pinned to the calendar quarter, the manager's
row and the sweep's row became indistinguishable by construction, so the sweep
adopted the manual one: all four amounts replaced with its computed totals,
**Snapshot Date** restamped to today, **Source** flipped from Manual entry to
Scheduled snapshot. **Quota** survived — the sweep never writes it — which is
what made the loss easy to miss: attainment and coverage silently re-based onto
the swept numbers while the row still looked plausible, and nothing recorded
that the typed numbers had ever existed.

What changes, per period and per owner:

- **A manual (or AI-written) forecast exists** → the sweep stands down for that
  owner and period. It writes nothing and, just as importantly, opens no second
  row beside it, so *This Quarter* and the Sales dashboard's *Quota Attainment
  by Rep* still see exactly one row.
- **A scheduled row exists** → refreshed in place, exactly as before.
- **Nothing exists** → the sweep opens its own row, exactly as before.

Deleting the manual row hands the period back to automation: the next sweep
opens its own row again. That is the only way out, and it is an ordinary edit —
no schema change, no second object, no view-precedence rule.

Mechanically, the sweep now reads through two filters instead of one: the
idempotency gate still asks "has this period been handled?" of *any* row in the
window, while the write target asks "which row do I own?" and matches only rows
with `source: 'scheduled'`. Narrowing the single shared filter instead would
have made the gate stop seeing the manual row and open a duplicate in the same
window. Refs #1082, #702, #1008, #1093.
