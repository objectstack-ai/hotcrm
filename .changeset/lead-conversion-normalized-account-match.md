---
'hotcrm': patch
---

Lead conversion now reuses an existing account when the company name differs only in capitalisation or spacing — converting a lead for `ACME  Corp` attaches it to your `Acme Corp` account instead of creating a second one.

The flow used to dedupe on the raw `crm_account.name`, so every case or spacing
variant produced its own account and the account list slowly filled with
near-duplicates of the same company. Matching is now **normalize-then-exact**:
both sides are lower-cased, trimmed and have runs of internal whitespace
collapsed before comparison. It is deliberately not fuzzy — `Acme Corp` and
`Acme Corporation` remain two different companies — because ranking candidate
matches needs a human review step this app does not have.

The comparison happens on two new derived columns, `crm_account.name_normalized`
and `crm_lead.company_normalized`, maintained by the `account_protection` and
`lead_duplicate_check` hooks. Both are read-only and hidden: nobody authors
them, and the display values (`name`, `company`) are untouched, so the account
created from a lead still carries the company name exactly as it was typed.

Storing the keys is forced rather than preferred, and each alternative was
measured against 17.0.0-rc.1 (the measurements are pinned in
`test/account-name-normalized-match.test.ts`, so a platform upgrade that changes
any of them fails loudly instead of leaving stale reasoning in a comment):

- a flow template cannot fold a string — the automation engine's token resolver
  understands only `NOW()` / `TODAY()`, so `{LOWER(x)}`, `{TRIM(x)}` and
  `{x.toLowerCase()}` all resolve to nothing;
- a formula field has no physical column, so nothing can filter on it;
- `$regex` is not a case-insensitive equality on SQL at all — it compiles to a
  substring `LIKE`, which also matches `Not Acme Corp Ltd`, cannot collapse
  whitespace, and cannot use an index.

`name_normalized` carries a plain index, **not** a unique one. Account-name
uniqueness already lives, per organization, on `name` (#625); a unique
normalized column would subsume that constraint and re-open a decision made one
release earlier, for a guarantee this change does not need. It would also be
impossible to add to any deployment that already holds both spellings, since
creating a unique index fails on existing duplicates.

**Upgrading an existing deployment.** Both columns start empty on rows written
before this version. An account with no key is invisible to the lookup, so
conversion would create *more* duplicates than before, not fewer; a lead with no
key stops its conversion outright, because the automation engine refuses to run
a query whose filter resolved to nothing rather than widening it. A one-time
backfill (re-save each account and open lead; the hooks derive the keys) is
documented in `docs/MAINTENANCE.md` §3.3. Fresh installs need nothing: seed
writes run lifecycle hooks, so every row is stamped as it is created.

Fixes #626.
