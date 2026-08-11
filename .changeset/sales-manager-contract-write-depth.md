---
'hotcrm': patch
---

Let a **Sales Manager** actually edit the contracts their reps own. The
permission table has always said they can, and the contract that matters most
answered 403 anyway.

`crm_contract` is a private object with an owner, so editing one takes two
doors, not one. The object-level `allowEdit: true` opened the first. The second
is record-level: the sharing layer asks whether the record's owner falls inside
the caller's write DEPTH, and with `modifyAllRecords: false` and no `writeScope`
authored, that depth defaults to `own`. So a Sales Manager could edit only the
contracts they had created by hand.

That is exactly backwards for the common case. Accepting a quote drafts a
contract and copies the quote's owner onto it, so the contract lands in the
**rep's** name — and the rep cannot edit it either (Contract is read-only for
them), and nobody below System Administrator can hand it over. Changing such a
contract's dates, value or status, terminating it included, was an administrator
-only act:

```
PATCH /api/v1/data/crm_contract/<id>   (as sales_manager, contract owned by a rep)
→ 403 FORBIDDEN: insufficient privileges to update crm_contract <id>
```

`sales_manager` now carries `writeScope: 'org'` on `crm_contract`, and that call
succeeds. Read access is unchanged (the profile already held *View All*), and so
is every other object.

The value is `org` because it is the only one that does anything here, measured
rather than assumed. `own_and_reports`, `unit` and `unit_and_below` are
hierarchy scopes resolved by an enterprise-only service; on this edition they
fail closed to owner-only, and `objectstack validate` rejects them by name.
HotCRM's positions are flat and it models no manager chain or business units, so
there is no narrower set of owners to aim at — in this app, org-wide *is* the
manager's team. It is deliberately not `modifyAllRecords: true`, which would
also skip row-level security, reach ownerless rows and open deletes: Sales
Manager still cannot delete a contract. Pinned end-to-end against a real kernel
in `test/contract-write-depth.test.ts`, and `content/docs/revenue/contracts.mdx`
(all three locales) now describes the write side as well as the read side.
Fixes #880.
