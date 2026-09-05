---
---

Repository tooling only — this PR releases nothing to HotCRM users, so the
frontmatter above is deliberately empty (the "releases nothing" declaration
`.github/workflows/changeset-check.yml` documents, on par with the
`skip-changeset` label). Nothing under `src/` changed: the diff is the source
token ratchet gate and its own test suite.

The source token ratchet no longer tells every run to re-anchor a **ruled**
ceiling. Its opportunistic-tightening advisory offers to re-derive a ceiling
from the current reading, which only means something for an ANCHORED ceiling —
one that was derived as `anchor(reading)` in the first place. A RULED ceiling is
a maintainer grant that no reading derives, so the advisory was asking authors
to hand back exactly the headroom the ruling had been made to create, and an
agent following it in good faith would have undone the ruling with no check
objecting.

The ruled/anchored distinction previously existed only in the gate's header
prose. It is now declared in the code beside each committed ceiling, the
advisory asks it at the one place it fires, and the ruled row prints what it is
instead of a nag. The advisory is unchanged for anchored ceilings, which still
receive it whenever their headroom passes twice the ruled buffer.
