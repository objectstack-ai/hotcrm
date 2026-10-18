---
'hotcrm': patch
---

A quote's **Discount Amount** and **Total Price** are now read-only. The system works them out from the quote's other pricing fields, as the Quotes guide says. Before this fix both could be typed by hand, in the edit dialog's Totals tab or over the REST API, and the typed figure was stored. It stayed until the next discount, tax, shipping or line-item change replaced it, and a quote accepted before then drafted its contract at the typed total.

Now the edit dialog shows both fields as read-only. A REST update that sends either field still succeeds, but the sent value is ignored and the stored figure stays as it was. A quote created over the REST API also gets both figures worked out from its Subtotal, Discount %, Tax and Shipping & Handling, whatever figures the request sent. For example, a quote created with a 1,000 subtotal, a 10% discount, 50 tax and a total of 999 is stored with a Discount Amount of 100 and a Total Price of 950.

**Generate Quote** prices the new quote exactly as before, to the cent. Editing the discount, tax or shipping, or changing a line item, still updates both totals in the same save. **Subtotal** can still be edited.
