# Task: Scaffold New Package

**Goal**: Add a new business module to HotCRM.

A package here is **a directory under `src/`** (ADR-0130, `docs/architecture/module-split-plan.md`):
`src/sales/` is the `type: app` package the artifact takes its identity from, and
`src/service/`, `src/revenue/`, `src/marketing/` are modules that depend on it. There is no
`packages/` directory, no per-package `package.json` and no npm workspace — one
`package.json`, one `tsconfig.json`, one build, one artifact. ⛔ Do not scaffold the retired
multi-package layout; `docs/archive/` is where that shape is kept, and nothing current
points into it.

**Prompt**:
```markdown
I want to add a new module named: `[PACKAGE_NAME]`.
Description: [DESCRIPTION]
Objects it owns: [OBJECT_NAMES]

Please scaffold it using the Architect Guidelines:
1. Create `src/[PACKAGE_NAME]/` with only the metadata-type subdirectories it actually
   uses (`objects/`, `views/`, `flows/`, … ), each with its own explicit `index.ts`
   barrel — registration stays file-by-file, no glob discovery.
2. Put each `*.hook.ts` beside the `*.object.ts` it names, and re-export the package's
   hooks from `src/[PACKAGE_NAME]/objects/hooks.ts`.
3. Import only from the file's own directory or from `src/sales/` — never sideways
   between modules, never upward. A source more than one package needs goes in
   `src/sales/`, in one copy.
4. Register the new barrels in `objectstack.composition.ts`, which collects the packages
   into the arrays `objectstack.config.ts` hands to the single `defineStack()`.
5. Add the package directory to `PACKAGE_DIRS` in
   `scripts/check-source-token-ratchet.mjs` so the gate prints a reading for it, and to
   `PACKAGES` in `test/helpers/src-roster.ts` so the app-wide test sweeps see it.
```
