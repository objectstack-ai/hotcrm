---
'hotcrm': patch
---

Correct the two sentences in the packaged Sales guide that still promised a
manager notification neither flow sends.

`src/docs/crm_sales.md` is a package doc: ADR-0046 collects it whole into
`dist/objectstack.json`, so it ships to every reader of the app, not just to
whoever opens the file in the repo. Two of its automation paragraphs named a
recipient that does not exist:

- **Stalled-deal nudge** — *"The owner and their manager are notified"*. The
  daily sweep in `src/flows/opportunity-stagnation.flow.ts` has exactly one
  `notify` node, addressing `{currentOpp.owner_id}` on inbox + email. There is
  no manager, position or team recipient anywhere in the flow; the node header
  records why (`{currentOpp.owner_id.manager}` cannot traverse a lookup in flow
  templates and interpolates to the literal `undefined`).
- **Won-deal alert** — *"the owner and manager are notified automatically"*.
  This is the same claim #851 already removed from the Automation page table and
  from the flow's own `description`, surviving here because it is spelled
  *"owner and manager"* rather than *"owner and their manager"* and so escaped
  that search. `src/flows/opportunity-won-alert.flow.ts` notifies
  `{record.owner_id}` alone, for the same lookup-traversal reason.

Both now read *the owner alone, not their manager* — the wording already landed
in the flow `description` (#851) and the node `label` (#869), so the app tells
one story about who gets paged. Everything else in the two paragraphs is
accurate and untouched: the 07:30 schedule, the 14-day threshold, the
high-priority follow-up task, and the $100,000 trigger amount.

Documentation only. No flow, node, condition or recipient changed. Fixes #875.
