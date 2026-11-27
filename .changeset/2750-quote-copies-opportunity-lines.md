---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**Sales: Generate Quote now copies the opportunity's product lines onto the quote (#2750).** Before, a quote generated from an opportunity had no line items, and reps typed the same products, quantities and prices in again. Now each product line on the opportunity becomes a line item on the new quote, with its product, quantity, sales price, line discount and description. A copied line is priced like a line added by hand: its list price comes from the quote's price book, and its title and line number are filled in. The quote's subtotal and total come from the copied lines, and the discount entered when generating the quote applies on top. After that the two sides are separate: changing a line on the quote does not change the opportunity, and the other way round. An opportunity with no product lines still gets a quote with no line items, priced from the opportunity's amount, as before. If the quote refuses a line (its product has no active price in the quote's price book, or its discount is above the 60% line ceiling), the other lines are still copied and the confirmation window says how many are missing, in English, Chinese, Spanish and Japanese. The lines are numbered in the order they are copied, which can differ from their order on the opportunity. No setup is needed; quotes generated before this change keep the line items they have.
