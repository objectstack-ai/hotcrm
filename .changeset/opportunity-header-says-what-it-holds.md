---
'hotcrm': patch
---

The Opportunities page describes the opportunity detail layout the app actually
ships: the header bullet is rewritten against the component, the highlights
strip gets the line it never had, and the sales path stops being counted twice
— in all three locales.

The **Header** bullet promised "name, stage badge with the 7-stage path,
amount, close date, owner", and was wrong in both directions at once. The
`page:header` on `src/pages/opportunity_detail.page.ts` declares a title
(`{name}`), a subtitle (`{crm_account}`), a breadcrumb and five action ids —
`generate_quote`, `clone_opportunity`, `log_call`, `log_meeting` and
`schedule_meeting`. So the stage badge is not on the header: the path is a
separate `record:path`, which the same list already named on its own line as
**Sales Path**, and that is how one component came to be counted twice. The
amount, close date and owner are fields on the `record:highlights` strip — a
component the page description never mentioned at all. Meanwhile the subtitle,
the breadcrumb and all five buttons went unnamed, **Generate Quote** among
them, which the page placed on the *Quote* related list rather than on the
header where it actually sits.

Each bullet in that list now describes one component. **Header** names what is
on the header and, just as plainly, what is not. A new **Key Information**
bullet names the strip's six fields — Amount, Close Date, Probability (%),
Expected Revenue, Opportunity Owner, Account — and points out that the account
is therefore on the screen twice. **Sales Path** describes the path once, and
the *Quote* related list says where the Generate Quote button really is.

Two claims went with the rewrite, for one reason. "Click any stage on the path
to jump directly to it" and "one-click stage progression" both promise a
control that does not exist: `RecordPathProps` declares `statusField`, `stages`
and `aria` and nothing else, and the renderer shipped in `@objectstack/console`
17.3.0 draws the strip as `role="list"` / `role="listitem"` spans with no
`onClick`, no button and no link anywhere in the component. The path is a
read-only indicator. A deal moves when its **Stage** field changes, under the
transition rules this same page already documents.

The Chinese faces are rewritten in their own register rather than translated
back from the English, and take the zh-CN language-pack wording for the UI
nouns they name. No `src/` metadata changed — the page is correct as authored,
and this is the documentation catching up with it — and no gate or test was
added.
