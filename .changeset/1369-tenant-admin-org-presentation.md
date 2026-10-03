---
'hotcrm': minor
---

The SaaS tenant administrator may now author their own organization's views, dashboards and reports

In the SaaS / multi-org composition (`HOTCRM_COMPOSITION=saas`), the
**Tenant Administrator** permission set now holds the platform's org-scoped
`manage_org_presentation` capability. The platform admits a metadata save from
this capability only for the types it lets each organization override (views,
dashboards, reports, translations and email templates). The save becomes an
overlay for the caller's own active organization, and other organizations see
none of it.

Everything else stays as it was. Objects, flows, apps, pages, permission sets
and positions still require `manage_metadata`, which reaches every
organization in a deployment, so a tenant admin still cannot author them. The
community app's **System Administrator** and the default composition are
unchanged.
