---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**An invoice paid more than its amount counts as fully paid: Open reads 0, the excess shows in a new read-only Overpaid amount, and no receivable goes negative.** Before, a 6,000 invoice paid 6,100 read Open −100, and the contract's and the account's Receivable Balance dropped by the same 100. The overpayment is still accepted, typed or imported; it is not set against other invoices. Overpaid has labels in en, zh-CN, ja-JP and es-ES and a column in All Invoices (#2513).

Invoices stored before this change keep their figures until their next payment, amount change or status change. To heal them now on a self-hosted org, run `pnpm exec tsx scripts/backfill-invoice-overpaid.ts --url <org> --email <admin> --password <pw>` to list them, then again with `--apply`.
