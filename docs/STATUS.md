# HotCRM Status

> **This page states the CURRENT state of `main` — it is not a dated snapshot.**
> Every number below is transcribed from a command you can re-run, and the ones
> that can be derived from the source tree are pinned by `test/docs-drift.test.ts`
> against the registered stack and `package.json`. A count that drifts fails CI
> here instead of quietly ageing on the page.
> Source of truth: `pnpm validate`, `pnpm typecheck`, and `pnpm test`.

## Summary

HotCRM is a single ObjectStack marketplace app at version `2.2.2`. The app manifest is defined in [`objectstack.config.ts`](../objectstack.config.ts) with id `app.objectstack.hotcrm` and namespace `crm`.

## ObjectStack Validation

The summary `pnpm validate` prints — every figure read straight off the stack the
loader registers:

```text
HotCRM v2.2.2
Data: 17 Objects  344 Fields
UI: 1 Apps  14 Views  8 Pages  5 Dashboards  10 Reports  26 Actions
Logic: 24 Flows
Security: 12 Positions  6 Permissions
```

Validation command:

```bash
pnpm validate
```

> **`26 Actions` is the REGISTRATION count, not a count of distinct action
> definitions.** One action bound to five objects registers five times, so this
> figure and the `13 actions` the README states are answering different
> questions (the source tree holds 6 `*.actions.ts` files, a third figure again).
> Which calibre a reader should be told is an open product question —
> [#1012](https://github.com/objectstack-ai/hotcrm/issues/1012) — and this block
> does not settle it: it transcribes what the command prints, which is the
> registered stack, exactly like every other number in it.

## Local Checks

| Check | Command | Current result |
| --- | --- | --- |
| ObjectStack metadata validation | `pnpm validate` | Passes |
| TypeScript | `pnpm typecheck` | Passes |
| Unit tests | `pnpm test` | Passes |

The test row states a **verdict, not a size**. A "N files, M tests" figure moves
on nearly every PR, and nothing can check it from inside the suite it describes —
which is why the number that used to sit here (`9 files, 97 tests`) was wrong by
an order of magnitude against a suite of 79 files. Run `pnpm test` when you want
the current figure.

Run the full project verification pipeline with:

```bash
pnpm verify
```

## Current Runtime Requirements

| Requirement | Value |
| --- | --- |
| Node.js | `>=22` |
| pnpm | `>=10.0.0` |
| ObjectStack packages | `17.0.0-rc.5` |
| Local dev port | `4001` |

Each row above is asserted against `package.json` (`engines`, the `@objectstack/*`
dependency line, and the `dev` script's port) by `test/docs-drift.test.ts` — this
table is read as present-tense fact, so it is held to one.

## Current Metadata Inventory

| Area | Source |
| --- | --- |
| Objects | `src/objects/*.object.ts` |
| Object hooks | `src/objects/*.hook.ts`, collected by `src/hooks/index.ts` |
| Actions | `src/actions/*.actions.ts` |
| Flows | `src/flows/*.flow.ts` |
| Skills | `src/skills/*.skill.ts` (skills-only AI surface since #512 — the agent directory is gone) |
| Views and pages | `src/views/`, `src/pages/` |
| Dashboards and reports | `src/dashboards/`, `src/reports/` |
| Security | `src/profiles/`, `src/sharing/` |
| i18n | `src/translations/` |

## Notes

Historical documents in `docs/archive/` may contain older counts, older protocol versions, or retired multi-package paths. Treat this file and the current source tree as authoritative.
