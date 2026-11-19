---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**The project approval of expense reports and travel requests belongs to Project Delivery again (REQ-0011, #2575). No user-visible change.** The approval of an expense report or a travel request on a project, the two notices that turn a report on a closed, cancelled or locked project back to Draft, and their labels are registered by Project Delivery instead of the expense module, where they sat until the platform's lint accepted a flow on another package's object (objectstack#34616, in 18.6.0). Approvers, the finance step from the threshold, the notices, and the rule that a report or request goes either to its project manager or to the submitter's manager, never both, are unchanged. With Project Delivery disabled, expenses and travel requests go to the submitter's manager as before.

**Upgrade note:** an expense report or travel request on a project that is waiting for approval when you upgrade cannot be decided afterwards; approving it answers `RESUME_TARGET_LOST`, because the approval now runs from Project Delivery. Decide pending project approvals before upgrading. For one left waiting, the submitter recalls the request; the record stays Submitted, so an administrator sets its status back to Draft and the submitter submits it again; and it goes to the project manager, then finance above the threshold, as before.
