---
'hotcrm': patch
---

Write the pipeline board's column total to what a kanban can actually show, and
name the two non-object Sales sidebar entries the app really ships.

**A kanban column carries one total, and it is unweighted.**
`content/docs/sales/pipeline-management.mdx` (and both zh pages) told a rep that
the top of every board column shows two numbers — an unweighted total and a
weighted one. A board cannot show two: `KanbanConfigSchema` in
`@objectstack/spec` declares `summarizeField` as a single optional string
("Field to sum at top of column"), so one column total is the shape of the
feature, and `pipeline_kanban` in `src/views/opportunity.view.ts` binds that one
field to `amount`. The weighted half of the promise therefore never existed, and
a rep looking for it on the board read the unweighted sum of Amount as though
the probability coefficient were already in it — the same class of error the
page's *How expected revenue is calculated* section was just corrected for, one
screen higher. The page now states the single column total for what it is and
sends the weighted forecast to where it genuinely lives: the *Expected Revenue*
column sums on **Open Deals** and **All Opportunities**.

**Two Sales sidebar entries were named by names the sidebar does not carry.**
`content/docs/sales/index.mdx` listed *Sales Pipeline* and *Sales Dashboard*
under "Where to find things" — a section whose whole job is to say what a reader
will see in the nav. `src/apps/crm.app.ts` labels those two entries **Pipeline**
and **Sales Performance**. *Sales Pipeline* is real, but it is the label of the
kanban *view* (`pipeline_kanban`), not of the sidebar entry that opens it;
*Sales Dashboard* is neither, and is the same phantom already removed from the
pipeline page's roll-up list and its forecast paragraph. Both bullets now carry
the nav label, with the view's own label named beside it, the way
`content/docs/sales/opportunities.mdx` already describes the pair. The third
occurrence of the same mix-up — the pipeline page's "sidebar shortcut **Sales
Pipeline**" — now names the view and the sidebar entry separately too.

Docs only, all three locales — no `src/` change.
