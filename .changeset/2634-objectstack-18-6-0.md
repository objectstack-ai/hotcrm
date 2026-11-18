---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**HotCRM runs on ObjectStack 18.6.0 (#2634).** Every `@objectstack/*` package moves from 18.5.0 to 18.6.0 together, and every package manifest and `objectstack.manifest.json` declare `^18.6.0`. Upgrade the host to ObjectStack 18.6.0 first.

What changes for people using HotCRM:

- **A refused time entry no longer leaves an empty timesheet behind.** On 18.6.0 a save is one unit with what its rules wrote first, so when a line is refused (say, more than 24 hours) the draft timesheet made for it goes too. The next line for that project and week makes it again. The Time and Expenses page no longer carries the note about the leftover timesheet.
- **Import mappings are named in the reader's language.** The import wizard offers Account, Contact, Lead, Invoice and Payment Import in Chinese, Japanese and Spanish, where it showed the English name in every language.
- **Analytics questions find the governed numbers in more words.** Every measure and dimension of the eleven datasets carries synonyms in English and Chinese (for example "bookings" and 赢单金额 for Won Revenue), so an assistant asked a business question in a person's own words answers from the dataset instead of an ungoverned query.
- The lead page's Activity Timeline, which shows logged interactions only, now says it takes no comments. The page looks the same: the composer was already hidden there.

Upgrading an existing database: no manual step. On SQLite the first boot on 18.6.0 converts any boolean cell stored as the text `'true'` / `'false'` to `1` / `0` (schema sync, `normalize_boolean_storage`, logged per table); a deployment that boots with `OS_SKIP_SCHEMA_SYNC=1` runs `os migrate plan`, then `os migrate apply`, to do the same. No HotCRM data changes.
