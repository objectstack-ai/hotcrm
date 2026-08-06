---
'hotcrm': patch
---

Rewrite the quick tour's left-navigation table against the app's real navigation.
The table in `content/docs/getting-started/quick-tour.mdx` — the first thing a new
user reads, and a table whose entire job is "here is what the sidebar holds" — had
drifted in every one of its eight rows. Four of the groups it named do not exist in
`src/apps/crm.app.ts` (*Products*, *Activities*, *Analytics*, *AI*), three groups
that do exist were absent altogether (**My Work**, **Activity**, **Insights**), and
the four rows whose group was real each dropped items or used a label the app never
shows: **Sales** was missing **Account Workbench**, **Pipeline** and **Sales
Performance**; **Service** spelled *Knowledge Base* for the entry actually labelled
**Knowledge** and omitted **Service Overview**; **Marketing** listed *Campaign
Members*, which is not a sidebar item at all; and **Approvals** listed two items
where the group has exactly one, **Inbox**.

The table now carries the pinned **Home** entry and all seven groups with their real
children, in source order, and says which groups are collapsed when the app loads
(**Marketing**, **Insights**, **Approvals**) — the failure mode that makes a reader
conclude something is missing. Every retired name is re-pointed rather than deleted:
the catalog is the **Products** item under **Marketing**, tasks are **My Tasks** and
**All Tasks** under **My Work**, the Copilot is the right-side chat panel, campaign
membership is reached from the campaign detail page, and the approval audit trail is
real data (`sys_approval_action`) that no navigation entry opens. All three locales
updated; `src/` untouched. A new guard, `test/docs-quick-tour-navigation.test.ts`,
compares the table against `CrmApp.navigation` group-for-group and child-for-child in
all three locales, so the next navigation change cannot leave the tour behind.
