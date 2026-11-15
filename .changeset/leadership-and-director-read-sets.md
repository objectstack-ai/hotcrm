---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**Executives, sales directors and the service director now read what their role needs, and change nothing.** The `crm_executive` and `crm_sales_director` positions distribute a new read-only Sales Leadership set (`sales_leadership`): every account, contact, deal, quote, contract, forecast and case a sales manager reads, at the same depth, with the private-deal row filter on the deal read and the sales manager's app visibility. Before it they held no set and saw only the large deals the large-deal shares opened, so the Executive Overview read zeros (#2492). The `crm_service_director` position distributes a new read-only Service Director set (`service_director`): read on cases with no View All, so the director sharing rule (critical and not closed) is the reach, and read on every account and contact behind a case. Before it every case list answered 403 for a director (#2490). Neither set grants create, edit, delete, transfer or export; the member floor every user holds is unchanged.
