---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**Update Stage on the opportunity list respects permissions and approval locks, and reports each deal (#2586, #2587, #2588, #2589).** The selection bar's **Update Stage** used to move every ticked deal through one system-level script, so a user who could only read a deal could change its stage, and a deal locked while an approval was in progress could be changed too. It is now a declared field write that runs once per ticked deal, as the person who clicked it: a deal they may not edit, or one an approval has locked, is refused and stays where it was, exactly as the record page would refuse the edit. The result dialog counts what moved (for example "Succeeded 2 / 3"), lists each refused deal on its own row with its own reason, and is worded in the reader's language. The dialog now offers the open stages only: a deal is closed as Won or Lost on its own record, where the win or loss reason is entered (ruling A on #2589). The button is not shown to anyone with no edit right on opportunities. FROM → TO for an API or MCP caller of `crm_opportunity/mass_update_stage`: the call takes one `recordId` and `params.stage`, `_selectedIds` is no longer read, and `closed_won` / `closed_lost` are refused with 400.
