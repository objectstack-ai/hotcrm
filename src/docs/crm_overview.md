---
title: HotCRM Overview
description: How HotCRM is organized and where the automated business rules live.
---

# HotCRM Overview

HotCRM runs your customer lifecycle across four areas. The screens are
self-explanatory — this documentation covers what the screens **don't** show:
the rules and automation working behind the scenes (who a record routes to, when
something escalates, what threshold triggers an approval).

Each guide is written for the people who operate that area.

- **[Sales](crm_sales.md)** — for sales reps and managers. Lead routing,
  conversion, opportunity stages, large-deal approvals, quotes.
- **[Service](crm_service.md)** — for service agents and managers. Case
  priority, SLA breaches, escalation, and satisfaction follow-up.
- **[Administration](crm_admin.md)** — for administrators. Roles, record
  visibility (sharing), and where to tune every automated threshold.

## The customer lifecycle, end to end

A record flows through the system like this:

```
Lead ──convert──▶ Account + Contact ──▶ Opportunity ──▶ Quote ──▶ (Closed Won) ──▶ Contract
                                          │
                              Case ◀──────┘  (post-sale support)
```

Most of what makes HotCRM useful is **automatic**: a new lead gets a follow-up
deadline and lands in a queue without anyone configuring it; a deal over a
threshold halts for sign-off; a case that misses its SLA escalates on its own.
The guides above document each of those behaviors and the exact thresholds, so
nothing the system does is a surprise.

> Tuning any of these rules (approval amounts, SLA timing, stale-deal windows)
> is an administrator task — see **[Administration](crm_admin.md)**.
