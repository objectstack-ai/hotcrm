---
'hotcrm': patch
---

Tasks booked from a private opportunity no longer carry its name

A deal flagged **Private** is visible only to its owner, and the records HotCRM writes from such a deal
now keep that promise too. The activation task booked when a private deal is won reads *Activate new
customer (private opportunity)*, and the follow-up task the daily **Stalled Deal Alert** books for it
reads *Advance stalled deal (private opportunity)*. Each still goes to the deal's owner and still links
to the deal. A deal whose Private flag changes while its stall task is open is still nudged once per
stall, not twice.

**Clone Opportunity** on a private deal now makes a private copy; the owner of the copy can clear the
flag on it.

Deals that are not private are unchanged: their tasks keep the deal's name in the title.
