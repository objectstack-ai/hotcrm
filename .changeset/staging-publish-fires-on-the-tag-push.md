---
---

CI only: `publish-staging.yml` now triggers on the `v*.*.*` tag push instead of on
`release: [published]`, which could never fire because `release.yml` creates the release
as `GITHUB_TOKEN` (#1908). A guard, `test/workflow-triggers.test.ts`, keeps the dead form
from coming back. No metadata, no source and no dependency changed — nothing ships to
users, and the app artifact this release publishes is byte-identical either way.
