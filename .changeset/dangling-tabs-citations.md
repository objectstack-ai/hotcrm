---
---

Prose only — this PR releases nothing to HotCRM users, so the frontmatter above is
deliberately empty (the sanctioned "releases nothing" declaration that
`.github/workflows/changeset-check.yml` documents, on par with the
`skip-changeset` label). No `src/` metadata changed: no object, field, view,
label, page or hook — the one `src/` edit is a comment.

Two residuals #1316 left behind, unrelated except in cause. One was **wrong**;
the other had merely gone **empty**.

`docs/feature-inventory.md`'s OPP-009 row was wrong on both halves. Its source
citation pointed at `src/views/opportunity.view.ts`(`list.tabs`) — a key #1316
deleted from every view file, so the citation dangled; it now points at
`listViews.pipeline_kanban`, where the board is actually defined. Its
entry-point sentence named 「`pipeline` 标签页」, which was the inert
`tabs[].name`; the console labels that tab with the target view's own `label`,
so a reader looking for a tab called *pipeline* would not find one. It now
names the label the switcher really prints, **Sales Pipeline**. This is the
internal-page counterpart to #1318/#1324, which fixed the same class on the
published corpus.

`src/views/event_attendee.view.ts`'s header was not false, it had decayed.
"It carries no `tabs` and no navigation entry" was offered as something that
**distinguishes** this junction bundle, but after #1316 no view file carries
`tabs`, so the clause was trivially true of all 14 and distinguished nothing.
The dead clause is dropped and the live one kept verbatim — no navigation entry,
an attendee is never something you go looking for on its own — because that half
is still true and still load-bearing. The paragraph is otherwise untouched.

After this, `git grep -n "list\.tabs" -- docs src content` returns nothing; it
returned this one line before.
