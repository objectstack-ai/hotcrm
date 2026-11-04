---
"hotcrm": minor
---

Clause-②: no
Metadata-protocol: none

**Accounts, products, quotes, campaigns and knowledge articles are titled by their name alone (#2369 row 10).** Their title used to put the number first, "ACC-000002 - Globex Industries", so the name was cut short in lookups, lists and the record header. The title is now just the name, "Globex Industries" (the article's own title on a knowledge article). The number has not gone anywhere: it stays a list column, it leads the summary strip under the record header, and the lookup picker shows it under each name ("Account Number: ACC-000002"). Search still finds a record by its number. Cases keep their number first, because agents speak by case number.

- **Messages name the record the same way.** Quote messages ("Quote Globex Manufacturing Suite Proposal accepted."), the frozen-quote refusals, the closed-campaign enrollment refusal and the duplicate price-book entry refusal now name the record by its name. A contract drafted from an accepted quote still names the quote by number and name, because quote names may repeat and the contract does not link back to the quote.
- **Line items follow their product.** An opportunity or quote line is named after its product, so it now reads "Premium Support" instead of "PRD-0009 - Premium Support".
- **Importing: a shared name is refused, not guessed.** A lookup cell names a record by its name. Account names are unique, but product, quote, campaign and article names may repeat; when two records share the name in a cell, the row is refused as ambiguous. Name such a record by its number (Product Code, Quote Number, Campaign Code, Article Number) or its record id. An export taken before this release that names these records as "PRD-0001 - Name" no longer matches; use the name, the number or the id.

**Upgrading.** Nothing to run. The five objects' old `display_title` column stays in the database, unused, and the server logs it once at boot as an orphaned column; drop it with `os migrate apply --allow-destructive` if you want it gone. Existing line items still carry the old "PRD-0001 - Name" copy until they are first read, which re-titles them; `scripts/backfill-line-product-title.ts --apply` does them all at once. `scripts/backfill-record-titles.ts` no longer lists the five objects. See `docs/MAINTENANCE.md` §3.5.
