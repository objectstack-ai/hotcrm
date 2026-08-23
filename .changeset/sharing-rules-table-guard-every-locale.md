---
'hotcrm': patch
---

The built-in sharing-rules guard now reads all three locale pages, not only the
English one — and the first thing it found was a live gap on both Chinese pages.

`test/sharing-coverage.test.ts` had three doc-reading rules over
`content/docs/administration/sharing-and-security`. #790 gave the third one a
per-locale sibling and widened the Org-Wide Defaults guard to all three pages,
but the two that read the **Built-in sharing rules** table — the roster of what
the app widens out of the box, and the object / access / position each row claims
— still read the English page alone. So the English table was *forced* correct
while the two Chinese copies of it were watched by nobody, which is the same
asymmetry that produced #791's whole-page drift and #592's dropped `| Events |`
row.

That gap was filed as dormant, on a row-by-row check that found both Chinese
tables clean. It stopped being dormant a week later. #1096 added the
**Unassigned Cases — Triage** rule together with its English row and did not
touch the Chinese pages, so for ten days a reader of either Chinese page was
shown nine of the app's ten sharing rules. The missing one is the app's only
grant over records with **no owner at all**: every holder of the Service Agent
position has edit access to open, unowned cases. Widening these rules turns them
red on exactly that, naming the page and the rule; the two rows are corrected
separately so the guard and the correction stay reviewable apart from each other.

The rules are now one per-locale block over the existing `PAGES` ledger. Every
fact a row states stays derived from the compiled stack — the roster is
`sharingRules` itself, and the object, access level and position must be the ones
the rule really grants — so adding or removing a sharing rule still costs zero
ledger edits and three doc rows. Only the language is authored, once per word:
the object column reuses `ROW_LABEL` (the ledger the OWD table already reads) on
the Chinese pages and the stack's own label on the English one, and a new
three-line `ACCESS_WORD` map spells `Read` / `Edit` as 读取 / 编辑 and 讀取 / 編輯.
Nothing about an object's sharing classification is copied per locale, so a
future reclassification stays one edit in one place.

Fixes #809. Follows #790, #791 and #725.
