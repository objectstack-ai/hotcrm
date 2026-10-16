---
'hotcrm': minor
---

Upgrade the ObjectStack platform to 18.0.0-next.2 (prerelease)

All 23 `@objectstack/*` dependencies move from 18.0.0-next.1 to 18.0.0-next.2 together, pinned
exact: 19 in `dependencies` and 4 in `devDependencies`. `specVersion` and `engines.protocol` follow
to `^18.0.0-next.2` in `objectstack.manifest.json` and in both package manifests (`src/sales`,
`src/service`). `pnpm install` regenerated `pnpm-lock.yaml`: 707 `packages:` entries before and
after. The 55 `@objectstack/*` keys and `create-objectstack` moved one for one, nothing was added or
removed, and no third-party package changed version.

**This release needs an ObjectStack 18 host.** 18.0.0-next.2 is a prerelease of protocol major 18.
The handshake compares majors, so any 18 runtime admits the artifact and a 17.x host refuses it
before it reads a single object.

The platform changes that reached this app:

- **Pages name only the layouts and slots the console draws.** 18.0.0-next.2 refuses the page
  template `full-width`, a region its template does not place, and `isDefault` on a page that is not
  a record page.
  - The lead, opportunity and case record pages move from `template: 'full-width'` to
    `template: 'default'`, the layout `full-width` was a second name for. They render as before.
  - Sales Home's `right_sidebar` region becomes `aside`, a slot its three-column layout places, and
    the page no longer declares `isDefault` (where the app opens is set by its navigation). Its empty
    `left_sidebar` region is removed: as a placed `sidebar` it would have reserved a blank column.
  - What a user sees: on Sales Home, the *Ask the AI Assistant* and *Upcoming Events* cards now sit
    in a column to the right of the key metrics. Before, the page stacked them below the rest of the
    page at full width.
- **The console that ships with the platform changed what HotCRM users see**, with no change here:
  - Text formula fields, such as a lead's full name, now read in the normal text font instead of a
    code font.
  - An inactive account is greyed out on *All Accounts*. Before, that tint painted nothing.
  - On *All Leads*, **Add to Campaign** is offered in the selection bar and in each row's menu, and
    no longer as a header button.
  - A service agent or service manager now opens the app on **Leads**, the first entry their sidebar
    shows. Before, they opened on the Executive Overview dashboard, which they cannot read.

The test suite moved with the platform. A cascade-delete test now pins the platform's new
`referentialCascadeDelete` marker, the one signal a hook can use to tell a parent's cascade from a
hand delete. A forecast test hands the platform's seed-ownership claim the row it restores, because
since 18.0.0-next.2 the claim only takes over ownerless rows that the seed itself reports writing.

**What operators should know:**

- **No app data changes.** No object, field or stored value changes in this release, and nothing
  needs to be cleared or reloaded.
- **A stored page customization keeps loading.** A deployment that saved its own copy of one of the
  four pages above through Studio keeps serving it as stored. The platform refuses the next save of
  such a copy until it uses the new template and region names.
- **A web lead or case that nobody was assigned stays unassigned.** On 18.0.0-next.2 the platform
  no longer hands rows that nobody owns to the first administrator at the next restart, unless its
  own seed wrote them. HotCRM still assigns web leads and cases as they arrive. A case that arrives
  while nobody holds the Service Agent position now stays in *Unassigned — triage* until someone
  takes it.
- **Moving a host from 17.x to 18 is the platform's migration, not this app's.** An 18 runtime
  refuses to serve a database still in the 17.x organization shape until the operator runs
  `os migrate organization-ownership` (plan with `--out plan.json`, then
  `--apply --backup-taken --plan-file plan.json`). That ceremony keeps existing data.
