---
---

Maintainer documentation only — this PR releases nothing to HotCRM users, so the frontmatter
above is deliberately empty (the sanctioned "releases nothing" declaration
`.github/workflows/changeset-check.yml` documents, on par with the `skip-changeset` label).
Nothing under `src/` or `content/docs/` moves, so the built artifact and the published
documentation site are byte-identical to `main`.

`docs/requirements/README.md` gains one section recording the maintainer's 2026-09-16 ruling **as
adopted rather than as typed**: the PM put this wording to the maintainer, who adopted it with
「其他同意」 ("agreed to the rest"), so the sentence is the PM's drafting carrying the maintainer's
decision, quoted exactly and kept untranslated:

> 写时为真的陈述冻结；写下时就已失效的路径按错误改正。这条写进 `docs/requirements/README`，以后不再逐卡吵。

The section is written as a criterion rather than a conclusion, so a reader can decide a
record nobody has argued about yet: compare the commit that wrote the sentence against the
commit that moved, renamed or deleted the structure it cites — earlier means the sentence was
true when written and is frozen, later means it named nothing the day it was typed and is a
typo to correct. It gives the cheap shallow-safe measurement (`git ls-tree` in the authoring
commit's own tree, not an ancestry walk), ties the "why" to this file's own opening — these
records are the input an AI agent reads before authoring metadata, so a frozen error protects
no fact and routes the next agent to a path that does not exist — and names the two worked
examples this directory already holds, REQ-0001 (frozen, its commits predate the ADR-0130
move) and REQ-0002 (corrected in PR #1942, its commit lands 29 minutes after that move).

No requirement record changes: REQ-0001 through REQ-0006 and `TEMPLATE.md` are untouched, and
so is `docs/architecture/`, whose document class this section explicitly does not decide.
