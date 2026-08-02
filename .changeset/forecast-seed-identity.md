---
"hotcrm": patch
---

Forecast demo seeds no longer upsert on `period_label`, which stopped identifying a single row

`crm_forecast` is a per-owner snapshot, and since the nightly `forecast_snapshot`
sweep began writing one row per active opportunity owner per quarter, every one
of those rows carries the same `period_label` ("Q3 2026"). The demo seed still
used that label as its upsert key, so re-seeding an existing database matched
whichever row the loader returned first and could overwrite a real
freshly-computed snapshot with the demo numbers.

`crm_forecast` gains a `seed_key` column that only the seed loader ever writes,
and the demo seed now upserts on it. The field is `readonly` — seed writes run
in system context and bypass readonly stripping, user and API writes do not — so
a genuine forecast row can never carry a value there and can never be matched by
a re-seed. It is also `hidden`, keeping a fixtures-only column out of forms and
pickers.

Existing demo databases are unaffected in place; the seeded forecast rows are
re-keyed on the next reseed (`pnpm demo:reset`). No user-authored data changes.
