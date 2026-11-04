---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**Four dead ends from the 18.2.0 browser pass are gone (#2338 items 1–4).**

- **Service Overview is offered only to people who can read cases.** A marketing user, who reads no cases, was offered it in the sidebar, and every tile said "You don't have permission to view the data behind this widget". It now asks the same question the three case reports already ask. Sales Activity stays open to marketing users: it reads their own activity, so it works. Sales Performance also stays open; one of its tiles, Quota Attainment by Rep, still refuses a member who cannot read forecasts, because the platform cannot hide a single tile by access yet.
- **Edit Case shows Resolution when you close the case.** Picking Status "Closed" on the edit form used to end in "Resolution is required when closing a case" with nowhere to type one. The form now shows Resolution as soon as Status is Resolved or Closed. A new case still opens without it.
- **Marketing Managers and Marketing Directors can edit campaigns.** Both positions now give their holders the Marketing User profile, so the people who lead marketing can edit a live campaign a marketer owns and enroll its members, as their position descriptions promise. Before, they could only read campaigns.
- **"Update Stage" is no longer a list header button on opportunities.** That button failed whatever was ticked: with two rows it said it runs on a single record, and with none it opened a dialog that targeted nothing. Tick the deals and use **Update Stage** on the selection bar, which moves them all in one run. It is now on the selection bar of every opportunity table list, not only Open Deals, and so is **Delete**, which Open Deals had lost.
