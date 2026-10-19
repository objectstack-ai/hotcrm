---
'hotcrm': patch
---

A contact or account whose only quote is accepted can now be deleted

Handling a data-deletion request used to stop at the first quote the customer had accepted. Deleting
the contact, or the prospect account above it, was refused with *"… 1 active quote(s) … Close or
reassign the opportunities and quotes first"*, and neither could be done: an accepted quote is
settled and frozen.

Now both deletes go through. **The accepted quote stays, with its Contact cleared** and everything
else on it unchanged, the way a closed deal already keeps its record when its primary contact is
deleted. When the accepted quote sits under the account being deleted, it goes with that account, as
every quote under a deleted account does.

What still holds a contact is open work: an open opportunity or open quote naming them, or a
contract with them as its primary contact. The refusal now lists only what holds the contact, with
real plurals (*"1 open opportunity and 2 open quotes"*, not *"1 open opportunity(ies), 2 active
quote(s), 0 active contract(s)"*), and names only steps that free the contact: close the opportunity
or give it another primary contact, give the quote another contact or reject it, give the contract
another primary contact.

A quote's Contact is still required on the save that moves the quote to Presented or Accepted, and
cannot be emptied while the quote is Presented, so a contract is never drafted without a recipient.
The Contact field's help text now says that. *Import & Export › Data deletion requests* and *Quotes*
describe the new behaviour.
