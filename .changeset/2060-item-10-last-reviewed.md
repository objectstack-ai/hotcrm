---
'hotcrm': patch
---

**A knowledge article's Last Reviewed date now moves only when someone looks after the article.** Before, every save of a published article refreshed it, including ones nobody made by hand. Pressing **Helpful** or **Not Helpful** on an article recounts its votes, and that recount moved the article's Last Reviewed date to today, so an article readers kept voting on looked freshly reviewed however long ago anyone had checked it.

Now the date refreshes when the article is published or published again, and when its content is edited while it is published: the title, summary, body, category, tags, audience, language or originating case. A reader's vote, or a change of the article's owner, leaves the date where it was.

The sample articles now show the review dates they were written with. On a new database, *Getting Started with HotCRM* reads as reviewed 20 days ago, *Resetting Your Password* 10 days ago, and *Legacy SSO Setup* 220 days ago. Before, all three read as reviewed on the day the database was created. A demo database created earlier keeps the date it was given; reset it (`pnpm demo:reset`) to see the sample dates.

A data import or other system write that carries its own Last Reviewed date keeps that date. A person still cannot type one in: the field is read-only.
