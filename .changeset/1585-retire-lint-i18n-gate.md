---
---

Tooling only, nothing ships: the local `lint:i18n-gate` step is retired from `pnpm verify` and from both CI workflows, together with `scripts/check-lint-i18n-gate.mjs` and its test. `pnpm lint` is `objectstack lint --strict`, and since `@objectstack/cli` 18.0.0 (objectstack#22238) it reads both packages of this artifact and fails on every `i18n/missing-*` finding the gate counted, so the gate was a second copy of a platform verdict. Measured on `main` `a9e7fac9`: deleting one `zh-CN` entry of each reachable class (object, field, option, section, view, action, navigation, dashboard, widget, dataset, page, flow, picklist) makes `pnpm lint` exit 1 (#1585).
