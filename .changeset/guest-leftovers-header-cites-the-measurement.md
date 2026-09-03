---
---

Comment only — this PR releases nothing to HotCRM users, so the frontmatter
above is deliberately empty (the sanctioned "releases nothing" declaration that
`.github/workflows/changeset-check.yml` documents, on par with the
`skip-changeset` label). Nothing under `src/` changed: no object, field, view,
label, page or hook. The touched file is `test/case-guest-branch-leftovers.test.ts`
and only its header docblock moved — the suite is byte-identical below the
comment and asserts exactly what it asserted before.

That header still told a reader the `plugin-security` middleware path was
unmeasured, and instructed them how to read a failure of the cases below it on
that basis: "nothing below is evidence that a guest reaches these columns in
production, and a failure here should not be read that way either." The premise
had been answered. PR #1515 retired the identical sentence from
`src/objects/case.hook.ts` after measuring the path against a real server, and
this file was the surviving twin. Left standing, it would make the next reader
either redo a measurement that already exists or under-read a real red.

**The replacement cites that measurement; it does not re-take it, and says so
in the header itself.** The route readings are marked INHERITED from #1515 and
explicitly not re-run here, and the header points at `case.hook.ts` — which
carries the full route table at the branch these cases exercise — rather than
keeping a second copy of the table that could drift from it. Re-badging another
round's reading as this file's own would have been the same defect the card
exists to fix, one file over.

Two things are held rather than flattened, because the reassuring one-sentence
summary is wrong in both directions:

- **The answer is per-column.** `web_to_case` declares exactly `subject`,
  `description`, `type` and `priority` (`src/views/case.view.ts` — the one list
  re-read for this change), and the surviving anonymous route allow-lists the
  body against that. So `escalation_reason` is dropped before ObjectQL and
  before the hook, and a guest does not reach it on the shipped app; but
  `priority` IS declared — the form asks the guest for it — so a guest does
  reach that column, by design. "A guest does not reach these columns in
  production" would have been false of the second one, and it is the column
  item 2 of the file is about.
- **The 401s do not make the guest branch redundant.** What holds is the form's
  declared field list — a product decision, not a security declaration —
  measured as such in #1515 by widening the form by one field, after which the
  same anonymous POST stored the planted value.

The original sentence's care is kept, not swapped for confidence pointing the
other way: these cases call ObjectQL directly with a guest context and make no
HTTP request, so a red below is still a statement about the hook branch and
nothing else.
