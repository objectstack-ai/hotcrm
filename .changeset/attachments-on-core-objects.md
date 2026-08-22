---
'hotcrm': minor
---

Accounts, contacts, opportunities, quotes, contracts and cases now accept file
attachments. Each of those records grows an **Attachments** panel — upload a
signed MSA onto the account, the proposal onto the deal, a screenshot onto the
case — with per-row download and delete. Leads are deliberately left out:
unqualified leads arrive in volume and an attachment surface on them mostly
collects junk; everything a lead converts into does accept files.

Attachments carry no permissions of their own — they inherit the record's, and
the platform enforces that on every path: uploading requires edit access to the
parent record, the file list is intersected with the records the caller can
actually read, deleting is limited to the uploader or someone who can edit the
parent, and the download URL is refused (403) to anyone without record access
and (401) to anonymous visitors. Sharing a record therefore carries its files
along, and no profile needed a new grant.

Record comments needed no change: the platform's `enable.feeds` capability is
opt-out and already on, and the Discussion feed on accounts, opportunities and
cases was verified in a live console to render, accept a post and persist it.
New guide: **Files & comments** (`/docs/guides/files-and-comments`), in all
three doc locales. Refs #602.
