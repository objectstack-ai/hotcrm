# HotCRM Release Strategy

> Current release model for the single ObjectStack marketplace app.

## Release Unit

HotCRM releases as one ObjectStack app package:

| Field | Value |
| --- | --- |
| npm package name | `hotcrm` |
| ObjectStack manifest id | `app.objectstack.hotcrm` |
| Namespace | `crm` |
| Current version | `3.0.0` |
| Publish artifact | output from `pnpm build` |

The active repository is not released as separate scoped npm packages.

## Version Sources

`changeset version` writes the first two from the changesets a release has
accumulated — ⛔ do not hand-edit either:

- `package.json` `version`
- `CHANGELOG.md` — the new release section is spliced in under the `# Changelog`
  title, and everything already below it is kept byte-for-byte

The remaining two are matched by hand to the version it just wrote:

- `objectstack.config.ts` manifest `version` — `pnpm verify` fails if this drifts
  from `package.json`
- marketplace publish note

## Release Checklist

1. Update source metadata and docs.
2. Run:

   ```bash
   pnpm verify
   ```

3. Cut the version. This one command writes `CHANGELOG.md` and bumps
   `package.json` — ⛔ do not hand-write either:

   ```bash
   pnpm changeset:version   # changeset version
   ```

   Then set the `objectstack.config.ts` manifest `version` to the version it just
   wrote — `changeset version` does not touch that file, and `pnpm verify` is
   what catches the drift.

4. Build the artifact:

   ```bash
   pnpm build
   ```

5. Publish or dry-run publish:

   ```bash
   pnpm publish:marketplace:dry-run
   pnpm publish:marketplace
   ```

## Marketplace Publish

The publish script is [`scripts/publish-marketplace.mjs`](../scripts/publish-marketplace.mjs). It is the preferred release path because it keeps marketplace package metadata in one place.

Authenticate once:

```bash
objectstack cloud login
```

Then publish:

```bash
pnpm publish:marketplace
```

## Source Availability

This repository contains TypeScript source. Marketplace consumers install the compiled ObjectStack package artifact, not a set of separate source packages.

If source-code protection becomes a product requirement, document that as a new distribution design. Do not revive older multi-package instructions without re-validating them against the current repository.

## Compatibility Policy

Use semantic versioning for the app:

| Change type | Version impact |
| --- | --- |
| Fixes, docs, seed data corrections | Patch |
| Backward-compatible objects, fields, views, flows, actions | Minor |
| Renamed or removed objects/fields, permission changes that break users, migration-required behavior | Major |

## Release Artifacts To Check

Before announcing a release, confirm:

- `pnpm validate` reports the expected app name, version, object count, and UI count.
- screenshots in `assets/screenshots/` still represent the product.
- product docs in `content/docs/` match the behavior being released.
- internal docs in `docs/` do not reference retired multi-package paths.

## Historical Notes

Older release notes described private npm publishing for standalone domain packages. That model is archived under `docs/archive/2026-02/` and is not the current release process.
