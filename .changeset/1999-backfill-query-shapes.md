---
'hotcrm': patch
---

The line-number and owner back-fill scripts run again on ObjectStack 17.6.0

`scripts/backfill-line-number.ts` (the one-time line-number back-fill this release asks you to
run) and `scripts/backfill-owner-id.ts` (`pnpm backfill:owner`) both stopped on their first
read and changed nothing. They printed `Backfill failed: query crm_opportunity_line_item → 400:
Invalid query request` and `Backfill failed: cannot read sys_user (400)`. On 17.6.0 the record
query endpoint refuses two request shapes the scripts sent: an empty filter list and a sort
written as text (`'id asc'`). Both scripts now send the same shapes as
`scripts/backfill-contact-mailing-address.ts`. Each still reads the same records and writes the
same values, and is still report-only until you pass `--apply`.

Measured on a fresh 17.6.0 boot:

- **Line numbers.** 12 line items had no line number, across three opportunities and two quotes.
  The report listed all 12. `--apply` numbered each one in creation order under its parent,
  after any number that parent already had. A second `--apply` found 0 rows to change.
- **Owner.** The test org had the old `Owner` field on leads and accounts. The report listed the 3
  records whose Owner did not match the access owner, and separately listed the 1 record whose
  Owner names no real user, which it skips. `--apply` updated the 3, and a second `--apply` found
  no differences. On an org that is already upgraded, the script says so for each object and
  makes no changes.

A new test runs every `scripts/backfill-*.ts` against the installed query schema. If a future
platform version refuses one of their requests, `pnpm verify` fails before the script ships.
