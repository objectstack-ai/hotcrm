---
'hotcrm': patch
---

Rewrite the four remaining passages on the Contracts page that describe something
`src/` does not contain, in all three languages. #826 (PR #831) settled three
other passages on the same page; these four are independent of those, and none of
them was caused by that change.

**The five "standard list views" are five names for nothing.**
`src/views/contract.view.ts` saves exactly one list — `all_contracts`, with no
filter on it — and offers that same data in four visualisations
(`appearance.allowedVisualizations` plus `tabs[]`): the grid, a renewal calendar
placed on `end_date`, a gantt from start date to end date, and a quarter-scale
timeline grouped by account. Following #792's treatment of the sales list-view
rosters, the section is rebuilt as one dataset drawn four ways, each tab
described by the columns, sort and colouring it really uses. The point a reader
needs most is now stated outright: none of the four filters anything, so *My
Active Contracts*, *Expiring in 60 Days*, *Up for Renewal*, *Expired This Month*
and *Pending Activation* do not exist and never did — narrowing the list is
something you do on the grid columns yourself, and what watches renewal dates is
the daily renewal reminder, not a saved view.

**Three picklist values the page offered cannot be picked.** Billing Frequency is
`monthly` (default), `quarterly`, `annually` and `one_time` — there is no
*Custom*. Payment Terms is the canonical set shared with Quote in
`src/objects/_picklists.ts`: `net_15`, `net_30` (default), `net_60`, `net_90`
and `due_on_receipt` — no *Net 45*, no *Prepaid*. Both lists are now the ones the
form offers, the absent values are named as absent so a reader stops hunting for
them, and the zh pages take the option labels from the locale pack (按月 / 按季度 /
按年 / 一次性, 15 天账期 … 货到付款). Since that payment-terms set is shared, the
quotes page was checked in the same pass: `content/docs/sales/quotes.mdx` already
lists exactly the five real values, so the distortion is confined to Contracts.

**"Activated contracts cannot be deleted" was a guardrail nobody built.** Contract
has no `beforeDelete` hook and no status check anywhere — deletion is decided by
the profile alone, and the profile never looks at the status: a System
Administrator can delete any contract, activated ones included, while Sales
Manager and Sales Rep can delete none, not even a draft. That sentence is gone.
In its place the section now carries the rules that really do reject a save — the
`end_after_start` validation rule, and the two throws in
`src/objects/contract.hook.ts`: a term more than one month away from the date
range, and any edit that pulls an activated contract's end date in. Two things
often read as rules are separated out as not being rules: the zero-or-positive
contract value is the field's own `min: 0` rather than a validation rule, and the
`contract_status_progression` state machine is declared at **warning** severity —
measured in `@objectstack/objectql`, a non-`error` verdict is logged and the save
proceeds — so Draft jumping straight to Activated, or an Expired contract being
revived, is written to the server log and saved anyway. Naming that honestly
matters more than the transition table: the whole defect class here is a reader
believing in a gate that is not there.

**The tip for sales reps taught them to do what the object refuses them.**
`src/profiles/sales-rep.profile.ts` grants `crm_contract` read-only
(`allowCreate: false, allowEdit: false`, own records), so "when you create the
contract" was addressed to the one persona who cannot. Nor is the opportunity
link ever pre-filled: `crm_contract.crm_opportunity` carries only
`dependsOn: ['crm_account']`, which filters the picker, and no `defaultValue`.
What actually happens is that accepting the quote drafts the contract —
`quote_on_accepted` in `src/objects/quote.hook.ts` inserts a Draft contract
carrying the quote's account, contact, opportunity, owner and total on a
12-month term — so the link is copied from the quote rather than filled in on a
form, and it lands in the rep's name as a record they can read but not edit. The
tips now say who creates contracts, how the link really arrives, and that nothing
reads it for reporting today, since HotCRM ships no contract report or dashboard.

Documentation only — no metadata, behaviour, permission or picklist changes.
Whether Contract should gain a Custom billing frequency, Net 45 or Prepaid terms,
a delete guard for activated contracts, or a create grant for sales reps are all
product decisions and stay open. Fixes #832.
