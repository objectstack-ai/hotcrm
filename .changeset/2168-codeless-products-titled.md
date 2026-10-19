---
'hotcrm': patch
---

**A product with no product code is now titled by its name, and so are its line items.**

Products created before HotCRM issued product codes automatically have no code. Their title combined the code and the name, so it came out empty: the product's own page had no title, and since 5.1.0 every line item of such a product was named by its record id, with no way to fix it. Such a product is now titled by its name alone, and its line items are named after it on their first view.

This also stops a side effect of 5.1.1 on those products: each time a list showed one of their untitled line items, HotCRM re-saved the product, updating its Last Modified date, and still could not name the line. 5.1.1 was only ever on the staging marketplace.
