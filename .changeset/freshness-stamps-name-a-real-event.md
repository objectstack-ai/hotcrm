---
'hotcrm': patch
---

Two documents in `docs/` asserted their own freshness with a hand-written date that nothing
produced, nothing checked and nobody had updated since the day it was typed. Neither date is
bumped here — bumping is the one move that must not happen, because it converts an obviously
stale assertion into a plausibly fresh false one and manufactures exactly the claim the line
was making without backing.

They did not resolve the same way, and the difference is the point.

`docs/README.md` read `> Last reviewed: June 4, 2026`. Measured: that string entered the file
in the single commit that created the tree's current form — a reorganisation, not a review —
and the pickaxe finds no second commit that ever touched it, across every ref. Six commits
have maintained the file since, each repointing a row or a step, and not one of them moved the
stamp. So the file **is** maintained; its stamp never was. There is no review cadence, no
reviewer and no producer behind that date, which makes it the weakest form of the class: a
reader cannot tell "read on that date and unchanged since" from "typed once and never
revisited", and the line asserts the first while the history shows the second. The header now
states the mechanism that actually keeps the index true — a PR that adds, moves, retires or
renames a document under `docs/` updates the tables in the same PR — and points at `git log`
for the one freshness record that cannot go stale. It is reworded in place rather than
deleted, following PR #1569 on this same file: an absent instruction is not enforceable by a
reader, and a header that simply loses its maintenance sentence invites the next person to
add a fresh one.

`docs/feature-inventory.md` read `> 最后清点日期:2026-08-07。` — same class by shape, opposite
disposition on measurement. That date names an event that really happened: the full
count-from-`src/` compile that created the file. It is also **load-bearing**, which a delete
would have broken. The 「总览统计(清点时点)」 block is scoped to it, and those figures have since
drifted hard — of nine spot-checked, six no longer match the tree (objects 17→18, flows 21→22,
dashboards 5→7, reports 10→6, datasets 9→10, profiles 6→8). The date is the only thing making
that block true; remove it and a frozen reading starts reading as a claim about today. So the
stamp is kept and reframed, the shape PR #1705 landed for the module-split inventory: it now
says in words that it is an event date rather than a freshness claim, that rows are maintained
incrementally under the file's own 「锚点即真相」 rule, that incremental maintenance does not
move the date, and that hand-editing the overview figures to match today's tree is not a
count — it swaps an honest old reading for an unsourced new one.

The population was re-derived by meaning rather than by phrase, across `docs/` and
`content/docs/`, because the two stamps share a semantics and share nothing lexically: a search
for the English wording cannot reach the Chinese one. No third instance of this defect exists.

No gate and no test is added: 2026-08-31 ruling item 3 keeps gate-type mechanisms on the
platform. `test/docs-src-tree-paths.test.ts` lists `docs/README.md` in both `TREE_DOCS` and
`TREE_DIAGRAM_DOCS` and `test/docs-role-hierarchy.test.ts` scans it; all three read `src/<dir>/`
paths and a forbidden-term list, none pins the header, and every one is green either side.
