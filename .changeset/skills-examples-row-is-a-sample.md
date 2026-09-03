---
'hotcrm': patch
---

Cut the AI layer table's Skills row in `docs/ARCHITECTURE.md` down to a genuine sample.
The row's "Examples" cell named `live_data`, `lead_qualification`, `email_drafting`,
`revenue_forecasting`, `case_triage` and `customer_360` — six names, and
`src/skills/*.skill.ts` registers exactly six skills. It was a complete hand-maintained
roster wearing the word "Examples". It now names three.

Nothing in that cell was false, which is what made it worth changing rather than
leaving. The header was the defect: "Examples" tells a reader the list is illustrative,
so nobody checks it against the tree — while it was in fact exhaustive. A reader
counting skills from this page got the right answer today and would have got no warning
on the day a seventh skill landed. That is the same failure that put three objects out
of date in this file's own object roster, and it is the fourth site of one transcription
(`AGENTS.md`, `docs/DEPLOYMENT.md`, `docs/MAINTENANCE.md`, and now here).

The list is **not** completed and not re-counted: a completed transcription is the same
defect one skill later — 2026-08-31 ruling item 5.

Of the two available routes, this is the sample one rather than the pointer wording
`AGENTS.md` / `docs/ARCHITECTURE.md` / the API reference already carry, because in this
row the pointer is already present: the `Files` cell of the very same row reads
`src/skills/*.skill.ts`, so pointing the `Examples` cell at the source would restate its
neighbour verbatim and leave the table with a column that says nothing on one of its two
rows. The other row — *"lead conversion, case triage, alerts"* under Actions and flows —
is a real sample of a much larger set, so the skills row was the odd one out in its own
table and now matches it. The three kept names span the three domains the layer serves
(live schema inspection, sales, revenue) and avoid restating the neighbouring row's
examples.

`test/docs-src-tree-paths.test.ts` resolves the `src/` paths this file quotes against the
real tree; the `Files` cell it reads is untouched, and the guard is unmoved. No guard is
added: the change is a truncation, and 2026-08-31 ruling item 3 keeps gate-type
mechanisms on the platform.
