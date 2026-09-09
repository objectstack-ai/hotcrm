---
---

Test-only — this PR releases nothing to HotCRM users, so the frontmatter above is
deliberately empty (the sanctioned "releases nothing" declaration that
`.github/workflows/changeset-check.yml` documents, on par with the
`skip-changeset` label). Nothing under `src/` changed: no object, field, view,
label, page, hook or translation string. The one file this PR touches is
`test/hook-input-shape.test.ts`.

`#1778` repaired a guard that scanned a file which could not contain the thing it
looked for, and stayed green for the whole life of the bug. This is the content-
level sweep that followed it: every scan surface under `test/**` re-read against
the stronger question — not "does the walk see a non-empty set?" but "does the
assertion pin that the surface still CARRIES the class the rule matches?"

The farm answered well. Of the surfaces measured, all but one already pin their
content, and several were stronger than expected: `hook-write-shape.test.ts` was
believed blind on the same evidence shape and turned out to carry an equality
cross-reference between its scanned call sites and the writes its runtime half
exercises, which fires on the mutation that was supposed to expose it. That
falsification is recorded here because it is the finding, not a detour: a guard
that looks count-only can be pinned by a rule three blocks away.

The one that was not pinned is `test/hook-input-shape.test.ts`. Its two rules
walk every `.ts` under `test/` and key on one token — a hook handler being
INVOKED, `handler(`. The file already guards its DETECTOR with planted probes,
but nothing in it claimed the scanned tree still holds a call site for that
detector to read, and a file count could not have claimed it either: 175 real
files stay 175 real files whichever way they invoke a hook.

That gap is live rather than theoretical. Measured on this branch's base: 31
files call a handler directly and 13 already reach a hook through
`runHookBody(...)`, a form neither rule matches. The class these rules
discriminate within is migrating out of the surface. Finish that migration and
both rules report clean over a real, non-empty tree carrying nothing they can
judge — `#1755`'s shape, one tree over.

Proved rather than argued, three readings against one mutation. With a hand-built
plain-object ctx planted in the tree, the shipped guard exits 1 and names it, so
the defect is real and detectable. With the surface swapped to a tree that is
real and non-empty but carries no call site (44 files, 0 invocations), the old
assertions exit 0 with 16 passed — the defect live, the guard silent. The new
assertion exits 1 on the same mutation and names file and line.

No new `it`, no new gate: the assertion went into the existing self-test block,
and the file stays at 16 tests. The invocation pattern is single-sourced so the
rule and the surface check cannot come to discriminate different classes. No
surface was widened, and no check was added to a surface that already pins its
content.
