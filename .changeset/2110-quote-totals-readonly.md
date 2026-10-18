---
'hotcrm': patch
---

A quote's **Discount Amount** and **Total Price** are now read-only. The system works them out from the quote's other pricing fields, as the Quotes guide says. Before this fix both could be typed by hand, in the edit dialog's Totals tab or over the REST API, and the typed figure was stored. It stayed until the next discount, tax, shipping or line-item change replaced it, and a quote accepted before then drafted its contract at the typed total.

Now the edit dialog shows both fields as read-only. A REST update that sends either field still succeeds, but the sent value is ignored: the stored figure stays as it was, or is worked out afresh when the same update changes a pricing field. A quote created over the REST API with a Subtotal also gets both figures worked out from its Subtotal, Discount %, Tax and Shipping & Handling, whatever figures the request sent. For example, a quote created with a 1,000 subtotal, a 10% discount, 50 tax and a total of 999 is stored with a Discount Amount of 100 and a Total Price of 950. A quote created without a Subtotal has neither figure until it gets one.

**Generate Quote** now prices the new quote with the same formula an edit uses, so the new quote's Discount Amount and Total Price always add up to its Subtotal. When the discount comes to an exact half cent, the Total Price can differ by one cent from what Generate Quote stored before. For example, a 999.95 opportunity at 10% now gets a Discount Amount of 100.00 and a Total Price of 899.95, where it used to get 899.96, so the two came to one cent more than the Subtotal.

Editing the discount, tax or shipping still updates both totals in the same save, and adding, changing or removing a line item still updates them right after. **Subtotal** can still be edited.
