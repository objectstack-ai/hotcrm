---
"hotcrm": minor
---

Clause-②: no
Metadata-protocol: none

**Order to Cash: plan steps, invoices and payments belong to the account; the contract becomes an optional source (REQ-0010, #2557).** Billing milestones, invoices and payments now hang off the **account** (their master) instead of the contract. So an invoice for an order, one invoice for several orders, and an advance payment that matches no invoice yet can be recorded against the account alone. A billing milestone still names the contract it plans.

- **Required field, FROM → TO:** on `crm_billing_milestone`, `crm_invoice` and `crm_payment`, the required master changes from **Contract** (`crm_contract`, master-detail) to **Account** (`crm_account`, master-detail; was a read-only stamped lookup). **Contract** becomes an optional lookup on all three; a billing milestone without a contract is refused (`billing_milestone_contract`).
- On the form, choosing a contract fills in the account. On every save the account is taken from the contract, and a contract of another account is refused, naming the contract. An invoice that names a milestone but no contract, or a payment that names an invoice or a milestone but no contract, takes its contract from it.
- A payment against another account's invoice is refused (was: another contract's).
- An invoice with no contract has no payment terms: its due date is typed.
- The contract page counts the records that name the contract; the account page counts all of the account's records, those with no contract included. On existing data both read the same as before.
- Deleting a contract still deletes its plan steps and is still refused while invoices or payments name it. Deleting an account deletes its plan steps and is refused while it has invoices or payments.
- **Invoice Import** and **Payment Import** gain an **Account** column (the account name); **Contract** is optional. The templates carry the new column.
- Who reads and writes plan steps, invoices and payments is unchanged for sales reps, sales managers and finance.
- People who read an account and hold read on invoices and payments without reading contracts (the CRM User default set, Marketing User, Service Agent, Project Member) now read that account's invoices and payments, read-only. Before, they read none, because the rows hung off contracts they cannot read.
- Demo data: Wayne Enterprises has a 10,000 deposit recorded against the account alone.

**Upgrading an existing environment:** no data moves; every row keeps its account and its contract, and the totals stay the same (measured from 6.5.0). The database still holds the contract column as NOT NULL until an administrator runs `os migrate apply` once and confirms the three `relax_not_null` changes it lists (`crm_billing_milestone.crm_contract`, `crm_invoice.crm_contract`, `crm_payment.crm_contract`). Until then a record with no contract is refused with "Contract is required", and the demo deposit is reported as a seed error on boot.
