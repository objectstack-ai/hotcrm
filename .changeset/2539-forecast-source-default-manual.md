---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**A forecast a person saves is Manual entry unless they choose otherwise, so the nightly sweep no longer overwrites it (#2539).** The New Forecast form pre-selected **Source = Scheduled snapshot**, and an insert that named no source stored `scheduled` through the API as well. The nightly **Forecast Snapshot** flow refreshes every `scheduled` row in the current quarter, so a manager's hand-entered current-quarter forecast saved without touching Source had its four amounts overwritten and its snapshot date restamped at 03:00. The default is now **Manual entry**, and a manual row stands the sweep down for that owner and quarter, as the handbook describes. The sweep and the sample data name their own source and are unchanged. **Period Start** is no longer marked required on the form: leave it blank and the forecast lands on the period containing its snapshot date, as the handbook already says; a start typed by hand must still be the period's first day, and an edit still cannot clear it.

Existing data: nothing is migrated. A row someone saved by hand while the old default stood is stored as `scheduled` and cannot be told apart from a row the sweep wrote, so a current-quarter one is still refreshed by the sweep. To keep its numbers, open it and set **Source** to **Manual entry**.
