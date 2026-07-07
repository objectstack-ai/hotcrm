---
'hotcrm': patch
---

Drop the hard-coded `$` from money display formats so amounts don't force a USD symbol.

Currency measures and table/axis columns used the numeral format `'$0,0'`, which bakes a literal `$` into every rendered amount regardless of the actual currency. Combined with the platform's (now removed) default currency, the Executive Overview KPI showed `US$2,528,600` even though the `amount` field declares no currency of its own. All money formats are now plain `'0,0'` (grouped number, no symbol) across the opportunity/account/product datasets and the executive/sales/crm dashboards, so amounts render as plain numbers unless a currency is actually configured (a field code or a workspace default).
