---
---

Comment text and one test only — this PR releases nothing to HotCRM users, so
the frontmatter above is deliberately empty (the sanctioned "releases nothing"
declaration that `.github/workflows/changeset-check.yml` documents, on par with
the `skip-changeset` label). No `src/` metadata behaviour changed: no object,
field, view, label or hook handler logic.

`knowledge_article_publish_timestamps` writes `published_at` under an existence
criterion read off the row (`input.published_at ?? previous?.published_at`). On
a predicate update that is a rewrite CONDITIONED on the row, and ADR-0058
Addendum II D3 makes the payload BATCH-scoped — one payload object shared by all
N per-row dispatches — so it widens to every matched row. Re-measured on current
`main` against a real `ObjectQL` + `InMemoryDriver` with a distinct marker per
dispatch: two articles carrying their own 2024 publish dates each correctly
declined to stamp and were overwritten anyway with the value computed by the one
row that took the branch.

The defect is NOT fixed here, and the reason is a measured platform fact rather
than a judgement call. D3 names three routes for row-specific work — throw,
write per row through `ctx.api`, or have the caller paginate — and all three
require the handler to know it is on the per-row predicate path. Hooks in this
app ship body-only through QuickJS (`test/action-sandbox.test.ts` holds every
registered hook to it), and the sandbox context the runtime builds for a body
carries `input`, `previous`, `user`, `session`, `event`, `object`, `api`, `log`,
`crypto` and nothing else. `ctx.dispatch` is absent; `input.id` and
`input.options` are dropped with it, because the engine hands the body a
flattened payload snapshot whose `id`/`options`/`data` are non-enumerable and
the unwrap copies enumerable own keys only. So the shipped handler cannot
distinguish a per-row batch dispatch from an ordinary single-record update, and
none of D3's three routes is expressible in it.

What this PR ships is the two things that are correct today. The file comment now
states the defect, the measurement, and — load-bearing — that a
`ctx.dispatch?.mode === 'per-row'` guard would lower cleanly, pass every
in-process test in this repo, and be inert in production, which is the shape the
next author is most likely to reach for. And a tripwire test asserts that the
shipped body sees no dispatch mode, no `input.id` and no `input.options`, while
`ctx.previous` does cross; it goes red when the platform starts handing bodies a
per-row signal, which is the blocker lifting rather than a regression.

The comment also narrows a claim the filing card got slightly wrong.
`last_reviewed_at` is not unconditional: it is unconditional only after an early
return that reads the row, so it is row-invariant only when every matched row is
published. Measured on a mixed batch over one published and two draft articles,
both drafts were stamped `last_reviewed_at` by the published row's dispatch.
