---
'hotcrm': patch
---

Give `crm_case.internal_notes` an authoring surface — the case record page's
Description section (#1428).

#1427 narrowed the case form to what a creator legitimately authors at intake.
Ten of the thirteen fields it dropped kept a surface elsewhere; three did not,
and `src/views/case.view.ts` said so in a comment rather than leaving it unsaid.
`internal_notes` is the one of the three with no product question attached: it
is staff prose a service agent writes, declared on the object, translated in all
four locales, and reachable from nowhere.

It goes on `case_detail.page.ts`'s existing Description section rather than an
"Internal Notes" section of its own, because a section is not a container an
author can rely on. Measured on the shipped console (`@objectstack/console`
17.2.0, `DetailSection`): a section whose fields are ALL empty returns `null` —
no heading, no shell, no toggle. A section holding only `internal_notes` would
render nothing until the field is non-empty, and the only way to make it
non-empty is to author it there. The Description section escapes that circle
because `description` is required on the object, so the section always renders
and an unwritten `internal_notes` is reachable through the section's own
"Show N empty fields" toggle, then authored by inline edit.

Inline edit is the surface deliberately: the record header's Edit button opens
`CaseViews.form`, which is also the create form, so putting the field back there
would re-open intake — where `case.hook.ts`'s guest branch (`!ctx.previous &&
!ctx.user?.id && !ctx.session?.isSystem`) nulls the column anyway. Field-level
security is unchanged: `service_agent` editable, `sales_manager` read-only,
`sales_rep` cannot read it.

`customer_rating` and `customer_feedback` deliberately do NOT get a surface
here. Whether staff should type a customer's satisfaction score on the
customer's behalf is a product question, and adding two inputs would settle it
by accident. Both consequences of leaving it open are now recorded in-tree
instead of being implied: the `case_csat_followup` flow notifies the case owner
to log a rating that has no input anywhere, and neither field is named in any
profile's `fields` map — which on this platform means unrestricted, not
restricted.
