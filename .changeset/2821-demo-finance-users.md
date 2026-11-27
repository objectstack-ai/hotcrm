---
---

Clause-②: no
Metadata-protocol: none

Dev tooling only: `pnpm demo:staff` now also creates a Finance Controller (`finance.controller@objectos.ai`) and an Accounts Receivable user (`ar.accountant@objectos.ai`), so the Order to Cash screens can be shown as finance on a local demo box, and its self-check signs in as each and requires invoices and payments to answer them with rows (#2821). Neither user owns any seeded record. The script and its table are not part of the published app, so nothing ships to users.
