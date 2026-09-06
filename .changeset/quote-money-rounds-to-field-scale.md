---
'hotcrm': patch
---

Round `quote_generation`'s two money expressions to the fields' declared
2-decimal scale, so `Generate Quote` stops failing for most non-zero discounts.

The flow wrote `discount_amount` and `total_price` as bare IEEE-754 products of
a currency and a percentage:

```ts
discount_amount: '{oppRecord.amount * (discount / 100)}',
total_price:     '{oppRecord.amount * (1 - discount / 100)}',
```

`discount / 100` is inexact for every percentage whose hundredth is not a
dyadic rational, so the product carries a tail that `crm_quote`'s
`Field.currency({ scale: 2 })` money fields refuse. On the seed data's own
numbers — a 180,000 opportunity — 30% gives `125999.99999999999` and the insert
is rejected with `Total Price must have at most 2 decimal places (got 11)`;
at 70% the tail moves onto `discount_amount` and both fields are refused. So
whether a quote could be created at all was an **arithmetic accident of
`amount × discount`**: 20% of 180K worked, 30% of the same 180K did not, and
`0` always worked, which is why the happy path in the seed data never caught
it. The rejection is a fully-formed 400 that the console throws away (filed
separately, upstream), so from the seller's chair the action simply did nothing
— and doing nothing is what *success* looked like too.

Both products are now rounded inside the expression, because the quote's own
money fields are the contract and the flow should meet it rather than hand the
engine an unrounded double:

```ts
discount_amount: '{round(oppRecord.amount * (discount / 100) * 100) / 100}',
total_price:     '{round(oppRecord.amount * (1 - discount / 100) * 100) / 100}',
```

`round()` is the CEL stdlib's, mirrored 1:1 into flow **value** expressions by
`@objectstack/service-automation` 17.3.0 — the capability this fix waited on,
and the reason it could not be written before. Read from the installed
`dist/index.js` rather than the release notes: the table is
`round`, `floor`, `ceil`, `abs`, `min`, `max`, and it is reachable from
`create_record` / `update_record` `config.fields`. `round()` is **integer-only
and single-argument**, so N-decimal rounding is spelled `round(x * 100) / 100`
— the pattern the platform's own arity diagnostic names verbatim. The same
release also made an unknown function fail **loudly**; before it, every
unbound identifier was rewritten to the literal `null` and the field was
written `undefined`.

⛔ No operator trick. `(x * 100 + 0.5 | 0) / 100` does evaluate, but `|0` is an
int32 coercion that **silently overflows above ~21.5M** — on a money field that
is worse than the defect it dodges. `round()` refuses loudly past
`Number.MAX_SAFE_INTEGER` instead.

`subtotal` is unchanged and needs no rounding: it is a bare path pass-through
of `crm_opportunity.amount`, which is itself `Field.currency({ scale: 2 })` and
cannot arrive unrounded. The two fields keep their existing writability —
making them `readonly` or formula fields would be a schema redesign, and
`quote.object.ts` records deliberately that the line-item rollup writes them.

The regression pin in `test/flow-quote.test.ts` asserts the **value**, not the
absence of an error. That harness's in-memory data engine does not enforce
field scale, so a pin asserting "the run did not fail" would have been green
both before and after and would have pinned nothing. It runs 30% and 70% on a
180,000 opportunity — between them covering both edited expressions — and
without the fix it fails with `expected 125999.99999999999 to be 126000`. The
two pre-existing cases (10% of 200,000 and 0%) use discounts that are exact
either way and stay green through the defect, which is exactly why they never
caught it.
