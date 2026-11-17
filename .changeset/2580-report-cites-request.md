---
"hotcrm": minor
---

Clause-②: no
Metadata-protocol: none

**An expense report can cite the travel request it was spent on, and the request reads its spending against the estimate (REQ-0011, #2580).** Beside **Submit for Reimbursement**, on an expense's page and in the My Expenses selection bar, **Submit for a Trip** submits the same way and asks for one travel request, offering only the person's own **Approved** requests; every report it makes names the request. A trip can be reported in several reports; a report names one request at most, chosen when it is submitted (a report is born Submitted and an approved one is frozen, so it is never added afterwards). Submit for Reimbursement keeps its one click for an expense with no trip: on ObjectStack 18.5.0 an action with any param, even an optional one, opens its param dialog, so the request is a second action rather than an optional param.

The request gains **Reported Amount** (the totals of its submitted, approved and paid reports), **Difference from Estimate** (reported minus estimated) and **Over the Estimate**, and lists its expense reports. Each report that cites a request shows its approver, under **Travel Request**, the trip's estimate, the amount reported for the trip and whether it is over; these are stored copies kept by the hook `expense_report_request_totals`, so an approver who may not open the request still sees them. Over the estimate never blocks an approval. When a report is marked paid and no other report of its request is still Draft, Submitted or Approved, the request becomes **Closed**; a cancelled or closed request takes no new report. A report with no request behaves as before and shows none of these fields.

Upgrade: additive. Reports made before this change cite no request, and requests show a Reported Amount of zero until a report cites them.
