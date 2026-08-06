---
'hotcrm': patch
---

Write the "what happens when a quote is accepted" step against the hooks, in all
three languages. `content/docs/sales/quotes.mdx:71` (and its zh-Hans / zh-Hant
twins) listed four consequences of marking a quote *Accepted*; two of them are
not on that chain at all, and both fail in the quiet direction — nothing errors,
the reader simply believes the system already did it.

**The account is not promoted at acceptance.** Moving an account from *Prospect*
to *Customer* is a write in `contract_on_activation`
(`src/objects/contract.hook.ts`), an `afterUpdate` hook that runs only when a
contract's status *becomes* `activated`. What `quote_on_accepted` inserts is a
**Draft** contract, so after an accepted quote the account is still a *Prospect*
and stays one until somebody activates that contract. The page now says which
step owns the promotion, and that the contract acceptance produces is a draft.

**There is no 60-day renewal task.** The activation-time task that hardcoded a
60-day notice was deleted — the comment at `src/objects/contract.hook.ts:121-124`
records why: renewal reminders belong to the `contract_renewal` scheduled flow,
which reads `activated` contracts only and honours each contract's own
`renewal_notice_days` (`src/objects/contract.object.ts`, default **30**). A
contract sitting in *Draft* is invisible to that sweep and gets no reminder at
all. The page now points at the daily sweep and the per-contract notice window
instead of a fixed 60 days, and links to `content/docs/revenue/contracts.mdx`
for the full description of both.

The two consequences that do hold are kept and written out at the level of detail
the Contracts page uses: the drafted contract's status, type, 12-month term from
today, and the account / primary contact / related opportunity / owner / total
price copied off the quote; and the close-won write on the linked opportunity,
dated today, stamping `quote_accepted` as the win reason only when the rep
recorded none. The old "with the quote's terms" is replaced by that explicit
list rather than restated.

The closing note tells a rep to put the contact and the opportunity on the quote
before accepting it, because the drafted contract requires a **Primary Contact**
and the close-won step acts on the quote's opportunity — the links are copied,
never invented. Matching the Contracts page, acceptance is described as the
action that drafts a contract, not as a guarantee that one always appears.

Documentation only — no metadata, hook or flow changes. Whether accepting a
quote should activate the contract outright remains a product decision and is
untouched here.
