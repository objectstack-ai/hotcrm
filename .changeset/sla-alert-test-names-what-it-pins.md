---
---

Test-only — this PR releases nothing to HotCRM users, so the frontmatter above is
deliberately empty (the sanctioned "releases nothing" declaration that
`.github/workflows/changeset-check.yml` documents, on par with the
`skip-changeset` label). Nothing under `src/` changed: `lead_assignment` behaves
exactly as it did, and no object, field, view, label, page, hook or translation
string moved. The one file this PR touches is `test/flow-record-change.test.ts`.

**A test title was the only place in the repo that promised an SLA task.**
`lead_assignment` authors `start · decision · update_record ×2 · notify ×2 · end`
and no `create_record` node at all: its "SLA" is a `next_followup_date` stamp on
the lead plus an alert addressed to the lead owner. It cannot produce a
`crm_task` row on any input. The test named *"sends every SLA task to the lead
owner, never a dot-walked manager"* nevertheless walked `h.store.crm_task`, and
that walk inspected zero rows on every input. Ruled (decision batch #91): the
flow was never meant to create a task, so the name is what is wrong. The walk is
deleted rather than made to assert that the app does nothing, and the test is
renamed to the assertion that remains.

**Inertness, measured, not argued.** With the walk's assertion inverted so that
*any* row it inspected would fail it, the test stayed green — it inspects none.
The same ablation on the surviving notification walk reds, so that one inspects a
real row (one per rating; its payload is `{"to":["rep1"],…}` — the lead owner).

**The new title is what the assertion checks, which is narrower than the old title
claimed and narrower than "the SLA stamp and the owner-addressed alert".** The
`next_followup_date` stamp is pinned by a different test in this file —
*"lead_assignment stamps the SLA on an integration-written lead"*, which seeds a
`crm_lead` row and reads the stamp back; breaking the stamp reds that test and
leaves this one green. And this test asserts only that no field of the emitted
notification renders as the literal string `undefined`; it does not assert who
the recipient is. On the pinned engine (17.2.0) an unresolvable recipient no
longer interpolates to `undefined` — the `notify` node fails and emits nothing —
so the dot-walk the old title named now reds the two branch tests above it
instead. Five flow mutations were tried (`{record.owner_id.manager_id}`,
`{record.owner.manager_id}`, `{record.manager_id}` as recipients; two dot-walked
title templates; the `next_followup_date` field name) and none of them reds this
test. It is live but, through those five, unfalsifiable — recorded here rather
than fixed, because this change is a rename and a deletion.

No new test, no new assertion, no new file: the repo's test file count is
unchanged at 164.
