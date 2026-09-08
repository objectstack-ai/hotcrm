---
---

CI configuration only — this PR ships nothing to HotCRM users, so the
frontmatter above is deliberately empty (the sanctioned "releases nothing"
declaration that `.github/workflows/changeset-check.yml` documents, on par with
the `skip-changeset` label).

`.github/labels.yml` grows from 16 to 38 declared labels, bringing the manifest
into agreement with the label objects that already exist on the repository. No
`src/` metadata changed: no object, field, view, label string, or hook handler.
