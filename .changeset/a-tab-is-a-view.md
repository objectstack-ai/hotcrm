---
'hotcrm': patch
---

Remove `list.tabs[]` from every view file. #1304 removed the entries' `label`;
this removes the rest of the entry, because the console never read any of it.

The object-view switcher builds its tab strip from the view descriptors — one
tab per `listViews` entry, plus the primary `list`, which the builder moves to
the front of the strip and marks default. Re-measured on the shipped renderer
(`@objectstack/console` 17.1.0): the strip comes from
`Dm({ definedViews: U.listViews, primary: U.list, primaryId, savedViews, … })`,
and `tabs` appears nowhere in that path. The tab's text is the view's `label`;
its icon is `viewTypeIcons[view.type]`, from a map the console hardcodes over
eight view types (`grid`, `kanban`, `calendar`, `gallery`, `timeline`, `gantt`,
`map`, `chart`).

So the 48 authored `icon:` keys were the same trap `label` was, only quieter.
All 48 were inert — the authored string is never looked up anywhere; the icon
is chosen by the view's `type`. And 39 of the 48 did not so much as coincide
with a name that map knows (`crown`, `inbox`, `git-commit-horizontal`,
`triangle-alert`, `gantt-chart`, …), so an author editing `icon: 'crown'` to
change what a user sees gets nothing and has no way to find that out. `name`, `order`, `pinned`, `isDefault`, `visible` and `filter` were
inert for the same reason. Under ADR-0049 the honest treatments are enforce or
remove; this repo removed, and #1283 already ruled remove over enforce here.

**Nothing users see changes** — 60 entries deleted across 12 files, and the
strip they described was never drawn from them. To rename a tab, rename the
`label` of the view it points at. To add one, add a `listViews` entry: a view
is on the strip by existing.

Two beliefs in this repo rested on the removed model and are corrected with it.
`test/view-references.test.ts` asserted that a `listViews` entry left out of
`tabs` was *unreachable*, and recorded seven working queues (`renewals_due`,
`at_risk_accounts`, `stale_opportunities`, `closing_this_quarter`,
`sla_at_risk`, `todays_tasks`, `overdue_tasks`) as having shipped "defined,
tested, unreachable". They were reachable the whole time; `tabs` curated
nothing. That suite now guards the direction that can still dangle — a
navigation entry naming a view no view file defines, which nothing checked.
`src/apps/crm.app.ts` pointed authors at `list.tabs` as the string to edit to
rename a tab; it now points at the target view's `label`.

`test/view-tab-label-inert.test.ts` is re-aimed rather than retired: with no
entries left, "carries no `label`" would pass vacuously, so it now pins that
`tabs` is absent, with an anti-vacuity half that pins the walk really reached
the twelve `list` blocks it claims to have cleared.

This does not touch `userFilters.tabs[]`, a different key that reuses the same
`ViewTabSchema` on page lists (ADR-0047). Its `label` **is** read and
translated. The console is explicit about the split: on an object list view it
logs that a tabs-shaped `userFilters` block is *ignored* because "the view
switcher owns the tab bar here". Nothing here should be read as a claim about
that key, and `ViewTabSchema.label` stays.
