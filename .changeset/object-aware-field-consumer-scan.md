---
"hotcrm": patch
---

Product docs: the *Standard list views* section now describes the two views the
catalog actually ships — **All Products** (the grid, grouped by category) and
**Product Catalog** (the gallery) — in all three locales. It previously named
*Active Products*, *By Category* and *By Family*, none of which exists; the
category grouping is a setting on the grid, not a saved view, and nothing groups
by family. The same section on the campaigns page named six views that do not
exist and is corrected the same way, and the cases page's roster gained the
*Unassigned — triage* view it had been omitting while claiming to list them all.

The products page also stops promising that tax is applied. *Default Tax Rate %*
is stored on the product and read by nothing: tax on a quote is an amount you
enter on the quote itself, and a quote line item carries its own per-line rate.
The sales-rep tip that said "pricing and tax are auto-filled" now says what is
actually filled in — the list price, and the sales price on a new line.

For maintainers: `pnpm scan:fields` prints an object-aware ledger of which
declared field is read by what. The sweep it replaces matched field names across
the whole source tree, so a field whose name is also used on another object read
as consumed whatever it did — `crm_product.tax_rate` was invisible that way.
