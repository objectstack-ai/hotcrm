---
'hotcrm': patch
---

Scope the nightly forecast sweep's four bucket queries to the snapshot row's own
organization. On a multi-organization install, an owner holding opportunities in
more than one organization had all of them summed into a single `crm_forecast`
row — so one tenant's forecast reported another tenant's pipeline, best case,
commit and closed-won amounts.

The sweep runs `runAs: 'system'`, which is the one execution context the driver's
organization predicate does not constrain, and it iterates `sys_user` — a global
identity that declares no `organization_id`. The four bucket fetches scoped by
`owner_id` and the target row's close-date window, and neither of those is an
organization predicate. Nothing was NULL-partitioned and no index was violated:
the amounts were simply wrong, in the direction that looks plausible, so nobody
would have reported it — they would have made decisions on it.

The fetches now pin `organization_id` to the row being written, the same "prove
the source carries the right organization" mechanism the sweep's `create_record`
already uses for `{ownerAnyDeal.organization_id}`. No second mechanism was
introduced, which is what lets the #1363 scheduled-sweep guard clear the node
with no exemption — the register entry that argued for those four columns is
deleted here, because the guard now proves them on their own.

A cross-organization owner still receives **one** snapshot row, not one per
organization: the row's key and the period filter are unchanged. That row now
reports only its own organization's numbers, so this trades a wrong total for an
incomplete one. Whether such an owner should instead get a row per organization
is a product-semantics question and is deliberately left open.
