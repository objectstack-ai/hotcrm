---
---

Tests only — this PR releases nothing to HotCRM users, so the frontmatter above
is deliberately empty (the sanctioned "releases nothing" declaration that
`.github/workflows/changeset-check.yml` documents, on par with the
`skip-changeset` label). No `src/` metadata changed: no object, field, view,
label, or hook handler logic.

The retired-copilot-persona guard read `content/docs/**` only. It now also reads
the authored metadata in `src/`, via the resolved stack, so a retired persona
name cannot re-enter user-visible app copy — a card `title`, a view's
`emptyState`, a skill `description`, or any of the four locale packs — the way
one previously survived for months with every gate green. The rule was measured
before it was written and is green on the day it lands: 0 hits across all 20,578
authored strings.
