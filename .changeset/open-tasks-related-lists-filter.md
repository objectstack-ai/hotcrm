---
'hotcrm': patch
---

**The three "Open Tasks" related lists now actually hide completed tasks.**

Opening an opportunity, a case or a lead and clicking through to **Open Tasks**
used to list every task on the record — the follow-ups still outstanding and the
ones already ticked off, together, under a heading that promised only the first
kind. The count next to it was the count of all tasks. A rep reading the deal
had no way to tell from that card what was still owed.

All three lists now filter to `status != completed`, which is what their heading
has claimed since they were written.

The cause was one authored key in three places, and it never announced itself.
`record:related_list` declares its `filter` prop as an array of rule objects —
`{ field, operator, value }`, `operator` drawn from a closed vocabulary
(`equals`, `not_equals`, `in`, …). None of the three lists used that shape:

- the opportunity's and the case's lists spelled the key `op` and the value
  `neq` — `{ field: 'status', op: 'neq', value: 'completed' }`;
- the lead's list used a bare AST array — `[['status', '!=', 'completed']]` —
  the spelling a `*.flow.ts` node `config` takes, on a surface that does not
  take it.

A rule the component cannot read is dropped, not refused: the page still built,
the artifact still wrote, and the list still rendered, minus its filter. So the
defect had no failing symptom to notice — only a heading that no longer matched
what was under it, on three pages, arriving by two different routes.

A guard in `test/metadata-references.test.ts` now checks both halves against the
component's own props schema: that every authored related-list filter is in the
shape the component accepts, and that every task list still carries a rule
excluding completed work. Nothing about your data changes, and no other list,
flow or view is affected — those surfaces have their own filter spellings and
are unchanged.
