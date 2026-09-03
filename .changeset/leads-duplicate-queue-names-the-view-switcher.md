---
'hotcrm': patch
---

Leads page: the duplicate review queue is reached from the Leads list's view
switcher, not from a "Leads tab", in all three locales.

`content/docs/sales/leads.mdx` sent a reader to "the **Suspected Duplicates**
view on the Leads tab", with the same sentence on the two Chinese faces as
「线索页签」 and 「潛在客戶頁籤」. Both names in it are real — *Suspected
Duplicates* is a live view (`suspected_duplicates` in `src/views/lead.view.ts`)
and *Leads* is a genuine sidebar item (`nav_lead`, label **Leads**, in
`src/apps/crm.app.ts`) — so this is not the fictional-name defect the same
family has produced elsewhere. What is wrong is the kind of surface: **Leads**
is a row in the sidebar, and a sidebar row has no tab on it. A reader following
the sentence looked for a tab row that is not there.

The sidebar carries one entry per destination and the several ways of reading
one object's records live as tabs across the top of that object's list page —
the switcher strip the console builds from the view descriptors. So the queue
is reached from the Leads list, and the sentence now says so, matching the
wording `content/docs/service/index` already uses for the case kanban ("the
**Service Workflow** tab in the case list's view switcher").

Each face keeps the vocabulary it already uses: the Simplified page's 线索列表
and 视图切换器, the Traditional page's 潛在客戶列表 and 視圖切換器. The view's
own name is untouched in all three, and no view, label or navigation entry
changed — the names were correct at source, and only the docs moved.
