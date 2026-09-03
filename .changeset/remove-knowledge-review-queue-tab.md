---
'hotcrm': minor
---

Remove the knowledge base's **Review Queue** tab.

The **Knowledge** list now ships three tabs — **All Articles**, **Published** and
**My Drafts**. The fourth, **Review Queue · Oldest First** (`stale_articles`),
is gone, along with its four locale labels (`复核队列 · 最久未复核在前`,
`Cola de revisión · Más antiguos primero`, `レビューキュー · 古い順`) and the
product-docs bullets and workflow step that pointed readers at it.

Why: the tab returned every published article, merely sorted least-recently-
reviewed first, so as a knowledge base grows it degrades into "all articles,
different sort" rather than a queue of work. The open question was whether it
should instead become a real 180-day cut; that question is now closed in the
other direction — the feature does not stay.

**What is NOT removed.** `last_reviewed_at` is untouched. The publish hook still
stamps it on first publish and refreshes it on every later edit made while an
article is published, it remains on the article form under **Engagement**, and
the field's four locale labels are unchanged. Only the tab that ranked by it is
gone. Nothing needs migrating: no data changes, and a saved link to the tab
simply lands on the list's default view.

The guard that keeps a view label from promising a time window its filter does
not apply is retained in full. Its subject is every list view the app ships, not
this one tab, so a label that reclaims an N-day window over a filter carrying no
matching `{N_days_ago}` still fails the build.
