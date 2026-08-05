---
'hotcrm': patch
---

Show the Needs Analysis stage on the opportunity path and tint its rows in Open
Deals, and guard stage coverage against the canonical picklist.

`crm_opportunity.stage` has **seven** canonical values
(`OPPORTUNITY_STAGE_OPTIONS` in `src/objects/_picklists.ts`), but two pieces of
UI metadata enumerated only six, and both dropped the same one:
`needs_analysis`. On the detail page's `record:path` a deal sitting in Needs
Analysis lit up **no step at all**, so the strip read as though the deal had
skipped straight from Qualification to Proposal; in the Open Deals list its rows
got no stage tint while every neighbouring stage did. Needs Analysis is an
ordinary mid-funnel stage — 40% default probability, `best_case` forecast
category, reachable from Qualification by the object's own state machine and
offered by `mass_update_stage` — so this was six-sevenths of a working feature
presenting as corrupted data on the seventh.

Both sites now carry the stage: the path gains a step between Qualification and
Proposal (funnel order; the two terminal stages stay last), and `rowColor` gains
teal `#14b8a6`, which sits between the cool qualification blue and the warm
proposal amber. The colour is deliberately **not** the `#FFD700` the option
carries in `_picklists.ts` — that map is a separate Tailwind palette, and gold is
one hue step from proposal's `#f59e0b`, so reusing it would have left the two
adjacent stages tinting rows indistinguishably and re-created the bug in a form
harder to see.

`test/metadata-references.test.ts` already checked these two surfaces in one
direction — every value written there must be a real option. That subset check
passes happily on a map that lists six of seven, which is why nothing caught
this. Four assertions add the converse: every value of
`OPPORTUNITY_STAGE_OPTIONS` must appear in every `record:path` bound to
`crm_opportunity.stage` and in every stage-keyed `rowColor`, no two stages may
share a row colour, and the object field must still be built from that same
constant. The expectation is **derived** from the picklist rather than
hand-copied, so an eighth stage cannot ship half-covered — a copied list would
need the same edit as the metadata it guards, and would be forgotten in the same
commit.

Fixes #759.
