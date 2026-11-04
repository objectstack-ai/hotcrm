---
"hotcrm": minor
---

Clause-②: no
Metadata-protocol: none

**Record pages offer only the actions a record can still take, and quotes and cases get buttons for their status moves (#2366).** Who may do what is unchanged.

- **Quotes:** each status move made by hand has a button, shown only on the statuses it leaves from: **Submit for Review**, **Mark Presented**, **Accept** (asks first), **Reject** and **Revise** (back to Draft). An Accepted, Rejected or Expired quote shows no **Edit**, and its line items show no **New**. A Rejected quote is now frozen like an Accepted one until **Revise** takes it back to Draft: only Internal Notes can change, and its lines take no change. A new quote can no longer be created as Accepted, Rejected or Expired: the New form does not offer them, and the save is refused.
- **Cases:** a Resolved or Closed case has a **Reopen Case** button, offered to whoever may edit cases. It moves the case back to In Progress. The SLA Due Date is kept and a recorded breach stays recorded; the Service Manual says so.
- **Leads:** a converted lead shows no **Edit** and cannot be edited inline. The lock behind it is unchanged.
- **Campaigns:** Number Sent, Responses, Leads, Converted Leads, Opportunities, Won Opportunities and Actual Revenue are read-only, and so are a member's Response Date and Has Responded. The system keeps all of them, and a value typed through the API is now dropped instead of standing until the next recompute.
- **Status colours:** the status options of quotes, campaigns, campaign members and knowledge articles declare whether each one is open, won or lost, so a record's path draws each one from that declaration instead of guessing from the value's name.

The in-app Sales, Service and Marketing manuals describe each change in English and Chinese, and the documentation site's Quotes page says how a rejected quote is revised.
