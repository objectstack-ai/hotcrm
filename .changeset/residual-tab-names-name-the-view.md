---
---

Docs only — this PR releases nothing to HotCRM users, so the frontmatter above is
deliberately empty (the sanctioned "releases nothing" declaration that
`.github/workflows/changeset-check.yml` documents, on par with the
`skip-changeset` label). No `src/` metadata changed: no object, field, view,
label, page or hook.

Finish what `tab-column-prints-the-view-label` started. That change corrected the
product-docs pages that printed a **Tab** column; six more pages named a tab in
running prose or in a bullet list, where no table-header search could reach them,
and kept publishing strings the console never renders. The object-view switcher
labels each tab with the target view's `label`, so a reader sent to a **Workflow**
tab is looking for a string that is not on screen.

Corrected to the target view's own label, in all three locale faces:

- `service/index` and `service/sla-and-escalation` — the case kanban reaches the
  list as **Service Workflow**, not *Workflow*. These two pages have contradicted
  `service/cases` on `main` since the earlier fix landed, which is the visible
  half of this change.
- `service/knowledge-base` — the four bullets under *Finding articles* are the
  four tabs of the Knowledge list. **All Articles** and
  **Review Queue · Oldest First** were shortened to *All* and *Review Queue*;
  **Published** and **My Drafts** were already right.
- `getting-started/quick-tour` — the retired sidebar names now say which tab each
  became: **Sales Pipeline** on Opportunities, **Event Calendar** and
  **✅ Interaction History** on Events. *All Tasks* was already the real label and
  is untouched.
- `analytics/reports` — *Stale* and *Renewals* replaced by
  **⚠️ Stale Opportunities · Longest in Stage First** and **Renewal Calendar**.
  One line wrote the full label and then called it "the Stale tab" in the same
  breath.
- `sales/accounts` — the English page said *Renewals*; the real label is
  **Renewal Calendar**.

On the translated pages each page keeps the language it already uses for view
names — the Chinese knowledge-base bullets take the locale pack's own
`全部文章` and `复核队列 · 最久未复核在前`, while pages that deliberately print the
source label in English keep doing so. Which language a Chinese page should spell
view names in is a separate open question and is not decided here.

The Chinese faces of `sales/accounts` already read `续约日历` / `續約日曆`, the
locale pack's translation of **Renewal Calendar**, and were correct before this
change; they are left alone.
