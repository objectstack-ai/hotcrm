---
"hotcrm": patch
---

Docs: repoint the product documentation at the real package tree — the third and last family of ADR-0130 dead directories.

A directory under `src/` is a package, so the app-wide `src/objects/`, `src/views/`, `src/datasets/`, `src/skills/`, `src/reports/`, `src/pages/`, `src/dashboards/`, `src/actions/`, `src/sharing/`, `src/hooks/`, `src/mappings/` and `src/apps/` directories stopped existing. 426 citations across `content/docs/` in all three languages still named them. Every one now resolves against the real tree, or says what it means without writing a path at all.

Three tutorials were sending readers into a directory that does not exist, where nothing would have registered the file they were told to write:

- **Extending Objects** — the three code fences that head `// src/objects/warranty.object.ts`, `// src/objects/index.ts` and `// src/objects/warranty.hook.ts` now name the package that owns them, and the hook section names the real registration point (`src/<package>/objects/hooks.ts`, assembled into `allHooks` by `objectstack.composition.ts`) instead of the removed `src/hooks/index.ts`.
- **AI Skills** — registering a skill is two steps, not one: a re-export from the package's own `skills/index.ts`, then an entry in `allSkills` in `objectstack.composition.ts`. The old single fence put `allSkills` in the barrel, where it is not.
- **Fork HotCRM** — the `rm src/objects/{…}.object.ts` command died on paste. Cutting Service, Revenue and Marketing now removes them as the packages they are, and the file-suffix protocol table carries the package dimension.
