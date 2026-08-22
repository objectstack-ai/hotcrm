---
'hotcrm': patch
---

Write the pipeline board's kanban section to the board the app really ships, and
put the Sales group's ninth sidebar entry back on the page whose job is to list
them.

**The board cannot show seven stages' worth of deals.** The kanban section of
`content/docs/sales/pipeline-management.mdx` (and both zh pages) opened with "7
columns — one per stage". `crm_opportunity.stage` does carry seven options, but
this board declares its own filter — `stage not_in [closed_won, closed_lost]` in
`src/views/opportunity.view.ts`, whose source comment says the exclusion is what
"keeps all five active stages visible" — so *Closed Won* and *Closed Lost* can
never hold a card here. A reader counting seven and finding two of them
permanently empty had no way to tell a filter from a bug. The page now says what
the metadata proves: one column per stage, **open deals only**, five active
stages, with closed business named where it does live (**All Opportunities** and
the **Sales Performance** dashboard). Whether the console draws the two closed
stages as empty columns or leaves them off is the renderer's choice, not this
app's declaration, and the page now says that rather than guessing a number —
the conservative shape `content/docs/sales/opportunities.mdx` already uses.

**There is no owner avatar on a kanban card.** The card list ran to five items,
ending in *Owner avatar*. Cards are bound by `kanban.columns`, which names four
fields — name, account, amount, close date. `owner_id` is in the view's
top-level `columns`, which is what the grid renderings read, and it is nowhere
on the card. The list is now four, and the owner is re-pointed to the two
surfaces that genuinely carry it: the *Owner* column on **All Opportunities**,
and the **Deal Cards** gallery, whose `visibleFields` include it.

**The stage rules are advice, not a gate.** The page told a rep "the system
enforces the stage rules, so you can't drag from *Prospecting* directly to
*Closed Won*". `opportunity_stage_progression`
(`src/objects/opportunity.object.ts`) does declare that transition illegal, but
at **warning** severity: the move writes one line to the server log and **the
save still goes through**. `content/docs/administration/state-machines` has said
exactly that — naming this very transition — since the state-machine sweep; the
two pages contradicted each other and this was the one that was wrong. Its
wording now matches, and it links there.

**The cadence table's *Open Pipeline Kanban*** named nothing in the product.
`Pipeline Kanban` is a camel-case reading of the identifier `pipeline_kanban`;
the view's label is **Sales Pipeline** and the sidebar entry that opens it reads
**Pipeline**. The daily row now sends a reader to **Pipeline**, matching the
correction the same section's opening paragraph already carries.

**Account Workbench was missing from the sales index.** The *Where to find
things* section of `content/docs/sales/index.mdx` listed eight of the Sales
group's nine entries. The missing one is **Account Workbench**
(`src/pages/account_workbench.page.ts`) — an interface page sitting third in the
group, with a real label in every locale bundle — so the page told a new reader
it does not exist, or that the sidebar they were looking at was broken. The same
question was already answered correctly one page over, in
`content/docs/getting-started/quick-tour.mdx`, which lists all nine. The section
now names it, says what it is (a curated way into the same account records,
reusing the **All Accounts** view with three quick filters and no view
management), and states the group size.

Two guards now hold both pages to their source, because nothing else can — `os
validate` and `pnpm lint` never open `content/docs`:
`test/docs-sales-index-navigation.test.ts` compares the section against the
Sales group in all three locales, and `test/docs-pipeline-kanban-section.test.ts`
pins the kanban section's card fields, filter, active-stage count and advisory
wording, plus the source facts each rests on. Bind an owner onto the cards, drop
the board's filter, raise the rule to `error`, or add a Sales nav entry, and the
docs go red with the metadata.

Docs and tests only — no `src/` change.
