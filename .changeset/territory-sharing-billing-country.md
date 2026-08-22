---
'hotcrm': patch
---

Fix territory sharing: the North America and Europe rules now actually grant
access. Both were declared against `record.billing_address.country`, a path
that reaches inside the structured Billing Address value. A sharing rule's
criteria have to compile into a database query, and a query cannot reach inside
a composite address — so the platform refused to install either rule (correctly
preferring that to widening them to "every account"), and `na_sales_team` /
`eu_sales_team` received no criteria-based account access at all while the
metadata and the admin docs said they did. The only sign was a WARN in the boot
log: `seeded: 7, skipped: 2, total: 9`.

Accounts now carry **Billing Country**, a read-only two-letter code projected
from the country you enter in Billing Address and maintained on every write, and
the two territory rules match on it. Territory membership is unchanged — the
same countries, read from a queryable column instead of from inside the address
— and the field is shown on the account's *Locations* section so an admin can
see at a glance why a territory team does or does not have an account. Enter the
billing country as its two-letter code (`US`, `DE`, …); a country spelled out in
full puts the account in no territory.

For anyone writing their own rules: **criteria may only filter on plain fields**,
never on part of an Address or Location value. `test/sharing-seeding.test.ts`
now compiles every declared rule with the platform's own compiler and fails the
build if any of them would be dropped at boot, so a rule can no longer ship
inert. Fixes #621.
