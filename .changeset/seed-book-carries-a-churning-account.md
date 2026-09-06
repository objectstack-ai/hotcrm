---
'hotcrm': patch
---

Flag one seeded account `churning` with its activity clock still running, so
the demo can actually show the **CSM-Flagged Accounts** panel of the *Customer
Churn Signals* report doing its job.

`crm_account.health_score` ships four options and the seed book used two. The
most severe of them, `churning`, had no record behind it anywhere in `src/data/`
— so on a fresh install the worst state in the churn model was a picklist entry
a demo could describe but never point at.

The consequence was worse than one unused option. `csm_flagged_accounts` is the
only panel on that report with **no time window**: its whole reason to exist is
the account a CSM is working *right now* and still expects to lose, which is
invisible to the three derived panels below it by construction. The seed book
contained no such account, so the panel rendered exactly one row — Initech
Solutions, which is also 72 days quiet and therefore appears in **At-Risk
Accounts** directly below. A reader of the demo saw a panel that restated its
neighbour, which is the opposite of the point.

**Wayne Enterprises** now carries `health_score: 'churning'` with
`last_activity_date` left at `today()`. It is the strategic-tier customer whose
every *derived* signal reads healthy — an operations rollout closed four days
ago, a licence at 80% two weeks from signature, three meetings held this month
— and that is why it was chosen: the panel exists to carry human judgement that
the windows and the pipeline do not agree with. Because the tier is
`strategic`, the row is inside **Silent High-Value Accounts**' scope as well and
is excluded from it by the clock alone, so it is visible in the flagged panel
and in neither windowed panel.

The demo split, stated as the set arithmetic the panels compute:

```
              before                          after
FLAGGED       Initech                         Initech, Wayne
QUIET60       Apex, Initech                   Apex, Initech      (unchanged)
SILENT90      Apex                            Apex               (unchanged)

FLAGGED \ QUIET60   (empty)                   Wayne
```

One record changed. The two windowed panels move by nothing, so the deliberate
territory partition (`billing_address` → territory) and the deliberate 41 / 72 /
104-day activity bands are both untouched — Initech stays the flagged-*and*-quiet
half of the split on purpose, and Wayne is now the flagged-*and*-active half.

Seed data only. No report, panel criterion, object or test changed.
