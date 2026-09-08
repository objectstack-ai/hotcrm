---
---

Dependency declaration only — this PR releases nothing to HotCRM users, so the
frontmatter above is deliberately empty (the sanctioned "releases nothing"
declaration that `.github/workflows/changeset-check.yml` documents, on par with
the `skip-changeset` label). No object, dataset, widget, layout, filter, hook,
flow or exported symbol changed: the whole diff is `package.json`'s
`dependencies` block plus the nine importer entries `pnpm install` wrote into
`pnpm-lock.yaml`.

Nine `@objectstack/*` packages that files under `test/` import were reaching the
test run as transitive dependencies of `@objectstack/runtime` and
`@objectstack/cli` rather than as anything this repo declared:
`@objectstack/core`, `@objectstack/platform-objects`,
`@objectstack/plugin-approvals`, `@objectstack/plugin-auth`,
`@objectstack/plugin-security`, `@objectstack/plugin-sharing`,
`@objectstack/service-messaging`, `@objectstack/service-storage` and
`@objectstack/trigger-record-change`. An undeclared import resolves for exactly
as long as some other package keeps pulling it in, and it is a transitive graph
change — not a change here — that would take it away. Each is now declared at
exact `17.3.0`, alongside the other eleven `@objectstack/*` entries in
`dependencies` and matching this repo's no-caret convention.

**Declared, not upgraded, and that is the point.** Every one of the nine already
resolved at `17.3.0` in `pnpm-lock.yaml`, so naming them moves no resolution: a
plain `pnpm install` added nine `importers:` entries and left the whole
`packages:`/`snapshots:` region byte-identical. That region is what pins
`@better-auth/core` at `1.7.2`, which is the version that still ships the
`./db` export a patch release of that package removed; a regenerated or
`--force`-installed lockfile would have taken the pin — and the export — with
it.
