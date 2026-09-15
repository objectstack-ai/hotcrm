---
---

Internal only: `test/docs-src-tree-paths.test.ts` — the guard whose contract is "a doc must
not advertise a directory that is gone" — was green over the defect on both of its axes, and
both are now closed (#1923).

**Form.** The inline extractor required a trailing slash, and a Mermaid node label does not
write one, so the flowchart in `docs/ARCHITECTURE.md` named 13 directories ADR-0130 had
deleted while the page sat enrolled in the guard's own list. The requirement is gone, held
honest by two lookaheads that keep a file under `src/` (`src/index.ts`) from reading as a
directory claim. Measured over the whole repo, the loosening adds exactly two things across
the guarded doc surface: those 13 dead directories, and four package names that exist.

**File.** The product-page roster was six hand-listed files. 87 pages under `content/docs/`
name a real `src/<dir>` path, so 81 were never looked at — which is why the 426 dead paths
repointed by #1922 never turned anything red, and why the 427th would not have either. The
roster is derived now: a page is enrolled because it names such a path. The drawn-tree roster
is derived the same way, from the `src/` node of the tree itself rather than from the parser
that reads it, so a diagram the parser can no longer follow goes red instead of silently
dropping out. Assertions over the guard: 28 before, 118 after.

**Instruction.** Rule 2's failure message called the app "single-package" and told the next
agent to use five directories that do not exist — inside the one assertion whose prose says "a
path here is an instruction, not prose". It now derives the package names from the tree.

`docs/ARCHITECTURE.md` gets the redrawn flowchart. This PR releases nothing to HotCRM users —
no `src/` metadata and no `content/docs/` page moves — so the frontmatter above is deliberately
empty, the sanctioned "releases nothing" declaration documented in
`.github/workflows/changeset-check.yml`.
