---
'hotcrm': patch
---

The Automation and Cases guides send readers to the record history they can actually open

- **Users are sent to the record's own activity, not to an audit log.** The
  Automation guide's *Tips for users* told users to "check the audit log". A
  sales rep cannot open it: Setup is not among their apps and the audit log
  refuses their reads. The tip now points to the record's activity (the
  **Activity** tab on a case, lead or opportunity, the **Discussion** feed on
  other records, and the **History** tab on a lead), where a change to a
  tracked field shows its old and new value, and asks an admin to read the
  audit log when the question is what else a save changed.
- **Admins are told where the audit log is.** *Where to monitor automation*
  named an "Object → audit log" that no record page shows. It now names
  **Setup → Diagnostics → Audit Logs** and says what one entry holds: the time,
  the user who saved, and the old and new value of every field the save
  changed.
- **The Cases guide no longer says every object tracks its history.** It said
  every CRM object ships with history tracking switched on and that the audit
  log feeds the case's Activity tab. Neither is so: tracking is chosen field
  by field, and the Activity tab does not read the audit log. The paragraph now
  says what the tab shows for a tracked field and for any other edit.

Both guides changed in English, Simplified Chinese and Traditional Chinese.
