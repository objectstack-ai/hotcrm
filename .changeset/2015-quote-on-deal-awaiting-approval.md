---
'hotcrm': patch
---

Generate Quote now works on a deal that is waiting for approval

A deal of $100K or more is locked while a manager reviews it. Clicking
**Generate Quote** on such a deal used to create the quote and then report
that generating it had failed, because the deal could not be moved to
*Proposal* while it was locked. The quote stayed behind anyway.

Generate Quote now finishes normally on a deal under review: the draft quote is
created, you are notified as usual, and the deal keeps its current stage until
the approval is decided. A deal that is not under review still moves to
*Proposal* as before.
