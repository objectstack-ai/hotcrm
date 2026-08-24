---
---

Comment text only — this PR releases nothing to HotCRM users, so the frontmatter
above is deliberately empty (the sanctioned "releases nothing" declaration that
`.github/workflows/changeset-check.yml` documents, on par with the
`skip-changeset` label).

Two load-bearing comments asserted, as current fact, a platform behaviour retired
before 17.0.0 GA: that on the bulk path (`multi: true`) there is no `input.id`,
that `sys_fetch_previous_update` fetches nothing, and that the hook therefore
sees no status and stamps nothing. Every clause of that inverts on the pinned
`@objectstack/* 17.1.0`, measured against a real engine rather than inferred: the
bulk path dispatches once per matched row with `input.id` bound to the row and
`previous` bound to its pre-image (ADR-0058 Addendum II), and every published row
a bulk load or mass edit touches is stamped.

Both sites now state current behaviour and keep the rc.2 account explicitly as
history, because each was the recorded justification for a shipped design and a
reader who re-derives that design from a dead premise reaches a stale conclusion
while believing they checked.

The corrections also record a constraint the old text could not have: the
predicate-write payload is BATCH-scoped (ADR-0058 Addendum II, D3), so a payload
rewrite conditioned on the row widens to every matched row.

No `src/` metadata changed — no object, field, view `filter`, label or hook
behaviour — and the app bundle is byte-identical.
