---
'hotcrm': patch
---

Correct the `case_metrics` dimension inventory on the service docs — two pages
told readers the dataset has five dimensions when it declares six, in all three
locales.

`src/datasets/case.dataset.ts` gained a sixth dimension, `resolved_article`
(labelled **Resolving Article**, over the `resolved_by_article` lookup), when
article ranking landed. Two service pages still enumerated the pre-existing
five and named them as the complete set:

- **SLA & Escalation** — "declares exactly five dimensions".
- **Cases** — "declares Status, Priority, Origin, Type and Created as its only
  dimensions".

Both are now correct and name **Resolving Article**, which is the dimension the
Service Overview dashboard's **Top Resolving Articles** table groups on — so a
reader who takes the docs as the inventory no longer concludes that a grouping
they can actually use does not exist.

The three conclusions the SLA page draws from that list are unaffected and are
left standing: `case_metrics` still declares no owner/agent dimension, still
reads `crm_case` alone and never crosses to `crm_account` for account tier, and
**Created** still buckets by day rather than by month. Each was re-verified
against source rather than assumed.

Separately, the SLA page said the SLA Performance report reports "not a
compliance percentage either". That remains true of the report, but the page
gave a reader no way to learn that the on-time percentage exists at all, so it
now carries the same parenthetical the analytics pages already carry: the
percentage is declared as **SLA Compliance Rate**, and the Service Overview
dashboard's **SLA Compliance** gauge plots it.
