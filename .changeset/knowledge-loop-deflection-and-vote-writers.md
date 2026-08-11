---
'hotcrm': minor
---

A case can now record **which article resolved it**, the Service dashboard measures **knowledge deflection** from that link, and the article's helpful / not-helpful counters finally have a writer. The counter that could never get one is removed.

**The link that was missing.** The only case↔knowledge relationship pointed the wrong way: `crm_knowledge_article.related_to_case` records the case an article was *written from*. Nothing could record *"this article resolved this case"*, so the single question a knowledge base exists to answer — is it saving us work? — had no data behind it. `crm_case.resolved_by_article` is that direction. Both links stay: an article usually has one origin and many resolutions, and merging them would make each unanswerable. It is offered on the **Close Case** screen and editable on the record at any time.

**The metric.** `case_metrics` gains `closed_count`, `kb_resolved_count` and a `kb_deflection_rate` ratio, and the Service dashboard shows the rate with **both of its halves printed beside it** plus a **Top Resolving Articles** ranking. A wrong denominator never errors — it returns a plausible number — so the two halves are declared once on the dataset rather than improvised per widget, and the numbers are pinned by running the shipped measures through the real analytics executor on both drivers, perturbing one case at a time.

One trap is worth knowing because it is invisible: a close-case screen field left empty resumes as `''`, not as absent, and `count(column)` counts empty strings. Every case closed *without* an article would have landed in the numerator and the rate would have read 100%, silently. `case_resolution_article_normalize` nulls the blank at write time, so the stored data is right for every reader rather than one measure being taught to discount it.

**The counters.** `helpful_count` and `not_helpful_count` were `readonly` with no writer anywhere — structurally pinned at whatever the demo data said. Published articles now carry **Helpful** / **Not Helpful** buttons that record one `crm_article_feedback` row per reader, and the two counts are **recounted** from those rows on every change. Recount rather than increment: it is idempotent, it self-heals when a vote is withdrawn or edited, and concurrent votes converge instead of losing one. One vote per reader per article, so the numbers mean *how many people* — change your mind and your own verdict moves rather than adding a second.

**`view_count` is gone.** It had no writer either, and unlike the other two it can't honestly get one: the only read-side event available (`afterFind`) fires on record materialization for *every* query — the article grid, global search, the lookup picker, AI grounding — so a "Views" number would grow fastest for articles nobody opens, at the cost of a database write on every read. A field that looks like a measurement and is not is worse than a missing one; it returns when a real article-view surface exists to write it.

**What you'll notice:** the article's *Views* column and field are gone from the grid, the review queue and the detail page. Seeded vote counts (38, 96, 5, 9) are gone too — they had no rows behind them, and the first real vote would have recounted 96 down to 1 in front of whoever pressed the button. A fresh `pnpm demo:reset` starts both counters at 0 and moves them for real; the deflection tiles do have seeded data, since a case naming its resolving article needs no user.

**Public articles are unchanged.** Share-link publishing (scope item 3) is not in this release: `publicSharing.eligibility` — the key that would keep internal and draft articles unshareable — is read by no consumer on 17.0.0-rc.6, and this app has no reachable seam to enforce it, so declaring the block would have opened anonymous access to internal articles rather than public ones. Guest permissions are untouched, and *Public* audience remains a statement of intent. Details in #601.

Refs #601.
