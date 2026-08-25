---
'hotcrm': patch
---

Say the won-deal alert reaches the deal owner on the two sales pages that still
named sales management. `opportunity_won_alert` notifies one person: its
`notify` node carries a `recipients` list whose single entry is
`{record.owner_id}`. Six lines across `sales/index` and `sales/opportunities`,
in all three locales, told readers the email goes to sales management instead.
The flow is correct as shipped and is unchanged here — only the prose moved.

This is the leftover of two earlier corrections rather than fresh drift. The
same claim was fixed in `src/docs/crm_sales.md` and again in the
`administration/automation` flow table, which now reads *"notify the owner — the
owner alone, not their manager"*; these two pages were missed both times. The
new wording reuses that sentence rather than inventing a third phrasing, so all
five surfaces now say the same thing in the same words, and the zh-Hans and
zh-Hant pages reuse the corresponding landed clause
(「只通知负责人本人，不通知其经理」/「只通知負責人本人，不通知其經理」).

It is the recipient, not a detail of it. `sales/index` is the section landing
page, so a sales manager reading it first expects an inbox signal on every big
win and never receives one. And `sales/opportunities` contradicted itself on one
page: line 78 said sales management while the admin tip further down already
described the `recipients` list as "the single entry `{record.owner_id}` — the
deal owner alone". Whichever line a reader believed, the page had misled them.

Nothing mechanical guards these pages yet, which is how two prior corrections
passed them by; a gate over this tree is tracked separately and had not landed
when this shipped.
