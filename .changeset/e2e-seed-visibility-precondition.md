---
'hotcrm': patch
---

Fail the end-to-end suite with the actual reason when the demo seed is loaded but
invisible to the account it runs as.

`pnpm test:e2e` against a dev server that has been up for more than ten minutes
failed eleven of sixteen specs on `no seeded accounts returned` and `no seeded
crm_account — the demo seed did not load`. The seed had loaded. `e2e/global-setup.ts`
signs **up** `e2e-admin@hotcrm.test`, which lands as a plain org member that owns
nothing and holds no sharing grant, and every seeded row starts out owned by nobody —
which under `sharingModel: 'private'` is the only reason it could read them at all.
Once `demo_bootstrap` (or `pnpm demo:staff`) claims those rows for the first user, the
suite reads zero, and reported it as a missing seed.

Global setup now states that precondition instead of depending on it silently. Two
`?limit=1` reads separate the two states that both look like "zero rows":
`crm_account` is `private` and swept by `demo_bootstrap`, so it goes dark the moment
the seeds are claimed; `crm_product` is `public_read` and in no sweep, so no ownership
state can hide it. Products but no accounts means the seed is there and claimed — the
run aborts with that sentence and `pnpm demo:reset`; neither means nothing seeded, and
says so. The spec-level assertions, still reachable if the sweep fires mid-run, now
carry the same cause rather than blaming the seed loader.

What the suite proves is unchanged: no sharing grant, no permission set, no switch to
the seeded dev admin. The guard also cannot turn a passing run red — it returns on the
first readable row, and waits out a seed that is still loading rather than calling it
absent.
