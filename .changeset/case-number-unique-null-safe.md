---
'hotcrm': patch
---

Enforce case-number uniqueness on deployments that have no organization set.
`crm_case` declared it as a hand-written table composite,
`indexes: [{ fields: ['organization_id', 'case_number'], unique: true }]`, and a
declared index is materialized verbatim — so it became plain
`UNIQUE (organization_id, case_number)`. SQL UNIQUE treats NULLs as distinct, and
`organization_id` is NULL on every row of a single-organization or untenanted
install, so on those deployments the index constrained nothing at all:

```
UNTENANTED, two cases both numbered CASE-00001
  before → second insert ACCEPTED   (index never engages; NULL ≠ NULL)
  after  → second insert REJECTED
```

That mattered here more than on any other object because `case_number` is an
autonumber (`CASE-{00000}`) whose sequence is keyed per tenant — each
organization counts from 1. The sequence was already scoped per organization
while the constraint was not enforced on the untenanted rows, so duplicate case
numbers were prevented only by the accident that a single-organization install
happens to run a single sequence.

Uniqueness is now declared on the `case_number` field itself (`unique: true`),
the same spelling `crm_account.name`, `crm_contact.email` and `crm_product.sku`
already use. The field-level form is per-organization (framework#3696) and its
organization key part is NULL-safe as of platform 17.0.0-rc.4 —
`COALESCE(organization_id, '__global__')` (ADR-0120 D3) — so rows with no
organization form one bucket instead of each escaping the constraint.

No behaviour changes for a multi-organization deployment: two organizations can
still each hold `CASE-00001`, and a duplicate within one organization is still
rejected. The old spelling was also the bare `unique: true` form that ADR-0120
warns on in 17.x and protocol 18 rejects, so this additionally clears both
`pnpm validate` warnings on the object. Measured end-to-end against a real
SQLite database in `test/case-number-tenant-scope.test.ts`, which also re-measures
the old spelling so the hole it left stays a measurement rather than a claim.
Refs #1023.
