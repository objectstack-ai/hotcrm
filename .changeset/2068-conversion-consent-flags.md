---
'hotcrm': patch
---

Converting a lead now keeps the person's communication preferences. The new contact carries the lead's **Do Not Call** and **Email Opt Out**, along with its mobile, lead source and salutation. Before this fix, a lead that had opted out became a contact you could email and call. If the conversion reuses an existing contact, an opt-out on either record wins: the conversion can turn a flag on but never clears one.
