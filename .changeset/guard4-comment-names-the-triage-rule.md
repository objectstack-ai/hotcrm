---
---

Comment text only — this PR releases nothing to HotCRM users, so the frontmatter
above is deliberately empty (the sanctioned "releases nothing" declaration that
`.github/workflows/changeset-check.yml` documents, on par with the
`skip-changeset` label). No `src/` metadata behaviour changed: no object, field,
view, label, sharing condition or hook handler logic. The change is provably
inert — the comment-stripped text of the only touched file is byte-identical
before and after.

`case_self_claim`'s guard 4 in `src/objects/_case-assignment.ts` described the
triage sharing grant as drawing its line with `is_closed == false`. It has not
drawn that line since #1145: `case_unassigned_triage_sharing` reads
`record.owner_id == null && record.status != "resolved" && record.status !=
"closed"`. The guard itself is correct and unchanged — this was #1327's
unfinished second half, the same false "these two are the same rule" claim in
the same file, one screenful below where that card's header fix landed.

The correction states the asymmetry positively rather than only deleting the
false clause, because a comment that merely drops an error can rot back to it.
Guard 4 stops at `closed` alone because reopening a resolved case is picking the
work up, so whoever does it should own it; the sharing grant excludes `resolved`
as well because a resolved unowned case is history, not backlog, and the triage
tab's row count has to keep meaning "work waiting for a human". The gap between
the two is live for exactly the callers the sharing rule does not reach — an
admin, a manager holding the escalation share — which is why
`test/unassigned-case-triage-reach.test.ts` drives the closed guard once per
layer, the second time with an actor that can reach the row.

It also disambiguates the hazard that makes the naive correction wrong.
`src/sharing/case.sharing.ts` holds three conditions and two of them do draw
with `is_closed == false` — the manager and director grants on critical-priority
cases, which keep standing reach through the `resolved → closed` review window
under their own ⚠️ headers. The comment now names the unowned/triage grant
specifically and says in so many words that those two are neither this rule nor
drift, so a reader arriving at the file with "align them" in mind is stopped at
both ends.

The file's other five `is_closed` mentions were read and left alone: they explain
why the load-balancing counts use `$nin` over statuses *instead of* the flag,
which is the opposite claim and still true.
