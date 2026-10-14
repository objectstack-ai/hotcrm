---
"hotcrm": patch
---

**Converting a lead with Create Opportunity ticked now requires an Opportunity Amount.** The
amount was optional on the conversion dialog, although every opportunity needs one. Submitting
the dialog with the box ticked and the amount empty used to create the account and the contact
first, then fail on the opportunity with "Amount is required". The lead was left half-converted:
a new account and contact, no opportunity, and the lead still not converted.

The dialog now marks Opportunity Amount as required whenever Create Opportunity is ticked, and a
submission without one is refused before anything is created; enter the amount to finish the
conversion. A lead with an Estimated Amount still has it filled in for you, and converting
without an opportunity needs no amount, as before.
