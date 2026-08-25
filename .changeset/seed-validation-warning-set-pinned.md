---
---

Test-only: pin which seed rows trip a warning-severity validation rule. Ships
nothing to users, hence the empty frontmatter.

A clean `pnpm dev` boot logs `related_to_required` twice, and the natural
reading — a seed row forgot its parent — is wrong. Measured across both objects
that declare the rule (`crm_task`, `crm_event`) and all of `src/data/`, exactly
one seeded row trips it: the `crm_task` row `Update CRM pipeline report`, which
is unparented deliberately and has carried a comment saying so since it was
written. Both log lines come from that single row — one for the seed insert, one
for `demo_bootstrap`'s claim sweep re-writing it to stamp `owner_id` — and the
warnings appear only on a first boot against an empty database; every later boot
logs none. No accidental row exists to fix, so no seed data changed.

`test/seed-validation-warnings.test.ts` pins that as a value: the exact set of
`(object, rule, record)` triples that warn, the reason comment that makes the one
entry legitimate, and the positive half — every other activity seed row carries
both halves of its polymorphic parent. It also records a hazard found while
building it: seeded dates are unresolved CEL envelopes until boot, and handing
one to a date predicate yields a confident wrong answer — `close_date_future`
"fired" for ten opportunities whose close dates are all in the future, a rule the
real boot logs zero times. Those pairs are skipped as unmeasurable rather than
pinned, with an anti-vacuity guard asserting the rule under test was never itself
skipped.
