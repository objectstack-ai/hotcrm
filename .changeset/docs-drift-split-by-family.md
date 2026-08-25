---
---

Test reorganisation only — this PR releases nothing to HotCRM users, so the
frontmatter above is deliberately empty (the sanctioned "releases nothing"
declaration that `.github/workflows/changeset-check.yml` documents, on par with
the `skip-changeset` label).

`test/docs-drift.test.ts` was split along the thirteen `describe` seams it
already had, into seven sibling `test/docs-*.test.ts` files, plus the pointer sweep that
keeps the comments naming those families accurate. The suite is identical either
side of the split: same tests, same names, same assertions, none added and none
removed. No `src/` metadata behaviour changed — no object, field, view, label or
hook handler logic — and the only `content/docs` edit is the guard filename
inside one parenthetical on the dashboards page (all three locales), which is a
pointer for maintainers rather than product copy.
