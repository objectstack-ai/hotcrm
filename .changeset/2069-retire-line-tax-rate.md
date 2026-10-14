---
'hotcrm': minor
---

Remove **Tax Rate %** from quote line items: a line's **Total** is now its **Subtotal**.

A quote carried two tax models that never read each other. A quote's own **Tax** is an amount
typed on the quote, and its **Total Price** adds it: *Subtotal − Discount + Tax + Shipping &
Handling*. A quote line item also carried a **Tax Rate %**, but the rate reached only that
line's own **Total**, and the quote total never read it. So on a quote whose line carried a
rate, the lines on the quote's *Related* tab added up to more than the quote beside them: lines
10,945 against a quote total of 9,810, on a quote with a 10% discount and one line taxed at 5%.

The quote's typed **Tax** is the model this app ships. It is on every demo quote, on the quote
form and the All Quotes list, and in the documentation's price formula, so the line rate is
removed. A line's **Total** is its price after its own discount, the same figure as its
**Subtotal**, and a quote's line totals add up to its **Subtotal**.

**What this means for you.** `crm_quote_line_item.tax_rate` no longer exists on the object, in
any of the four language packs, or in the documentation. A write naming it is refused with 400
`INVALID_FIELD`. No demo line ever carried a rate, so the demo data is unaffected.

**If you filled a line's Tax Rate % on an existing install**, that line's **Total** changes when
you upgrade, and its rate no longer shows. A line of 1 × 1,000 at a 10% line discount and a 5%
rate showed 945 and now shows 900. The quote's **Total Price** does not change, because the
quote total never included a line's rate. If that tax belongs on the quote, add it to the
quote's **Tax**.

The upgrade does not delete the stored rates. The column stays in the database, unread. On boot
the server logs it as orphaned (`[schema-drift] crm_quote_line_item.tax_rate`), `os migrate plan`
lists dropping it as the one destructive change, and
`os migrate unmapped-columns --object crm_quote_line_item --json` reads each line's stored rate
by record id. `os migrate apply --allow-destructive` drops the column, so read the rates first if
you need them.

A tax model where line rates roll up into the quote remains a possible future design; this
removal does not build it.
