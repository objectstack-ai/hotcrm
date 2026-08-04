---
'hotcrm': patch
---

Contact documentation now states the email rule that actually ships: an email
address is unique **per organization**, not "within the same account".

`content/docs/sales/contacts.mdx` and its two Chinese translations promised that
"an email address must be unique within the same account" and that "the same
person can appear under multiple companies (a board member, for example)". Both
halves were wrong, and the second one walked the reader straight into an error:

- `crm_contact.email` carries field-level `unique: true`, which since framework
  #3696 materializes as the tenant composite `(organization_id, email)` — one
  address per organization, across every account in it.
- The `contact_integrity` hook (`src/objects/contact.hook.ts`) looks the address
  up with **no account scope** and rejects the duplicate first, with
  `Another contact (…) with email … already exists.`, so the friendly check is at
  least as strict as the index.

So the documented board-member workflow — the same person under two companies —
is exactly the write the product refuses. The rule lines now read like the
corrected `crm_account` ones (#625 / #646): unique within your organization,
another organization may hold its own contact at the same address, the address is
normalised to lower case before it is stored and compared, and a person you deal
with at two companies needs a different address on each contact record.

Documentation only — no metadata, hook or constraint changed. Whether "one
person, two companies" *should* be supported is a separate product question; this
change only stops the docs describing a write that fails.

Fixes #648.
