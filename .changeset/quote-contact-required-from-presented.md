---
'hotcrm': patch
---

Require a **Contact** on a quote from `presented` onward, so the sentence the
schema has always carried — *"Recipient is nailed down by the time a quote is
presented"* — finally has a mechanism behind it.

`crm_quote.crm_contact` was optional in every state while
`crm_contract.crm_contact` is `required` + `notNull`. A quote accepted without a
recipient therefore could never draft its contract. Since #1013 that failure is
honest and no longer swallows the close-won leg, but `quote_on_accepted` is
`async: true` + `onError: 'log'`: the accepting write still answers 200, and the
only evidence is a server log with no human in front of it.

`crm_contact` now carries
`requiredWhen: has(record.status) && (record.status == "presented" || record.status == "accepted")`,
which moves the same refusal forward to the write that turns the quote outward —
synchronous, reported against the field, with the quote still editable:

```
PATCH /api/v1/data/crm_quote/<id> {"status":"presented"}
→ 400 VALIDATION_FAILED  "Contact is required"   (quote stays draft)
```

Drafting is unchanged: a `draft` or `in_review` quote still needs no recipient,
which is what lets `quote_generation` quote a contact-less opportunity. The two
states a quote can reach *without ever being sent* are deliberately not gated —
`expired`, written by the nightly `quote_expiration` sweep over never-sent
drafts, and `rejected`, legal straight out of `in_review`.
