---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**A lead's status path draws Unqualified apart from the steps, because the status options now say which one is the lost end (#2326).** The lead record's stage path drew New ✓ → Contacted → Qualified → Converted → Unqualified, with Unqualified as a fifth step after Converted. The platform reads each option's lifecycle `kind` (`open`, `won` or `lost`) to tell the steps of a path from its end, and no option declared one, so the path guessed from the spelling, and *Unqualified* matches no spelling it knows.

Every option of four lifecycle fields now declares its kind:

- **Lead Status**: *Converted* is won and *Unqualified* is lost.
- **Opportunity Stage**: *Closed Won* is won and *Closed Lost* is lost.
- **Case Status**: *Resolved* and *Closed* are won.
- **Task Status**: *Completed* is won. *Deferred* stays open, because a deferred task is postponed, not given up.

Every other option is declared open. Case and task have no cancelled value, so neither has a lost option. No option was added, renamed or reordered, and stored values do not change, so no data migration is needed.
