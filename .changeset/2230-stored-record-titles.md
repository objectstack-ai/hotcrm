---
'hotcrm': minor
---

Record titles are stored, so an exported lookup column imports back, and the app moves to ObjectStack 18.1.0

**Nine record titles are stored fields now, not formulas (#2230).** Account, contact, lead,
forecast, product, quote, campaign, case and knowledge article each title their records with a
field the platform computes from the record's own columns (for example `ACC-000004 - Stark
Medical`, or a contact's full name). Until now that title was computed each time it was read and
stored nowhere, so the import could not match it. It is now computed when the record is written and
stored with it, with the same wording as before:

- **An export imports back.** A contact export whose *Account* column reads `ACC-000004 - Stark
  Medical` now links each row to that account on re-import. Before, every such row was refused with
  "no record matches". The same holds for every lookup to one of the nine objects.
- **A new record's title carries its number.** A case created today is titled `CASE-00039 -
  <subject>` the moment it is saved.
- **An account or campaign with no number is titled by its name**, as a product already was.
  Before, such a record had no title at all.
- The title stays read-only and is not offered on any form.

**Upgrading an existing database needs one step.** Records stored before this release have no
stored title yet, so until they are next edited their header, lookup chip and search hit fall back
to the record id. Run the backfill once after the upgrade, report-only first:

```bash
pnpm exec tsx scripts/backfill-record-titles.ts --url https://<your-org> --email <admin> --password <pw>
pnpm exec tsx scripts/backfill-record-titles.ts --url https://<your-org> --email <admin> --password <pw> --apply
```

It re-saves one unchanged field on each untitled record, so the platform computes and stores the
title, and it is safe to run again. A new install needs nothing. See `docs/MAINTENANCE.md`.

**ObjectStack 18.1.0.** All 23 `@objectstack/*` dependencies move from 18.0.0 to 18.1.0 together,
pinned exact, and `specVersion` and `engines.protocol` follow to `^18.1.0`. 18.1.0 carries the two
platform fixes the stored titles need: a stored title that reads an autonumber is computed with the
number (objectstack-ai/objectstack#25073), and the import matches a lookup cell by the target's
stored title (objectstack-ai/objectstack#25033).

- **Approval names are translated.** The language packs now name the six approval processes and
  their steps in Chinese, Japanese and Spanish, and 18.1.0 serves an approval request with them in
  the reader's language, for example *大额商机审批 · 销售经理审核* for *Large Deal Approval · Sales
  Manager Review*.
- **The Details, Related and Activity tabs** of the opportunity and case record pages are translated
  in the same three languages.
