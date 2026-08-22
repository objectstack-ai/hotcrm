---
'hotcrm': patch
---

Sales Home's three tabs now show the work they are named after, and the
Activities documentation describes the task views the app actually ships.

**Sales Home.** *My Leads*, *My Opportunities* and *My Tasks* each held a single
`page:section` with no properties. That is a legal page schema — it validates,
it builds, and it renders `<section></section>`: three tab names over three
blank panels, measured in a browser, with no diagnostic anywhere because there
is no broken reference to catch. The three tabs now embed the objects' own saved
views (**My Leads**, **My Open Deals**, **My Open Tasks**), which render as
sortable, filterable grids on the landing page; `{current_user_id}` resolves on
this path, so "mine" means mine. Two tabs were renamed to match the view behind
them — *My Opportunities* became **My Open Deals** and *My Tasks* became **My
Open Tasks**, because both views exclude closed/completed records and the old
names promised more than they showed.

The tab configuration is **read off** `src/views/*.view.ts` rather than retyped,
so there is still exactly one definition of what "my leads" means; a page
component cannot name a saved view on 17.0.0-rc.2, and retyping the columns and
filters would have created a second definition free to drift from the first.
A new guard (`no page tab renders an empty container`) fails the build for any
future tab that promises content and binds none.

**Activities documentation** (English, zh-Hans, zh-Hant). The page advertised a
*home page activity widget* offering *Today's Tasks* and *Overdue Tasks* — no
such widget exists, and those two names belong to list views whose shipped
labels and behaviour are different again. Its "Standard list views" roster named
six views, of which four do not exist and two were described by the wrong
filter: *Today* was documented as "due today" when **📅 My Priority Tasks**
filters on priority and status and never looks at a date, and *Overdue* was
documented as "past due date, not completed" when **⏰ Open Tasks · Most Overdue
First** is the whole open backlog ordered oldest-due-first, not a past-due
filter. Meanwhile the five views that make tasks the richest object in the app —
All Tasks, Task Board, Task Schedule, Execution Plan and Worklog Timeline — went
unmentioned. All eight views are now documented tab by tab against
`src/views/task.view.ts`, including where each one is reached from.
