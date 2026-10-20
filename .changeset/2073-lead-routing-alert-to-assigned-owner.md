---
"hotcrm": patch
---

**A lead you create for yourself no longer sends you an "awaiting assignment" alert.** New-lead routing alerts the lead's owner, but its standard alert read *"New lead to assign: … is awaiting assignment"*, an assigner's message sent to the person the lead was already assigned to. Every lead a rep created, from the form or through the API, therefore told that same rep the lead was waiting to be assigned.

Now the standard alert reads *"New lead assigned to you"*, and it is sent only when someone else put the lead in the owner's name: the round-robin gave them a web-to-lead enquiry, an integration named them as owner, or a colleague logged the lead for them. A lead you create for yourself sends you no standard alert. Its three-day follow-up date is still set, and it is in **My Leads**.

The hot-lead alert (4 stars or better) now reads *"Hot lead — follow up within 24h"* instead of *"Hot lead — assign within 24h … needs an owner today"*. It still goes to the owner whoever created the lead, by inbox and email, because the rating may be the system's own score. Both alerts are reworded in all four languages. A lead with no owner still gets its follow-up date and no alert.
