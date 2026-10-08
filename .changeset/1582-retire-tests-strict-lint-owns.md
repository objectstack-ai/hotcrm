---
---

Tests only, releases nothing. For maintainers: the local test assertions whose every case `objectstack lint --strict` (`pnpm lint`) now reports are retired, row by row — the inert decision `config.condition`, `list.tabs`, page and form field references, field-group integrity, skill tool names, report dataset/dimension/measure bindings, preset filter comparands, the option-key, navigation-orphan and section-name translation checks, FLS key qualification and field names, and RLS predicates (#1582, #1583, #1584, #1585, #1586, #1805). `pnpm verify` still runs `lint:i18n-gate`: on the two-package artifact, `objectstack lint`'s `i18n/missing-*` coverage reports nothing, so the gate was not retired.
