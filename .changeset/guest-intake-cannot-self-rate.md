---
'hotcrm': patch
---

Anonymous case submissions can no longer plant `customer_rating` or
`customer_feedback`. The guest branch of `case.hook.ts` now nulls both, joining
the five fields it already stripped.

`crm_case.customer_rating` is the satisfaction score — the customer's verdict on
how a case was HANDLED, which `case_csat_followup` exists to collect after the
work — and `customer_feedback` is the prose beside it. Neither is a fact a
submitter states about themselves when opening a case, and a case that arrives
already rated five stars is a quality measure with no service behind it, on the
one column `case_metrics` reporting reads back.

**This is defence in depth, and the record says so rather than implying a
breach.** The middleware path was measured against a real server
(`objectstack start`, the production plugin set) rather than left as the open
question the hook's own comment flagged. Unauthenticated over HTTP, every
generic write surface answers `401 UNAUTHENTICATED`
(`/api/v1/data/crm_case`, its `:id` update, `/api/v1/actions/…`, `/api/v1/mcp`);
the single anonymous write path that survives is the public form route
`POST /api/v1/forms/support/submit`, and it filters the request body against an
allow-list built from the matched form view's own declared sections — so a
planted `customer_rating` was already dropped before ObjectQL and before the
hook. **A guest does not reach these columns on the shipped app today.**

What makes the fix load-bearing rather than cosmetic is that the allow-list is
the form's FIELD LIST — a product decision, not a security declaration.
Measured by widening it: adding `customer_rating` to `web_to_case`'s sections,
one line, the exact edit the open product question on #1428 would make, and the
same anonymous POST stored `customer_rating: 5`. Field-level permissions cannot
catch it either — re-measured against the installed platform,
`getFieldPermissions` builds its mask only from fields a permission set names,
and `guest_portal` names none, so its mask is empty and the write guard is
skipped. The hook branch is the layer this app declares to be its field-level
control for anonymous intake, and it is the layer that has to hold when the form
list moves.

The strip stays guest-scoped: an authenticated agent logging a rating is
unaffected, which is what `case_csat_followup` notifies the case owner to do.
