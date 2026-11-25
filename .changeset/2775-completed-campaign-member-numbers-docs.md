---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**The marketing manual no longer says a Completed campaign's member numbers stop moving (#2775).** The in-app Campaigns page said a **Completed** campaign "takes no new members, so its member counts stay as they closed", and the docs site's Campaign Members page said it "keeps the sent, lead and response figures it closed with". Only the first half is true. A completed campaign refuses new members, but a member already on it can still be marked responded or removed, its lead can still convert, and deleting a lead or contact still removes its memberships; the campaign's sent, response and lead numbers follow each of those, as the same pages already say under "What the numbers count". Both pages now state that rule, in English, Simplified Chinese and (on the docs site) Traditional Chinese. Documentation only: no behaviour changes.
