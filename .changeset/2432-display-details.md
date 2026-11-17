---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**Display and sample-data details from the 6.1.2 browser pass (#2432).** **All Forecasts** is a flat list, newest period first, that names each period by **Period** (Month or Quarter) and **Period Start** in the reader's language instead of the stored English label ("Nov 2026"). It draws no heading per period, which on a one-owner book was one row per heading and one extra request each, and no column totals, which counted each month twice beside its quarter; group it by Period Label from the grouping control to get the headings back. **Expected** on a forecast now reads as money with the tenant currency, like the amounts beside it. A case's page header reads its stored title (`CASE-00034 - Subject`), as the breadcrumb does. The **All Accounts** footer shows the average **Annual Revenue** instead of a total. The lead-conversion result screen says where the lead went ("The lead is now part of the account Foundry Robotics." / 「线索已转入客户：铸造机器人。」) instead of "No account approval is pending for …". Sample data: every seeded lead names a **Need Type** and an **Estimated Amount**, Wayne Enterprises is `healthy` (it holds the largest open deal and a contract in approval, and was seeded `churning`), and the Chinese demo story writes its amounts in 元, not 美元. Seed changes reach a new database only; an existing one keeps its rows.
