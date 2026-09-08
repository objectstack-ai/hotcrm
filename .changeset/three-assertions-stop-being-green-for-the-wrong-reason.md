---
---

Make three existing assertions inspect the set they already claim to inspect.
Test-only: no new test file, no new assertion, no metadata change.

**The field-level-security guard's filter half had never once run.**
`test/authorization-coverage.test.ts` — *"a masked (unreadable) field is never
filtered or sorted on by a view"* — walked `node.filters` (plural). No
view/page node schema in `@objectstack/spec` has that key: `ListViewSchema`,
`ViewTabSchema` and friends all declare a singular `filter` array of
`ViewFilterRuleSchema`, and where `filters` *does* appear in the spec is in the
alias tables (`chart.zod.ts`, `app.zod.ts`), as a spelling the protocol
normalises away. Because the walk reads the **authored** object rather than the
normalised one, the alias never rescued it. Measured on this app: `filters` is
present on **0** walked view nodes, `filter` on **29**, `sort` on **39** — so
the sibling `sort` half was live the whole time, which is why the assertion
looked healthy. Paired legs in the same file and command: a masked field
planted in a node's `sort` was RED before and after; the same field planted in
that node's `filter` — the exact case the assertion names — was **GREEN**
before and is **RED** now. The guard is green on this repo's real metadata, so
nothing was authored wrong; the guard simply could not fire.

**A disjunctive anti-vacuity guard protected neither population.**
`test/flow-record-change.test.ts` guarded the `lead_assignment` branch tests
with `expect(h.notifications.length + h.store.crm_task.length)
.toBeGreaterThan(0)`. A sum over two populations proves neither is non-empty —
the failure mode an author reaches for when already thinking about vacuity.
Here the task disjunct can never contribute: `lead_assignment` authors
`update_record` and `notify` and **no `create_record` node at all**, so its
"SLA" is a `next_followup_date` stamp on the lead and never a task row. Each
guard now asserts the population the flow actually writes. Measured: with the
hot-lead alert edge retargeted away from `notify_hot` and one pre-existing
`crm_task` row in the store, the sum form stayed green while the alert was
gone; the split form reds.

**An `it.each` row asserted nothing.**
`test/docs-setup-navigation-names.test.ts` skipped exempt spellings with
`if (NOT_BANNED.has(wrong)) continue;`, so the one row whose every spelling is
exempt executed its walker and made zero `expect()` calls — a green
parameterised case pinning no fact, in a table whose own comment says that
entry is "listed so the gloss is pinned live". The exemption was also a
silencer: adding a genuinely retired name to `NOT_BANNED` removed all judgement
of it and the file stayed green. Every spelling is now judged against the same
roster in the direction its entry claims — a banned name must resolve to
nothing, an exempt one must still resolve — through the one assertion that was
already there.
