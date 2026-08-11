---
'hotcrm': patch
---

Declare the write depth `sales_manager` actually means on `crm_contract`, so
the permission table stops describing a reach the metadata never asked for.

`crm_contract` is private with an owner, so editing one takes two doors. The
object-level `allowEdit: true` opened the first. The second is record-level: the
sharing layer asks whether the record's owner falls inside the caller's write
DEPTH, and with `modifyAllRecords: false` and no `writeScope` authored, that
depth defaults to `own`. So a Sales Manager could edit only the contracts they
had created themselves — while the contract that matters most belongs to a rep,
because accepting a quote drafts a contract and copies the quote's owner onto
it.

`sales_manager` now carries `writeScope: 'own_and_reports'` on `crm_contract`,
with the matching `requires: ['hierarchy-security']` on the stack. The two are
one declaration: `defineStack` refuses the grant outright without the
capability, so they move together or not at all. `own_and_reports` rather than
`unit_and_below` because the two resolve through different data — `unit*`
through business units, `own_and_reports` through the manager chain — and the
reporting line is what "a manager reaches their team" means here.

**What this changes per edition.** The depth is an ADR-0057 hierarchy scope,
resolved by the `hierarchy-scope-resolver` service that ships in ObjectStack
Enterprise:

- **Enterprise** — the resolver is present, and a Sales Manager can change a
  contract standing in a rep's name: its dates, value or status, termination
  included.
- **Open edition** — no resolver, so the scope narrows safely to owner-only and
  a Sales Manager still cannot edit a rep's contract. Those changes remain a
  System Administrator's job, exactly as before this change.

Nothing about an open-edition deployment's behaviour moves, so no existing
install changes what it permits. Read access is untouched (the profile already
held *View All*), delete is untouched (Sales Manager still cannot delete a
contract), and this is deliberately not `modifyAllRecords: true`, which would
also skip row-level security and reach ownerless rows.

`content/docs/revenue/contracts.mdx` and both localised siblings gain a *Who can
edit which contract* section stating the per-edition answer, and the three
places that previously promised a Sales Manager could make these changes flatly
now say which edition that holds on. Pinned by
`test/contract-write-depth.test.ts`, which asserts the declaration, both
directions of the spec gate, and the open-edition owner-only behaviour. Fixes
 #880.
