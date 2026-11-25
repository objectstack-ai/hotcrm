---
title: The Project Plan — Tasks, the Gantt and Percent Complete
description: How a project's tasks make its plan, what the Gantt draws, how hours reach a task, and how the project's Percent Complete is worked out.
order: 4
# sources: the objects this doc documents. Build ignores unknown frontmatter keys.
sources:
  - object:crm_project_task
  - object:crm_project
  - object:crm_time_entry
---

# The Project Plan — Tasks, the Gantt and Percent Complete

For project managers, and for the team who reads the plan. A project's plan is
its **Project Tasks**: **Project Plan** in the app draws them on a Gantt, and
the project's **Percent Complete** is worked out from them.

## Who writes the plan

- **The project manager, the project's owner and administrators** add, change
  and remove tasks: writing a task needs edit on its project.
- **The team reads it.** Someone staffed on the project sees every task but
  cannot change one, so their own progress goes to the project manager.
- Finance, the project directors and the PMO read every project's plan.

## A task

- **Parent Task** puts a task under another one. A task with subtasks is a
  **summary**: its own hours and percentage are not counted anywhere.
  **Task Tree** in the app shows each summary with its subtasks under it.
- **Predecessors** are the tasks that must finish before this one starts. The
  Gantt draws each as an arrow into the task.
- A parent or a predecessor is always a task of the **same project**. A parent
  that is one of the task's own subtasks is refused, because the plan would go
  round in a circle.
- **Milestone** marks a checkpoint, such as a go-live review. It is drawn as a
  diamond and usually has no planned hours.
- **Completed** sets the task's **Percent Complete** to 100. A **Cancelled**
  task stays on the plan but no longer counts.

## The Gantt

- **Where:** **Project Plan** in the app shows every task you can read, with
  the predecessors as arrows and milestones as diamonds. Pick a project in its
  **Project** filter to see that project's plan alone; the project's own page
  lists its tasks in the Related tab and draws no Gantt. Subtasks are listed
  beside their summary task rather than under it; **Task Tree** shows the tree.
- **Dragging a bar** changes the task's planned dates, and dragging its
  progress handle changes its Percent Complete. Both save at once.
- **Auto-schedule** in the Gantt's toolbar moves the tasks that wait on a moved
  task and saves them. Only the Gantt does this: a date changed in the task's
  form, by an import or over the API moves that task only, and its successors
  keep their dates until someone moves them.

## Hours on a task

A time entry has an optional **Task**, chosen from the timesheet's project. The
task's **Actual Hours** adds up every entry that names it, whatever the
timesheet's status, so a project manager sees effort as it is booked. The cost
of those hours is still counted only when the timesheet is approved.

## The project's Percent Complete

The project's **Percent Complete** is no longer typed. It is worked out each
time a task changes:

1. Take the tasks with **no subtasks**, leaving out **Cancelled** ones.
2. Weigh each one's Percent Complete (100 for a Completed task) by its
   **Planned Hours**.
3. Divide by the total planned hours.

So a 40-hour task half done and a 10-hour task finished make 60 %, not the 75 %
a plain average would. When none of the counted tasks has planned hours, each
counts the same. A project with no task to count shows no percentage.
