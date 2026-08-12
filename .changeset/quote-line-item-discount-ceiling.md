---
'hotcrm': patch
---

Quote line items now carry the same 60% discount ceiling as the quote itself.

The hard ceiling shipped for **Discount %** on a quote constrained only one of the two percentages that decide a quote's total. A quote's price applies them in sequence — each line is discounted, the lines are summed, and only then does the quote's percentage come off that sum — so a quote sitting at 0% with every line at 90% off priced 90% below list and cleared the quote-level rule outright. The rule read as a guarantee it did not deliver.

A line whose **Discount %** exceeds 60 is now refused on save with *"Line discount cannot exceed 60%"*. It is an invariant, not a checkpoint: it is evaluated on every save of the line, so a line stored above the ceiling before this release is refused on its next edit until its discount comes down — lowering it is always allowed. The wording differs from the quote-level *"Discount cannot exceed 60%"* so a refused save says which of the two numbers to bring down, and both come from the one `QUOTE_DISCOUNT_CEILING` constant, so the two ceilings cannot drift apart.

Nothing HotCRM ships is affected — the deepest discount in its demo data is 20%.

Not changed, and worth knowing: 60% per line **and** 60% on the quote still compounds to roughly 84% off. Each rule caps one multiplier; whether the ceiling should be read against the effective discount is an open product question tracked separately.
