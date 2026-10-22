---
"hotcrm": patch
---

**The large-deal-won notification shows the amount formatted, and a stalled deal with a long name gets its follow-up task.**

- **Large Deal Won Alert** (#2193): the inbox and email text read "Wayne Enterprise License closed at 1200000." The amount now goes through the template renderer's `number:2` formatter in the recipient's locale, so it reads "closed at 1,200,000.00", the way the record and the list show it (`1.200.000,00` in Spanish). All four locale packs carry the change.
- **Stalled Deal Alert** (#2210): a deal whose name was longer than 233 characters got no stall task, because `Advance stalled deal: ` + the name overflowed the task subject's 255-character limit and the insert was refused. The subject is now cut to 254 characters plus an ellipsis, as the won-deal and case-escalation tasks already are. The "already nudged?" check matches the cut subject, so a long-named deal still gets exactly one task per stall.
