---
---

`AGENTS.md` only — this PR releases nothing to HotCRM users, so the frontmatter above is
deliberately empty (the sanctioned "releases nothing" declaration that
`.github/workflows/changeset-check.yml` documents, on par with the `skip-changeset`
label). No `src/` metadata changed: no object, field, view, label, flow or hook.

What landed is the twelve-principle "pure metadata application" chapter tree distilled
from the 2026-08-31 ruling corpus (verbatim source: objectstack#13848), merged into the
file's existing structure rather than appended as a list — scope and platform-defect
behaviour under the Scope chapter, documentation discipline under the Constraint
Checklist, authoring semantics as a new Metadata semantics chapter, ruling discipline as
its own short chapter — plus the contradiction sweep those principles forced: four
passages that disagreed with them were superseded in place, each with a one-line note
naming the ruling.

A later ruling from the same day closes the Metadata semantics chapter with the
escape-hatch clause: a layout escape hatch (authoring `record:details` sections, or
enumerating fields in a view's `form.sections`) is for the extreme, customer-demanded
case only, and the default ladder is `fieldGroups` derivation first, the group-reference
form second, per-field enumeration last and commented.
