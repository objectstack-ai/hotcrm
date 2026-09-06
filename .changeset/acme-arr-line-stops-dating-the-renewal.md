---
'hotcrm': patch
---

Stop dating the Acme renewal from the account description. The ARR line said the
renewal was signed in **Q1 2025**; the deal it describes closes `daysAgo(15)`,
so on the day this was read it had closed three weeks earlier — the disagreement
was in both the quarter and the year.

### An absolute label on a relative-date record

`src/data/sales.seed.ts`, the `Acme Corporation` description:

```
- ARR: $220K (signed Q1 2025 renewal). Up 22% YoY.
```

The record it names is `Acme Annual Renewal 2025`, whose close is seeded
relatively — `close_date` is a `daysAgo(15)` CEL expression — and whose contract in
`src/data/revenue.seed.ts` stamps the same day as its `signed_date`. A fixed
calendar quarter sitting on a record that moves with the calendar is wrong the
moment the two disagree, and gets further from the truth every day the demo is
not re-seeded. The other half of the same sentence — `$220K`, the deal's
line-item total — is exactly right, which is what made the wrong half credible.

### The date now lives only where the records keep it

The line reads:

```
- ARR: $220K (signed renewal). Up 22% YoY.
```

The quarter is not re-derived here, it is **gone**. The seed book already
derives period labels where a label is the value — the forecast rows in
`src/data/revenue.seed.ts` compute theirs precisely so a list never mixes
"This Quarter" with "Q3 2026" — but this sentence is prose about a record that
already carries its own date twice, on the opportunity's `close_date` and on the
contract's `signed_date`. Computing a third copy in the account's description
would mean re-stating that record's offset in a second place, which is the same
defect one level down. The neighbouring `next_step` on `Acme Platform Upgrade`
settled this for the same account: no date goes back into seed prose, absolute
**or** relative, because a second copy is a second thing to drift.

What is left is true whenever the demo renders it: the renewal *is* signed — the
deal is `closed_won` and its contract `activated`. A reader who wants the date
follows the related opportunity or contract, which is where it is maintained.

`$220K` and `Up 22% YoY` are unchanged, and so are the renewal opportunity, its
name, and the `Acme Platform Upgrade` record.
