---
'hotcrm': patch
---

Make the end-to-end suite independent of who owns the seeded records.

`pnpm test:e2e` could only ever assert anything while the demo book was owned by
NOBODY. `e2e/global-setup.ts` signs **up** `e2e-admin@hotcrm.test`, which lands as
a plain org member holding the positions `[org_member, everyone]` — no
`viewAllRecords`, no sharing grant — and under `sharingModel: 'private'` such an
account reads a seeded row only while that row is ownerless. `demo_bootstrap`
claims every ownerless row for the org's first user, so the suite's green rested
on an accident: on CI, `objectstack start` seeds no dev admin, the suite's own
account is therefore the org's first user, and the sweep claims the seeds FOR it.

Measured on 17.0.0-rc.5, that accident is now narrower than #665 recorded. The
sweep no longer waits for the wall-clock ten-minute boundary: on a fresh
`pnpm dev` database all nine seeded accounts carried the dev admin's `owner_id`
25 seconds after boot, so a local run failed on its FIRST attempt rather than
after ten minutes. And a `pnpm start` database whose first user is anybody else
fails the same way, which is exactly how much of CI's green was luck.

The specs now create the records they assert on. A `crm_account` fixture inserts
an account per test, the platform stamps the caller as its owner, and the
lifecycle and win/loss specs hang their deals off that. `demo_bootstrap` selects
`owner_id: null`, so it never touches these rows, and `pnpm demo:staff`
re-evaluating every sharing rule cannot take them away either. Verified: 16/16
pass against a `pnpm dev` server whose seeds belong to `admin@objectos.ai`, again
after `pnpm demo:staff` with no `demo:reset` in between, on a cold CI-shaped
`objectstack start` boot, and on a `start` database where the suite is the org's
SECOND user — the state that aborted the whole run before this change.

`e2e/fixtures.ts` now states what the suite proves about access control, because
the change moved it: every record assertion is about a record the caller OWNS,
reached through the OWD baseline alone. `smoke.spec.ts` asserts that owner match
explicitly rather than leaving it implied — a read that succeeds because the
caller holds `viewAllRecords` proves something different from one that succeeds
because it owns the row, and this suite proves the second. It follows that
granting the e2e account org-wide read to make a future spec easier would quietly
weaken every assertion here; specs should create what they need instead.

Two consequences recorded rather than left implicit. The `#665` precondition
guard (`e2e/seed-precondition.ts`) is gone with its unit test: it guarded a
dependency that no longer exists, and its "claimed" branch had become
unreachable. And the `afterEach` delete loops are gone because they never worked
— `DELETE` answers 403 `PERMISSION_DENIED … for positions [org_member, everyone]`
for this account — so records persist and every name the suite writes now carries
a unique suffix, which is what keeps reruns against one database honest given
that `crm_account.name` is unique per organization.

The win/loss spec's seeded-sweep case retires with its claim carried elsewhere:
`test/win-loss-capture.test.ts` already asserts every settled SEED supplies its
reason, over the seed source rather than the first 200 rows one user can see, and
a new case here asserts the seed's own write shape — an insert landing directly
in a settled stage — is accepted and stores the reason, the positive counterpart
to the rejection already tested.
