---
'hotcrm': patch
---

**An approval decision now shows the approver as Last Modified By.** Before, when a sales manager approved or rejected a request, the record's **Last Modified By** went back to the person who submitted it. The record's history already named the approver. The approval flow then saved the same verdict a second time, as the submitter, and that second save changed only Last Modified By.

That second save is gone from these decisions:

- **Account Approval**: approve and reject.
- **Lead Conversion Approval**: approve and reject, on installs that turn the gate on.
- **Large Deal Approval**: reject.
- **Opportunity Qualification Approval**: approve.

Each verdict still lands the same way: **Approved** or **Rejected**, written by the approval as the person who decided.

Some decisions also save a value of their own: the approval date on a large deal, the stage on an approved status change, or the request cleared after a rejection. On those decisions **Last Modified By** still names the submitter.
