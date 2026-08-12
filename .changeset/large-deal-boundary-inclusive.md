---
'hotcrm': minor
---

Large-deal governance now starts **at** $100,000, not above it

A deal priced at exactly $100,000 used to be shared with the sales director and
the executive as a large open deal, while requiring **no** manager approval and
firing **no** large-deal-won alert: the two sharing rules cut at `>= $100,000`
and the approval entry gate and won-deal alert cut at `> $100,000`. Leadership
could see the deal; nobody had to sign it. A threshold set at a round number
attracts deals priced at exactly that number, so this was not a rounding edge —
"a hundred K" is how deals get quoted.

All four large-deal sites now cut the same way, inclusively:

- `opportunity_approval` entry gate, and its `opportunity_approval_on_create`
  insert twin — `amount >= $100,000`
- `opportunity_won_alert` — `amount >= $100,000`
- both opportunity sharing rules — unchanged, already `>= $100,000`

**What changes for users:** an opportunity at exactly $100,000 now locks and
routes for Sales Manager review, and fires the won-deal alert when it closes.
Nothing that was previously visible to leadership stops being visible, and no
deal that previously needed approval stops needing it — the change only widens
governance by the boundary case. The $500,000 director tier is untouched, and
so is the threshold value itself.

The published tables in the Sales and Admin package docs now read
"$100,000 or more" instead of "> $100,000".
