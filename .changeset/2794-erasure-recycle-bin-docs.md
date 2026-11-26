---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**The Security & Compliance page now says what deleting a record does when you answer an erasure request.** Nothing in the app changes; the page was wrong, in English and both Chinese versions. It said a delete is a hard delete with no recycle bin. Since ObjectStack 18.4.0, a deleted record keeps a full copy in the recycle bin for 30 days by default. The page now says three things:

- An administrator completes the request at once by purging that record's entry through the REST API.
- Setup → Recycle Bin offers only Empty recycle bin, which removes every deleted record of that object.
- Without either, the copy stays until the retention period ends. The audit-log entries and the record's activity history keep a copy of its field values, and a purge does not remove them.
