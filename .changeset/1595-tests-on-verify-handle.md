---
---

Tests only, releases nothing. For maintainers: the test harness now runs on the platform's verify handle (`@objectstack/verify`, pinned at 17.7.0). The five hand-built stand-ins under `test/helpers/` — the hook harness, the flow harness, the action sandbox, the metadata fixtures and the tenancy probe — are gone, with the suites that proved them. Every hook, flow and action suite now boots the shipped app and drives it through the platform's own doors: a person's write, the flow trigger and resume, the action dispatcher, the anonymous form door's context. What the 17.7.0 handle has no door for keeps one local path each in `test/helpers/verify-stack.ts`.
