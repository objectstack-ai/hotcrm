---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**A reopened case no longer keeps its first close (#2375).** Before, a Resolved or Closed case moved back to an open status kept the first close's **Closed Date** while it was open again, and closing it again kept that date and its **Resolution Time (Hours)**, so the resolution figures and the average-resolution tile and reports read the first close. Now any move back to an open status clears both, whether through **Reopen Case**, **Edit** or the API, and the next close stamps both afresh. The SLA is unchanged by this: the SLA Due Date is kept and a recorded breach stays recorded. The in-app Service Manual says so in English and Chinese.

Contract statuses now declare whether each one is open, won or lost (Draft and In Approval open, Activated won, Expired and Terminated lost), so a contract's path draws each one from that declaration instead of guessing from the value's name.
