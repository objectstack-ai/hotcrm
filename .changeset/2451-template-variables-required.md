---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**A notification that is missing a value is no longer sent with a blank in it.** Every value a HotCRM notification template prints (the record's name, a contract number, a date, an amount, a stage or priority label) is now declared required, in all four languages. When a flow, for example one a customer has edited, sends a notification without one of those values, that notification is not delivered, and its delivery record is marked failed with `MISSING_VARIABLES` and the name of the missing value. Before, the recipient got a sentence with a gap in it, such as "Contract  ends on .", and nobody learned that anything was wrong. `pnpm lint` now also reports a flow's notify step that leaves out a value its template needs. HotCRM's own flows pass every value, so every notification they send today is unchanged.
