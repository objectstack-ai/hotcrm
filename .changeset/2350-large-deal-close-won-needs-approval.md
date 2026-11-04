---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**A deal of $100,000 or more can be closed won only once its Large Deal Approval is approved (#2350).** Until now only a pending or rejected approval stopped the close. A rep could still win a large deal with no approval at all in two ways: recall the request (which hands the deal back as *Not Required*) and then close it, or raise the amount over the line and close the deal in the same save. Now moving a deal at or over the line to *Closed Won* is refused unless its **Approval Status** is *Approved*, whatever else it says, and the message tells the rep to save the deal without closing it to send it for approval. Accepting a quote on such a deal is refused the same way, so an accepted quote never sits on a deal it could not close. Closing a deal as lost, and any deal under $100,000, are not affected.

Known limit: the rule cannot tell whether the *Large Deal Approval* flow is switched on, so an install that switches that flow off can no longer close a large deal won by hand.
