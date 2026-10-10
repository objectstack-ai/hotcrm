---
'hotcrm': patch
---

**The demo pipeline board is draggable out of the box.** In a freshly seeded database nine of the
ten open opportunities were priced at $100K or more, so every one of them was born into the
**Large Deal Approval** flow, which locks the record while the approval is pending — on the
**Sales Pipeline** kanban those cards refused every drag with `RECORD_LOCKED`, and only one open
card could be moved (#1902).

The seeded active pipeline is re-priced so that exactly **two** open deals exhibit the approval
flow, one per tier:

- **Acme Platform Upgrade** ($150,000) — Sales Manager review only.
- **Wayne Enterprise License** ($1,200,000) — Sales Manager review, then Sales Director sign-off.

The other seven open deals are now scoped under $100K (their product lines were re-scoped, and
each amount is still derived from its lines), so every active stage keeps at least one card
that moves. On a fresh database: open deals locked by a pending approval **9 → 2**, draggable
open cards **1 → 8**. The **Globex Manufacturing Suite Proposal** quote follows its deal's new
lines. The approval flow and the $100K / $500K thresholds are unchanged.

This is a change to the demo seed only, measured on a fresh database. An existing demo database is
not re-priced in place — approval requests already open there stay open until decided or
recalled; run `pnpm demo:reset` to start from the new seed.
