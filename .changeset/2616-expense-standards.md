---
"hotcrm": minor
---

Clause-②: no
Metadata-protocol: none

**Expense standards, and Review Notes on each expense (REQ-0011, #2616, F4a).** A new object, **Expense Standard** (`crm_expense_standard`, 「费用标准」), holds the company's spending standards, one row per rule: a name, an optional category (the expense's own list; empty means any), an optional limit in the organization's currency with what it is counted per (night, day, item or trip, asked for once a limit is written), who and where it applies to in words, details, and Active. Finance Controllers, AR Accountants and administrators keep them; every set that records expenses reads every standard. They are listed under **Expense Standards** in the Expenses app only.

A standard is advice. Nothing in HotCRM compares an expense with a standard: no validation, hook, flow or formula reads one, and an expense above a standard saves and is submitted exactly as before. An assistant reads the standards and compares (the expense skills come in F4b, #2617).

An expense gains **Review Notes**, where an assistant or the spender writes what a check found; the approver reads it in the expense list on the report's page, and it locks with the expense's other fields once the report is sent. The expense's Receipt Number is now indexed, so a duplicate check by receipt number is one indexed query.

Upgrade: additive. Existing expenses read an empty Review Notes; the standards list starts empty.
