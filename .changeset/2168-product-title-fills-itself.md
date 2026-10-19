---
'hotcrm': patch
---

**Old line items now get their product name on their own, and renaming a product with many lines updates every one of them.**

5.1.0 names each opportunity and quote line item after its product. Lines created before 5.1.0 had no name yet, so they showed a record id until someone ran `scripts/backfill-line-product-title.ts`. That script signs in with a password, so a hosted environment had no way to run it.

Now, the first time a list, a record page or an API read shows such a line, HotCRM fills in the name of every line of that product in the background. That first screen still shows the id; the next one shows the product. Nobody has to run anything, and a read where every line is already named does no extra database work.

Renaming a product used to stop partway on a product with many lines when HotCRM runs on a hosted environment, and so did the backfill: hook code there runs under a 30-second limit, and the update wrote one line at a time. On staging, a product with 21 lines had 9 of them renamed. The update now handles a few lines at a time and carries on in a fresh run until every line has the new name. If a run cannot make progress (for example, a line refuses every write), it stops and logs one error instead of retrying forever.

`scripts/backfill-line-product-title.ts` still works for self-hosted operators, and a second run still reports zero lines.
