---
'hotcrm': patch
---

Rewrite the "Standard list views" section on the Accounts, Leads, Contacts and
Quotes documentation against the views those objects actually ship.

Same defect as the Opportunities page fixed in #757, on four more pages (and
their zh-Hans / zh-Hant siblings): the rosters were invented. Accounts listed
*All Customers*, *Top Accounts by Revenue*, *Inactive Accounts*, *By Industry*
and *Recently Updated* — none of which exist — while never mentioning the five
views that do: **Account Cards**, **Accounts by Location**, **Enterprise
Accounts**, **🔄 Upcoming Renewals** and **⚠️ At-Risk Accounts**. Contacts and
Quotes each advertised five views where only three exist. Leads advertised five,
of which one was real, and hid three working queues plus the kanban, calendar
and gallery views. A reader looking for any of those names in the product found
nothing under it, and the queues with the most business value were the ones
nobody was told about.

Each page now carries the real roster measured against its `*.view.ts`
declaration — what the view filters on, how it sorts, and where it is reached
from — plus the behaviour that makes an empty list readable:

- **Accounts** — seven views. The two customer-success queues get their own
  note: both are scoped to **Type = Customer** before anything else, and both
  read hand-maintained fields (Health Score has no default, Next Renewal Date
  can be blank), so an empty *At-Risk Accounts* is missing data rather than a
  broken filter. Also corrected: **Enterprise Accounts** is a revenue cut
  (Annual Revenue ≥ $10M), *not* the Customer Tier field — an account tiered
  *Enterprise* at $5M is not in it; and the map plots **Office Location**, not
  the billing address.
- **Leads** — eight views, the full switcher. **🔥 Hot Leads** is documented as
  it behaves: its cut is 4.5 stars against a whole-star rating, so it is the
  5-star queue, and a 4-star lead is on **High Priority** — the old page called
  Hot Leads "rating ≥ 4 stars", which is the other view's filter. The rep tip
  that pointed at a nonexistent *Today's Follow-ups* view now says what the
  Next Follow-up Date really drives: the sort order of Hot Leads, stamped
  automatically on intake (tomorrow at 4+ stars, three days otherwise) and
  re-stamped by **Schedule Follow-up**.
- **Contacts** — three views, with the account-grouped default explained and a
  plain statement that no owner-filtered view exists, since contact visibility
  follows the account anyway.
- **Quotes** — three views, none of them filtered, and why that works: status is
  the filter (the nightly sweep keeps *Expired* honest) and Expiration Date is
  sortable. A fresh org has no quotes at all until the first **Generate Quote**,
  and these views declare no empty-state text, so the page says an empty grid is
  expected there.

English pages use the metadata labels; the zh pages use the names from the
zh-CN locale bundle.

Fixes #758.
