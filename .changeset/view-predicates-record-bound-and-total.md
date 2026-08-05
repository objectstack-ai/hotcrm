---
'hotcrm': patch
---

Leads can be created from the console again: every conditional field on the lead
forms now hides when it should, instead of appearing as a mandatory field nobody
can satisfy.

Console → Leads → New was unusable. Submit was blocked client-side with five
"required" errors — Disqualification Reason, Duplicate Of, Duplicate Of Lead,
Duplicate Of Contact, Duplicate Status — and no write ever reached the server.
The form was not merely annoying, it was **unsatisfiable**: `duplicate_of_lead`
and `duplicate_of_contact` are mutually exclusive by design, so it demanded the
new lead be a duplicate of an existing lead *and* of an existing contact at once.
Creating a lead through the REST API worked (201) the whole time, because the
object's `requiredWhen` predicates were already written correctly.

The cause was the form predicates, in this app's own metadata. They were spelled
with bare field names (`status == "unqualified"`), but the renderer binds field
values under the `record` namespace, so a bare name is an unbound identifier and
the predicate **never** evaluates — for any record, in any state. An
unevaluable visibility predicate fails open: the field renders, and a rendered
field enforces its `required` flag. Every such predicate in `src/views/` is
rewritten to the `record.`-bound form the object files already use, and made
total with `has(record.x)` guards (plus `!= null` on ordering comparisons) so it
still answers on a brand-new record whose keys do not exist yet — prefixing alone
would have left the same five fields failing on exactly the New form where the
bug was reported. The `duplicate_of_lead` / `duplicate_of_contact` predicates are
now character-for-character identical to the object's `requiredWhen`, so the form
shows a lookup exactly when the server will demand it.

No field, requirement or label changed — only the predicates that decide when a
field is shown. `test/view-predicate-dialect.test.ts` enumerates every predicate
from the compiled stack and fails on any that references an unbound namespace or
cannot evaluate, so a bare-name predicate cannot land green again.
