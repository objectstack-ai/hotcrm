---
"hotcrm": patch
---

**Editing the demo case "Mobile app crashes on iOS 17" no longer escalates it a second time.** The demo data's escalated cases had the **Escalated** flag and an **Escalation Reason** but no **Escalated Date**, and the automatic escalation of Critical cases treats a case with no Escalated Date as never escalated. So the first edit anyone saved on that case, a Critical case being worked in **In Progress**, replaced its reason "Affects 30% of mobile users" with "Auto-escalated: critical priority", gave it a new Escalated Date, and moved it back to **Escalated**.

Every escalated demo case now carries an Escalated Date between the moment the case was opened and now. Editing one keeps its reason, its date and its status.

This applies to a new demo database only. The demo cases are written once, when the database is first seeded, and later starts never write them again: the case dataset is insert-once (`mode: 'ignore'`, #2139), and this release ships no migration or backfill. A demo database seeded before this release keeps its escalated cases without an Escalated Date, and there an edit to "Mobile app crashes on iOS 17" still escalates it again. A new demo database (`pnpm demo:reset`, which deletes the existing one) gets the new data.
