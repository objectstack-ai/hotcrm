---
'hotcrm': patch
---

Move the platform baseline from ObjectStack 17.0.0-rc.2 to 17.0.0-rc.3. Every
`@objectstack/*` dependency is bumped together, and `specVersion` /
`engines.protocol` in `objectstack.manifest.json` follow.

Unlike the rc.1 → rc.2 window, this one migrates nothing: rc.3 carries exactly
one substantive platform change, and it is a loosening. `BulkActionParamSchema`'s
`options[]` entry became `.passthrough()` (upstream #4001), so keys beyond
`label` / `value` on a bulk-action param option — `color`, `icon`, `disabled`,
`visibleWhen` — are preserved at parse instead of being silently removed. Every
other `@objectstack/*` package in this release is a version-bump republish whose
changelog entry is `Updated dependencies` alone.

HotCRM authors two bulk-action params with options, both on
`src/views/account.view.ts` (`update_tier`, `transfer_owner`), and both spell
their options with exactly `label` and `value`. Nothing was being stripped here,
so the loosening is a no-op for this app today — it is now simply possible to
give a bulk-action option a colour or an icon and have it survive to the
renderer.

The full suite was re-run against the installed rc.3 with `dist/` deleted first:
`validate`, `typecheck`, `build`, `test`, `lint` and `hygiene` are all green with
no source, metadata, test or documentation change required. The pre-existing
author-time warnings (four approval-approver warnings on the two opportunity
approval flows, one shadowed field group on `crm_campaign_member`) are unchanged
in number and wording.

Version-string references elsewhere in the repo are deliberately untouched. Every
remaining `17.0.0-rc.2` in `src/`, `test/`, `content/` and `.changeset/` is a
record of when a behaviour was measured ("measured on 17.0.0-rc.2", "from
17.0.0-rc.2 the engine rejects the write"), not a declaration of what this app
depends on; rewriting them to rc.3 would falsely claim a re-measurement that did
not happen.
