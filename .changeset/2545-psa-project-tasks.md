---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**Projects get a plan: tasks, a Gantt and a computed Percent Complete (#2545, PSA phase 2a).** New `crm_project_task`, master-detail on the project: a parent task (so tasks form a tree), planned start, end and hours, a task owner, a status, a milestone flag and predecessors. A parent or predecessor from another project, or a parent that is one of the task's own subtasks, is refused; Completed sets the task to 100 %.

- **Gantt.** The project's record page (new `project_detail_page`, slotted) draws the project's tasks on a Gantt under its fields: predecessors as links, milestones as diamonds. The app gets **Project Plan** (every task on a Gantt, filter by project), **Task Tree** (subtasks under their summary task) and **My Project Tasks**. The Gantt does not yet nest subtasks: on 18.5.0 it reads an expanded lookup as the parent instead of its id. The console's auto-schedule shifts successors; there is no server-side cascade.
- **Hours on a task.** `crm_time_entry` has an optional **Task** from the timesheet's project (another project's task is refused); the task's **Actual Hours** sums the entries.
- **Percent Complete is computed.** `crm_project.percent_complete` is now read-only, kept from the project's tasks with no subtasks, weighted by planned hours, cancelled ones left out. A project with no task reads empty, so a project whose percentage was typed before keeps that value until its first task is added.
- **Who writes the plan.** The project manager (and owner, admin) writes tasks; the team and finance read them (ruling D).
- **Demo data.** The seeded projects carry their plans in en and zh-CN (23 tasks each), and their Percent Complete now comes from them.
- Translations in the four locales, the docs site's new *The Project Plan* page (en, zh-Hans, zh-Hant) and the in-app *The Project Plan* doc.
