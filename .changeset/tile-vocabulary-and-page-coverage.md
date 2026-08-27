---
---

Docs prose and one test guard — this PR releases nothing to HotCRM users, so the
frontmatter above is deliberately empty (the sanctioned "releases nothing"
declaration that `.github/workflows/changeset-check.yml` documents, on par with
the `skip-changeset` label). No `src/` metadata changed: no object, field, view,
label, page, dashboard or hook.

Converge the one Traditional Chinese page that called a dashboard tile 「磁磚」
onto 「磁貼」, the term every other `zh-Hant` page uses, and close the two blind
spots that let the discrepancy sit unread.

`content/docs/service/cases.zh-Hant.mdx` wrote 「磁磚」 four times where its
character-for-character parallel `zh-Hans` sibling wrote 「磁贴」, so a reader of
the Traditional docs met two names for one screen element. The tile guard could
not see it from either side: its page list held three `analytics/dashboards`
pages and no service page, and its vocabulary held 磁贴/磁貼 and not 磁磚.

Both halves are now checkable rather than assumed. The guard reads every `.mdx`
under `content/docs`, derived from the tree instead of listed by hand, so a page
that names a tile is in scope the day it is written; and two new rules fail when
the vocabulary falls behind the pages — one requiring every 磁-family spelling
the docs use to be one the rule can read, the other holding the two Chinese
scripts to the same tile references, which catches a missing word without anyone
having to guess it in advance. 磁磚 stays listed as a backstop so a relapse is
caught rather than silently unread.
