---
'hotcrm': patch
---

Stop `docs/README.md` ordering the next maintainer to hand-copy object fields into
`docs/developers/api_reference.md`. Two statements about that page were left stranded when
PR #1495 replaced its transcript with a pointer at source, and one of them is the standing
order that manufactured the drift PR #1495 measured:

- Step 3 of "Maintain The Docs" read `Update docs/developers/api_reference.md when object
  fields change` — an instruction to perform the act 2026-08-31 ruling item 5 forbids by
  name, aimed at a page that now states in its own words that field lists are deliberately
  not restated on it. A reader following it faithfully re-creates the fifteen `Key fields:`
  lists PR #1495 removed, and the count of copies starts over at one.
- The Start Here row was labelled `Object field reference`, which described the page as it
  was rather than as it is. Post-#1488 the page states where object and field metadata is
  declared and which command counts it; it reproduces neither list.

Both lines are **reworded in place rather than deleted**, which is the same shape the same
ruling's earlier cleanups landed: `docs/ARCHITECTURE.md` kept its `engines.protocol`
sentence and repointed it at `objectstack.config.ts` (PR #1476), and `docs/MAINTENANCE.md`
kept step 2 of its own numbered per-PR loop and repointed it at `src/translations/`. Both
carry a `*Supersedes … — 2026-08-31 ruling, item 5.*` note, and this one follows them.
Deleting step 3 was the alternative and it is safe — nothing in the repo cross-references
"step 3" of this list, so the renumbering breaks nothing — but it answers the question the
step asked with silence. The step exists because someone wanted the field reference to stay
current; a checklist that simply drops the entry leaves the next maintainer facing an
`api_reference.md` row in the index with no maintenance rule attached, and re-adding a table
is the cheapest thing they can do about it. That is how one roster reached four files
(#610, #965, #977, #1228 record the same class). A negative instruction is enforceable by a
reader; an absent one is not.

So step 3 now says what to do instead: leave the page alone, because the `fields:` block of
`src/objects/*.object.ts` is the reference — editing the object file *is* updating it.
Steps 1 and 5 of the same list already carry the two obligations an object-field change
really does have: the business-concept docs under `content/docs/` if user-facing behaviour
changed, and the checks in `docs/STATUS.md`, where `pnpm validate` is authoritative for
object and field counts.

Measured rather than assumed: lines 20 and 63 are the only two places in `docs/README.md`
that describe `api_reference.md` as carrying field lists (the file's other two "reference"
hits, lines 6 and 28, describe the `docs/` tree as a whole), and `docs/README.md:63` is the
only standing instruction of this kind anywhere in `docs/`, `.github/`, `content/docs/`,
`AGENTS.md` or `CLAUDE.md`. No file quotes the old row label, and no guard keys on it.

No guard is added or retired: 2026-08-31 ruling item 3 keeps gate-type mechanisms on the
platform. `test/docs-src-tree-paths.test.ts` lists `docs/README.md` in both `TREE_DOCS` and
`TREE_DIAGRAM_DOCS`; the guard is untouched and green either side of this change, and the
new step-3 text names `src/objects/` inline, so its inline membership has not gone vacuous.
