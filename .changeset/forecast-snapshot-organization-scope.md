---
'hotcrm': patch
---

Scope the `forecast_snapshot` sweep's four bucket queries to the snapshot row's own organization.

The nightly sweep aggregates `crm_opportunity` per owner into a `crm_forecast` row. Its four
bucket fetches (open pipeline, best case, commit, closed-won) filtered on `owner_id` and the
period window only — neither of which is an organization predicate — while the sweep runs
`runAs: 'system'`, whose reads are not constrained by the driver's organization predicate.
`sys_user` is a global identity carrying no `organization_id`, so nothing else narrowed them
either. An owner holding opportunities in more than one organization therefore had **every**
organization's deals summed into the single snapshot row: one tenant's forecast reporting
another tenant's pipeline, with no NULL partition and no index violation to make it visible.

The fetches now pin `organization_id` to `{currentForecast.organization_id}` — the row being
written — reusing the same "prove the source carries the right organization" mechanism the
sweep's `create_record` already establishes with `{ownerAnyDeal.organization_id}`.

What this does and does not change, stated plainly: `crm_forecast` is still keyed by (owner,
period), so a cross-organization owner still gets **one** snapshot row, and that row now
reports **only its own organization's** numbers. That is true but **incomplete** — it does not
make forecasts complete for a multi-organization owner, and the other organizations' deals are
now absent from the snapshot rather than mixed into it. It is strictly better than the previous
behaviour, which reported a false total blending another tenant's amounts. Whether such an owner
should instead get one row per organization is a product decision, recorded and deliberately not
undertaken here.
