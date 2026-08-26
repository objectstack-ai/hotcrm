---
---

Docs only — this PR releases nothing to HotCRM users, so the frontmatter above is
deliberately empty (the sanctioned "releases nothing" declaration that
`.github/workflows/changeset-check.yml` documents, on par with the
`skip-changeset` label). No `src/` metadata changed: no object, field, view,
label, page or hook.

Stop fifteen product-docs pages printing a **Tab** column of strings the console
never renders. The object-view switcher labels each tab with the target view's
`label`; `list.tabs[].name` was inert and #1316 deleted the key outright. The
authored names had already shipped to customers, in three locale faces:
`service/cases`, `sales/activities`, `marketing/campaigns`, `revenue/products`
and `sales/meetings-and-calls`.

Where a **View** column already carried the real label, the invented **Tab**
column beside it was a second name for the same thing, so it is collapsed away
and the lead-in now says the tab carries the view's own name. Where the **Tab**
column was the only name column (`meetings-and-calls`), it is filled with the
labels themselves — the shape `revenue/contracts` already ships.

`sales/activities` also asserted the false model in prose before tabulating it:
"Three of the tabs are named for the job rather than for the view they open, so
both names are given" — all eight differed, not three — and its Chinese faces
went further, claiming tab names are not translated by the locale pack while
view names are. Both claims are deleted.
