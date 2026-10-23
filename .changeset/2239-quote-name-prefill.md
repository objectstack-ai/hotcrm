---
"hotcrm": patch
---

**Generate Quote opens with the Quote Name filled in.** The name is prefilled with the opportunity's name, so submitting the form without typing one creates the quote; a name you type still wins. Before, the field started empty and was required, so the first Submit of every quote failed with "Please complete the required fields: Quote Name". The prefill is the opportunity's name alone, without a " Quote" suffix: the default cannot follow the user's language today, and an English word would appear in every language (#2239).
