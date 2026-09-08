---
---

CI configuration only — this PR ships nothing to HotCRM users, so the
frontmatter above is deliberately empty (the sanctioned "releases nothing"
declaration that `.github/workflows/changeset-check.yml` documents, on par with
the `skip-changeset` label).

The 16 pre-existing `color:` values in `.github/labels.yml` are now quoted
strings, matching the 22 entries #1795 appended. Two of them are valid YAML 1.2
float literals and resolve as numbers rather than colours — `ci/cd`'s `6e5494`
to Infinity and `upstream:objectstack`'s `5319e7` to 53190000000. The other 14
are safe only by accident. No colour, name, description or ordering changed, and
no `src/` metadata was touched.
