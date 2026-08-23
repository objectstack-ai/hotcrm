---
'hotcrm': minor
---

The sidebar is back to what the docs promise. `content/docs/whats-new.mdx`
sells a "slimmed nav … so a new user can find their way around in 30 seconds",
and the nav had grown to 7 groups and 31 items, all but two of them expanded on
load. It is now 6 groups and 27 items.

Almost all of the excess was one pattern: the same object surfaced repeatedly
through its own saved views, while the list page it opened already carried a
tab for every one of them. `crm_event` held four rows, `crm_opportunity` three.
The redundant rows are gone and **no destination went with them** — each is a
tab on its object's list page:

- **Pipeline** → the `pipeline` tab on **Opportunities** (`pipeline_kanban`).
- **Calendar** and **Interaction History** → the `calendar` and `history` tabs
  on **Events** (`event_calendar`, `held_events`).
- **All Tasks** → the `all` tab, which is the landing tab of the page
  **My Tasks** opens (`all_tasks`).

Three items also moved to where they belong. **Products** is now under
**Sales**: the catalogue is the master data every quote line and opportunity
line item points at, so it is revenue data that happened to be filed next to
campaigns. The approvals **Inbox** is now under **My Work** — an approval
waiting on you is your work — and the one-item **Approvals** group it used to
sit alone in is dissolved. **Marketing** stays a single-item group on purpose:
it is a domain of its own, and the Approvals group was dissolved because its
item *was* personal work, not because one child is too few. Because **My Work**
is expanded on load, a pending approval is now visible without opening a group.

What is deliberately *not* trimmed is the demonstration. HotCRM is the app
authors read to learn what each kind of navigation entry looks like, and nav
items come in six kinds — plain `object`, object + `viewName`, `page`,
`dashboard`, `report`, `component`. Every kind keeps at least one entry;
`page` and `component` are down to one each, so the next slimming pass is a
single deletion away from removing a demonstration silently.

`test/app-navigation-shape.test.ts` holds both properties shut from both
directions: every one of the six kinds must keep an exemplar, no two entries
may open the same destination, and no object may hold more than one plain list
entry (a personal saved-view entry alongside it is fine — that is what **My
Work** is). The nav-item count is not pinned there, because
`docs-quick-tour-navigation.test.ts` already holds the group-by-group roster
against the tour table.

The four locale bundles drop the orphaned `apps.crm_enterprise.navigation`
entries and keep the labels of the two items that moved. The documentation that
enumerates the sidebar is re-cut in all three doc locales — the quick tour, the
sales and revenue indexes, the approvals page, and the activities and
meetings pages that cited a removed row as a sidebar entry. Each retired name
is re-pointed rather than deleted, so a reader arriving with the old name is
told where the thing actually is.
