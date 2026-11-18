---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**Project Delivery walkthrough fixes (#2565, #2567, #2568) and stacked New/Edit forms (#2566).** A budget version created or edited with lines typed into its form now saves: the form saves the version and its lines together, which the two objects did not allow (`bulk`). A timesheet keeps the name its author typed; an empty name is still filled from the project and the period, and a generated name now follows a later change of either. A project member is named by the person's name, so creating one says *Project Member "Lena Park" created* instead of showing a user id; the name follows a rename of the user (the new **Project Member Person Renamed** flow). Existing members get the name on their next save, or all at once from `scripts/backfill-record-titles.ts`. The New and Edit forms of accounts, contacts, contracts, opportunities, quotes and campaigns are one page of sections instead of tabs, so a missing required field is on the same page and every section is reachable on a phone. Sections a new record is rarely given start collapsed, and the wider dialog takes three fields a row. `docs/developers/number-formats.md` records three amount and percentage display gaps measured on 18.5.0 and left to the platform (#2569).
