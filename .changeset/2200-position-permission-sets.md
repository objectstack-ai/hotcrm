---
'hotcrm': minor
---

Each position now names the profile it hands out, so Setup shows who holds what

Five positions give their holders a profile: Sales Manager, Sales Representative, Service Agent, Service Manager and
Marketing User. Until now none of them said so. Each reached its profile only because the two share a name, a match
the platform makes without anything declaring it, warns about on every boot, and is retiring. So Setup told the
wrong story: a position's page said it grants nothing on its own, and each profile's **Assigned Users** panel was
empty, while the people holding those positions were in fact getting the profile.

- **Each of the five positions now lists its profile** under **Permission Sets** on its page in **Setup →
  Positions**. Sales Manager, Sales Representative, Service Agent and Marketing User each hand out the profile of
  the same name; Service Manager hands out **Service Agent**.
- **Nobody's access changes.** Every persona reads and edits exactly the records it did before: the sales reps,
  the sales manager, the service agent, the service manager and the marketing user were each measured object by
  object before and after. The boot no longer warns about these positions, and when the platform stops matching
  positions to profiles by name, these five keep working.
- **The Service Manager profile is retired.** It was a renamed copy of Service Agent that existed only because a
  position could not name its profile. The Service Manager position now names Service Agent directly, so there is
  one profile to keep correct instead of two. **If you assigned the Service Manager profile to someone directly** in
  Setup, rather than giving them the Service Manager position, that assignment grants nothing after this release:
  assign **Service Agent** instead, or give them the position.
