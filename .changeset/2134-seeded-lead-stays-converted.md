---
"hotcrm": patch
---

**A sample lead you convert stays converted after the server restarts.** The sample leads that ship with HotCRM were written back on every boot. A sample lead converted with Convert Lead therefore came back after the next restart at the stage it was seeded with, Contacted for example, while it still counted as converted and kept its links to the new account, contact and opportunity. Its stage path showed the old stage, Convert Lead stayed hidden, and nothing on the page said the lead had been converted.

The sample leads are now added once, on the first boot of a database that does not have them, and a later boot leaves them alone. A conversion, or any other change you make to a sample lead, now survives a restart. The follow-up and last-contacted dates on the sample leads now keep the values from the day they were added and no longer move forward on each boot. Leads you create yourself were never affected, and conversion itself is unchanged.

A sample lead that a restart has already reset keeps its wrong stage: this release does not repair it. Reset the demo database (`pnpm demo:reset`) to start again from the shipped sample data.
