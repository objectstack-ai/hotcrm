---
---

Tooling only — this PR releases nothing to HotCRM users, so the frontmatter above
is deliberately empty (the sanctioned "releases nothing" declaration
`.github/workflows/changeset-check.yml` documents, on par with the
`skip-changeset` label). No `src/` metadata changed: no object, field, view,
label or hook handler logic.

`CLAUDE.md` arrived at the repo root in #1830 as the pointer file agents read
first, and landed outside `ROOT_TEXT_FILES` — the explicit whitelist the source
hygiene gate reads the root through. The gate cannot walk the root (it holds
`node_modules`, build output and every tree already scanned), so the whitelist
is the surface, and the surface module states the cost of that choice in the
same breath as the choice: a whitelist cannot notice a NEW first-class root
file, so adding one means adding it here.

The consequence was measured rather than inferred. With a raw `0x01` planted in
`CLAUDE.md` and the whitelist untouched, `pnpm hygiene` exits **0** and prints
"no raw control bytes in first-party files" — the byte is not missed, it is
never read. With `'CLAUDE.md'` on the list the same tree exits **1** and names
`CLAUDE.md: 1 control byte(s)` by path. That is the whole change: one entry,
alphabetically between `CHANGELOG.md` and `CONTRIBUTING.md`.

The reason this file belongs on the list is the reason `AGENTS.md` was put there
in #838 — it is what agents grep daily, and a control byte drops a line out of
text search while leaving it on screen. A pointer file that cannot be searched
points nowhere.

No test changed, and that was checked rather than assumed: #1314 made the three
sandbox suites import this list instead of copying it, so all three now
materialise a `CLAUDE.md` fixture, `test/source-hygiene-scan-surface.test.ts`
derives its banner assertion from `ROOT_TEXT_FILES.length` (15 root file(s) to
16), and its per-file `it.each` gains a case (53 tests to 54). No reader
hard-codes the count.
