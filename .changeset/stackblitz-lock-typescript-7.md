---
---

Regenerate the StackBlitz `package-lock.json` for TypeScript 7. #439 bumped
`package.json` to `^7.0.2` and updated `pnpm-lock.yaml`, but not the npm lockfile
the StackBlitz demo boots from, so `main` fails the "StackBlitz npm lockfile is
in sync" CI step and every open PR inherits the red. Tooling only — releases
nothing.
