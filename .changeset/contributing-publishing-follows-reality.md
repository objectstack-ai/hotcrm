---
---

`CONTRIBUTING.md` only — this PR releases nothing to HotCRM users, so the frontmatter
above is deliberately empty (the sanctioned "releases nothing" declaration that
`.github/workflows/changeset-check.yml` documents, on par with the `skip-changeset`
label). It is a contributor-facing document, no `src/` metadata changed, and the root
package ships no `files` list that could carry it.

§Publishing handed a maintainer `pnpm release` — a script that does not exist in
`package.json` — and described it as running `pnpm build && changeset publish` to
"publish each non-private package". Both halves were false. `hotcrm` is the only
package Changesets sees and it is `private: true`, so `changeset publish` names an
empty set; the app has always shipped through the ObjectStack marketplace, which the
section's own closing note already said correctly three lines below the wrong command.

That correct answer is now the body: the section states that nothing here goes to an
npm registry, hands over `pnpm publish:marketplace:dry-run` / `pnpm publish:marketplace`,
and links `docs/RELEASE_STRATEGY.md` as the single source of truth for the release
sequence rather than restating its checklist. The paragraph claiming `.ts` sources are
never published — and the `files` field it cited, which this `package.json` does not
have — went with it: both described the retired multi-package shape archived under
`docs/archive/`, as did the claim that packages go to a private GitHub Packages
registry, a host that appears nowhere else in the tree.

No `release` script was added. The command that would have been aliased already exists
and is already the right answer, and writing the documented semantics into code would
have turned a wrong sentence into a wrong script.
