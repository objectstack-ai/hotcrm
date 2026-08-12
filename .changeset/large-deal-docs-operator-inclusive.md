---
'hotcrm': patch
---

Docs: every large-deal page now states the inclusive operator the gate actually uses

#1128 converged every large-deal site on `>=`, so a deal at exactly $100,000
requires manager approval and fires the won-deal alert. The value did not
change; the operator did. 21 product pages (7 pages x 3 locales), the internal
feature inventory and the `demo:staff` hint still described the old exclusive
operator. This is that wording sweep — no number and no behaviour changes.

The sentence that made it urgent, on **Revenue › Approvals**: *"Below $100K, no
approval is needed."* A rep quoting a hundred K flat was told to expect no
approval and now gets a locked record. It now reads *"Under $100K, no approval
is needed"* followed by an explicit statement that the manager line is
inclusive and a deal at exactly $100,000 **does** route for approval.

Also corrected:

- **Sales › Opportunities** and **Sales › Pipeline Management** quote the CEL
  start condition verbatim as the authoritative "where is this threshold
  configured?" answer. Both now read `record.amount >= 100000`, matching
  `src/flows/opportunity-won-alert.flow.ts` exactly — those two lines are a
  copy-paste surface for the next author, not only a user-facing claim.
- **Administration › Automation** — the flow table's manager cell reads
  `≥ $100K` while the director cell stays `> $500K`, because those two
  operators genuinely differ; the won-alert row reads "$100K or more".
- **Administration › State Machines**, **Sales › Index**, **Sales › Quotes** —
  the same operator, reworded in place.
- The zh-Hans and zh-Hant editions of all seven pages. Chinese carries no
  word-for-word "or more": `超过` / `超過` is strictly exclusive, so the
  inclusive reading is carried by `$100K 及以上` and `达到` / `達到` rather
  than by swapping an operator character.

`$500,000` is deliberately untouched everywhere. `HIGH_VALUE_DEAL_AMOUNT` is a
matched `>` / `<=` pair whose two halves must partition — a different property,
explicitly excluded from #1087's convergence.
