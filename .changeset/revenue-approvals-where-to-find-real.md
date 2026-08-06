---
'hotcrm': patch
---

Write the approvals page's *Where to find pending approvals* section to the app's
real navigation, so it stops contradicting the overview page next door.

`content/docs/revenue/approvals.mdx` carried the same phantom sidebar the revenue
overview carried until #943: an **Approval Requests** item with three filter views
and an **Action History** item. The **Approvals** group in `src/apps/crm.app.ts`
holds exactly one child, labelled **Inbox** (待我审批 in Simplified Chinese), and
the group is collapsed by default. Each wrong name is now recorded rather than
quietly deleted, because they were wrong in three different ways:

- ***Approval Requests*** is not a navigation entry — but the name is not
  invented either: it is what the approvals plugin calls the **object**
  (`sys_approval_request`, plural label *Approval Requests*). The section says
  where the name really lives instead of claiming nothing carries it.
- ***Pending My Approval***, ***Submitted by Me*** and ***Recently Approved***
  match nothing in `src/` and nothing in the installed approvals plugin, under
  any spelling — they never existed. What does exist are the four built-in list
  views the plugin ships on the request object, which the **Inbox** item pins
  none of and therefore opens all of: **My Pending**, **I Submitted**,
  **Completed** and **All**. The section now names those, so a reader looking for
  "requests waiting on me" finds the tab that does it.
- ***Action History*** names no sidebar item anywhere in the app. The audit trail
  itself is real — every action is stored as `sys_approval_action`, with its own
  **Recent** / **By Actor** / **All** views and a `request_id` lookup back to its
  request — so what is missing is only the way in.

All three locales updated; `src/` untouched. `test/docs-revenue-approvals-navigation.test.ts`
pins both halves: the section must name every list view the plugin ships (so a new
view cannot land while the prose goes stale) and must keep all five wrong names
with their denial, while the source side pins the single **Inbox** child, its
absent `viewName`, the zh-CN label, and the zero-hit status of the three phantom
view names — so a future plugin release that ships a view by one of those names
fails a test instead of silently making the page right again by accident.
