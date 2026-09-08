---
---

Comment prose only — this PR releases nothing to HotCRM users, so the
frontmatter above is deliberately empty (the sanctioned "releases nothing"
declaration that `.github/workflows/changeset-check.yml` documents, on par with
the `skip-changeset` label). No `_sections` key changes, so no label a user can
see moves, and comments do not survive into the built artifact.

All four locale bundles introduced the `crm_lead._sections` form-section keys
with a comment that counted the forms they came from — the `en` one read "the
default form and its **six** named formViews", and `zh-CN` / `ja-JP` / `es-ES`
each carried the same figure in their own wording. `src/views/lead.view.ts`
declares **seven** named `formViews` today and declared eight until
`quick_create` was removed, so the number was wrong before that removal and
wrong after it. Nothing produced it and nothing checked it.

The four comments now state the **principle** rather than a figure: the sections
of the default form and of every named `formView` live here — add a form there,
add its section names here. Re-numbering to seven would only re-arm the trap,
because the next named form makes any figure stale again; a count written beside
a list that keeps growing is a copy of a fact the neighbouring file owns, and a
second copy is a second thing to drift. This repo has ruled the same way on
dates in seed prose, absolute or relative, for the same reason.

The reuse note the `en` comment carries is kept and is still true: `address` and
`qualification` are declared earlier in the block (identical `fieldGroup`
wording) and every other name below the comment is new. That sentence names
identifiers rather than counting them, so it cannot drift the way the figure did.

Nothing else moves: no `_sections` key, no other translation entry, and
`src/views/lead.view.ts` itself is untouched.
