---
'hotcrm': patch
---

Rewrite the three remaining fabricated passages on the Contracts page against the
flows and the object that actually run, in all three languages. #805 fixed only
the activation section; these three were on the same page, and none of them was
caused by that change.

**The expiration sweep sends one notification, not two.** The loop body of
`src/flows/contract-expiration.flow.ts` holds exactly two nodes — `mark_expired`
and `notify_owner`, whose recipient list is `{currentContract.owner_id}` alone.
Nothing in the flow reads the account's owner, so the page's third step
("Notification to the account owner") described a message nobody ever receives —
the failure mode where an account owner believes they will be told a contract has
lapsed. The page now says the contract owner is the only recipient and that
anyone else has to be arranged by an admin, and adds the two facts that decide
whether a given contract is touched at all: the sweep reads *Activated* contracts
only, and takes at most 500 per run.

**The renewal reminder has no one-click action, and it does more than remind.**
`notify_owner` in `src/flows/contract-renewal.flow.ts` carries
`actionUrl: '/crm_contract/{currentContract.id}'` — the contract detail page.
There is no "Create Renewal Opportunity" button on it, and opening it creates
nothing; the renewal opportunity is created *by the flow itself*, unprompted, when
`auto_renewal` is on and the account has no open renewal deal. The section now
lists what the sweep does in the order it does it — the renewal task it files
first (which the page never mentioned), the notification, and the conditional
renewal opportunity with the values it copies — plus the idempotency the task
provides: an open *Renewal due* task means the day is already handled, and
completing it lets the next morning file a fresh one. The 120-day look-ahead is
written down too, because it caps notice windows set longer than that.

**Four field names on the record table do not exist.** `activation_date`,
`renewal_terms`, `account_exec` and `order_form` are each zero hits under `src/`.
Following #792, the table is rebuilt from the six `fieldGroups` declared in
`src/objects/contract.object.ts`, so it is now the full inventory rather than an
invented one, with the required fields called out. The four absent names are
addressed head-on rather than quietly dropped, since a reader who went looking for
them deserves to know where the capability really lives: activation stamps
**Signed Date**, renewal instructions belong in **Special Terms**, ownership is the
single **Contract Owner** lookup, and **Contract Document** is a URL — the executed
PDF is an attachment on the record, and there is no *Order Form* field.
*Renewal Terms* was recommended a second time further down the same page, in the
Renewals section and in the tips for contract owners; both now point at Special
Terms. The zh pages take **计费周期 / 計費週期** for billing frequency from the
locale pack, matching the field-group headings the table now uses.

Documentation only — no metadata, behaviour or field changes. Whether Contract
*should* carry an activation date, a renewal-terms field, an account exec or a
file-typed contract document is a product decision and stays open. Fixes #826.
