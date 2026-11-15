---
title: Projects Overview — What the Dashboard Counts
description: Which projects and which hours the Projects Overview dashboard counts, and how its percentages are worked out.
order: 3
# sources: the objects this doc documents. Build ignores unknown frontmatter keys.
sources:
  - object:crm_project
  - object:crm_time_entry
---

# Projects Overview — What the Dashboard Counts

For project directors, the PMO, finance and project managers. **Projects →
Projects Overview** in the **Project Delivery** app shows budget, cost, margin
and hours across every project you can read.

## Which projects the money counts

- **Only projects that are spending.** The money tiles count **Active**, **On
  Hold** and **Completed** projects. A Draft or In Approval project has a
  budget but no cost yet; a Closed or Cancelled one is finished.
  **Projects by Status** is the one tile that counts every project.
- **Approved cost only**, the same figures the project record shows: a draft or
  waiting timesheet is not cost yet.
- **Budget Used is the portfolio's.** It is the total Actual Cost over the
  total Approved Budget of the projects counted, not an average of each
  project's percentage, so a large project weighs more than a small one.
- **Projects by Budget Status** leaves out projects with no budget.

## Which hours count

- **Approved timesheets only.** **Approved Hours by Week** and **Billable Share
  by Person** count hours on approved timesheets; submitted and draft hours are
  left out until they are approved. Each hour falls in the week of the day it
  was worked, so a timesheet that crosses a week is split between the two.
- **Billable Share** is billable hours over all hours, for each person.
  Hours from a non-billable staffing count in the total, not in the billable
  part.

## No date picker

A project runs for months, and cutting projects by a date would leave a running
project out of its own figures, so the dashboard has no date filter. The hours
tiles are laid out by week instead.

## Who sees what

The dashboard counts what you can read. A project manager counts the projects
they manage; finance, the project directors and the PMO count every project.
Someone staffed only as a team member does not see project cost on the record,
and is not offered the dashboard either; opened from a link, it shows them only the tiles that carry no cost.
