# HotCRM Status

> Snapshot date: June 22, 2026
> Source of truth: `pnpm validate`, `pnpm typecheck`, and `pnpm test`

## Summary

HotCRM is a single ObjectStack marketplace app at version `1.3.0`. The app manifest is defined in [`objectstack.config.ts`](../objectstack.config.ts) with id `app.objectstack.hotcrm` and namespace `crm`.

## ObjectStack Validation

Latest local validation:

```text
HotCRM v1.0.5
Data: 15 Objects  296 Fields
UI: 1 Apps  12 Views  13 Pages  4 Dashboards  10 Reports  10 Actions
Logic: 16 Flows  2 Agents
Security: 10 Roles  6 Permissions
```

Validation command:

```bash
pnpm validate
```

## Local Checks

| Check | Command | Current result |
| --- | --- | --- |
| ObjectStack metadata validation | `pnpm validate` | Passes |
| TypeScript | `pnpm typecheck` | Passes |
| Unit tests | `pnpm test` | 1 file, 6 tests passing |

Run the full project verification pipeline with:

```bash
pnpm verify
```

## Current Runtime Requirements

| Requirement | Value |
| --- | --- |
| Node.js | `>=20` |
| pnpm | `>=10.0.0` |
| ObjectStack packages | `^7.7.0` |
| Local dev port | `4001` |

## Current Metadata Inventory

| Area | Source |
| --- | --- |
| Objects | `src/objects/*.object.ts` |
| Object hooks | `src/objects/*.hook.ts`, collected by `src/hooks/index.ts` |
| Actions | `src/actions/*.actions.ts` |
| Flows | `src/flows/*.flow.ts` |
| Agents | `src/agents/*.agent.ts` |
| Skills | `src/skills/*.skill.ts` |
| Views and pages | `src/views/`, `src/pages/` |
| Dashboards and reports | `src/dashboards/`, `src/reports/` |
| Security | `src/profiles/`, `src/sharing/` |
| i18n | `src/translations/` |

## Notes

Historical documents in `docs/archive/` may contain older counts, older protocol versions, or retired multi-package paths. Treat this file and the current source tree as authoritative.
