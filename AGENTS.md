# AGENTS.md — HotCRM

Single source of truth for every AI coding agent working on **HotCRM**. Tool-specific files (`CLAUDE.md`, `.github/copilot-instructions.md`) only point here and restate nothing.

## 🚫 Scope — a pure metadata application

Maintainer rulings, verbatim and kept untranslated (2026-09-09, then 2026-08-31):

> 「首先要明确 hotcrm 是元数据应用，平台功能应该在 objectstack中开发。」

> 「基于以上决裁，对于hotcrm 元数据项目，需要补充哪些 agents.md ，比如纯元数据应用应该简化，只开发业务功能，平台能力全部在平台开发。」

**HotCRM is a metadata application. Platform capability is developed in objectstack.** This chapter governs every other chapter of this file; the ruling corpus behind the four rules is objectstack#13848.

### 1. What HotCRM is

Business capability authored as metadata under the platform spec, guided by the platform's published skills, checked for legality by
the `os` commands (`pnpm validate`, `pnpm lint`). **Build business features here; build platform capability on the platform.** A gap
you find in the platform — infrastructure, a service, dev tooling, a builder — is filed upstream: ⛔ never compensated for or re-invented here.

### 2. A platform defect means you WAIT for the platform fix

⛔ Do not route around it — no defensive coding, no shape tolerance, no hand-written predicate re-implementing a platform rule, no
landing "the half we can land now". File the blocked card with a `Blocked-by:` line to the platform card; when the fix lands, resume the
**original** ruling after confirming the pinned `@objectstack/*` version carries it (**merged is not available in the pin**) and
re-running the defect card's own fixture. Red means stop. (#549)

### 3. ⛔ Do not build platform-level tooling here

Lint, validation, gates and diagnostics belong to the platform, uniformly; a drift-class or validation-class gap goes upstream. Tests
here pin **this repo's own business facts** only — a seed-row pin, a "doc wording equals the language-pack label" guard. ⛔ No gate farm. (#806)

### 4. A bad platform default is fixed at the default

Writing an `emptyState` on every tile, or hand-tuning tile placement to dodge a platform render defect, pays the same tax on every tile. Change the default upstream. (#1212 → objectui#7063)

## 🗣️ 沟通语言 / Communication Language

**始终使用中文与用户沟通。** 所有面向用户的回复、解释、总结、提问都用中文；代码、标识符、提交信息、PR 标题/正文、代码注释保持英文不变。
**Always communicate with the user in Chinese (中文)**; code, identifiers, commit messages, PR titles/bodies and code comments stay in English.

## 🏗️ Project Architecture

HotCRM is a **single ObjectStack marketplace app**, not a multi-package monorepo: `objectstack.config.ts` registers every metadata
collection from a flat `src/` tree organised **by metadata type**, on the `@objectstack/runtime` dependency — ⛔ never built, patched or worked around here.

```
hotcrm/
├── objectstack.config.ts   # App manifest — feeds each src/{type}/index.ts barrel to defineStack()
├── src/
│   ├── objects/            # *.object.ts schemas + *.hook.ts lifecycle hooks
│   ├── views/  pages/      # List views (*.view.ts) and page layouts (*.page.ts)
│   ├── flows/              # Automation (*.flow.ts)
│   ├── actions/            # UI actions + AI-callable tools (*.actions.ts)
│   ├── dashboards/ reports/ datasets/   # Analytics metadata
│   ├── skills/             # AI skills (*.skill.ts) — the app's only AI surface
│   ├── profiles/ sharing/  # Permission sets (*.profile.ts) and sharing rules (*.sharing.ts)
│   ├── translations/       # Locale packs: en · zh-CN · es-ES · ja-JP
│   └── data/               # Seed data (defineDataset)
├── content/docs/           # Product documentation site (Fumadocs): en, zh-Hans, zh-Hant
└── docs/                   # Internal maintainer documentation (docs/README.md is the full map)
```

`src/` itself is the roster of what this app authors — open it rather than trust a list. ⛔ Do NOT create `packages/<x>/src/` paths: the multi-package layout is retired and archived under `docs/archive/`.

## 💻 Tech Stack & Protocol

1. **Metadata-first, TypeScript only.** Every business object is a `*.object.ts` built with `ObjectSchema.create()` from
   `@objectstack/spec/data`. ⛔ Never YAML or JSON metadata; ⛔ never raw SQL.
2. **The `crm_` prefix is written out, everywhere.** Business object names are `snake_case` with an explicit `crm_` prefix
   (`crm_account`); the runtime injects nothing, so the name in source = at runtime = in the DB = in the REST URL = in the docs, and
   every reference — lookup / master-detail targets, cube `sql`, view, hook, action, navigation, dashboard and translation keys — uses
   it. Platform objects keep `sys_*`; the file stays unprefixed (`src/objects/contract.object.ts` declares `name: 'crm_contract'`); the
   roster is `src/objects/*.object.ts`, ⛔ never restated in prose. The `os lint` `naming/namespace-prefix` warning on non-object items
   is advisory (ADR-0048): ⛔ do not mass-rename to chase it.
3. **Data access is ObjectQL through `ctx.api`** — there is no `broker`. Shape:
   `ctx.api.object('crm_opportunity').find({ where: { amount: { $gt: 50000 } } })`; a `*.hook.ts` casts once
   (`const api = ctx.api as HookApi | undefined`, from `src/objects/_hook-api.ts`), an action body calls it directly.
   - **The predicate key is `where`.** `filter` is a live alias the engine folds to `where`, so the hazard is not silent loss but
     **mixing**: a query carrying both keys throws `Conflicting options … 'where', 'filter'`, and an empty `where: {}` is a different
     value. `HookQuery` omits `filter` so the mix is a compile error; `test/hook-query-predicate.test.ts` pins the engine per method.
   - **Other surfaces spell their own key, and their own schema decides.** A `*.flow.ts` node `config` takes `filter:`; a page component's
     `filter` is its `ComponentPropsMap` entry (`@objectstack/spec/ui`) — `record:related_list` takes rule **objects** `[{ field, operator, value }]`; the AST array and `op:` are rejected by `objectstack build` and the list renders unfiltered (#1248).
4. **AI-native.** AI-callable tools are `*.actions.ts`. The AI surface is skills-only — `src/skills/*.skill.ts` via `defineSkill()`,
   attached to a platform agent by `surface`. ⛔ Never author a `*.agent.ts` (#512, ADR-0063 §2).

## 🔒 Schema Validation Requirements

Every metadata file under `src/` is validated — ⛔ **not by a `parse()` call you write in the file**; no file under `src/` makes one.
The authoring form is yours to get right; the enforcement point is fixed.

**Author the file the way its neighbours are authored.** The form is **not uniform across metadata types**: open the file next to the
one you are creating and copy its shape — the directory is the template. ⛔ Do not generalise from one directory to its neighbour; the
`define*` names are the trap (`defineView()` / `defineSkill()` are the form for their directories; `defineFlow()`, exactly
`FlowSchema.parse()`, is ⛔ not the form for `src/flows/`). Three forms exist:

1. **A validating constructor, called in the file.** `src/objects/*.object.ts` uses `ObjectSchema.create({ … })` (`@objectstack/spec/data`),
   `src/views/*.view.ts` uses `defineView({ … })`, `src/skills/*.skill.ts` uses `defineSkill({ … })`. These reject at author time and
   name the unknown key back (`unknown key(s) — workflows`).
2. **A typed object literal, no runtime call in the file.** `src/pages/*.page.ts` annotate with `Page`, `src/dashboards/*.dashboard.ts`
   with `Dashboard` (both `@objectstack/spec/ui`), `src/flows/*.flow.ts` with `Automation.Flow` (`import type * as Automation from '@objectstack/spec/automation'`).
3. **A plain object literal with no schema import.** `src/profiles/*.profile.ts` — this app's **permission sets**; ⛔ not
   `*.permission.ts`, authored nowhere — and `src/sharing/*.sharing.ts`.

**Where the validation actually happens.** `objectstack.config.ts` hands every collection to `defineStack()`, which validates each against
its `@objectstack/spec` schema; `pnpm validate` and `pnpm build` run it, and the platform parses again on boot. An unknown key on a page or a permission set fails `pnpm validate` with exit 1 though the file imports nothing.

**⚠️ A file missing from its barrel is validated by nothing.** Registration is explicit, file by file: each `src/{type}/index.ts`
re-exports its files by name and `objectstack.config.ts` feeds those barrels to `defineStack()` — no glob discovery. A valid file that
never reaches the barrel is **silently ignored**: `pnpm validate` stays at exit 0 and names it nowhere. Exporting it is part of authoring it.

**`XSchema.parse()` is a real API — for tests, not for `src/`.** `ObjectSchema`, `PageSchema`, `ViewSchema`, `FlowSchema`,
`PermissionSetSchema` and their siblings carry `.parse()`; call it in a **test** or when building metadata programmatically, ⛔ never as the authoring form of a file under `src/`.

> **There is no `workflow` metadata type** (ADR-0019/0020): `WorkflowRuleSchema` is exported by no installed `@objectstack/*` package,
> and `ObjectSchema` rejects `workflows:` / `workflow:` by name. Field updates belong in `*.hook.ts`; status flips and notifications in
> a `record_change` / `schedule` flow; approvals in an `approval` node inside a flow. A record **lifecycle** constraint is a
> `validations[]` entry with `type: 'state_machine'` on the object, ⛔ not a `StateMachineSchema` file; whether it wants an invariant or
> a transition gate at all is **Metadata semantics rule 7**.

## 🏷️ Field Type Guidance

Use the most specific `Field` type `@objectstack/spec/data` offers:

| Need | Field type |
|---|---|
| Optional association to another object | `Field.lookup('crm_x', …)` |
| Required parent-child with cascade delete | `Field.masterDetail('crm_x', …)` |
| Aggregate over child records (sum, count, min, max) | `Field.summary()` |
| Multi-select picklist | `Field.select({ multiple: true })` |
| File · image · GPS · postal address | `Field.file()` · `Field.image()` · `Field.location()` · `Field.address()` |

## 🧩 Metadata semantics — say what you mean (2026-08-31 ruling)

Which construct carries which intent (verbatim source objectstack#13848). Prose in a `description` is not a construct.

**7. Invariant, or transition gate — pick the construct by the intent.** An **invariant** ("X may never exceed Y") is a `validations[]`
script; existing violations are frozen, not bricked. A **transition gate** ("by the time the record reaches state S, X must be filled")
is `requiredWhen`, or a bound on the field; records that predate the rule pass. ⛔ Never let prose describe a gate as an invariant. (#1069)

**8. Interception stands on a person's judgement.** A machine signal (`suspected`) warns and lets the write through; only a value a person wrote down (`confirmed`) may block one. ⛔ Do not build an override escape hatch. (#1288)

**9. Elevate as little as possible.** A screen flow stays `runAs: 'user'`; a write that genuinely needs elevation is a dedicated `system` sub-flow called through a `subflow` node. ⛔ Never elevate a whole flow to make `readonly` take effect. (#1434)

**10. The organization dimension is the platform's.** Every `runAs: 'system'` scan or rollup MUST pin an organization predicate — the
#1363 guard is the acceptance criterion. `organization_id` is injected by the platform: ⛔ never declare it, or "add a tenant dimension", object by object. (#1372)

**11. A deliberate deviation is written down twice.** A choice that departs from a repo-wide convention carries a comment beside the
code **and** an entry in the roster of the guard that would otherwise flag it; without both, the next agent tidies it away. (#1328)

**Escape hatches are for extreme cases — layout is derived by default.** Maintainer ruling, 2026-08-31 (verbatim, untranslated):

> 「或者说 skills 应该说明，逃生仓是极端场景按照客户需求自定义的场景下才需要，应该尽量避免。」

Authoring `record:details` sections on a custom record page, or enumerating fields in a view's `form.sections`, is for a named,
customer-demanded customization only. The ladder: (1) `fieldGroups` on the object, each field opting in with `group: '<key>'` — the
norm, the layout is *derived*; (2) the group-reference form `{ group: '<key>' }` (objectstack#13897) when partial arrangement is genuinely
needed; (3) per-field enumeration only in the extreme case, with a comment naming the customer need and why a group reference cannot express it — rule 11 applying itself.

## ⚠️ Constraint Checklist

- **Object Naming**: `crm_` prefix on every business object, written out (Tech Stack rule 2).
- **i18n**: every new object ships in all four locale packs, `src/translations/{en,zh-CN,es-ES,ja-JP}.ts` — label, pluralLabel, every field and option label, view labels, navigation labels.
- **Docs**: every new object or feature gets a user-facing page under `content/docs/` for business users and admins — business concepts,
  never a hand-copied machine roster; English first, then `.zh-Hans.mdx` and `.zh-Hant.mdx` beside it, under **Documentation discipline** below.
- **Validation predicates must be TOTAL**: every `record.x` read in an authored CEL predicate (`validations[].condition`, `requiredWhen`,
  `readonlyWhen`, `visibleWhen`) carries a `has(record.x)` guard.
- **Dependencies**: the `@objectstack/*` packages in `package.json` are version-locked and bumped together; keep `specVersion` in
  `objectstack.manifest.json` aligned with the installed `@objectstack/spec`.

### Validation predicates must be TOTAL (#630)

A rule evaluates against `{...previous, ...data}`; on update, a driver that stores only the columns a row was written with hands back
the key **absent**, not null. Strict CEL aborts the predicate with `No such key`, and since 17.0.0-rc.2 an unevaluable rule **rejects
the write** (before rc.2 it was skipped in silence). Neither is the rule you wrote, so:

| intent | write this |
| --- | --- |
| `x` holds no value | `(!has(record.x) \|\| isBlank(record.x))` |
| `x` holds a value | `has(record.x) && record.x <op> …` |

`!= null` and `coalesce(record.x, "")` are ⛔ not substitutes — both abort on an absent key. `test/object-validation-predicates.test.ts` enforces the guard and carries the measurement; read it before adding a rule.

### Documentation discipline (2026-08-31 ruling)

**5. Docs explain business concepts. ⛔ They never hand-copy a machine list.** The source of truth for a machine fact — a dataset's
dimensions, an object's fields, the roster of objects — is the metadata under `src/`; a table transcribed into prose drifts, and this
repo has measured it drifting repeatedly. The boundary is one question: **can a reader see this directly in the product UI?** A
navigation fact may be documented and guarded; a machine semantic layer may not. This rule binds this file too. (#1620)

**6. The Chinese doc surface has three rules.**

- **List view names** take the **zh-CN language-pack** wording — ⛔ never coin a fresh translation for a view the app already labels
  (#1329). Every other pack-carried UI noun — dashboard and tile titles, gauges, dataset dimensions and measures, sharing-rule names,
  the dashboard's own label — keeps its **English** spelling in every locale even though the pack carries a translation:
  `test/docs-dashboard-tiles.test.ts` resolves each `**Name** 磁贴` to an English widget title and goes red on a converted one. The
  guard's ablation is the discriminator, not pack-carriage; measures are the same class and currently unguarded (#1618).
- A Chinese heading carries an **explicit English anchor id**, and one anchor word is used across every language, so a link survives translation (#1359).
- zh-Hant conventions are stated by their **real** reason, not a style preference: the
  console falls back to Simplified, so a Traditional page labels platform navigation in
  English rather than ship mixed Simplified/Traditional script (#1368).

## ⬆️ Platform Upgrades (ObjectStack version bumps)

1. **Read the official release notes first** — <https://docs.objectstack.ai/docs/releases> (per-major pages carry the breaking-change list and a migration checklist). ⛔ Do not reverse-engineer breaking changes from changelogs.
2. Per-package `node_modules/@objectstack/<pkg>/CHANGELOG.md` supplements the release notes, never replaces them.
3. Bump all `@objectstack/*` packages **together** (they are version-locked), update `specVersion` in `objectstack.manifest.json`, then
   run `pnpm verify` and browser-verify (see below).
4. Record the upgrade in the PR's **changeset**, ⛔ not in `CHANGELOG.md`: `changeset version` owns that file and splices each release in, so a hand-written entry is published by nothing.
5. **Re-scope the claims that name the old pin — re-scope, never renumber.** Search version-agnostically, across wrapped lines and comment leaders, for the *shape* of a pin claim, over identifiers **and** human-readable labels; every hit is a candidate to classify by hand — a claim is false only when it asserts the old version **is** the current pin (re-measure it on the new pin, or re-word it to date itself), while "measured on X" is dated truth and stays. (#1681)
   A grep finds only text carrying a version token; the same stale fact stated in other words, or by a label, is found by reading — say so in the PR rather than call the sweep complete.

## ⚖️ Ruling discipline (2026-08-31 ruling)

**12. Look for an existing ruling before you escalate.** When a card already records a maintainer ruling, ⛔ do not re-escalate it and ⛔ do not re-decide it. The ledger of rulings is the director seat's pinned post (objectstack#13766, ruling B); the card's own comments are the detail notes. (#1198)

## ✅ Verifying changes

**Verify before opening a PR.** Run `pnpm verify` and make sure it is green — `package.json` is the single source of truth for what that
chain runs; `pnpm validate` inside it also enforces ADR-0021 widget binding (`xAxis` is a dataset **dimension**, `yAxis[]` a **measure**).

**Every PR carries a changeset.** A PR is not finished until it adds a `.changeset/*.md` entry — the `Changeset Check` workflow diffs
against the PR base, so files already in the directory prove nothing. Write it for the release-notes reader (what changed and why;
FROM → TO for a breaking change); it ships as `CHANGELOG.md`. The lone exception, for a PR that ships nothing to users, is the
**`skip-changeset`** label or an empty-frontmatter changeset — ⛔ never to turn a red check green.

### How a green PR lands

A seat may take a PR out of draft and arm auto-merge once every check on it has finished and none has failed. Arming **enqueues**:
`main`'s ruleset carries a merge queue that performs the squash merge within seconds — ⛔ never merge by hand, and do not re-derive a
wait from `min_entries_to_merge_wait_minutes`. A check that concluded `skipped` under a label, or never ran because a path filter
excluded it, is not a failure. **Governed paths — `AGENTS.md`, `CLAUDE.md`, `.claude/**`, `.github/instructions/**` — govern the whole
diff**, however small that part of it is: the PR stays a **draft** and is the maintainer's own merge; ⛔ a seat never flips it ready and never arms auto-merge on it. (#1742)

### Verifying UI in the browser

Dashboard charts and other heavy widgets are **`React.lazy`-loaded** and hydrate a beat after navigation — an empty chart card right after navigating is the normal state, ⛔ never a verdict:

1. After navigating, wait ~1–2 s (or poll) for the lazy bundle to hydrate.
2. Confirm the chart drew with a DOM probe, not a picture — e.g.
   `document.querySelectorAll('.recharts-pie-sector, .recharts-rectangle, .recharts-funnel-trapezoid, .recharts-area-area, .recharts-line-curve').length > 0`.
3. Cross-check the data path: `POST /api/v1/analytics/dataset/query` returning `200` with rows means data and metadata are fine; an empty
   visual is then hydration timing or a renderer issue, ⛔ never a metadata bug. `gauge` renders as a single number by ADR-0021 design.

Gotchas, same workflow: a `NODE_MODULE_VERSION … requires …` flood on boot is `better-sqlite3` built for another Node ABI —
`pnpm rebuild better-sqlite3`, restart the dev server, unrelated to any app change · the Console dashboard route is
`/_console/apps/<manifest.id>/dashboard/<dashboardName>` (`app.objectstack.hotcrm`), ⛔ not `/_console/a/<appName>`, which bounces to
`/_console/home` · dev admin, seeded on an empty DB (dev only): `admin@objectos.ai` / `admin123`.
