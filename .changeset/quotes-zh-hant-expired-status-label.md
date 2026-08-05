---
'hotcrm': patch
---

The Traditional Chinese quotes page now names the `expired` quote status the way
the shipped locale pack does.

`content/docs/sales/quotes.zh-Hant.mdx` called the status 「已到期」 in its status
table and again in the daily-sweep bullet, while `crm_quote.status.options.expired`
in `src/translations/zh-CN.ts` is 「已过期」 — 「已過期」 in traditional script. The two
are not the same word (到期 is a deadline arriving, 過期 is having lapsed), so a
reader following the page looked for a status the screen never shows. Same defect
class as the `presented` alignment shipped earlier, on the one status that survived
it.

Both status-name occurrences now follow the locale pack. The page's third mention —
the standard-list-view section explaining that the nightly sweep flips a quote to
已過期 — already used the pack's wording, so the page had been contradicting itself
as well as the product.

Verb and field usages are deliberately left alone, because they are not the status
name: 「自動到期」 in the frontmatter describes the expiry mechanism, 「每日到期掃描」
names the nightly sweep, and 「到期日期」 is the shipped label of the
`expiration_date` field (`src/translations/zh-CN.ts`).

Docs follow the locale pack rather than the other way round, so nothing under
`src/` changed.

Fixes #793.
