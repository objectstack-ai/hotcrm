---
---

Docs only — this PR releases nothing to HotCRM users, so the frontmatter above
is deliberately empty (the sanctioned "releases nothing" declaration that
`.github/workflows/changeset-check.yml` documents, on par with the
`skip-changeset` label). No `src/` metadata changed: no object, field, view,
label, page or hook, and no asset was added or deleted.

`getting-started/quick-tour` section 1 — **the first screen of the onboarding
tutorial** — closed with a screenshot of the wrong dashboard. The section
describes **Executive Overview**, the dashboard `nav_home` really opens
(`src/apps/crm.app.ts`), and #978 had just rewritten its prose tile-for-tile
against that dashboard's nine tiles. The figure immediately below it showed
**Sales Performance** (`sales_dashboard`), a different dashboard sitting under
the **Sales** group. Of the nine tiles the prose had just named, exactly one —
**Pipeline by Stage**, which shares a factory between the two dashboards —
appears on the pictured board. The alt text never lied; the position did. A
reader finishing the paragraph and looking down was shown a board on which
almost nothing they had just read exists.

The figure is removed from `quick-tour.mdx` and `quick-tour.zh-Hans.mdx`.
`quick-tour.zh-Hant.mdx` never carried it, so section 1 now reads the same in
all three locales: the `Learn more: Dashboards` line, then `## 2.`. Two lines
leave each of the two files — the image and the blank line that was only there
to separate it.

**Removing rather than relocating** is the deliberate choice among the three
routes the card offered. Keeping the figure and explaining in prose that it is
not the landing page amounts to conceding on the tutorial's first screen that
the picture is wrong. Relocating it inside the quick tour has no natural home
either: the only place these pages name **Sales Performance** is one cell of
section 2's nine-item left-nav table, and a full-width dashboard screenshot
hung off a nav inventory is not what that table is for. Nothing is captured to
replace it — see below.

The asset is untouched and is **not** orphaned by this: `README.md` still
renders `assets/screenshots/hotcrm/sales-dashboard/en.jpg` in its screenshot
grid, and `scripts/sync-docs-screenshots.mjs` copies the pair from a hardcoded
list that reads no page. Deleting the images would have broken the README.

Two things this change deliberately does not settle:

- **No Executive Overview screenshot exists.** `assets/screenshots/hotcrm/`
  holds eight sets — campaign-detail, customer-360, large-deal-approval,
  lead-detail, quote-pipeline, sales-dashboard, sales-pipeline,
  sales-representative-permissions — and none of them is the dashboard Home
  opens. Capturing one needs a booted app and seed data, which is a different
  kind of work; it is filed separately.
- **Whether zh-Hant needs its own screenshots** is an open convention, not an
  implementation detail. The app ships four UI languages (en / zh-CN / ja-JP /
  es-ES), there is no Traditional pack, and zh-Hant docs have always borrowed
  Simplified captures. This change avoids needing an answer — it removes a
  figure rather than adding one.
