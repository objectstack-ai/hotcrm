---
"hotcrm": minor
---

Clause-②: no
Metadata-protocol: none

**HotCRM's twelve positions carry the `crm_` prefix (#2437).** FROM `executive`, `sales_director`, `sales_manager`, `sales_rep`, `service_director`, `service_manager`, `service_agent`, `marketing_director`, `marketing_manager`, `marketing_user`, `na_sales_team`, `eu_sales_team` TO the same names with `crm_` in front (`sales_rep` → `crm_sales_rep`). From ObjectStack 18.4.0 a position is one slot per name in the whole environment, so a second app that shipped its own `sales_rep` would be refused at install, and `os lint --strict` asks every app's positions to carry its prefix. Labels and descriptions do not change, and neither do the permission sets that share some of these names (`sales_rep`, `sales_manager`, `service_agent`, `marketing_user` stay as they are). Every sharing rule, approval step, queue and navigation gate HotCRM ships now names the new positions, and the administration docs in all three languages use the new names.

⚠️ Upgrading an installed organization: the platform keeps who holds a position by the position's name and does not follow a rename, so after the upgrade every existing assignment still names the old position and grants nothing (no permission sets, no sharing, no approvals, no queue) until it is moved. Right after installing this version, run once per organization, signed in as that organization's administrator:

```
pnpm exec tsx scripts/migrate-position-holders.ts --url https://<your-org> --email <admin> --password <pw>          # report
pnpm exec tsx scripts/migrate-position-holders.ts --url https://<your-org> --email <admin> --password <pw> --apply  # move
```

It rewrites each assignment's position to the new name and nothing else (holder, organization, business unit, validity dates and delegation stay), skips a holder who already holds the new position, and is safe to run again. It also lists, without changing them, queue members and sharing rules your organization added in Setup that still name an old position: pick the new position there. A formula or condition of your own that tests `"sales_rep" in current_user.positions` (or any other old name) needs the new name too.
