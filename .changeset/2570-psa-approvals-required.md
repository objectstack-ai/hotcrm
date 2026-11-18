---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**Time and Expenses and the Project Delivery handbook say that approval needs approvals on the deployment (#2570).** A submitted timesheet, a submitted expense report and a project sent In Approval are decided through the deployment's approvals, which also give the approver their Inbox. The pages now say what happens on a deployment that does not include them: nobody is asked, the record stays Submitted (or In Approval) and its cost does not reach the project, and the approver's own decision is refused. An administrator decides each one there by setting its Status to Approved or Rejected; an approved timesheet or expense report then counts in the project's cost as usual. Nothing in the app's behaviour changes, and a test now boots Project Delivery both with and without approvals and pins each.
