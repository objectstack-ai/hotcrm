---
'hotcrm': patch
---

Converting a lead whose company has no match key now stops with a clear message instead of attaching the lead to another customer's account

Lead conversion finds the existing account by a match key that the app derives from the lead's Company. A lead can lack that key: a row from before the key existed, or a company sent through the record API as a number. Such a lead used to convert onto an unrelated account that also had no key. Its new contact and opportunity were filed under the wrong customer.

**Convert** now opens a "Conversion refused" dialog for such a lead, before the conversion form. The dialog says why the lead was stopped and that nothing was created. To fix it, save the lead's Company again, which rebuilds the key, and then convert the lead. Leads with a company key convert exactly as before.
