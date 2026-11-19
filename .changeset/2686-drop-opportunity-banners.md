---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**A deal waiting on approval no longer shows HotCRM's blue banner; the platform's own approval strip says where the request stands (#2686).**

FROM → TO on an opportunity sent for large-deal approval:

- **FROM** a blue banner under the title, which read the same to everyone who opened the deal: "Sent for approval to a Sales Manager" (or "…then a Sales Director" over $500,000), the deal is locked, and "Recall, above the title, withdraws the request". An approver was told to recall a request that was not theirs, and the fixed approver names were wrong when a request had been reassigned, delegated or opened on the administrators.
- **TO** the approval strip above the title, which every approval in the product already uses. The approver reads **Awaiting your approval**, the step (for example **Sales Manager Review**) and who submitted it, with **Approve** and **Reject**. The submitter has **Recall** and **Reply**, and the **Approvals** card on the page names who the request is waiting on, with **Send reminder**.

The opportunity now has no page of its own: it opens on the standard record page, as an account does. The #2382 note in this release is corrected to match: it no longer lists the deal's approval banner among the banners that stay. Nothing in the data or in the approval rules changes. The docs site and the in-app manual describe the strip in place of the banner.
