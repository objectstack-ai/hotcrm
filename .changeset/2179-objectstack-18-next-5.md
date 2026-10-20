---
'hotcrm': patch
---

Upgrade the ObjectStack platform to 18.0.0-next.5 (prerelease)

All 23 `@objectstack/*` dependencies move from 18.0.0-next.3 to 18.0.0-next.5 together, pinned
exact. `specVersion` and `engines.protocol` follow to `^18.0.0-next.5` in `objectstack.manifest.json`
and in both package manifests. No third-party package changes version.

**This release still needs an ObjectStack 18 host.** 18.0.0-next.5 is a prerelease of protocol
major 18, so any 18 runtime admits the artifact and a 17.x host refuses it.

What HotCRM users see on the new platform:

- **Sales Home's key figures show in full.** *Revenue (Won)* and *Pipeline Value* used to be cut
  with an ellipsis (`1,290,0…`). The figure now shrinks to fit its tile, so `1,290,000.00` reads whole
  at a 1440 px window.
- **Setup › Diagnostics has one audit entry, Audit Log.** It opens the audit browser, which filters
  by action, object, user and date. The separate *Audit Logs* record list is no longer in Setup's
  menu; the browser links to it.
- Every page lays out as before. Sales Home and the lead, opportunity and case record pages no longer
  declare a width for their main column, which the platform now refuses there; the column is drawn
  at the same width as before.

What administrators and integrators should know:

- **A public web form now refuses a submission that leaves one of its required fields empty.** A
  script or integration that posts to *Contact Us* or *Support* without a *Description* gets `400`
  with the field named, and nothing is stored. Before, the case or lead was stored with that field
  empty. People filling in the forms see no change, because the form page already asked for it.
- **The app's own sharing rules are no longer rows in Setup › Sharing Rules.** The platform reads
  them from the app, so that list shows only rules your organization creates. They still grant
  access exactly as before. To see every rule, use the sharing rules API (`GET /api/v1/sharing/rules`).
  An app rule cannot be deleted, and no new rule may take its name.
- **ObjectStack 18.0 starts a fresh install under every tenancy posture.** `os serve` starts with
  `OS_TENANCY_POSTURE=group` or `isolated`, or with `OS_MULTI_ORG_ENABLED=true`, as it does under
  `single`, given the enterprise `@objectstack/organizations` runtime and `OS_PLATFORM_OWNER_EMAIL`.
  An existing database is a different case: it is upgraded before 18.0 serves it (see the 18.0.0
  upgrade entry).
- **No app data changes.** No object, field or stored value changes in this release, and nothing
  needs to be cleared or reloaded.
