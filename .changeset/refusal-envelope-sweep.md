---
'hotcrm': patch
---

Business refusals now reach REST as refusals, not as server faults. Every guard
in this app threw a bare `Error`, and the platform's error mapper reads exactly
two properties off a thrown error — `code` and `status`. With neither set, a
deliberate refusal ("this quote is frozen", "this account still has open
opportunities") was classified `500 / INTERNAL_ERROR`. A REST consumer could not
machine-distinguish a business rule from a crashed server; the only signal was
the message string, which is prose, is localised in places, and is precisely the
part of a refusal that is meant to change.

Seventeen guard sites across ten `*.hook.ts` files now carry an envelope, drawn
from one declared vocabulary in `src/objects/_refusal.ts`:

| class | code | status | guards |
| --- | --- | --- | --- |
| `invalid_value` | `VALIDATION_FAILED` | 400 | website format, non-negative revenue, campaign date order, campaign `in_progress` dates, contract term vs range, list price vs cost, reminder vs due date |
| `duplicate` | `DUPLICATE_VALUE` | 409 | contact email within an organization |
| `locked` | `RECORD_LOCKED` | 409 | converted lead, closed opportunity, accepted/rejected quote, activated contract end-date |
| `delete_restricted` | `DELETE_RESTRICTED` | 409 | customer account with open opportunities, referenced contact, referenced product |
| `prohibited` | `FORBIDDEN` | 403 | Do Not Call, on tasks and on events |

The codes are the platform's own `ErrorCode` members, not an app dialect: the
mapper only echoes a code it recognises, and demotes anything else to
`declaredCode` while deriving the branchable `code` from the HTTP status. `403`
rather than a `409` for Do Not Call is deliberate — a conflict invites a retry,
and a compliance flag must not be auto-retried.

Refusal wording is unchanged. The phrasing is a contract in its own right and
every existing pin on it still holds; the envelope is added alongside, never
instead. One throw is deliberately left bare: `quote_on_accepted` reports a
failed close-won cascade the user neither caused nor can act on, and `500` is
the right answer for it.
