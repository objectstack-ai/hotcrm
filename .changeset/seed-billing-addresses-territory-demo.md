---
'hotcrm': patch
---

Give the nine demo accounts a billing address, so the two territory sharing
rules match real records instead of an empty set. `north_america_territory` and
`europe_territory` filter on `crm_account.billing_country`, and until now not
one seeded account carried a `billing_address` for that column to be projected
from — both rules installed correctly and then covered zero accounts, so Setup
showed two territories with nothing behind them. The addresses partition the
set deliberately across all three outcomes the rules can produce: six in North
America (five US, one CA), two in Europe (DE, UK) and one outside both (SG),
with the account phone numbers moved to match their new countries. A rule with
no matching record is indistinguishable from a rule that never seeded, so
`test/territory-seed-coverage.test.ts` now walks the whole chain — seed record →
the real `account_protection` projection → the seeder's own CEL compiler → which
accounts each territory covers — and fails when any bucket empties out.

`billing_country` is deliberately still not authored in the seeds: hooks DO run
over seed writes (the loader's `skipTriggers` suppresses record-change
automation, not lifecycle hooks), so the projection is computed at seed time,
and the seed doctrine block that claimed the opposite has been corrected.

The seed fixtures are now split by object family — `catalog`, `sales`,
`service`, `marketing` and `revenue` `*.seed.ts` modules with `src/data/index.ts`
reduced to the aggregating `CrmSeedData` export. The single file was 1.5KB under
the 100KB source-hygiene cap, so this change would not have fit; the split makes
where-to-add-a-record follow from the object, and a new test fails if a family
module's dataset is never wired into `CrmSeedData`. Fixes #638. Refs #635, #617,
#621.
