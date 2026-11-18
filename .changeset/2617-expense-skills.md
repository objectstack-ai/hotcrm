---
"hotcrm": minor
---

Clause-②: no
Metadata-protocol: none

**Expense skills for an assistant (REQ-0011, #2617, F4b).** Two skills in the expense package teach an assistant this module, over MCP as prompts (`crm-expense_filing`, `crm-expense_check`) and on the platform's assistant where it runs.

- **Expense Filing** (`expense_filing`, 「费用代填」), for the person who spent: it fills an expense from a receipt with Source = Agent, checks for a duplicate (same receipt number, or same date, amount and merchant), attaches the receipt through the platform's one-time upload link, reads the active expense standards and writes its findings into the expense's Review Notes before the expense is sent, drafts travel requests with their legs, and submits only after the person says yes.
- **Expense Check** (`expense_check`, 「费用检查」), for the approver and finance: it reads a report and lists what is over a standard, possibly duplicated, missing a receipt or over its trip's estimate, tells the reader, and changes nothing. Its instructions forbid the platform's approval actions and marking a report paid.

Seven actions are opened to an assistant (`ai.exposed`): Submit for Reimbursement, Submit for a Trip, an expense report's Submit and Back to Draft, and a travel request's Submit, Cancel Trip and Close. Each one that sends to an approver or cannot be undone asks for the person's confirmation first (`run_action` answers 428 until `confirm: true`). Mark as Paid is not opened. No permission changes.

A report under approval stays locked, the approver included, so findings live on each expense, written before it is sent; the report's own Review Notes can be written only while it is back in Draft. `read_file` and `create_upload_link` are named in the skills' instructions but not bound, until the platform's strict lint resolves the storage tools (objectstack#34948).

Upgrade: additive. No data changes.
