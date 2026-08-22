---
'hotcrm': patch
---

An accepted quote's payment terms now reach the contract it drafts. Until now
they did not: `quote_on_accepted` built the draft contract from the quote's
account, contact, opportunity, owner, value, term months and dates — but never
its `payment_terms` — so every auto-drafted contract took
`crm_contract.payment_terms`'s own option default of **Net 30**, whatever the
customer had negotiated. A deal closed on Due on Receipt, Net 15, Net 60 or
Net 90 produced a contract quietly saying 30 days, with nothing on the record
marking the value as a default rather than a decision.

The value does not stay on the contract, either: the billing hand-off sends the
contract's `payment_terms` to the billing system when the contract is activated,
so the wrong term became the invoicing term. And the rep who negotiated it could
not correct it — Sales Reps have no edit right on contracts, so every occurrence
needed a manager or an administrator.

Quote and Contract have shared one payment-terms vocabulary since #490,
including `due_on_receipt`, specifically so that an accepted quote's terms could
be carried over intact. That was the stated reason for sharing it; the copy that
justified it had never been written.

Nothing changes for a quote that never chose a term: the field stays absent on
the draft and the contract's own Net 30 default applies, exactly as before.
