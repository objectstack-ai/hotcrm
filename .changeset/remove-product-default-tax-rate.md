---
'hotcrm': minor
---

Remove **Default Tax Rate %** from the product catalog.

A product record carried a default tax rate that nothing ever applied. It was not
on the product form, so no admin could set it in the console — only the REST API
could — and no total anywhere read it: the price fill that copies a product's List
Price onto a quote or opportunity line does not copy a rate, a quote line item
carries its own per-line **Tax Rate %**, and a quote's total takes **Tax** as an
amount typed on the quote itself. The field looked wired and was not, which is the
shape that misleads the next author into building on it.

Wiring it up instead was measured and is provably wrong: stamping the product's
rate onto a line makes the quote's total disagree with the sum of its own line
totals, and double-taxes any rep who also fills in the quote's Tax amount.

**What this means for you.** `crm_product.tax_rate` no longer exists on the object,
in any of the four language packs, or in the product documentation. Any value
written to it through the REST API is dropped, and a write naming that field is no
longer accepted; no seeded catalog product ever carried one, so the demo data is
unaffected. Tax is unchanged everywhere it was actually computed — the quote line
item's own rate and the quote's Tax amount both stay exactly as they are. Making a
product rate drive the quote-level tax figure remains a possible future design;
this removal does not foreclose it.
