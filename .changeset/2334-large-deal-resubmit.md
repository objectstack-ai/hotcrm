---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**A large deal whose approval was rejected can be sent back for approval, and can no longer be closed won without one (#2334).** Once an approver rejected a deal of $100,000 or more, no save could open a new approval request, and nothing stopped the rep from moving the deal straight to *Closed Won*: one rejection was enough to skip the approval for good. Now the deal is unlocked after a rejection and the rep's next save, once they have revised it, sends it for approval again as a new request. Until a later request is approved, moving the deal to *Closed Won*, or accepting a quote on it, is refused with a message that says how to send it back. Closing it as lost is still allowed, and a deal under $100,000 is not affected.

**Recall hands a large deal back instead of re-submitting it.** Recalling a pending large-deal approval used to open a new request in the same second, so the deal stayed locked and the rep could never take it back to edit. A recall now leaves the deal unlocked with no request open; the rep's next save sends it for approval again.
