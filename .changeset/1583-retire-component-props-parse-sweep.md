---
---

Tests only, nothing ships: the local sweep that parsed every page component's `properties` against its `ComponentPropsMap` entry is retired, because `objectstack lint --strict` now refuses every case it covered as a `component-props-invalid` or `component-props-unknown-key` error, nested components and a `null` or array props bag included (measured on ObjectStack 18.1.0). The guard that every page component type has a props contract stays, since lint cannot judge a type it has no contract for (#1583).
