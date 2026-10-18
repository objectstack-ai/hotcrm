---
'hotcrm': minor
---

Upgrade the ObjectStack platform to 18.0.0-next.3 (prerelease)

All 23 `@objectstack/*` dependencies move from 18.0.0-next.2 to 18.0.0-next.3 together, pinned
exact: 19 in `dependencies` and 4 in `devDependencies`. `specVersion` and `engines.protocol` follow
to `^18.0.0-next.3` in `objectstack.manifest.json` and in both package manifests (`src/sales`,
`src/service`). `pnpm install` regenerated `pnpm-lock.yaml`: 707 `packages:` entries before and
after. The 55 `@objectstack/*` keys and `create-objectstack` moved one for one, nothing was added or
removed, and no third-party package changed version. `@objectstack/metadata-core` no longer declares
an optional `vitest` peer, so the lockfile's snapshot keys drop that suffix.

**This release still needs an ObjectStack 18 host.** 18.0.0-next.3 is a prerelease of protocol
major 18, so any 18 runtime admits the artifact and a 17.x host refuses it.

The platform changes that reached this app:

- **Sales Home's lists draw again.** The console that ships with 18.0.0-next.3 reads a page's list
  block only in the platform's list view spelling: the object in `data`, the kind in `type`. Under
  the old `objectName` / `viewType` spelling, *My Leads*, *My Open Deals*, *My Open Tasks* and
  *Upcoming Events* each showed "No object named: set data.object or dataSource.object." and loaded
  nothing. Sales Home now names its lists the new way, and each tab shows its saved view as before.
- **The lead forms say `visibleWhen`.** 18.0.0-next.3 removes `visibleOn`, the old name for a form
  field's show-when condition. The lead form views now use `visibleWhen`, and each condition is
  unchanged, so the same fields appear and hide as before.

Changes in the platform that HotCRM users see, with no change here:

- **Setup › Audit Logs no longer fills with your own clicks.** Opening a record or a list saves your
  recent items, and each save used to add an `update` row on `sys_user_preference` to the audit log.
  A user's own writes to their own preferences are no longer recorded. Anyone else's write to them
  still is.
- **Public web forms show their section headings in the visitor's language.** A Chinese visitor of
  *Contact Us* or *Support* now reads the section titles in Chinese, beside the field labels that
  were already translated.

**What operators should know:**

- **No app data changes.** No object, field or stored value changes in this release, and nothing
  needs to be cleared or reloaded.
- **A Studio copy of Sales Home keeps its old list spelling.** A deployment that saved its own copy
  of Sales Home through Studio keeps serving that copy as stored, and this console no longer reads
  its `objectName` / `viewType`. Delete the copy to fall back to the packaged page, or re-save it
  with `data` and `type`.
- **Moving a host from 17.x to 18 is still the platform's migration, not this app's.** An 18 runtime
  refuses a database still in the 17.x organization shape until the operator runs
  `os migrate organization-ownership`.
