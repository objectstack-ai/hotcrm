# HotCRM Architecture

> Current architecture for the single-app HotCRM repository.

## Overview

HotCRM is an ObjectStack marketplace app. It is not currently organized as multiple scoped npm packages; the app is assembled from the local `src/` tree and registered through [`objectstack.config.ts`](../objectstack.config.ts).

```mermaid
flowchart TD
  Config["objectstack.config.ts"] --> Stack["defineStack()"]
  Stack --> Objects["src/objects"]
  Stack --> Actions["src/actions"]
  Stack --> Flows["src/flows"]
  Stack --> Skills["src/skills"]
  Stack --> UI["src/apps, src/views, src/pages"]
  Stack --> Analytics["src/datasets, src/dashboards, src/reports"]
  Stack --> Security["src/profiles, src/sharing"]
  Stack --> Data["src/data"]
  Stack --> Runtime["@objectstack/runtime"]
```

The compiled marketplace artifact is produced by `pnpm build`. The generated artifact is the package that gets published, not the TypeScript source layout itself.

## Stack Manifest

The stack manifest defines:

| Field | Current value |
| --- | --- |
| id | `app.objectstack.hotcrm` |
| namespace | `crm` |
| version | `3.0.0` |
| type | `app` |
| name | `HotCRM` |
| engines.protocol | `^17.0.0-rc.1` |

Runtime capabilities are declared in `requires`: `automation`, `triggers`, `analytics`, `auth`, `ui`, `approvals`, and `sharing`.

`ai` is deliberately **not** in that list. ObjectStack 11.3.0 (ADR-0025 S2) moved the
AI runtime out of the open edition, and under ObjectStack 16 `requires: ['ai']` is
fail-fast — declaring it would hard-abort `objectstack start`/`dev` for this
open-edition app. The AI metadata is unaffected: the skills still validate, build into
the artifact, and run wherever a runtime provides the `ai` tier. See the comment in
[`objectstack.config.ts`](../objectstack.config.ts) for the full rationale.

## Metadata Areas

| Area | Files | Registered as |
| --- | --- | --- |
| Data model | `src/objects/*.object.ts` | `objects` |
| Lifecycle hooks | `src/objects/*.hook.ts` via `src/hooks/index.ts` | `hooks` |
| UI actions | `src/actions/*.actions.ts` | `actions` |
| Automation | `src/flows/*.flow.ts` | `flows` |
| AI skills | `src/skills/*.skill.ts` | `skills` |
| Apps, views, pages | `src/apps/`, `src/views/`, `src/pages/` | `apps`, `views`, `pages` |
| Analytics | `src/datasets/`, `src/dashboards/`, `src/reports/` | `datasets`, `dashboards`, `reports` |
| Security | `src/profiles/`, `src/sharing/` | `permissions`, `sharingRules`, `positions` |
| i18n | `src/translations/` | `translations`, `i18n` |
| Demo data | `src/data/` | `data` |

## Data Model

Objects are declared with `ObjectSchema.create()` and use the explicit `crm_` namespace prefix.

```typescript
import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Account = ObjectSchema.create({
  name: 'crm_account',
  label: 'Account',
  fields: {
    name: Field.text({ label: 'Account Name', required: true }),
    owner: Field.lookup('user', { label: 'Account Owner' }),
  },
});
```

The object roster is deliberately **not** restated here — `src/objects/*.object.ts` is
its source of truth, one file per object, each registering its `crm_`-prefixed `name`.
The model spans four business domains: Sales, Service, Marketing, and Revenue.
*Supersedes the hand-maintained fifteen-name domain table that stood here, which had
already drifted three objects behind the tree — 2026-08-31 ruling, item 5.*

## Hooks

Object lifecycle hooks live beside object definitions in `src/objects/*.hook.ts`. They are collected in `src/hooks/index.ts` and passed to `defineStack({ hooks: allHooks })`.

Use hooks for record-level invariants and cross-object maintenance that must run with data changes, such as:

- lead defaults and conversion bookkeeping
- opportunity probability and approval fields
- quote and line-item total calculations
- case SLA and escalation fields
- account and contact relationship maintenance

## Actions

Actions live in `src/actions/*.actions.ts`. They define record-header, list-item, list-toolbar, modal, and flow-triggering behaviors. Some action bodies are executable metadata and can use constrained capabilities such as `api.write`.

Example shape:

```typescript
export const ConvertLeadAction = {
  name: 'convert_lead',
  label: 'Convert Lead',
  objectName: 'crm_lead',
  type: 'flow',
  target: 'lead_conversion',
  locations: ['record_header', 'list_item'],
};
```

## Flows

Flows live in `src/flows/*.flow.ts` and are registered through `allFlows`. HotCRM uses record-change, scheduled, and screen-style automation for lead conversion, routing, alerts, SLA monitoring, contract renewal, quote expiration, campaign enrollment, and approval paths.

Record-change flows rely on the `triggers` capability declared in the stack manifest.

## UI

HotCRM ships metadata for:

- one primary app surface
- list, kanban, and object-specific views
- record detail pages and utility pages
- dashboards and reports

The UI is metadata-driven. Object field definitions, views, pages, actions, permissions, translations, and sharing rules all influence the rendered experience.

## AI

AI is modeled as ObjectStack metadata. The surface is **skills-only**: the two
`*.agent.ts` copilots were retired in [#512](https://github.com/objectstack-ai/hotcrm/pull/512),
because ADR-0063 §2 closed agent records to third parties and the runtime
refuses non-platform ones. The capability lives in the skills, which attach to
the platform assistant by surface affinity.

| Layer | Files | Examples |
| --- | --- | --- |
| Skills | `src/skills/*.skill.ts` | `live_data`, `lead_qualification`, `email_drafting`, `revenue_forecasting`, `case_triage`, `customer_360` |
| Actions and flows | `src/actions/`, `src/flows/` | lead conversion, case triage, alerts |

Skills declare no bespoke tools (ADR-0109). They compose the platform's data
tools with the `action_<name>` tools the runtime materialises from Actions that
opt in via `ai.exposed` (ADR-0011) — every name a skill declares must resolve to
one of those, which `test/skills-integrity.test.ts` enforces.

The `live_data` skill explicitly requires live schema inspection before
answering record questions, because admins can change metadata over time.

## Security

Security is assembled from:

- 6 permission profiles in `src/profiles/`
- 9 sharing rules in `src/sharing/*.sharing.ts`
- 12 positions in `src/sharing/positions.ts`

The stack registers sharing rules for accounts, opportunities, cases, campaigns, and
territory-style visibility, and passes `CrmPositions` to `defineStack({ positions })`.
Per ADR-0090 D3 positions are flat capability-distribution groups — the v1 role
hierarchy's parent links are gone, because hierarchy belongs to the business-unit tree,
which this app does not model.

## Verification

Use these commands after architecture-affecting changes:

```bash
pnpm validate
pnpm typecheck
pnpm test
```

See [STATUS.md](STATUS.md) for the current validation snapshot.
