---
'hotcrm': patch
---

Redraw the customization landing page's `src/` tree from the real repository, and
put the page under the docs-drift tree guard.

`content/docs/customization/index.mdx` (and both Chinese locales) is the twin of
the developer page fixed in #984: it drew an `agents/` branch in the `src/` tree
and listed `*.agent.ts` in the file-suffix table, both of which went away with
the two app-owned copilots. HotCRM authors skills and the agent comes from the
platform, so a reader following this page was being pointed at a directory and a
file suffix that no longer exist.

The tree was reconciled directory by directory rather than only having the dead
branch cut out, so it now lists all eighteen directories `src/` actually
contains: `hooks/`, `datasets/`, `mappings/`, `docs/` and `interfaces/` were
real and missing from it, and every branch states what it actually holds. The
"What you can build" table billed the AI skills page as "Copilot skills and
agent wiring"; the wiring it referred to is gone, and exporting from the skills
barrel is the whole of it.

The page then joins `PRODUCT_TREE_DOCS` in `test/docs-drift.test.ts`, the guard
#984 built for exactly this defect class and left a note in pointing at this
page. Membership covers both of that guard's axes at once, since the tree-diagram
list is derived from the product list.
