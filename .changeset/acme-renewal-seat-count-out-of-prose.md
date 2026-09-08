---
"hotcrm": patch
---

Take the seat count out of the Acme renewal's description. The opportunity's prose read `Annual renewal of the Acme Standard subscription (40 seats), …` while the deal's own line item bills **45** — the hero account's most-read record disagreeing with itself about the number the whole renewal narrative is built on.

`45` was never the half that could move. It is what makes the deal total `220,000`, and that same total is the `contract_value` on the Acme contract in `src/data/revenue.seed.ts` and the `$220K` on the ARR line in the account description. Three consumers hold it in place; a 40-seat line would total `215,000` and break all three.

So the sentence stops carrying a seat count at all, rather than restating `45` in prose. That is this file's own doctrine, written a few hundred lines above for **dates**: a value a record already owns is not repeated in prose, because the copy is a second source of truth and the copy is what drifts. A seat count is the same shape as a date, and `quantity: 45` on the `AI Agent Seat (Annual)` line is where this number lives — a reader who wants it opens the deal's Products panel. Writing `(45 seats)` would have kept exactly the duplicate that doctrine exists to remove, and next to "22% YoY uplift driven by seat expansion" it would also have invited the reading that all 45 seats are new, which does not produce 22%.

The description now reads:

> Annual renewal of the Acme Standard subscription, signed two weeks ahead of the renewal date. 22% YoY uplift driven by seat expansion in the new EMEA team. Multi-year option declined this round — they want to see how the platform upgrade lands first.

Two clauses are deliberately unchanged. **"signed two weeks ahead of the renewal date"** survives word for word: the Acme contract's `start_date` is derived from it (signature + 14 days), so a paraphrase would cost that derivation. **"22% YoY uplift"** stays as narrative — no prior-year ARR is seeded anywhere in this repo, so the figure is *consistent with* the seeded numbers rather than derivable from them; nothing in the book can confirm it and nothing can contradict it, and the alternative fix would have had to write a prior term nobody seeded.

Nothing else moves: the line item and its own description (`Seat expansion driven by the new EMEA team`), `contract_value: 220000`, the account's `$220K` ARR line and the quote totals are all untouched. Free prose and the rows it narrates have no mechanical relation, so nothing is added to check one against the other — removing the second copy is what closes this off on the record.
