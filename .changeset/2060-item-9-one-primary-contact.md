---
'hotcrm': patch
---

**An account now has at most one primary contact.** Before, the flag piled up: **Mark as Primary Contact** flagged the contact you clicked and left the account's previous primary flagged too, ticking **Primary Contact** on the contact form did the same, and converting a lead into an account that already had a primary contact flagged the new contact as well. The **Primary Contacts** list ended up showing almost every contact.

Now, when a contact becomes an account's primary contact, the flag is cleared on the account's other contacts. This holds however the flag is set: Mark as Primary Contact, the contact form, the API, or moving a primary contact to another account.

Converting a lead now flags the new contact as primary only when its account has no primary contact yet. Converting into a new account works as before: the new contact is its primary contact. Converting into an account that already has one leaves that contact as primary.

An account that already shows more than one primary contact keeps them until you choose one: untick **Primary Contact** on the contacts that should not be primary. Marking another contact of the account as primary also clears them all.
