---
"hotcrm": minor
---

Clause-②: no
Metadata-protocol: none

**Quotes now price from a price book (#2318).** A quote carries a **Price Book**: a new quote starts on the **Standard** book, and a rep can pick another active book before adding line items. A quote line's **List Price** is now the product's price in that book (its **Sales Price** still starts there and stays negotiable), and a product the book does not price, or prices with an inactive entry, is refused on the line with a message naming the book and the product. Lines already written keep their prices when a book's entries change later. A quote's book cannot change once it has line items, is frozen with a settled quote, and a book any quote uses cannot be deleted (turn off **Active** instead). Opportunity line items still take the product's own **List Price**.

The **Standard** book now follows the catalog: a product added later gets its Standard entry at its **List Price**, and changing a product's **List Price** reprices that entry. Quotes created before this release have no **Price Book**; their new lines price from the Standard book. A SaaS tenant's starting catalog now includes the Standard book.

A price book's page gains **Add Products**, which gives every active product the book does not price yet an entry at one percentage of its **List Price** (80 for a partner tier 20% below it), leaving existing entries alone. Price books get an **All Price Books** and an **Active Price Books** list, and a product's page lists its entries in every book with their price. All of it is translated in the four locale packs, and the Price Books and Quotes guides describe it (#2318).
