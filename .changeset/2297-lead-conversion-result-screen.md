---
"hotcrm": minor
---

Clause-②: no
Metadata-protocol: none

**Convert Lead ends on a result screen that links what it created (#2297).** The conversion used to finish on a "Lead converted successfully!" toast and leave the rep on the lead, with no link to the new account, contact or opportunity and no word that the account had gone to a sales manager's approval inbox. It now ends on a screen that lists the account, the contact and, when one was created, the opportunity, each by name as a link to its page; with no opportunity that line shows a dash. The screen also says whether the account is waiting for account approval, read from the account itself after the conversion. Everything is written before the screen appears: Submit finishes the run and refreshes the lead, and closing the screen any other way undoes nothing. The screen is translated in all four locales.

A caller that drives the conversion through the REST door or the `action_convert_lead` AI tool's `resume_run` now gets the run back paused on this screen after answering the conversion screen, with every write already done, instead of completed; one more resume with no values completes the run.
