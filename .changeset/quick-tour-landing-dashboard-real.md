---
'hotcrm': patch
---

Rewrite the quick tour's opening section against the dashboard **Home** really
opens. `content/docs/getting-started/quick-tour.mdx` — the first paragraph a new
user reads — described a dashboard that does not exist: its name came from one
dashboard and its five bullets from three others.

The name was wrong. `nav_home` binds `executive_dashboard`, whose label is
**Executive Overview**. **CRM Overview** is a real dashboard, but it hangs off
`nav_crm_dashboard` under **Insights** — a group that ships collapsed — so a new
user neither lands on it nor can click it without opening the group first. The
same page's navigation table already said Home opens **Executive Overview**
(PR #968), so the page contradicted itself, with the wrong half first.

Of the five bullets, one was right (**Open Leads**), one was half-right, and
three named tiles that are on other dashboards entirely. The section now lists
all nine **Executive Overview** tiles with what each measures, names the three
dashboard-wide controls, and re-points every retired claim instead of deleting
it: cases are counted on **Service Overview** (**Open Cases**, **Critical
Cases**, **SLA Violations**), interactions on **Sales Activity**
(**Interactions Logged**, **Meetings Booked**, **Customer Minutes**), and a
count of open deals is **Active Deals** on **CRM Overview**. "Top accounts by
pipeline value" is not a tile in this app at all — the nearest ranking anywhere,
**Pipeline by Owner**, ranks sales reps rather than customers.

Two corrections beyond the reported ones. The pipeline bullet was half-right
rather than wrong: **Pipeline by Stage** *is* on this dashboard, arriving from
the shared widget factory rather than an inline literal, so a title grep over
`executive.dashboard.ts` finds eight tiles where the dashboard ships nine. The
section now says what that tile actually measures — open opportunity value per
stage, not a count of deals. And the closing promise of "team-level rollups for
managers" describes something this app does not do: positions are flat, so
visibility never rolls up a reporting line, and the **Sales Manager** permission
set grants `viewAllRecords` outright, which makes a manager's totals org-wide
rather than a team slice.

All three locales updated; `src/` untouched. The guard added in PR #968,
`test/docs-quick-tour-navigation.test.ts`, only ever read the navigation table
and so stayed green through all of this — it now also compares this section
against `ExecutiveDashboard.widgets` at runtime (which is what counts the
factory-produced funnel), pins the source side of each negative claim, and
fails in all three locales when a tile is added, renamed or removed.
