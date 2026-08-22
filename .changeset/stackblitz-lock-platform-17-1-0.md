---
---

Regenerate the StackBlitz `package-lock.json` for the 17.1.0 platform. #1205
bumped the twelve `@objectstack/*` entries in `package.json` and updated
`pnpm-lock.yaml`, but not the npm lockfile the StackBlitz demo boots from, so
`main` fails the "Check the StackBlitz npm lockfile is in sync" CI step and
every PR cut from it inherits the red.

The regenerated lockfile also carries the 17.1.0 dependency tree's own
requirements: 39 transitive entries were pinned at versions the 17.1.0 ranges no
longer accept (`better-auth` 1.7.0-rc.2 against a `1.7.1` peer,
`pg-connection-string` 2.6.2 against `^2.14.0`, `ejs` 3 against `^6`), so the
stale lockfile was not merely twelve lines behind — it described a tree npm
could not have installed for this manifest. Tooling only — releases nothing.
