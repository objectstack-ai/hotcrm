---
---

Re-scope nine source comments that asserted `17.0.0-rc.2` **is the pinned**
version, and re-measure every reading they carry on the version this repo
actually pins.

`package.json` has pinned `17.2.0` since PR #1442 — two releases past rc.2 — so
each of these sentences told a maintainer, in the place they read before
deciding whether to re-take a measurement, that a reading was taken on the
current pin when it was not. This is the same defect PR #1466 fixed for the
`17.1.0` family; a grep keyed to one version number could not see this one.

Deliberately **not** a find-and-replace to `17.2.0`. Renumbering would have
converted nine *stale* claims into nine *fabricated* ones. Every reading was
instead re-taken on the current pin, and each sentence now says which pin it was
first taken on, which pin it was re-taken on, and on what date.

**Eight of the nine came back unchanged.** The current-quarter three-way outcome
(`period_start` equality and the `close_date` range), the `{180_days_ago}`
day-start boundary, `{14_days_ago}` reaching the driver already substituted,
`{current_user_id}` interpolating on the read path while `{current_org_id}`
selects nothing, `{today}` selecting exactly the past-due rows, and the
`due_date`-major sort all report on `17.2.0` what they reported on rc.2.

**One did not, and it is the reason the "not a find-and-replace" rule earns its
keep.** `src/views/task.view.ts` recorded that `{TODAY()}` was *not rejected* —
that it fell outside the placeholder grammar, reached the driver verbatim and
compared as text, so a `due_date < '{TODAY()}'` filter matched every row through
the #744 lexicographic inversion, "still live for spellings the grammar cannot
see". On `17.2.0` that is false. `FILTER_TOKEN_WRAPPED_RE` in
`@objectstack/spec/data` widened from `/^\$?\{([a-zA-Z0-9_]+)\}$/` to
`/^\$?\{([^{}]+)\}$/`, which matches `TODAY()`, so the token now classifies as
`kind: 'unknown'` and the read path throws `UnknownFilterTokenError`
(`FILTER_TOKEN_UNKNOWN`, HTTP 400) — the same envelope `{TODAY}` gets. The
change landed at `17.0.0-rc.6`; `test/flow-filter-today-token.test.ts` has
pinned it since #1107. Had the nine been renumbered, that comment would have
gone on describing a live hazard, dated to the current pin, that no longer
exists — and a reader could reasonably have coded around it.

The four comments that already read `17.2.0` correctly are untouched and
byte-identical: they were the control group for telling true claims from false
ones. The roughly forty bare `17.0.0-rc.2` mentions that record *when* a
behaviour was measured are provenance, are historically true, and are untouched
as well.

Comments only — no metadata, schema or behaviour change.
