---
'hotcrm': patch
---

Retire the `Demo Bootstrap` flow: seeded records get their owner from the platform, once

HotCRM shipped a scheduled flow, **Demo Bootstrap** (`demo_bootstrap`), that ran every ten
minutes forever in every tenant. Each run filtered twelve objects for records with no owner
and gave them to the first user. A seed cannot name a user, so seeded demo records arrive
with no owner, and the flow existed to fix that after the fact. On a production tenant it ran
1,776 times in 13 days, took up to 26 minutes, and changed nothing after its first pass.

From ObjectStack 17.6.0 the platform does this itself, on a new install's first boot: when the
seed data finishes loading, it hands every seeded record that has no owner to the first
administrator. A fresh `pnpm dev` boot on this release, with the flow kept from running,
leaves no ownerless record on any of the twelve objects the flow used to cover. So the flow is
removed.

**What changes for you:**

- A fresh install no longer carries a `flow-schedule:demo_bootstrap` job (`*/10 * * * *`) in
  `sys_job`, and **Flow Runs** no longer shows a Demo Bootstrap run every ten minutes.
- HotCRM now ships 30 flows, eight of them scheduled. The admin *Automation* page says so in
  all three locales.
- Seeded demo records are still owned by the first administrator, as before. Known limit: seed
  records that a later upgrade adds to an existing install do not get an owner from the
  platform yet (tracked in objectstack-ai/objectstack#21486). `pnpm demo:staff` works unchanged.
- The `saas` composition no longer differs from the community app in its flows. It already
  left this flow out.

**Upgrading an existing install:** the platform leaves the old
`flow-schedule:demo_bootstrap` row in `sys_job`, still marked active, when the flow disappears.
Nothing runs it any more. An operator who wants the table clean can delete that one row.
