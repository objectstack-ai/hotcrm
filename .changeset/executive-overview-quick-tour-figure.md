---
---

Docs and published assets only — this PR releases nothing to HotCRM users, so the
frontmatter above is deliberately empty (the sanctioned "releases nothing"
declaration that `.github/workflows/changeset-check.yml` documents, on par with the
`skip-changeset` label). No `src/` metadata changed: no object, field, view, label,
page, dashboard or hook. The empty changeset is preferred over the label because it
is committed evidence that travels with the PR and it leaves both steps of the gate
running instead of skipping the job outright.

Capture the **Executive Overview** dashboard and put the figure back on the first
screen of the quick tour.

`assets/screenshots/hotcrm/` held eight screenshot sets and none of them was the
dashboard `nav_home` opens — the one every user of this app lands on. A previous
change had honestly *removed* a mismatched figure from the quick tour's section 1
(it showed **Sales Performance** under a heading about **Executive Overview**),
which closed the lie and left the onboarding tutorial text-only exactly where a
picture helps most. This restores it, correctly this time.

New set `assets/screenshots/hotcrm/executive-dashboard/` — `en.png` and
`zh-Hans.png` at 1440x1024, captured from a booted app on seeded demo data, with
a colocated `meta.yaml` in the shape the other eight sets use. The id is
registered in the hardcoded roster in `scripts/sync-docs-screenshots.mjs`; an
unregistered set is never copied into `apps/docs/public/` and nothing errors, so
that line is what makes the asset reachable from a docs page at all.

The figure is placed at the end of section 1 on the English and Simplified Chinese
quick-tour pages, matching how the `lead-detail` and `sales-pipeline` figures are
placed in sections 3 and 4.

**Two locales, and no Traditional Chinese one.** The `meta.yaml` carries the reason
rather than the rule, because the reason is what lets the convention be overturned
correctly later: the platform ships no Traditional language pack, so the console
falls back to Simplified whenever the UI language is Traditional, so a `zh-Hant`
capture would be the same pixels at twice the maintenance and the two would drift
the first time only one was refreshed. Measured on the installed platform rather
than inherited — driving the console with `navigator.language` set to `zh-TW`,
`zh-Hant` and `zh-HK` in turn renders Simplified in all three, with no Traditional
glyph on the page.
