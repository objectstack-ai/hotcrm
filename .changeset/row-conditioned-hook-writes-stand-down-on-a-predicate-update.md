---
'hotcrm': patch
---

Bulk updates no longer corrupt the columns HotCRM's hooks derive, and the seeded
forecasts are owned again from the first boot.

A predicate update — `update(object, payload, { multi: true, where })`, the shape
the platform's own seed-ownership claim uses — sends **one** `SET` clause for
every matched row, and hands each row's `beforeUpdate` handler that same payload
rather than a per-row copy (ADR-0058 Addendum II D3). Ten of this app's lifecycle
hooks decided a payload write from the row in front of them (`ctx.previous`), so
that write did not stay on the row it was decided on. Measured on the pinned
`@objectstack/* 17.4.0`, on a fresh `pnpm dev`, it landed two different ways:

- **Refused, loudly.** `forecast_derive_period` stamped `period_end` /
  `period_label` into the shared payload on the first row; the remaining six then
  saw them already set and stamped nothing. Divergent key sets make the engine
  refuse the whole batch, so all **7 seeded forecasts were left with no owner** —
  and under a `private` sharing model an ownerless row is editable by nobody,
  admin included. The app's own `demo_bootstrap` sweep repaired it within ten
  minutes, by id; until it ran, the forecast module was read-only for everyone.
- **Accepted, silently.** Where every row wrote the *same key* nothing diverged,
  the batch went through, and the **last row's value was stored for all of them**.
  On a fresh install that left every closed-lost opportunity reading
  `probability: 80` instead of `0` and every closed-won one `80` instead of
  `100`, with `expected_revenue` flattened to a single figure across deals of
  different size; `crm_task` reported `priority_rank: 2` for urgent, high and low
  alike and `Is Completed: false` on completed tasks. Nothing in the product said
  so, and re-running the sweep never corrected it.

Those hooks now stand down on the predicate path: `ctx.previous` is there for a
guard to **refuse** a write, not to aim one, so derivation happens on the
per-record path instead — which is every writer this app actually has (all 19
`update_record` flow nodes, every action and hook write through `ctx.api`, and
the `demo_bootstrap` claim, every one of them by id). Refusals that read the row
in order to throw — the closed-opportunity and frozen-quote locks, the
do-not-call guards, the delete restrictions — are unchanged and still fire on a
bulk write, which is what D3 supplies `previous` for.

After the change, on a fresh database: the boot banner carries no
`claimSeedOwnership` warning, `crm_forecast` is 7 rows with 0 unowned, and every
opportunity, task and case reads the value its own row earned.
