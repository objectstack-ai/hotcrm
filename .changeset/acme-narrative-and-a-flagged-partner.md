---
'hotcrm': patch
---

Correct three hand-written assertions in the hero account's seeded description
against the records they name, and give the seed book one flagged **partner**
so the *CSM-Flagged Accounts* panel can show the split it groups for.

### The Acme description said three things the data does not

`Acme Corporation` carries the longest piece of hand-written narrative in the
seed book, and it is the one an evaluator is most likely to read end to end.
Three of its lines had drifted away from the rows sitting beside them:

- **"Renewal due in 45 days — they've already verbally committed but want a
  workshop on AI agent governance before signing."** No record has a 45-day
  renewal horizon. The renewal (`Acme Annual Renewal 2025`) is `closed_won`
  and closed 15 days ago; the contract runs another 335 days and auto-renews;
  and the governance workshop belongs to the OPEN `Acme Platform Upgrade`,
  which closes in 30 days. The sentence had folded an open upgrade into a
  renewal that was already won. It now names the upgrade, its real horizon and
  the workshop that gates the signature.
- **"Slipped one opportunity ($75K add-on) in the last quarter due to slow
  procurement cycle on their side."** `Acme Add-on (Lost)` closed `closed_lost`
  on `loss_reason: 'timing'`, and its `loss_details` say why: the marketing org
  is locked into a two-year HubSpot contract. Procurement slowness appears
  nowhere on that deal. The line now states the loss and the reason the record
  gives.
- **"Login issues ticket is approaching its SLA."** Since SLA due dates became
  derived from the priority × tier matrix, that case — `high` priority on an
  `enterprise` account, opened two days ago — is due **8 hours** after creation,
  so its clock ran out roughly 40 hours before the demo boots. It is past its
  SLA, not approaching it; `case_sla_monitor` flags it on its first sweep. The
  line now says so, and still says the ticket needs eyes today.

Everything else in that description reconciles and is unchanged: the $220K ARR
and the 22% uplift match the closed renewal, the open $150K upgrade matches the
opportunity, and the open ticket and the billing dispute match seeded cases.

### The flagged panel grouped by `type` and could only ever render one row

`csm_flagged_accounts` groups by `type` in order to separate a flagged customer
from a flagged prospect or partner — the one thing the grid view
`crm_account.at_risk_accounts` cannot show, because it filters
`type == 'customer'` before anything else. Every flagged account in the seed
book was a `customer`, so the panel rendered a single group row and demonstrated
none of that.

**Stark Medical** (`type: 'partner'`) now carries `health_score: 'at_risk'`. It
is the honest severity as well as the matching one: its pilot was won, its
expansion died on a capital freeze 60 days ago, and the partnership contract is
still in legal review — a partner can be at risk, while `churning` would have
described a subscription it never had. Its clock stays at `today()`, so like
Wayne it is outside every windowed panel and visible only in the flagged one.

Computed with the panel's own criterion read off the report metadata:

```
FLAGGED = is_active AND health_score in [at_risk, churning]

              before                              after
rows          Initech  (at_risk,  customer)       Initech  (at_risk,  customer)
              Wayne    (churning, customer)       Wayne    (churning, customer)
                                                  Stark    (at_risk,  partner)

group by type customer: 2          → 1 row        customer: 2, partner: 1 → 2 rows
```

One field added, one paragraph of narrative rewritten. The territory partition
(6 NA / 2 EMEA / 1 other) and the 41 / 72 / 104-day activity bands are both
untouched — no address and no activity clock changed. No report, panel
criterion, object, view or test changed.
