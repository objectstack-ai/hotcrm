---
---

Test-only — this PR releases nothing to HotCRM users, so the frontmatter above is
deliberately empty (the sanctioned "releases nothing" declaration that
`.github/workflows/changeset-check.yml` documents). No `src/` metadata changed: no object,
field, view, label, flow or hook, and no `content/docs` page.

`test/docs-zh-hant-justification.test.ts` is new. It gates the zh-Hant navigation
convention's justification on the reason `AGENTS.md` sanctions, which nothing in CI read
before: a passage that names platform navigation in English must state, in the same
passage, that the console falls back to Simplified. That correction landed in the rulebook
via #1368 and then took four PRs across two rounds (#1537, #1546, #1549, #1554) to reach
nine reader-facing copies, with nothing going red for the three days they disagreed with
it.

Replayed over that history, the rule is red for the whole window and green only from
#1554 — 7 red of 7 convention passages before #1537, 1 of 9 before #1554, 0 of 9 today.
The last red is the navigation guard's own file header, the site that survived because
that file exempts itself from its own scan. This one takes no exemption: it matches the
assertion rather than the vocabulary, so a passage that quotes the retired reason in order
to forbid it passes on its merits, and its own retired-reason ledger is escaped the way
`docs-object-term-consistency.test.ts` escapes retired spellings.
