---
'hotcrm': minor
---

**Line items now carry their line number.** `line_number` on opportunity and quote line
items is read-only and platform-assigned, but nothing assigned it: every line a rep added
stored an empty `Line #`, and the billing hand-off sent `"line_number": null` for each of
them on every won deal and every activated contract. A new `beforeInsert` hook on both
line-item objects now stamps `(highest line number under the parent) + 1` — a line added
from the Products or Line Items panel, through the API, or in a batch gets the next number
under its opportunity or quote, a number supplied by the caller is ignored, and an existing
number is never renumbered. The seed's own numbering is kept as authored.

**Existing deployments: run the one-time back-fill.** Lines created before this release
still have no number. The same hook numbers such a line the next time it is edited; to
number them all now, in creation order under each parent, run
`pnpm exec tsx scripts/backfill-line-number.ts --url https://<your-org> --email <admin>
--password <pw>` to see the count, then again with `--apply`. It is safe to re-run — a
converged org reports zero rows. Each touched line re-runs the parent rollups, exactly as
an edit would: an open deal's amount and a draft quote's totals are recomputed from their
lines.
