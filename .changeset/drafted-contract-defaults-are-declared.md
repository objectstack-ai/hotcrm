---
---

`quote_on_accepted` provenance only — this PR releases nothing to HotCRM users, so the
frontmatter above is deliberately empty (the sanctioned "releases nothing" declaration
that `.github/workflows/changeset-check.yml` documents, on par with the `skip-changeset`
label). The drafted contract document is byte-identical: the same keys with the same
values, pinned by a new test rather than argued.

What changed is that the three values `quote_on_accepted` has to invent —
`contract_term_months: 12`, `start_date: today`, `contract_type: 'subscription'` — are now
collected in a `DRAFT_CONTRACT_DEFAULTS` block that says in so many words that they are
placeholders and not business decisions, with `end_date` documented as derived from two of
them rather than as a fourth guess. Per the #1129 ruling (2026-08-31), an auto-drafted
contract is a starting draft an admin completes, not a transcription of what was sold; the
values stay, their provenance becomes visible. `contract_type` is the load-bearing one:
`crm_contract` declares six types and no default of its own, so that one line is the only
thing that ever picks one, and the contract's type reaches the billing system when it
activates.

The ruling's other half is recorded at the same site: the quote's `shipping_terms`,
`billing_address`, `shipping_address` and `description` are deliberately not copied, so
that gap stops reading as one nobody examined.
