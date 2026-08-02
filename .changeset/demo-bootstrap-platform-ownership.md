---
'hotcrm': patch
---

Demo bootstrap now claims the platform ownership column, so seeded records are editable

On a freshly seeded demo org, every seeded contract was read-only for every user — the
admin included. Opening a demo contract and changing a field answered
`403 FORBIDDEN`, and uploading to its Attachments panel answered
`403 ATTACHMENT_PARENT_ACCESS`, which read as "attachments are broken on contracts" when
what was broken was the contract's ownership.

Each of these objects carries two ownership columns: the app's own `owner` lookup, which
drives the "My Leads" / "My Deals" / "My Cases" views and every owner-addressed
notification, and the platform's `owner_id`, which is the only one record sharing reads.
Under `sharingModel: 'private'` a record with no `owner_id` admits nobody, and a share can
only widen access from an owner that isn't there. The `demo_bootstrap` sweep stamped the
`owner` lookup alone, so a seeded row that arrived without a platform owner came out of
bootstrap looking claimed everywhere a person would check while still being owned by
nobody for access control — and because the sweep then selected on `owner`, it never
looked at that row again. The state was permanent.

`demo_bootstrap` now stamps both columns on every record it claims, and sweeps each object
for rows missing either one, so an org already left in the half-claimed state repairs
itself on the next pass rather than needing a database reset. No metadata, seed values or
API shapes changed; only the bootstrap sweep.
