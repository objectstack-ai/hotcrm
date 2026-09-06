---
---

Internal design documentation only — this PR releases nothing to HotCRM users, so the
frontmatter above is deliberately empty (the sanctioned "releases nothing" declaration that
`.github/workflows/changeset-check.yml` documents, on par with the `skip-changeset` label).
Nothing under `src/` changes and the built artifact is identical.

`docs/architecture/module-split-inventory.json` told its next maintainer to do something
nobody could do. Its header read *"Generated for `docs/architecture/module-split-plan.md`.
Regenerate from the artifact; never hand-edit"*, and it carried a commit stamp — but there is
no generator in this repository, and the commit that added the file says one was
**deliberately not committed**, because a one-off analysis script that produced a design
artefact is not a gate (AGENTS.md, *Do not build platform-level tooling here*). So the only
permitted action did not exist and the only available action was forbidden. Doing nothing was
the rational move, which is exactly why the file went stale — and the `generated` stamp made
it worse, because a file that claims to be derived from a commit is read as fresh.

The header now says what is true and what can be done: the file is **hand-maintained**, there
is no generator and there will not be one, and an edit is recorded in a new `$hand_edits`
list. The `generated` block becomes `measured_at` — the stamp survives, reframed from a
generation claim into a measurement stamp, because `module-split-plan.md` anchors its own
*"Measured against"* line to it. A `$maintenance` block names who updates the file, when, and
which figures must be left alone: the token counts, totals and edge verdicts are one reading
taken at the stamped commit, they cannot be re-derived by hand, and adjusting them to look
current would be the same lie in a new place.

`module-split-plan.md` carried the other half of the contradiction — a section titled *"how to
regenerate the inventory"* that ended *"regenerate rather than patch it"* while the paragraph
above it explained that the generator is deliberately absent. That decision stands and is kept;
the impossible instruction is replaced by the possible one.

One roster row is dropped: `src/flows/case-csat-followup.flow.ts`, whose file was deleted after
the measurement. Auditing the whole roster rather than that one row showed the file was never
wrong — `files[]` was a 171/171 exact match for `src/**` at its stamped commit. Every other
difference against today's tree is 119 commits of movement, not error: 34 authored files added
since the measurement have no row. That is a snapshot behaving like a snapshot, so the counts
stay as measured and the drift is recorded in `$hand_edits` instead of being silently patched.
