---
"hotcrm": patch
---

Docs: **Extending Objects** now teaches the whole flow registration path, and a guard keeps it that way.

**Add automation** told readers to put a new flow in the `flows/` directory of the package that owns its trigger object and export it from that directory's `index.ts`. That is necessary and not sufficient. `allFlows` in `objectstack.composition.ts` is an explicit ordered list — the registration order interleaves the four packages, so no per-package barrel can carry it — and a flow that reaches the barrel but never that array is handed to `defineStack()` by nobody. It binds no trigger, it never runs, and `pnpm validate` still exits 0 and names it nowhere. An author following the page shipped automation that did nothing, with no signal anywhere.

The page now spells out both steps in all three languages, in the same shape the **AI Skills** page already used for `allSkills`. `test/flow-registration-completeness.test.ts` fails when a flow a package barrel exports is missing from `allFlows`, and in the opposite direction when `allFlows` carries a flow no barrel exports — which would run in the app while staying invisible to every suite that reads the barrels.
