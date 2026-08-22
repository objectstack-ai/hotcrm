---
'hotcrm': patch
---

Redraw the developer page's repository tree from the real `src/`, and teach the
docs-drift guard to read a tree diagram.

`content/docs/getting-started/for-developers.mdx` (and both Chinese locales)
still drew an `agents/` branch in the `src/` tree, still listed `*.agent.ts` in
the file-suffix table, and still ended the "Add an AI skill" recipe with "add
the skill name to the relevant agent in `src/agents/`". That directory and that
suffix were deleted with the two app-owned copilots: HotCRM authors skills, and
the agent comes from the platform. A developer following the page was being sent
to create a file under a path that does not exist, and to perform a wiring step
that no longer exists — exporting the skill from `src/skills/index.ts` is the
whole of it.

The tree was checked branch by branch while it was open, so it now matches the
repository it claims to describe: `hooks/`, `mappings/`, `docs/` and
`interfaces/` are real directories that were missing from it, and every branch
states what it actually holds.

`test/docs-drift.test.ts` owns exactly this defect class and could not see any
of it, because two blind spots overlapped: it scanned only the maintainer docs
(`README.md`, `AGENTS.md`, `docs/*`), never `content/docs`, and it matched only
paths written with a literal `src/` prefix in a sentence — while a tree diagram
draws the branch as `agents/`, with the prefix stripped by the drawing itself.
Both axes are now covered: the product page is scanned for inline paths, and
every doc that draws a `src/` tree, maintainer or product, has its branches
resolved against the real tree. Each new check refuses to pass vacuously — a
page whose diagram stops parsing fails loudly instead of silently checking
nothing.
