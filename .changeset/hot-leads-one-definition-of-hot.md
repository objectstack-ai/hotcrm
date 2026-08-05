---
'hotcrm': patch
---

🔥 Hot Leads now holds the leads new-lead routing actually calls hot: the view's
cut moves from `rating >= 4.5` to `rating >= 4`, matching the `lead_assignment`
flow.

The two disagreed about what "hot" means, and `rating` is a **whole-star** field
— `lead.hook.ts` rounds the computed score to whole stars, `Field.rating(5)`
renders as a star widget that offers nothing finer, and the single seeded `4.5`
was deleted for that same reason in #591. So `>= 4.5` meant `== 5` on every row
that can exist, while the routing flow's hot branch fires at `>= 4`. A 4-star
lead was therefore stamped with the 1-day follow-up SLA, its owner was alerted
"Hot lead — assign within 24h" … and the lead never appeared in the 🔥 Hot Leads
queue that alert points at. Four stars is not rare: a business-domain email, a
phone number, a senior title and a high-value industry reach it.

There is now one definition of hot, produced in one place — the flow's
`check_hot` decision — and the queue mirrors it. **What changes for users:**
4-star New/Contacted leads appear in 🔥 Hot Leads from this release; the queue
is wider than before and matches the alerts already being sent. Nothing about
routing, SLAs or alerts changes.

Hot Leads and **High Priority** now cover the same population, which is the
deliberate cost of having a single definition rather than an oversight. They
differ in purpose: Hot Leads is the work order (sorted by next follow-up, with
phone, email and owner on the row), High Priority is the scan list (rating-tinted
rows, lead source, no SLA column). A five-star-only queue, if it is ever a real
need, belongs in its own view under its own name.

Also removed: the view comment crediting an `auto_flag_hot_lead` workflow, which
has never existed in this repo — it named a producer nobody could open. The
comment now cites the real one.

`test/hot-lead-threshold-parity.test.ts` keeps the two honest. Both thresholds
are derived from the shipped metadata (the view's filter clause and the flow
edge's CEL source), and a truth table asks the real automation engine and the
real view filter, for every rating a lead can carry, whether "routed hot" and
"in the queue" agree. It also fails on a whole-star field cut at a half star,
and on any view comment naming an automation the stack does not register.

The user documentation (`content/docs/sales/leads.mdx` and its zh-Hans /
zh-Hant siblings) described Hot Leads as the five-star queue with four-star
leads over on High Priority; those two rows now describe the shipped behaviour.

Fixes #766.
