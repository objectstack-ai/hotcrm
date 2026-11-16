---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**A consultant enters a whole week across projects without building timesheets by hand (#2546).** A time entry now has a **Project**. An entry saved with its project and date and no timesheet goes into the person's timesheet on that project whose period holds the date, or into a new draft timesheet for that week, Monday to Sunday (`time_entry_timesheet`); changing an entry's project or date moves it the same way. Each project keeps its own timesheet, approver and approval. New lists: **My Week** (this week's entries grouped by project, edited in place), **My Time** (all of one's entries by timesheet) and **Submit This Week** (one's timesheets touching this week, with a bulk **Submit** that submits each as the person); a timesheet also gets a **Submit** button. The timesheet model is unchanged. Entries written before this change have no Project until their next save, which copies it from the timesheet. On 18.5.0 a single write is not one transaction (objectstack#34412), so an entry refused after its timesheet was created (a declared validation, say) leaves that empty draft timesheet, which the next entry for the project and week uses; a person not staffed on the project is refused before anything is created.
