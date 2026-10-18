---
"hotcrm": minor
---

**Opportunity and quote line items are now named after their product.** Open an opportunity and its **Opportunity Line Items** card lists each line as its product, for example **PRD-0009 - Premium Support**. A line's own page is headed the same way, and so is every other place that names a single line. Before, a line had no name of its own, so the app showed its description. A line added with the **Products** list's **Add** picker has no description, so it showed a raw record id, such as **Opportunity Line Item anj16lV4**. Quote line items had the same gap and get the same fix.

The name is the product's own title, its code and name, kept in a new read-only **Product Title** field on both line items. It follows the product: rename a product and the name changes on every line that sold it. That includes lines on closed deals and on accepted or expired quotes, because a name is not a figure. Every other field of those lines stays locked, as before. Searching line items by a product's name now finds them.

**After upgrading, run the one-time backfill once.** Lines created before this version have no Product Title yet, so their page would be headed by a record id until it is filled. The backfill fills every line, on open and closed parents alike:

```
pnpm exec tsx scripts/backfill-line-product-title.ts --url https://YOUR-ORG --email ADMIN --password PASSWORD          # report only
pnpm exec tsx scripts/backfill-line-product-title.ts --url https://YOUR-ORG --email ADMIN --password PASSWORD --apply  # write
```

It changes no product: it re-saves each product's unchanged name, which fills the lines that sold it. A second run reports zero lines. Restarting the server does not fill these lines, demo data included.
