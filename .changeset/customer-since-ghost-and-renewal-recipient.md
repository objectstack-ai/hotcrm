---
'hotcrm': patch
---

Remove the last two homes of the ghost **Customer Since** field, and write the
daily renewal reminder's recipient list against the flow that sends it — in all
three languages.

`crm_account` has no `customer_since` field, and no field of any name records
when an account became a customer (`src/objects/account.object.ts`). Contract
activation (`src/objects/contract.hook.ts`) writes a date to the **contract**,
not to the account: it stamps **Signed Date** when the contract carries none
yet, and sets the account's **type** to *Customer* when the account is not
already one. #805 / PR #823 had already corrected `revenue/contracts.mdx`; the
same claim survived on two more pages, where it was the more misleading of the
two — on `sales/accounts.mdx` it sat in *Automatic updates* between three
rollups that are real, so nothing marked it out as the empty one.

Both pages now describe the write that happens and say plainly that no date is
recorded on the account, pointing a cohort question at the contract's Signed
Date or Start Date instead.

The renewal reminder on the Revenue overview promised "the owner and the account
owner get a reminder email". `contract-renewal.flow.ts`'s only `notify` node has
a single recipient — `{currentContract.owner_id}`, the contract owner — over the
inbox and email channels; the account owner and the account's renewal owner
receive nothing. The same sentence now names the renewal task the sweep creates
before it notifies, and states the notice window as the contract's own
**Renewal Notice (Days)** (default 30) rather than an invented "e.g., 60 days".

Documentation only — no metadata, behaviour or field changes, and `src/**` is
untouched. Whether `crm_account` *should* carry a `customer_since` field is a
product decision and stays open; this change only stops the docs from claiming
it already exists. Fixes #824.
