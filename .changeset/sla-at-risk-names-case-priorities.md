---
---

Prose only — this PR releases nothing to HotCRM users, so the frontmatter above is
deliberately empty (the sanctioned "releases nothing" declaration that
`.github/workflows/changeset-check.yml` documents, on par with the
`skip-changeset` label). No `src/` metadata changed: no object, field, view,
label, filter, option list or colour key — the one `src/` edit is a comment.

The `sla_at_risk` JSDoc on `crm_case` named a priority the object does not have.
It read "open, high/urgent priority cases", but `crm_case.priority` is
low/medium/high/critical — `urgent` is `crm_task` vocabulary — and the filter
underneath selects `['high', 'critical']`. The comment now names High and
Critical, and records why the two vocabularies must stay apart: the mirror-image
crossing already shipped a real defect once, when the task view carried Case
colour keys (`critical`/`medium`) and left every urgent and normal row
uncoloured.
