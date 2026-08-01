---
'hotcrm': minor
---

Upgrade HotCRM to ObjectStack 17.0.0-rc.1. The app now declares protocol 17
compatibility, preserves existing required-field database constraints explicitly,
uses the live metadata contracts for skills, flows, and APIs, and enables the
date buckets that make CRM analytics aggregate by month, day, and quarter.

Also completes the 17.0 permission migration that the version bump alone leaves
half-done: `allowExport` became an opt-in bit whose absence DENIES, so every
CSV/XLSX list export and every report export is authored explicitly on the
profiles that need it. Approval nodes drop their hand-rolled org-owner backstop
for the native `onEmptyApprovers` policy, media fields declare the `accept` and
`maxSize` constraints 17.0 enforces server-side, and the platform-upgrade
checklist now covers the `os migrate` data gates.
