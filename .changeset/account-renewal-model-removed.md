---
'hotcrm': minor
---

Remove the dead account-level renewal model — renewals are a contract-level
process with one home.

`crm_account` declared **Renewal Owner (CSM)** (`renewal_owner`) and **Next
Renewal Date** (`next_renewal_date`), and nothing in the product ever wrote or
read either one. No hook stamped the date, no flow consulted the owner, and no
dataset exposed them — so an admin who named a CSM as renewal owner was told a
renewal would reach that person, and it never did. The date, meanwhile, showed
whatever had last been typed in by hand: a second, hand-maintained copy of a
fact the contract already carries, free to drift from it.

The renewal process that actually runs is unchanged and untouched: the daily
sweep in `contract_renewal` reads `crm_contract.end_date` against each
contract's own **Renewal Notice (Days)**, books the renewal task, notifies the
**contract owner**, and opens the renewal opportunity when auto-renewal is on.

**Migration — what changes for users:**

- The account list's **🔄 Upcoming Renewals** view and its **Renewals** tab are
  gone. Both its filter and its sort key were `next_renewal_date`, so the view
  could not outlive the field. The equivalent queue already ships on the
  contract object: **Contracts → Renewals** (`renewal_calendar`, over
  `end_date`), or sort **All Contracts** by **End Date**. That list is driven by
  the same dates the reminder acts on, so it is the accurate one.
- **⚠️ At-Risk Accounts** loses its *Renewal Owner* column; its **Health Score**
  filter and everything else about it are unchanged.
- The account form's **Customer Success** section keeps Tier, Segment and Health
  Score, and no longer offers Renewal Owner or Next Renewal Date.
- Any value previously stored in `crm_account.renewal_owner` or
  `crm_account.next_renewal_date` is dropped with the columns. Nothing consumed
  them, so no behaviour changes — but if your org was maintaining the date by
  hand as a private convention, record it on the contract's **End Date** before
  upgrading.

Authorized by the maintainer ruling of 2026-08-17, 「逐个 enforce-or-remove
（推荐）」: a declared-but-unenforced field ends the card either genuinely
enforced or genuinely gone.
