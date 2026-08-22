---
'hotcrm': patch
---

Accepting a quote that is missing a link no longer breaks the rest of the
acceptance chain.

`quote_on_accepted` read the ids it copies onto the drafted contract with
`(typeof input.x === 'string' && input.x) || (typeof previous?.x === 'string' &&
previous.x)`. When neither operand held — a quote with no contact, or no
opportunity, both of which `crm_quote` allows by design — that expression is not
`undefined`, it is boolean `false`, and `false` went to the engine as the
*content* of a lookup. A lookup column takes a record id or nothing at all, so
the write was wrong in every deployment, in one of two ways:

- with strict value shapes on (after `os migrate value-shapes --apply`), the
  insert was refused — `Primary Contact has an invalid lookup value: Invalid
  input: expected string, received boolean` — and the refusal aborted the whole
  handler, so the **close-won step below it never ran either**. A rep accepting a
  quote that carried its opportunity but no contact got no contract *and* an
  opportunity still sitting open, while the accepting save answered `200`: the
  hook is `async` with `onError: 'log'`, so the only evidence was a server log;
- with the warn-first default, nothing was refused at all — `false` was
  **stored** in the reference column, which is a row the value-shape migration
  scan later cannot convert.

An absent link is now an absent key. The contract is drafted with only the
lookups the quote actually carries, so an opportunity-less quote drafts its
contract normally instead of being rejected for a link it never had. The two
consequences of acceptance are also independent now: a contract that will not
draft no longer decides whether the deal is won, and each leg that fails is
reported by name (`could not draft the contract for quote …`) so the log says
what happened instead of nothing.

One behaviour is unchanged and worth restating, because it is the reason this
looked like a total failure: `crm_contract.crm_contact` is required, so a quote
accepted with no contact still produces no contract — now refused honestly with
`Primary Contact is required` rather than as a shape error, and no longer at the
cost of the opportunity. This is what the Quotes page already tells reps ("put
both on the quote before you mark it accepted").
