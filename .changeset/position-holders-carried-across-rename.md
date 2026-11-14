---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**People who held a position before 6.2.0 hold it again after the upgrade, with nothing to run (#2458).** 6.2.0 gave the twelve positions the `crm_` prefix (`sales_manager` → `crm_sales_manager`) without telling the platform they were the same positions. An assignment stores the position's name, so every holder assigned on 6.1.x kept naming a position that no longer existed and silently lost the permission sets and sharing it gave them: measured on a member holding Sales Manager, 9 accounts, 23 opportunities and 7 forecasts on 6.1.2, then 0, 0 and refused on 6.2.0. FROM: an administrator had to run `scripts/migrate-position-holders.ts` with an email and password, which a hosted, single-sign-on environment cannot do. TO: each position declares its earlier name in `renamedFrom` (ObjectStack 18.4.0), and the platform moves every holder of the old name to the new one at boot, in every organization, as the system; the same member reads 9, 23 and 7 again, whether the database comes straight from 6.1.2 or already ran 6.2.0. The move happens **at boot**: an environment that installs the upgrade while it is running moves its holders at its next restart. It moves holders only: a sharing rule, queue member or record share added in Setup under an old position name keeps that name, and the boot log lists each one to re-point. A person an administrator already reassigned by hand keeps both rows. `scripts/migrate-position-holders.ts` is removed, since the platform now does the move on every install path.
