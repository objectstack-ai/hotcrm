---
"hotcrm": patch
---

**Converting a lead with Create Opportunity ticked and an amount of zero or less no longer leaves it half-converted.** Every opportunity needs an amount greater than zero, but the conversion dialog accepted 0 or a negative figure. Submitting it created the account and the contact first, then failed on the opportunity with "Amount must be greater than zero". The lead was left with a new account and contact, no opportunity, and still not converted.

Such a conversion now stops right after the dialog, before anything is created, and says why: the opportunity amount must be greater than zero. Convert the lead again with the amount the deal is worth, or leave Create Opportunity unticked to convert it without one. A positive amount converts exactly as before.
