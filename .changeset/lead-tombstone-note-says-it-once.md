---
---

Comment text only — this PR releases nothing to HotCRM users, so the frontmatter
above is deliberately empty (the sanctioned "releases nothing" declaration that
`.github/workflows/changeset-check.yml` documents, on par with the
`skip-changeset` label). The one changed line is inside a TypeScript comment in
`src/objects/lead.object.ts`, that file's comment-stripped, blank-stripped source
is byte-identical to the base commit, and `dist/objectstack.json` hashes to the
same sha256 built from either side.

The closing sentence of the `crm_lead` duplicate-tombstone note appeared verbatim
on two consecutive lines. The second copy is deleted; nothing else in the
paragraph moved.

The paragraph is worth the card because it is load-bearing: it explains why a
tombstoned (`erased`) duplicate type still satisfies
`duplicate_disqualification_requires_survivor`, i.e. why a GDPR erasure can
complete against a lead a human confirmed as a duplicate **without** deleting the
verdict that reviewer recorded. A reader who meets the same sentence twice
concludes the block was edited badly and discounts the argument around it.

Swept as a class rather than fixed as an instance, because this line had already
survived the `src/objects/` comment sort that judged 347 blocks in this very
folder — a sweep's blind spot is the thing adjacent to what it came for. Three
instruments over all 201 `src/**/*.ts` files (15,706 comment-only lines, 1,927
comment blocks), each first shown to catch this known instance: adjacent
identical comment lines after prefix/indent normalisation, the same with internal
whitespace and case collapsed, and sentences repeated inside one comment block
after re-wrapping. All three found exactly one pair tree-wide, and it is this one.
