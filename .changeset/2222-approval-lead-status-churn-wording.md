---
"hotcrm": patch
---

**The docs and one report now say what the app does.** No behaviour changes.

- **Large deal approval.** The opportunities page, the sales and revenue overviews, the pipeline health signals, the setup checklist and the FAQ said a deal entered approval above $500K, and the opportunities page said final approval set the stage to Closed Won. A deal enters the Large Deal Approval flow at $100K or more: a Sales Manager reviews it, and only a deal above $500K also needs a Sales Director. Final approval sets Approval Status to Approved and stamps Approved Date; the stage does not move, and the rep closes the deal as usual.
- **Lead statuses.** The leads page said reps can only advance one step at a time and that the app blocks other jumps. The usual path is a guide, not a rule: a status change off it still saves, with a warning in the server log. Only Converted is enforced, and only Convert Lead sets it.
- **Customer Churn Signals.** The report's description called it a three-panel view and missed CSM-Flagged Accounts. It now describes all four panels.
