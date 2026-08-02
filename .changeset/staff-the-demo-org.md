---
'hotcrm': patch
---

Give the demo org people, so the position-based mechanisms this app ships stop
resolving to an empty recipient set. A new `pnpm demo:staff` command creates
three non-admin demo users on a local dev server — an NA rep, an EU rep and a
sales manager — assigns the positions they hold, and re-evaluates the sharing
rules so the already-seeded records materialise grants.

This was the last dark layer of the same gap #621 and #638 closed from the other
two sides. The rules installed and the records matched them, but nobody held any
position, so a matching account still granted nothing: on a fresh install
`sys_user_position` had 0 rows and `sys_record_share` 0 rows, every
position-based sharing rule granted nobody anything, and submitting a deal for
approval opened `opportunity_approval`'s `manager_review` with an empty approver
slate while `lockRecord` held the record with no in-product recovery. After
staffing, the same fresh install shows `north_america_territory` granting its 6
accounts and `europe_territory` its 2, the NA rep reading exactly the six US/CA
accounts she does not own (and neither the two EU ones nor the one account in no
territory), and `manager_review` routing to a real approver.

Who exists and which positions they hold is a table
(`src/sharing/demo-staffing.ts`) — adding a person is adding a row. The two reps
must be users who do NOT own the accounts, because `crm_account` is `private`
and the OWD baseline already admits a record's owner, so a share to the owner
would prove nothing; ownership stays with `demo_bootstrap`'s first user and the
script exits non-zero if that ever stops being true. The other seven positions
stay unstaffed on purpose: a real deployment staffs its own people.

**These accounts can never reach a customer org.** Staffing is a repo script
that drives a local dev server through the platform's own admin endpoints, not
metadata: nothing in the published artifact can create a user, and
`test/demo-staffing.test.ts` fails if a seed dataset or a flow node ever writes
`sys_user`, `sys_member` or `sys_user_position`. (It could not have worked as
metadata either — identity tables are `managedBy: 'better-auth'`, so a row
inserted around that surface has no credential and nobody can sign in as it.)

One platform behaviour worth carrying forward, measured here: `plugin-sharing`
materialises rule grants from a record-write hook that returns early on
`isSystem` writes, and every seeded row is written with `isSystem: true`. So
staffing alone leaves `sys_record_share` empty until a rule is re-evaluated —
which the script does, and which a server restart also does via the boot
backfill. Fixes #640. Refs #621, #638, #622, #488.
