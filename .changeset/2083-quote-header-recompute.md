---
'hotcrm': patch
---

Editing a quote's own **Discount %**, **Tax** or **Shipping & Handling** now updates its **Discount Amount** and **Total Price** in the same save. Before this fix the two totals stayed at their old figures until a line item was added, changed or removed. A quote accepted in that window drafted its contract at the old total. For example, a quote with a 95,000 subtotal, 7,220 tax and 2,500 shipping had its discount raised from 5% to 10% and was then accepted: its contract was drafted at 99,970 instead of 95,220.

The totals follow one formula, whichever field changed: Discount Amount = Subtotal × Discount %, and Total Price = Subtotal − Discount Amount + Tax + Shipping & Handling. An accepted or expired quote is still frozen, and editing one is refused exactly as before. A quote with no Subtotal keeps the totals it has.
