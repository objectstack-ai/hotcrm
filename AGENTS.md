# AGENTS.md — HotCRM

Single source of truth for AI coding agents working on **HotCRM**, the AI-Native
Enterprise CRM built on the **@objectstack/runtime** engine. Tool-specific files
(e.g. `.github/copilot-instructions.md`) point here.

You are an expert developer working on HotCRM, delivering business capabilities
as metadata on top of the ObjectStack platform. HotCRM is a **pure metadata
application**: business features are built here, platform capability is built on the
platform. Read **🚫 Scope — a pure metadata application** before your first edit; it
governs every other chapter in this file.

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
│   ├── profiles/ sharing/  # Permission sets, positions, sharing rules
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
    - Data access MUST use **ObjectQL**, reached through the `ctx.api` surface. There is
      **no `broker`** in this repo — the identifier has zero occurrences in `src/`.
    - **NEVER** write raw SQL.
    - Format: `ctx.api.object('crm_opportunity').find({ where: { amount: { $gt: 50000 } } })`.
      Object names carry the `crm_` prefix, same as rule 1. In a `*.hook.ts` the surface is
      cast once — `const api = ctx.api as HookApi | undefined`, from `src/objects/_hook-api.ts`
      — and then called as `api.object(...)`; action script bodies call `ctx.api.object(...)`
      directly.
    - On `ctx.api`, the predicate key is **`where`**, and only `where`. `filter` (canonical)
      and `filters` (deprecated alias) are *HTTP query-param* spellings carrying a JSON
      **string**, not keys of the in-process query object — passing either in process fails
      **silently**: `findOne` spreads the query into the AST without aliasing and returns the
      object's **first row**, `count` reads `query.where` only and counts the **whole object**.
      Neither throws. This repo has already paid for that once — see
      `.changeset/hook-query-where-not-filter.md`. `HookQuery` in `src/objects/_hook-api.ts`
      deliberately omits the alias so the mistake is a compile error.
      Other surfaces are **not** governed by this rule and have their own spelling — but a
      different surface never licenses a shape that surface's own schema rejects. A
      `*.flow.ts` node `config` takes `filter:`, and `where:` appears in no flow file at
      all — grep `src/flows/` for the current spread rather than trusting a number in
      prose (*the hand-copied occurrence counts that stood here had already drifted;
      superseded by the 2026-08-31 ruling, item 5*). Do not "fix" that into a hook's
      `where:`, nor a hook's `where:` into `filter:`. A **page component** also spells
      the key `filter:`, and its shape is whatever that component's entry in `ComponentPropsMap`
      (`@objectstack/spec/ui`) declares — for `record:related_list`, an array of rule
      **objects**: `filter: [{ field, operator, value }]`, `operator` from a closed
      vocabulary (`equals`, `not_equals`, `in`, …), no other key accepted. The AST array
      (`[['status', '!=', 'completed']]`) and the `op:` key are not second spellings:
      `objectstack build` rejects both and the list renders unfiltered. No in-repo example
      is cited here on purpose — every `record:related_list` filter currently under
      `src/pages/` is one of those rejected forms (#1248), so read the shape off the
      schema instead.

3.  **AI-Native**:
    - Every feature should consider AI augmentation (Co-Pilot, Agents).
    - Use `*.actions.ts` to define tools callable by AI agents.

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
2.  **Logic Second**: Create `*.hook.ts` and `*.actions.ts` utilizing the defined objects.
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
- `*.actions.ts`: API Endpoints & AI Tools — the one PLURAL suffix in this protocol; one file bundles an entity's actions (e.g. `src/actions/lead.actions.ts`)
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
3. **Flows**: Use `FlowSchema.parse()` from `@objectstack/spec/automation` (`defineFlow()` is that call)
4. **State Machines**: Use `StateMachineSchema.parse()` from `@objectstack/spec/automation`
5. **Plugins**: Use `PluginSchema.parse()` from `@objectstack/spec/kernel` (remove `: any` annotations)
6. **Permissions**: Use `PermissionSetSchema.parse()` from `@objectstack/spec/security`
7. **AI Agents**: Use `AgentSchema.parse()` from `@objectstack/spec/ai`

> **There is no `workflow` metadata type** (ADR-0019/0020): `WorkflowRuleSchema` is not
> exported by any installed `@objectstack/*` package, and `ObjectSchema` rejects
> `workflows:` / `workflow:` by name. Field updates belong in `*.hook.ts`; status flips and
> notifications in a `record_change` / `schedule` flow (item 3); approvals in an `approval`
> node inside a flow. A record **lifecycle** constraint is not item 4 either — it is a
> `validations[]` entry with `type: 'state_machine'` on the object, validated by
> `ObjectSchema.parse()` (item 1); item 4's `StateMachineSchema` is a different shape
> (`initial` / `states` / `on`) and does not validate that entry. Whether a given
> constraint wants an invariant or a transition gate at all is decided by **Metadata
> semantics rule 7** below.

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

## 🧩 Metadata semantics — say what you mean (2026-08-31 ruling)

Five rules on which construct carries which intent, plus the escape-hatch clause that
closes the chapter — distilled from the 2026-08-31 rulings (verbatim source:
**objectstack#13848**). Prose in a `description` is not one of those constructs.

**7. Invariant, or transition gate — pick the tool by the intent.**
An **invariant** ("X may never exceed Y") is a `validations[]` script: existing
violations are frozen rather than bricked. A **transition gate** ("by the time the record
reaches state S, X must be filled") is `requiredWhen`, or a bound on the field: records
that predate the rule are let through. ⛔ Do not let prose describe a transition gate as
an invariant. Which construct a lifecycle constraint takes is the same question the
Schema Validation note answers for state machines.

> Precedent: #1069 (its platform-teaching half is objectstack#13879).

**8. Interception stands on a person's judgement.**
A machine signal (`suspected`) warns and lets the write through. Only a value a person
wrote down (`confirmed`) may block one. ⛔ Do not build an override escape hatch.

> Precedent: #1288.

**9. Elevate as little as possible.**
A screen flow stays `runAs: 'user'`. A write that genuinely needs elevation is split into
a dedicated `system` sub-flow and called through a `subflow` node. ⛔ Do not elevate a
whole flow to make `readonly` take effect. `close_case` is a historical precedent, not a
policy.

> Precedent: #1434.

**10. The organization dimension.**
Any `runAs: 'system'` scan or rollup MUST pin an organization predicate — the #1363 guard
is the acceptance criterion. The tenant column (`organization_id`) is a uniform platform
capability, injected by default: ⛔ do not declare it object by object, and ⛔ do not "add
a tenant dimension" object by object.

> Precedents: #1372 · #1177 (the mechanism reading).

**11. A deliberate deviation must be written down.**
A choice that departs from a repo-wide convention — a demo position left empty, a board
that keeps `resolved`, a standing grant for the review window, two priority vocabularies
— carries a comment beside the code **and** an entry in the roster of the guard that
would otherwise flag it. Without both, the next agent tidies it away.

> Precedents: #1102 (the fence was strengthened) · #1328 (the boundary roster) · #1342
> (the vocabulary comment).

**Escape hatches are for extreme cases — layout is derived by default.**
Maintainer ruling, 2026-08-31 (verbatim, kept untranslated):

> 「或者说 skills 应该说明，逃生仓是极端场景按照客户需求自定义的场景下才需要，应该尽量避免。」

A layout escape hatch — authoring `record:details` sections on a custom record page, or
enumerating fields in a view's `form.sections` — is reached for **only** in the extreme
case, a named customer-demanded customization. ⛔ Avoid it everywhere else. The ladder,
in order:

1. **`fieldGroups` on the object, each field opting in with `group: '<key>'`** — the
   norm, and it authors no sections at all: the layout is *derived*.
2. **The group-reference form** (`{ group: '<key>' }`, objectstack#13897) when partial
   arrangement is genuinely needed. No in-repo example is cited on purpose — nothing here
   uses it yet, so read the shape off the spec rather than off a neighbour.
3. **Per-field enumeration** only in the extreme case, and then with a comment beside the
   code naming the customer need and why a group reference cannot express it (composing a
   capture across groups; a wizard or pane structure). That comment is rule 11 applying
   itself, not an extra ask.

> Mechanism: objectstack#13855 · objectstack#13897.

## 🚀 Development Workflow

1.  **Define Object**: Create `src/objects/{entity}.object.ts`.
2.  **Add Logic**: Create `src/objects/{entity}.hook.ts`.
3.  **Expose Action**: Create `src/actions/{entity}.actions.ts` if external API/AI needed.
4.  **Config UI**: Create `src/views/{entity}.view.ts` and `src/pages/{entity}.page.ts`.

## ⚠️ Constraint Checklist

- **Object Naming**: All HotCRM business objects MUST be prefixed with `crm_` (e.g. `crm_account`, `crm_opportunity`). The roster is deliberately **not** restated here — `src/objects/*.object.ts` is its source of truth. *Supersedes the hand-maintained fifteen-name list that stood in this bullet, which had already drifted three objects behind the tree — 2026-08-31 ruling, item 5.* All references — `reference_to`, `lookup`, `masterDetail`, cube `sql`, view `data.object`, hook `object`, navigation `objectName`, action `objectName`, dashboard `object` — MUST use the prefixed form. Platform objects keep their existing `sys_*` prefix.
- **i18n**: Every new object must have entries in all 4 locale files (`src/translations/{en,zh-CN,es-ES,ja-JP}.ts`) — label, pluralLabel, all field labels + option labels, view labels, navigation labels. No new feature ships without all 4 locales.
- **Docs**: Every new object/feature requires user-facing documentation under `content/docs/` (e.g. `getting-started/`, `guides/`, `marketing/`, `analytics/`, `administration/`) written for business users + admins (not developers) — business concepts, never a hand-copied machine roster (see **Documentation discipline** below).
- **Documentation**: written in English, then translated — `content/docs` ships `.zh-Hans.mdx` and `.zh-Hant.mdx` pages beside the English ones, and that Chinese surface follows the three rules under **Documentation discipline** below. *Supersedes "All documentation MUST be in English", a blanket the shipped tree already contradicted — 2026-08-31 ruling, item 6.*
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

### Documentation discipline (2026-08-31 ruling)

**5. Docs explain business concepts. ⛔ They never hand-copy a machine list.**
The single source of truth for a machine fact — a dataset's dimensions, an object's
fields, the roster of objects itself — is the self-describing metadata under `src/`.
A table transcribed into prose drifts, and this repo has measured it drifting four
times. The boundary is one question: **can a reader see this directly in the product
UI?** A navigation fact (which views a user is offered) may be documented and guarded;
a machine semantic layer may not.

> Drift measured: #610, #965, #977, #1228. Boundary precedents: #1422 (documentable)
> against #1329 / #1326 (not).

**6. The Chinese doc surface has three rules.**

- UI nouns take the **zh-CN language-pack** wording. ⛔ Never coin a fresh translation
  for something the app already labels (#1329).
- A Chinese heading carries an **explicit English anchor id**, and one anchor word is
  used across every language, so a link survives translation (#1359).
- zh-Hant conventions are stated by their **real** reason, not a style preference: the
  console falls back to Simplified, so a Traditional page labels platform navigation in
  English rather than ship mixed Simplified/Traditional script (#1368).

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

> A platform fix that has **merged** is not yet a fix you can use. Before resuming a card
> that was blocked on one, confirm the pinned `@objectstack/*` version actually carries it
> — that is the second half of Scope rule 2.

## 🚫 Scope — a pure metadata application (2026-08-31 ruling)

Maintainer ruling, 2026-08-31 (verbatim, kept untranslated):

> 「基于以上决裁，对于hotcrm 元数据项目，需要补充哪些 agents.md ，比如纯元数据应用应该简化，只开发业务功能，平台能力全部在平台开发。」

The four rules below are distilled from that day's rulings. The verbatim quotes and the
precedent ledger they were drawn from are single-sourced in **objectstack#13848** —
read that card before arguing with one of these. Every rule carries its precedent cards
on purpose: they are tombstones, and they are what stops the same card being filed again
next quarter.

### 1. What HotCRM is

HotCRM is the **simplified implementation of business capability**: metadata authored
under the platform spec, guided by the platform's published skills, checked for legality
by the `os` commands (`pnpm validate`, `pnpm lint` here). ⛔ Do not re-invent what the
platform already owns.

**Build business features here; build platform capability on the platform.** A gap you
find in the platform is filed as a platform card upstream — ⛔ it is never compensated
for in this repo.

> Precedents: #806 → objectstack#13855 · #1203 → objectstack#13889 · #1212 →
> objectui#7063 · #1247 → objectui#7064 · #1301 → objectstack#13894 · #1185 →
> objectstack#13881 · #1069 → objectstack#13879 · #1231 (credential mechanism voided).

### 2. A platform defect means you WAIT for the platform fix

⛔ Do not route around it — no defensive coding, no shape tolerance, no hand-written
predicate re-implementing a rule that lives inside the platform. ⛔ Do not split a ruling
into "the half we can land now" and land that half.

File the blocked card and make the dependency machine-visible with a `Blocked-by:` line
pointing at the platform card. When the fix lands, resume the **original** ruling — and
before resuming, confirm the pinned version actually contains it (**merged is not the
same as available in the pin**; see Platform Upgrades) and re-run the defect card's own
fixture. Red means stop.

> Precedent: #549 / objectstack#11082 / objectstack PR #11183 — waiting was proved right.

### 3. ⛔ Do not build platform-level tooling here

Lint, validation, gates and diagnostics belong to the platform, uniformly. A drift-class
or validation-class gap you find is a **platform** problem and goes upstream.

Tests in this repo pin **this repo's own business facts** and nothing else — a seed-row
pin, a "doc wording equals the language-pack label" guard. ⛔ Do not grow a gate farm.

> Precedents: #806 (its lint half was retired) · #1423 (the comment-volume gate was
> deliberately not built).

### 4. A bad platform default is fixed at the default

Writing an `emptyState` string on every tile, or hand-tuning which tile a row lands on to
dodge a collapsing render, is paying the same tax over and over again. Change the default
upstream instead.

> Precedents: #1212 → objectui#7063 · #1247 → objectui#7064.

### Out of scope: platform features

The following are **NOT** in HotCRM's scope — they are platform-level features provided by `@objectstack/runtime` or other platform packages:

- **Platform infrastructure**: visual workflow/process/approval builders, formula builder, report & page-layout designers.
- **Low-level services**: database engine, auth (OAuth/SAML/SSO), multi-tenancy, encryption, API gateway, caching, message queue, file storage.
- **Dev tools**: schema migration, CLI scaffolding, metadata deployment pipeline, VCS integration, IDE extensions.

**Focus Area**: HotCRM focuses exclusively on **business domains** (CRM, Finance, HR, Marketing, Products, Support) and their **business logic, data models, and AI capabilities** — authored as metadata in `src/`.

## ⚖️ Ruling discipline (2026-08-31 ruling)

**12. Look for an existing ruling before you escalate.**
When a card already records a maintainer ruling, ⛔ do not re-escalate it and ⛔ do not
re-decide it. The authoritative ledger of rulings is the director seat's pinned post
(**objectstack#13766**, ruling B); the comments on the card itself are the detail notes.

> Precedent: #1198 — the 8/22 mistake.

---

## ✅ Verifying changes

### Verify before opening a PR

Run the repo's own verify chain and make sure it's green:

```
pnpm verify
```

`package.json` is the single source of truth for what that chain runs. *Supersedes the
hand-copied `pnpm validate && pnpm typecheck && pnpm build && pnpm test` line that stood
here and named half of it — 2026-08-31 ruling, item 5.*

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
