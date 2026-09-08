---
---

Comment prose only — this PR releases nothing to HotCRM users, so the
frontmatter above is deliberately empty (the sanctioned "releases nothing"
declaration that `.github/workflows/changeset-check.yml` documents, on par with
the `skip-changeset` label). No field, view, action, flow or seed changes; the
`readonly` flag on `crm_event_attendee.invited_date` is NOT touched, in either
direction.

`crm_event_attendee.invited_date` was the one audit-stamp-shaped column left
without a writer census. Its note said what holds it open is that "nobody has
ruled on it" — an honest placeholder, but a placeholder. The census #1435 ran
for the other three columns has now been run for this one, and the note states
its result instead.

Three surfaces write the column. The fifteen generated activity actions INSERT
it under an `isSystem` action context, and the two attendee seeds write it under
an `isSystem` seed context — neither would lose its write to a `readonly: true`
declaration, since the strip is an UPDATE-path rule and skips `isSystem` runs
anyway. The third is the record form: `src/views/event_attendee.view.ts` lists
`invited_date` in its `invitation` section, authored by hand rather than
synthesized, and all four profiles grant `allowEdit` on the object. A rep
correcting Invited on a saved attendee row is a non-`isSystem` UPDATE carrying a
caller-supplied key — exactly what the strip deletes. The three columns #1666
and #1667 moved appear in no form section anywhere in `src/views/`, including
`crm_opportunity`'s hand-authored form.

The column is also not the same kind of thing. `added_date` and `approved_date`
are stamped `{NOW()}` by their writer, so their value is the write moment;
`invited_date` records when the invitation went out, and the service seed dates
it three to ten days before its own event, independently per row. A column whose
value is not the write moment is one a person can be right about.
