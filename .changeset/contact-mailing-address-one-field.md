---
'hotcrm': minor
---

**A contact's mailing address is now one structured field.** `crm_contact` stored its
address as five separate text fields — `mailing_street`, `mailing_city`, `mailing_state`,
`mailing_postal_code`, `mailing_country`. It now carries one `mailing_address`
(`Field.address()`), the same shape as an account's Billing Address and a lead's Address.
FROM five fields TO one: the contact detail page shows the address as one unit, the
contact form's Mailing Address tab edits it as one field, and each locale pack carries one
label instead of five. A report, list view, integration or API client that read or wrote
`mailing_street` … `mailing_country` must read and write `mailing_address` and its parts
(`street`, `city`, `state`, `postalCode`, `country`) instead.

**The contact import template does not change.** `assets/import-templates/contacts.csv`
keeps its five `Mailing …` columns. The `crm_contact_import` mapping now sends each column
to one part of `mailing_address` (`mailing_address.street` … `mailing_address.country`), so
a customer's existing file imports exactly as before; a row with all five cells blank
leaves the address empty.

**Existing deployments: run the one-time conversion after upgrading.** Upgrading does not
move the old values; the five old columns stay in the database, unused. Run
`pnpm exec tsx scripts/backfill-contact-mailing-address.ts --url https://<your-org> --email
<admin> --password <pw>` to see what it will write, then again with `--apply`. It composes
each contact's `mailing_address` from the non-blank old columns, writes only an empty
`mailing_address` (an address someone entered after the upgrade is kept and listed), never
changes or deletes the old columns, and is safe to re-run — a converted org reports nothing
to do. Run it **before** `os migrate apply --allow-destructive`: that command drops unused
columns, and with them the only copy of the old addresses.
