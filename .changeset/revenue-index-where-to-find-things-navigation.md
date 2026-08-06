---
'hotcrm': patch
---

Write the revenue overview page's *Where to find things* section to the app's real
navigation. `src/apps/crm.app.ts` has no **Products** group at all — the catalog's
only sidebar entry is `nav_product`, labelled **Products**, under **Marketing** —
and `group_approvals` carries exactly one child, labelled **Inbox**, not the three
items the page listed. So the section now sends readers hunting for a Products
group to **Marketing** (linking `content/docs/marketing/index.mdx`), keeps
**Contracts** where it really is under **Sales**, names the approvals item by its
real label, and records what happened to the two phantom entries instead of
deleting them silently: no sidebar item anywhere is called **Action History** (the
audit trail exists as the plugin object `sys_approval_action`, reachable from no
navigation entry), and **Processes** was removed on purpose because no
`sys_approval_process` object exists in any installed plugin, so its
`requiresObject` guard hid it on every install. It also notes that **Marketing**
and **Approvals** are collapsed by default, unlike Sales, My Work, Activity and
Service. All three locales updated; `src/` untouched.
