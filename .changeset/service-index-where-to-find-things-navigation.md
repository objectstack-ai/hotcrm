---
'hotcrm': patch
---

Write the service overview page's *Where to find things* list to the app's real
navigation. The **Service** group in `src/apps/crm.app.ts` holds three items —
Cases, Knowledge and **Service Overview** — so the list now names Knowledge
(it was missing), gives the dashboard entry its actual sidebar label instead of
"Service Dashboard", sends readers looking for Tasks to **My Tasks** /
**All Tasks** under **My Work**, and records that no *Service Board* exists:
the kanban is the `case_workflow` view labelled **Service Workflow**, reached
from the **Workflow** tab in the case list, not from the sidebar. All three
locales updated.
