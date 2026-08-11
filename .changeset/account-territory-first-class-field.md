---
'hotcrm': minor
---

Make territory a first-class field on Account instead of matching free-text
country strings. `crm_account` gains a read-only **Territory** picklist
(`na` / `emea` / `other`) that `account_protection` derives from the billing
address, and the two territory sharing rules now compare `record.territory`
instead of matching `billing_country` against a list of country codes inside a
CEL string.

The defect this closes is silent by construction. `billing_country` is free
text, so an account whose address read `United States` rather than `US` belonged
to **no territory at all** — the metadata said territory sharing worked, and for
that account it did nothing, with no error anywhere. A declared `select` makes
the domain knowable instead: three values, every one of them reachable, and an
account outside the staffed territories now says `other` rather than nothing, so
"belongs to no territory" and "nobody filled this in" stop looking alike.
`Germany`, `DE` and `de ` all land in `emea`.

The country-to-territory mapping is authored once, in
`src/objects/_territory.ts`, and everything else is derived from it: the
picklist, both sharing-rule conditions (interpolated, so a renamed value cannot
be half-applied), and the localised country tables that were previously kept in
sync by hand across three documentation languages. `account.hook.ts` is the one
consumer that still carries a copy — a hook body is lowered to metadata and
evaluated with no module scope, so it cannot import one — and
`test/territory-single-source.test.ts` parses that copy back out of the
**lowered** body and asserts it equals the module's map, then drives every
declared spelling through the real QuickJS sandbox. A country added to either
side alone is red at PR time.

`UK` is kept as an accepted spelling of the now-canonical `GB`, which is what
let the ISO correction happen with no data migration: both land in `emea`, and
no existing account was evicted from its territory. The stock London account
still says `UK` on purpose — it is the fixture proving the alias path works on
real data. Nothing needed backfilling: both derived columns are `readonly` and
hook-owned, never authored in seeds, so they are computed on the seed insert.

Fixes #639. Refs #621, #637, #638.
