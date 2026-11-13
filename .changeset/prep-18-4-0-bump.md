---
---

Clause-②: no
Metadata-protocol: none

Ships nothing to users: test fixtures and the publish script's listing body, prepared for the `@objectstack/*` 18.4.0 bump (measured on a candidate build of objectstack `main`). The marketplace listing keeps sending `publisher: objectstack` and `is_starter: false`; they now come from the publish script rather than `objectstack.manifest.json`, which 18.4.0's manifest schema refuses them on (#2420).
