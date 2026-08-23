---
'hotcrm': patch
---

Stop `AGENTS.md` teaching the broken related-list filter spelling. The ObjectQL
section — the paragraph every metadata author reads before their first edit —
described a page component's `filter:` as taking "the AST-array form" and cited
`src/pages/lead_detail.page.ts:217` as the canonical example. That line is
`filter: [['status', '!=', 'completed']]`, and `objectstack build` rejects it:
`record:related_list: filter.0: Invalid input: expected object, received array`.
The AST array is not a second legal spelling. It is dropped, and the list then
renders unfiltered — on that page, an "Open Tasks" list that lists completed
tasks.

The paragraph now states the shape the schema actually declares. A page
component's `filter:` is whatever that component's entry in `ComponentPropsMap`
(`@objectstack/spec/ui`) says it is; for `record:related_list` that is an array
of rule objects, `[{ field, operator, value }]`, with `operator` drawn from a
closed vocabulary and no other key accepted — which is why the `op:` shorthand
is rejected too (`Unrecognized key(s) on this filter rule: op`). No in-repo line
is cited in its place, deliberately: all three `record:related_list` filters
currently under `src/pages/` are one of those two rejected forms (#1248), so a
citation to any of them would rebuild the same trap with a different line
number. The instruction points at the schema instead.

The prohibition that followed — "Do not 'fix' one surface's spelling into
another's" — is narrowed to the hazard it was written for. Flow `filter:` versus
hook `where:` genuinely are two surfaces, and that half is kept verbatim in
effect; but the sentence had been stretched to cover a case where there is no
second surface, only one correct shape and one the build refuses. It no longer
reads as licence to ignore a component's declared props.

Also refreshed the flow-side measurement in the same paragraph, which had
drifted: `filter:` now appears 47 times across 18 of the 22 `*.flow.ts` files
(was 44 / 17 / 21), and `where:` still appears in none of them.
