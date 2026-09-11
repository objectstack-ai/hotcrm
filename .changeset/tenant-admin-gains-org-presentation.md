---
'hotcrm': minor
---

Grant `manage_org_presentation` to the SaaS composition's `tenant_admin`
permission set. Chartered by the maintainer, 2026-08-27: 「发版后把 tenant_admin
那格补上创建卡片」.

`tenant-admin.profile.ts` shipped without any metadata-authoring vocabulary
because the platform's only key for it was `manage_metadata` — `scope:
'platform'`, which reaches every organization in the deployment. objectstack#12702
added the org-scoped subset key, and this app's pin now carries it: measured on
the installed `@objectstack/spec` 17.4.0, `PLATFORM_CAPABILITIES` declares
`{ name: 'manage_org_presentation', scope: 'org' }`.

**What a tenant admin can do now that they could not before.** Save, reset,
publish and roll back `/meta` items of the metadata types whose registry entry
declares `allowOrgOverride` — views, dashboards and reports — scoped to their
own active organization. Measured against `metaWriteCapabilityVerdict`
(`@objectstack/metadata-core`, the function that actually reads
`systemPermissions` on a `/meta` write), the grant flips those three from
denied to allowed and moves nothing else: objects and flows stay denied, and an
org-overridable type written by a session with no active organization stays
denied.

**What is unchanged.** Exactly one entry is added. `customize_application`,
`manage_profiles` and `manage_roles` stay dropped — they describe the broad
authoring authority, not this narrow one. The community `system_admin` set is
untouched. Because the new key is `scope: 'org'`, the existing pin that
`tenant_admin` holds no platform-scoped capability keeps passing unchanged.

Minor rather than patch: this widens what a published permission set permits,
which is a behaviour change for anyone running the SaaS composition, not a
correction to one.
