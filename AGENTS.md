# AGENTS.md — HotCRM

Single source of truth for AI coding agents working on **HotCRM**, the AI-Native
Enterprise CRM built on the **@objectstack/runtime** engine. Tool-specific files
(e.g. `.github/copilot-instructions.md`) point here.

You are an expert developer working on HotCRM, delivering business capabilities
as metadata on top of the ObjectStack platform.

## 🗣️ 沟通语言 / Communication Language

**始终使用中文与用户沟通。** 所有面向用户的回复、解释、总结、提问都用中文。
代码、标识符、提交信息（commit message）、PR 标题/正文、代码注释保持英文不变。

**Always communicate with the user in Chinese (中文).** All user-facing replies,
explanations, summaries, and questions must be in Chinese. Keep code, identifiers,
commit messages, PR titles/bodies, and code comments in English.

## 🏗️ Project Architecture

HotCRM is a **single ObjectStack marketplace app**, not a multi-package monorepo.
The source of truth is `objectstack.config.ts`, which registers all metadata from a
flat `src/` tree organised **by metadata type** (not by business package).

- **Engine**: We DO NOT build the core engine. We use `@objectstack/runtime` as the platform dependency.
- **Metadata** (`src/{type}/`): All business capability lives here as typed metadata files.
- **Product docs** (`content/docs/`): User/admin/marketplace documentation (Fumadocs).
- **Internal docs** (`docs/`): Architecture, status, release, and maintenance notes.

**Directory Structure** (see `docs/README.md` for the full map):
```
hotcrm/
├── objectstack.config.ts   # App manifest — registers metadata from src/
├── src/
│   ├── objects/            # *.object.ts schemas + *.hook.ts lifecycle hooks
│   ├── views/  pages/      # App UI metadata (*.view.ts / *.page.ts)
│   ├── flows/              # Automation (*.flow.ts)
│   ├── actions/            # UI actions + AI-callable tools (*.actions.ts)
│   ├── dashboards/ reports/ datasets/          # Analytics metadata
│   ├── skills/             # AI skill metadata (*.skill.ts) — skills-only surface
│   ├── profiles/ sharing/  # Permission sets, role hierarchy, sharing rules
│   ├── translations/       # Locale bundles (en / zh-CN / es-ES / ja-JP)
│   └── data/               # Seed data (defineDataset)
├── content/docs/           # Product documentation site content
└── docs/                   # Internal maintainer documentation
```

> The retired multi-package (`packages/*`) direction is archived under
> `docs/archive/`. Do NOT create `packages/<x>/src/` paths — everything lives in the
> flat `src/{type}/` tree above.

## 💻 Tech Stack & Protocol

1.  **Metadata-First (`*object.ts`)**:
    - All business objects are defined in **TypeScript** using the `ServiceObject` interface.
    - strictly typed using `@objectstack/spec`.
    - **NEVER** use YAML or JSON for metadata.
    - Object names must be `snake_case`.
    - **All HotCRM business object names MUST use the `crm_` prefix and the prefix MUST be written explicitly in source** (e.g., `crm_account`, `crm_opportunity`, `crm_knowledge_article`). **No automatic prefix injection by the runtime.** Open architectural decision: AI-authored metadata is fragile around "context-aware" naming, so we trade verbosity for grep-ability. Cross-references via `reference_to` / `lookup` / `masterDetail` MUST use the prefixed name. Cube `sql:` fields, view `data.object`, hook `object:`, action `objectName:`, navigation `objectName:`, dashboard `object:`, translation `objects.{key}`, REST URLs, and DB table names ALL use the same prefixed name. The name in source = the name at runtime = the name in DB = the name in URL = the name in docs. No translation layer.

2.  **ObjectQL (No-SQL)**:
    - Data access MUST use **ObjectQL**.
    - **NEVER** write raw SQL.
    - Format: `broker.find('opportunity', { filters: [['amount', '>', 50000]] })`.

3.  **AI-Native**:
    - Every feature should consider AI augmentation (Co-Pilot, Agents).
    - Use `*.action.ts` to define tools callable by AI agents.

## 🧠 Autonomous Iteration Protocol

When asked to implement a feature, you MUST follow this **Thinking Process**:

### Phase 1: Architecture & Planning
1.  **Analyze**: Identify the domain area (e.g., sales, service, marketing) and the metadata it touches.
2.  **Schema Design**: List all necessary Objects, Fields, and Relationships.
3.  **File Inventory**: List exact file paths to be created.
    *   `src/objects/candidate.object.ts` (Data)
    *   `src/flows/candidate.flow.ts` (Automation)
    *   `src/pages/candidate.page.ts` (UI)

### Phase 2: Implementation (Iterative)
1.  **Metadata First**: Create `*.object.ts` files first. They are the source of truth.
2.  **Logic Second**: Create `*.hook.ts` and `*.action.ts` utilizing the defined objects.
3.  **UI Last**: Create `*.page.ts` and Actions to expose functionality to users.

### Phase 3: Self-Correction
After generating code, ask yourself:
*   [ ] Did I respect the strictly typed `ServiceObject` interface?
*   [ ] Are all `reference_to` pointing to real objects?
*   [ ] Did I use ObjectQL instead of SQL?
*   [ ] are file names strictly `snake_case`?

## 📝 Coding Standards (The "File Suffix Protocol")

We enforce strict file naming to separate concerns. Files live under `src/{type}/`, grouped by metadata type (e.g. `src/objects/`, `src/flows/`, `src/views/`).

### Core File Types
- `*.object.ts`: Data Model (Schema) — validated with `ObjectSchema.parse()`
- `*.hook.ts`: Server-side Business Logic (Triggers)
- `*.action.ts`: API Endpoints & AI Tools
- `*.flow.ts`: Automation Flows — typed as `Automation.Flow` from `@objectstack/spec/automation`
- `*.page.ts`: UI Page Layouts — validated with `PageSchema` from `@objectstack/spec/ui`
- `*.view.ts`: List View Configurations — validated with `ViewSchema` from `@objectstack/spec/ui`

### Extended File Types (Phase 6+)
- `*.dashboard.ts`: Dashboard Definitions — validated with `DashboardSchema` from `@objectstack/spec/ui`
- `*.form.ts`: Form View Definitions — validated with `FormViewSchema` from `@objectstack/spec/ui`
- `*.statemachine.ts`: State Machine Definitions — validated with `StateMachineSchema` from `@objectstack/spec/automation`
- `*.permission.ts`: Permission Set Definitions — validated with `PermissionSetSchema` from `@objectstack/spec/security`
- `*.capabilities.ts`: Plugin Capability Manifests — validated with `PluginCapabilityManifestSchema` from `@objectstack/spec/kernel`
- `*.events.ts`: Domain Event Definitions — validated with `EventSchema` from `@objectstack/spec/kernel`

## 🔒 Schema Validation Requirements

All metadata files MUST be validated against their corresponding `@objectstack/spec` schemas:

1. **Objects**: Use `ObjectSchema.parse()` from `@objectstack/spec/data`
2. **Pages/Views/Dashboards/Forms**: Use schemas from `@objectstack/spec/ui`
3. **Workflows**: Use `WorkflowRuleSchema.parse()` from `@objectstack/spec/automation`
4. **State Machines**: Use `StateMachineSchema.parse()` from `@objectstack/spec/automation`
5. **Plugins**: Use `PluginSchema.parse()` from `@objectstack/spec/kernel` (remove `: any` annotations)
6. **Permissions**: Use `PermissionSetSchema.parse()` from `@objectstack/spec/security`
7. **AI Agents**: Use `AgentSchema.parse()` from `@objectstack/spec/ai`

## 🏷️ Field Type Guidance

Use the most specific `Field` type available from `@objectstack/spec/data`:

| Relationship | Field Type | When to Use |
|---|---|---|
| Parent reference | `Field.lookup()` | Optional association to another object |
| Child of parent | `Field.masterDetail()` | Required parent-child with cascade delete |
| Rollup value | `Field.summary()` | Aggregate child records (sum, count, min, max) |

| Data Type | Field Type | When to Use |
|---|---|---|
| Multiple choices | `Field.select({ multiple: true })` | Multi-select picklist |
| File upload | `Field.file()` | Document/attachment fields |
| Image upload | `Field.image()` | Photo/avatar fields |
| GPS coordinates | `Field.location()` | Geographic location data |
| Mailing address | `Field.address()` | Structured postal address |

## 🚀 Development Workflow

1.  **Define Object**: Create `src/objects/{entity}.object.ts`.
2.  **Add Logic**: Create `src/objects/{entity}.hook.ts`.
3.  **Expose Action**: Create `src/actions/{action}.action.ts` if external API/AI needed.
4.  **Config UI**: Create `src/views/{entity}.view.ts` and `src/pages/{entity}.page.ts`.

## ⚠️ Constraint Checklist

- **Object Naming**: All HotCRM business objects MUST be prefixed with `crm_` (e.g., `crm_account`, `crm_opportunity`, `crm_case`, `crm_lead`, `crm_campaign`, `crm_contact`, `crm_contract`, `crm_product`, `crm_quote`, `crm_quote_line_item`, `crm_opportunity_line_item`, `crm_task`, `crm_campaign_member`, `crm_knowledge_article`, `crm_forecast`). All references — `reference_to`, `lookup`, `masterDetail`, cube `sql`, view `data.object`, hook `object`, navigation `objectName`, action `objectName`, dashboard `object` — MUST use the prefixed form. Platform objects keep their existing `sys_*` prefix.
- **i18n**: Every new object must have entries in all 4 locale files (`src/translations/{en,zh-CN,es-ES,ja-JP}.ts`) — label, pluralLabel, all field labels + option labels, view labels, navigation labels. No new feature ships without all 4 locales.
- **Docs**: Every new object/feature requires user-facing documentation under `content/docs/` (e.g. `getting-started/`, `guides/`, `marketing/`, `analytics/`, `administration/`) written for business users + admins (not developers).
- **Documentation**: All documentation MUST be in English.
- **Validation predicates must be TOTAL**: every `record.x` read in an authored
  CEL predicate — `validations[].condition`, `requiredWhen`, `readonlyWhen`,
  `visibleWhen` — carries a `has(record.x)` guard. See below.
- **No Engine Code**: Do not try to modify the core runtime code. Focus on the *usage* of the runtime.
- **Dependencies**: HotCRM depends on the published `@objectstack/*` packages (runtime, spec, drivers, services) declared in `package.json`. Keep `specVersion` in `objectstack.manifest.json` aligned with the installed `@objectstack/spec`.
- **Tone**: Act as a Senior 10x Engineer. Be concise, professional, and technically accurate.

> **Naming note (ADR-0048):** the `crm_` prefix above is a deliberate HotCRM
> convention for **grep-ability**, and it is enforced for **objects**. It is
> *not* required for collision avoidance: as of ObjectStack 9.4 the cross-package
> collision throw was retired (ADR-0048 §3.4) — packages coexist via
> `packageId`-scoped resolution. So the `os lint` `naming/namespace-prefix`
> warning on non-object items (pages/flows/datasets/etc.) is advisory only; its
> "fail at install" wording is stale. Don't mass-rename UI/automation items to
> chase that warning.

### Validation predicates must be TOTAL (#630)

A validation rule is evaluated against `{...previous, ...data}`, and the engine
fills absent fields with `null` **only on insert**. On update, `previous` is
whatever the driver returned — and a driver that stores only the columns a row
was actually written with (`driver-memory`, `driver-mongodb`) hands back a
record with the key **absent**, not null. Strict CEL then aborts the whole
predicate with `No such key` — and what the engine does next changed under us:

```
≤ 17.0.0-rc.1  WARN Validation rule 'x' predicate failed to evaluate (…) — skipped
≥ 17.0.0-rc.2  WARN … — write rejected (#4649)
               ValidationError: Validation rule 'x' could not be evaluated … — write rejected.
```

Through rc.1 a rule that could not answer required nothing at all, silently.
From rc.2 it **fails closed**: the same abort rejects the save. Neither is the
rule the author wrote — one under-enforces, the other blocks an ordinary save on
a record shape nobody considered — and one guard prevents both. So **every
`record.x` read carries a `has(record.x)` guard**:

| intent | write this |
| --- | --- |
| `x` holds no value | `(!has(record.x) \|\| isBlank(record.x))` |
| `x` holds a value | `has(record.x) && record.x <op> …` |

`!= null` is **not** a substitute — measured on an absent key, `record.f != null`
aborts exactly like `record.f < 0` does. It guards a different hazard
(`dyn<null> < int`); numeric comparisons need both guards. `has()` is the only
total accessor: `coalesce(record.f, "")` aborts too, because its argument is
evaluated before the call.

`test/object-validation-predicates.test.ts` enforces this two ways — a grep for
the guard, and a run of every predicate through the engine's own
`evaluateValidationRules` against a record with no keys at all. That file also
carries the full measurement table, the driver-by-driver findings, and why this
route was chosen over making the in-memory test driver column-complete. Read it
before adding a rule.

## ⬆️ Platform Upgrades (ObjectStack version bumps)

When upgrading the `@objectstack/*` dependency line, **start from the official
release notes — do not reverse-engineer breaking changes from `node_modules`
changelogs**:

1. **Read the release notes first**: <https://docs.objectstack.ai/docs/releases>
   (per-major pages, e.g. `/docs/releases/v14`, carry the breaking-change list
   and a migration checklist with before/after examples).
2. Per-package details live in each package's `CHANGELOG.md`
   (`node_modules/@objectstack/<pkg>/CHANGELOG.md`) — use these to supplement,
   not replace, the release notes. Breaking changes reference ADRs for rationale.
3. Bump all `@objectstack/*` packages **together** (they are version-locked),
   update `specVersion` in `objectstack.manifest.json` to the new major,
   then run the full verify suite and browser-verify (see below).
4. Record the upgrade in `CHANGELOG.md` following the existing entry format
   (what changed on the platform, what metadata was migrated and why).

## 🚫 Out of Scope (Platform Features)

The following are **NOT** in HotCRM's scope — they are platform-level features provided by `@objectstack/runtime` or other platform packages:

- **Platform infrastructure**: visual workflow/process/approval builders, formula builder, report & page-layout designers.
- **Low-level services**: database engine, auth (OAuth/SAML/SSO), multi-tenancy, encryption, API gateway, caching, message queue, file storage.
- **Dev tools**: schema migration, CLI scaffolding, metadata deployment pipeline, VCS integration, IDE extensions.

**Focus Area**: HotCRM focuses exclusively on **business domains** (CRM, Finance, HR, Marketing, Products, Support) and their **business logic, data models, and AI capabilities** — authored as metadata in `src/`.

---

## ✅ Verifying changes

### Verify before opening a PR

Run the full suite and make sure it's green:

```
pnpm validate && pnpm typecheck && pnpm build && pnpm test
```

`pnpm validate` enforces ADR-0021 dashboard-widget binding integrity: a chart's
`chartConfig.xAxis.field` must resolve to a dataset **dimension** and
`yAxis[].field` to a **measure**, regardless of chart orientation (the renderer
handles the visual flip). A swapped axis is a hard validation error.

### Every PR carries a changeset

A PR is not finished until it adds a `.changeset/*.md` entry. Run `pnpm changeset`
(or hand-write the file) and commit it with the rest of the change — the
`Changeset Check` workflow diffs against the PR base and fails when the PR adds
none. Counting the files already in `.changeset/` proves nothing: the directory
always holds a `README.md` plus whatever is awaiting the next release, so only
what *this* PR adds counts.

Write the summary for the release-notes reader — what changed and why it matters,
not which files moved. A breaking change must state the FROM → TO migration in
the body; that text ships to consumers as `CHANGELOG.md`.

The lone exception is the **`skip-changeset`** label, for PRs that ship nothing to
users (CI-only chores, repo housekeeping). Do not reach for it to get a red check
green — write the changeset instead.

### Verifying UI in the browser

The Console renders dashboards, charts, and views from metadata. When verifying a
change by driving the browser, follow these rules.

#### Rule: wait for lazy-loaded UI before judging — never conclude from an early screenshot

Dashboard charts (`AdvancedChartImpl` / Recharts) and other heavy widgets are
**`React.lazy`-loaded** — the chart bundle hydrates a beat *after* the page
navigates. A screenshot taken immediately after navigation shows **empty chart
cards even when nothing is wrong**.

Do **not** report a widget as broken from a single early screenshot. Before
concluding anything about rendering:

1. After navigating, wait ~1–2s (or poll) for the lazy bundle to hydrate.
2. Confirm the chart actually drew via a DOM probe, not just a picture — e.g.
   count Recharts nodes:
   `document.querySelectorAll('.recharts-pie-sector, .recharts-rectangle, .recharts-funnel-trapezoid, .recharts-area-area, .recharts-line-curve').length`
   A non-zero count means it rendered; re-screenshot only once it's > 0.
3. Cross-check the data path: `POST /api/v1/analytics/dataset/query` returning
   `200` with rows means the data is fine — an empty visual is then either
   hydration timing (wait) or a genuine renderer issue (investigate), but it is
   **not** a data or metadata bug.

All chart types (`funnel`, `donut`, `pie`, `bar`, `horizontal-bar`, `area`,
`line`, `table`) render correctly once settled. `gauge` renders as a single
numeric value (no dial yet — by ADR-0021 design), which is expected, not a bug.

> Origin: during the ObjectStack 9.4 upgrade an agent screenshotted a dashboard
> too early, saw blank funnel/donut cards, and wrongly reported the renderers as
> broken. They were fine — it was the lazy-load race. Verify hydration first.

#### Other browser-verify gotchas (same workflow)

- **`better-sqlite3` native ABI mismatch.** If boot floods
  `NODE_MODULE_VERSION ... requires ...` errors, the SQLite native binary was
  built for a different Node ABI. Fix: `pnpm rebuild better-sqlite3`, then
  restart the dev server. Not related to any app/code change.
- **Console dashboard route** is
  `/_console/apps/<manifest.id>/dashboard/<dashboardName>`
  (e.g. `app.objectstack.hotcrm`), **not** `/_console/a/<appName>` — the latter
  bounces to `/_console/home`.
- Dev admin (seeded on an empty DB, dev only): `admin@objectos.ai` / `admin123`.
