# HotCRM module boundaries — inventory and split plan (ADR-0130)

> **Status**: design only. Nothing in `src/` moves on the strength of this document.
> **Measured against**: `origin/main` at the commit stamped in
> [`module-split-inventory.json`](./module-split-inventory.json), `@objectstack/*` 17.2.0.
> **Upstream**: [objectstack#14122](https://github.com/objectstack-ai/objectstack/issues/14122)
> (epic) and ADR-0130, *the release artifact is the co-ownership boundary — one artifact,
> N packages*.

HotCRM ships as one package: 18 objects, 39 hooks, 26 flows, 14 views, 8 pages, 30 actions
and one app, all flat inside `app.objectstack.hotcrm`. ADR-0130 makes it possible to split
that into several packages inside **one release artifact**, sharing the `crm` namespace, so
Studio and the team can work module by module — **without renaming a single object**. Not
renaming is the whole point: under ADR-0129 the object `name` is the table name, the REST
path, the formula token and the key of every saved view, so a rename reaches customer data.

This document is the inventory and the seam. It answers three questions: which module does
each authored file belong to, which dependencies cross a module boundary, and which of those
the platform refuses today.

## What this document is not

It is not the split. The code split is blocked on the upstream work listed under
[上游缺口 / Upstream gaps](#upstream-gaps), and this repository does not route around a
platform gap (AGENTS.md, *A platform defect means you WAIT for the platform fix*).

It also does not restate the business case. That is measured on #14122 §1 and recorded in
ADR-0130 §1 — the fork tax paid twice on one platform upgrade, Studio's ungrouped 30-object
and 29-flow lists, the single context ceiling with no per-module budget, and CPQ having no
sellable unit. Read those; they are not re-derived here.

## The four rules that decide every edge

Every cross-package edge below is judged by one of exactly four rules, each **measured** on a
running 17.2.0 instance and recorded in #14122 §4 / ADR-0130 §1.5. No fifth rule is invented
here; where an edge falls outside all four, it is listed as unmeasured rather than guessed.

| # | Edge | Verdict |
| --- | --- | --- |
| **R1** | A `lookup` / `masterDetail` field pointing at another package's object | ✅ ACCEPTED |
| **R2** | `navigationContributions` injecting navigation into another package's app | ✅ ACCEPTED |
| **R3** | A package's own app `navigation` pointing at another package's object | ❌ REFUSED |
| **R4** | A hook attached to another package's object | ❌ REFUSED |

R3 and R4 fail loudly at author time, with the same shape of message — *"references object
`core_account` which is not defined in objects"*. That is the good case: the seam announces
itself. ADR-0130 states the consequence in one line — **navigation crosses only through
contributions, and the split must follow hook ownership.**

R1 is not a hypothesis in this repository. 15 of the 18 objects already carry a lookup into
`sys_user` — `owner_id` on thirteen of them, `product_manager` on `crm_product`, `sys_user` on
`crm_event_attendee` — an object HotCRM does not own and never has. (The three without are the
child rows: `crm_campaign_member`, `crm_opportunity_line_item`, `crm_quote_line_item`.)
Cross-package lookups are what this app has been doing in production since it was written.

## Method, and how the inventory is maintained

The companion [`module-split-inventory.json`](./module-split-inventory.json) was
**generated once**, and carries the commit it was measured at. It is the machine-readable
half of this plan: file → module, every edge with its rule and verdict, and the item classes
the four rules do not cover. It is **hand-maintained from here on** — see the paragraph below
and the `$maintenance` block in the file itself.

The inputs the one-off analysis read were, in order of authority:

1. **`dist/objectstack.json`** — the compiled artifact from `pnpm build`. Every reference in
   the graph (a field's target object, a hook's `object`, a nav node's `objectName`, a view's
   `data.object`, a dataset's `object`, an action's `objectName`) is read from the artifact,
   not from a regex over source. The artifact is what the platform actually registers.
2. **`src/**`** for file identity and each file's module assignment.
3. **`scripts/check-source-token-ratchet.mjs`** for token counts — the generator imports that
   script's own exported `authoredText()` and `tokensOf()` and calls them unmodified, so a
   per-module figure is the same measurement the gate makes, only partitioned. The module
   figures reconcile exactly with the gate's whole-tree reading at this commit.

The generator itself is deliberately **not committed**. Lint, validation and diagnostics are
platform-level tooling and do not live in this repository (AGENTS.md, *Do not build
platform-level tooling here*); a one-off analysis script that produced a design artefact is
not a gate and must not become one. That decision stands — but it means **there is nothing in
the tree that can regenerate the inventory**, so patching it by hand is the only maintenance
available, and the file used to forbid exactly that (#1698). It is a snapshot frozen at its
stamped commit, not a live index: read it as evidence for this plan, and when a path it names
is deleted or moved, **edit it by hand and record the edit in its `$hand_edits` list**. Its
measured figures — token counts, totals and edges — are readings at the stamped commit; leave
them as measured rather than adjusting them to look current.

For the same reason the per-file roster lives only in the JSON. This document carries the
module-level rollups and the judgements; it does not transcribe a machine list into prose,
which is how four earlier drifts started (AGENTS.md, *Documentation discipline*, item 5).

## The module plan

One `type: 'app'` package and six `type: 'module'` packages. **All seven declare
`namespace: 'crm'`** — that is the ADR-0130 mechanism, and it is why no object is renamed.

| Package id | Type | Objects | Files | ~Authored tokens |
| --- | --- | ---: | ---: | ---: |
| `app.objectstack.hotcrm` | `app` | 0 | 54 | 21,606 |
| `app.objectstack.hotcrm.core` | `module` | 2 | 18 | 11,498 |
| `app.objectstack.hotcrm.sales` | `module` | 3 | 31 | 41,743 |
| `app.objectstack.hotcrm.cpq` | `module` | 5 | 21 | 15,630 |
| `app.objectstack.hotcrm.service` | `module` | 3 | 23 | 19,062 |
| `app.objectstack.hotcrm.marketing` | `module` | 2 | 10 | 9,441 |
| `app.objectstack.hotcrm.activity` | `module` | 3 | 14 | 15,194 |

- **core** — `crm_account`, `crm_contact`. The customer record every other module points at.
- **sales** — `crm_lead`, `crm_opportunity`, `crm_forecast`. The pipeline.
- **cpq** — `crm_product`, `crm_quote`, `crm_quote_line_item`, `crm_opportunity_line_item`,
  `crm_contract`. Configure, price, quote, sign.
- **service** — `crm_case`, `crm_knowledge_article`, `crm_article_feedback`.
- **marketing** — `crm_campaign`, `crm_campaign_member`.
- **activity** — `crm_task`, `crm_event`, `crm_event_attendee`. What a rep did and when.

### The assignment rule

**An item belongs to the module that owns the object it is authored against.** A view, page,
action, dataset, report, sharing rule, seed dataset, import mapping, skill and hook all name
an object; that object decides the package. This is not a per-file opinion, and it is the
reason almost every item lands inside one module rather than across two — the exceptions are
enumerated below and in the JSON, each with a stated reason.

### What stays in the app package, and why it holds no objects

The app package holds the consumer surface — the app and its navigation scaffolding, the
three pages that are not record pages (`home`, `app_launcher`, `utility_bar`), the two
cross-domain dashboards, the three cross-domain AI skills, the six permission sets, the four
locale bundles, the package docs, and the shared TypeScript source described below.

It declares **no objects at all**, and that is deliberate. ADR-0130's payoff is that "package
boundaries *are* the grouping Studio has never had"; parking objects in the app package puts
them straight back into the flat ungrouped list the split exists to remove.

The alternative — keeping `core` inside the app package so that `crm_account` and
`crm_contact` navigate directly — was measured and rejected: it saves 2 of the 17 navigation
conversions below, and costs the customer core its own boundary forever.

## The dependency graph

73 cross-module edges, of which **54 are ALLOWED and 19 are REFUSED** — 44 R1 field
references, 10 R2 navigation contributions the cut creates, 17 R3 navigation nodes and 2 R4
hooks. Every edge is in the JSON with its rule; the refused ones are all here, with their cut.

### R1 — field references: 44 edges, all ALLOWED

Object-to-object references cross freely. `crm_case` looks up `crm_account` and `crm_contact`;
`crm_quote` and `crm_contract` look up `crm_account`, `crm_contact` and `crm_opportunity`;
`crm_event` and `crm_task` each carry five `related_to_*` lookups spanning four modules. None
of this constrains the split. 15 of the 44 point at platform-owned `sys_user` and already
cross a package boundary today; the other 29 are the module-to-module references the split
creates, and the platform has measured that they are fine.

The one master-detail in the tree — `crm_contact` to `crm_account` — is **internal** to
`core`, so the split never tests a cross-package cascade delete.

### R3 — app navigation: 17 edges, all REFUSED, all with the same cut

The app's `navigation` array contains 17 `type: 'object'` nodes. With the objects living in
modules, every one of them is refused: an app may only navigate to objects its own package
defines.

The cut is mechanical and is rule R2, which is ACCEPTED. Each module declares in its own
manifest:

```ts
navigationContributions: [
  {
    app: 'app.objectstack.hotcrm',
    group: 'group_service',   // the group node the app still owns
    priority: 20,
    items: [ /* the nodes that used to sit in the app's navigation */ ],
  },
]
```

The shape was first read off `ManifestSchema` in `@objectstack/spec` 17.2.0 — the
version this repo pinned when this plan was measured — and RE-READ on the current pin,
17.4.0 since PR #1814 (#1807), during #1883:
`{ app, group?, priority, items }`, unchanged, with `priority` optional (it defaults to
`200`). ⚠️ One thing the 17.2.0 reading did not record: `app` is validated as a bare
snake_case identifier (`/^[a-z][a-z0-9_]*$/`), so the dotted manifest id used in the
sample above — `app.objectstack.hotcrm`, which `ManifestSchema.id` itself accepts —
is REJECTED there with `invalid_format`. Whatever R2 ends up contributing under, it is
not that literal. The app package keeps the group scaffolding — `Sales`,
`My Work`, `Activity`, `Marketing`, `Service`, `Insights` — and each module contributes its
items into the named group, so the information architecture a user sees is unchanged.

The navigation block is 1,162 of `src/apps/crm.app.ts`'s 1,238 authored tokens: this
conversion moves most of that file into six manifests. The nodes **move**; they do not
duplicate.

Two things about `group` are not settled by the four measured rules and are listed as an
upstream gap: whether it matches a group node's `id`, and what happens when several packages
contribute into the same group at the same `priority`.

### R4 — hooks on foreign objects: 2 edges, REFUSED

Both live in one file, `src/objects/campaign.hook.ts`, and both attach a hook to an object
that would sit in `sales`:

| Hook | Attached to | Owning module |
| --- | --- | --- |
| `campaign_attribution_refresh` | `crm_opportunity` | `sales` |
| `campaign_lead_conversion_refresh` | `crm_lead` | `sales` |

Both exist to keep a campaign's metrics live: a campaign metric derives from opportunity and
lead state, so each input carries a trigger that recomputes the metric when it changes.

This is the one place in the tree where the split moves business logic across a domain
boundary, so it is stated as a choice rather than a mechanism:

- **Recommended — move each hook to the module that owns its object.**
  `campaign_attribution_refresh` ships in `sales` beside `crm_opportunity`,
  `campaign_lead_conversion_refresh` in `sales` beside `crm_lead`. The campaign rows they
  update are reached through `ctx.api` at run time, which is not an authoring-time package
  reference and is not governed by any of the four rules.

  The cost is visible and should be named: the recompute arithmetic is already written out
  **four times** — a lowered L2 hook body cannot reach module scope, so a shared helper cannot
  be imported — and `test/campaign-member-lifecycle.test.ts` holds the four copies
  character-identical. After the move, two of those copies live in `sales` and two in
  `marketing`, and that test spans two packages. The pin still works; it just now guards a
  cross-package invariant, which is a fact a reviewer should see rather than discover.

- **Alternative — put `crm_campaign` and `crm_campaign_member` in the same module as
  `crm_lead` and `crm_opportunity`.** Zero refused edges, at the cost of marketing ceasing to
  be a module and the largest module growing further. Not recommended, but it is the only
  other shape that satisfies R4.

`marketing` is the only module carrying an R4 violation. The other five modules' hooks are
all attached to their own objects — the seam is clean everywhere else, exactly as #14122
measured for the 黑猫 fork.

## Item classes the four rules do not cover

The measured rules cover two of the item classes that name an object — `hooks[].object` and
`app.navigation[].objectName`. Several others carry an object name too and were **not**
measured: an action's `objectName`, a view's `data.object`, a page's record object and its
related lists, a dataset's `object`, a sharing rule's `object`, a permission set's `objects`,
a seed dataset's `object`, an import mapping's `targetObject`, and a flow node's object.

Under the assignment rule almost all of these are internal by construction. What remains is
counted in the JSON under `unmeasured_edge_classes`, and none of it is given a verdict here:

| Class | Instances | How the plan avoids depending on it |
| --- | --- | --- |
| Action body writes an object in another module | 19 | The action ships in the module owning its **host** object; the write is run-time ObjectQL. |
| Flow node reads or writes an object in another module | 9 | The flow stays with the module owning its trigger object. |
| Permission set grants on objects in several modules | 6 | Stays whole in the app package — no module owns a role. |
| Page component binds an object in another module | 5 | Ships with its record object; the related lists are the untested part. |
| Dashboard widget binds a dataset in another module | 3 | Multi-module dashboards move to the app package. |
| Translation bundle labels objects in every module | 1 | Stays whole in the app package. |

The one file that cannot follow the assignment rule is **`src/actions/global.actions.ts`**: it
is a factory generating `log_call`, `log_meeting` and `schedule_meeting` across five host
objects in four modules, and every generated body writes `crm_event` and `crm_event_attendee`
in a fifth. It must be split so that each generated action ships in the module owning its host
object, with the factory itself becoming shared source. Whether the `activity` module could
instead declare all of them directly on foreign objects is precisely the unmeasured question
above — so the plan does not rely on it.

## First cut: `app.objectstack.hotcrm.cpq`

The first module to extract should be the one nothing points into, that owns no hook on a
foreign object, and that touches the fewest unmeasured classes. Measured over the graph:

| Module | Inbound field refs | Refused nav (R3) | Hooks on foreign objects (R4) | Unmeasured touches |
| --- | ---: | ---: | ---: | ---: |
| **cpq** | **0** | 3 | **0** | **12** |
| service | 2 | 3 | 0 | 27 |
| marketing | 1 | 1 | **2** | 11 |
| activity | 0 | 3 | 0 | 31 |
| sales | 9 | 5 | 0 | 41 |
| core | 17 | 2 | 0 | 38 |

`cpq` is a leaf. Its five objects reference `core` and `sales` through seven lookups (R1,
allowed) and **nothing in the tree references them back** — no field, no hook, no navigation
outside the three nodes converted by R2. Extracting it exercises exactly the two proven rules
plus the mechanical navigation conversion, and touches no refused edge at all.

It is also the module with the business reason. ADR-0130 §1.3(c) names CPQ specifically:
it is meant to be sold separately and today has no unit to be sold as. The cheapest cut and
the most valuable cut are the same cut.

`marketing` scores well on coupling and is the natural second, but it carries both R4
violations, so it needs code motion and a maintainer's call on the hook question above — not
the shape a first cut should have.

## The token budget

`scripts/check-source-token-ratchet.mjs` reads **~134,174 authored tokens against a 140,000
ceiling** at this commit — 5,826 of headroom. Three things about the split and that number:

1. **Manifests are free.** The ratchet walks `src/` only, and `objectstack.config.ts` sits at
   the repository root. Module manifests and their `navigationContributions` declared there
   cost the ratchet nothing. The 1,162 navigation tokens moving out of `src/apps/crm.app.ts`
   are a **reduction** in the interaction layer.
2. **Duplicating shared source is the one real hazard, and it is the size of the whole
   headroom.** Six TypeScript files are imported across module boundaries, totalling 2,182
   authored tokens: `_hook-api.ts` (6 packages), `_picklists.ts` (4), `src/data/_shared.ts`
   (4), and `shared-widgets.ts`, `_thresholds.ts` and `src/mappings/_shared.ts` (2 each).
   Copy each into every package that consumes it and the tree grows by **5,692 tokens — 98%
   of the 5,826 available**, for zero new capability; `_picklists.ts` alone accounts for
   3,741 of that, 64% of the headroom. The split must keep **one** copy of each shared source
   file. That is an acceptance criterion for the split PR, not a preference, and it is the
   number to re-measure before the PR opens.
3. **The gate is coupled to the current layout and will fail loudly if it moves.** Its
   `LAYERS` list names `src/objects`, `src/flows`, `src/actions`, `src/hooks`, `src/views`,
   `src/pages`, `src/dashboards`, `src/apps`, and it exits non-zero when one of them is not a
   directory. Any re-layout must re-point `LAYERS` in the same PR. That is a re-point, not a
   raise: the ceilings must not move, because the same files are being measured in a new
   place. Raising a ceiling needs a maintainer ruling quoted in the raising PR.

   **Dated, and superseded twice.** That paragraph was true when this section was measured;
   both halves have since moved. #1905 re-pointed `LAYERS` onto `src/sales/…` (and `src/hooks`
   stopped existing, a hook now sitting beside its object), and #1928 replaced the path list
   with metadata-type NAMES — `objects`, `flows`, `actions` / `views`, `pages`, `dashboards`,
   `apps` — resolved against every package, which is what lets the same two layers read on all
   four. The rule the paragraph states survives both moves and is the part to carry forward:
   a re-layout re-points the gate in the same PR, a re-point is not a raise, and raising a
   ceiling needs a maintainer ruling quoted in the raising PR. Read the script's own header
   for what it names today; ⛔ do not re-derive the directory list from this line.

The per-module figures in the table above are `round(module chars / 4)` — the gate's own
estimator, partitioned. They exist so the per-module budget ADR-0130 promises has a starting
measurement, and at this commit they reconcile exactly with the gate's whole-tree reading.
Translations and seed data are outside the ratchet by maintainer ruling and are excluded from
every figure here, as they are from the gate.

## What must change in this repository before the split lands

Neither of these is an upstream gap; both are decisions for this repository's maintainer.

1. **AGENTS.md forbids the layout this may need.** *Project Architecture* says: "Do NOT create
   `packages/<x>/src/` paths — everything lives in the flat `src/{type}/` tree", with the
   retired multi-package direction archived under `docs/archive/`. That prohibition was
   written against a different proposal — a multi-package **repository** — and ADR-0130's
   packages are not that. Whether the split is expressed as N source roots or as N manifests
   over today's flat tree is decided by the upstream compile-path work; either way the rule
   needs the maintainer's amendment before a split PR can be opened, and no agent should read
   this document as that amendment.
2. **The ratchet's `LAYERS` list** must be re-pointed in the same PR that moves any measured
   directory (see the token budget above).

<a id="upstream-gaps"></a>

## 上游缺口 / Upstream gaps

*(The heading is bilingual because #1448 asks for this section by name. It carries an
explicit English anchor id so a link to it survives translation — AGENTS.md, Documentation
discipline, item 6. The id is an HTML anchor rather than the `[#id]` suffix used under
`content/docs`: that suffix is fumadocs syntax, and this tree is rendered by GitHub, which
would otherwise slug the heading to `#上游缺口--upstream-gaps` — the exact rot
`test/docs-anchor-links.test.ts` was built for.)*

**Already tracked upstream — cited, not re-derived.** The code split is blocked on all three:

- The multi-package **compile path** — `os build` emitting `packages[]` —
  [objectstack#14439](https://github.com/objectstack-ai/objectstack/issues/14439), in flight.
- Studio's writable verdict —
  [objectstack#14430](https://github.com/objectstack-ai/objectstack/issues/14430).
- An objectstack release carrying both, and the version bump in this repository. HotCRM is
  pinned to `@objectstack/*` 17.4.0 today (PR #1814, #1807; this plan's own measurements
  were taken at the 17.2.0 pin and are labelled as such). Merged upstream is not the same as available
  in the pin (AGENTS.md, *Platform Upgrades*).

**New, found by this analysis — for the PM to file upstream.** None of these is worked around
here:

1. **The ACCEPT/REFUSE matrix covers two item classes; this split needs it for nine.**
   #14122 §4 measured `hooks[].object` and `app.navigation[].objectName`. An action's
   `objectName`, a view's `data.object`, a page's record object and related-list objects, a
   dataset's `object`, a sharing rule's `object`, a permission set's `objects`, a seed
   dataset's `object`, an import mapping's `targetObject` and a flow node's object were not
   measured. HotCRM has 19 action instances, 9 flows, 5 pages, 6 permission sets and 3
   dashboards that would sit on one side of a boundary and name something on the other.
   **Ask**: extend the measured matrix over those item classes on 17.2.0, the same way §4 did
   for the first four.
2. **`navigationContributions[].group` semantics are unspecified where this plan depends on
   them.** The 17-node conversion assumes `group` resolves against a group node the target
   app declares, that a contribution into a group that does not exist fails visibly rather
   than vanishing, and that ordering across several packages contributing into one group is
   determined by `priority` rather than by package registration order. **Ask**: pin those
   three behaviours with tests, so the conversion preserves today's information architecture
   provably rather than by inspection.
3. **A permission set has no module home, and the split does not fix the pain ADR-0130 cites
   for it.** ADR-0130 §1.3(a) names the 30-row × 9-column × 6-set permission matrix as one of
   the three measurable consequences of having no boundary, and offers package boundaries as
   the grouping Studio never had. But a permission set grants across domains by nature — four
   of HotCRM's six span five or six modules — so it cannot live in a module, and the matrix
   stays flat after the split. **Ask**: decide whether permission sets can be composed per
   package (a module contributing its own object grants into a role the app owns), or record
   that the permission matrix is explicitly out of scope for the boundary ADR-0130 creates.
4. **Cross-package analytics binding is unmeasured.** Three dashboards bind datasets that
   would live in other modules, and a report binds a dataset the same way. **Ask**: measure
   whether a dashboard or report may bind a dataset defined in another package of the same
   artifact — this is item class (1) for the analytics surface specifically, and it decides
   whether a module can ship its own dashboard.

## Decisions recorded (2026-09-02)

The maintainer ruled on the three choices this plan left open. They are recorded here so the
plan is the document of record; the sections above are left as written so the reasoning stays
readable.

1. **R4 — the two campaign hooks: option A.** `campaign_attribution_refresh` and
   `campaign_lead_conversion_refresh` move into `sales` beside `crm_opportunity` and
   `crm_lead`; the campaign rows they update are reached through `ctx.api` at run time.
   `test/campaign-member-lifecycle.test.ts` keeps its four character-identical copies and
   guards them across the `sales` / `marketing` boundary. `marketing` stays a module.
2. **AGENTS.md's `packages/<x>/src/` rule: defer to objectstack#14439, then prefer the flat
   tree.** The compile path decides whether N packages need N source roots. If it accepts N
   `defineStack` calls composed with `composeStacks(..., { manifest: 'preserve' })` from one
   project config, the split is expressed as N manifests over today's flat `src/{type}/` tree,
   each stack importing its own share of the index files; the AGENTS.md prohibition then
   needs no amendment and the token ratchet's `LAYERS` list is untouched. Only a compile path
   that mandates per-package directories reopens the rule.
3. **Permission sets: option B now, option A as a second phase.** For this release the six
   permission sets stay whole in the app package and ADR-0130 records that the permission
   matrix is outside the boundary's payoff (objectstack#14487, docs-only). Per-package
   composition of grants — a module contributing its own objects' grants into an app-owned
   role — is filed as objectstack#14488 for the phase in which a module ships on its own.

## Decisions recorded (2026-09-14) — the shape that supersedes the table above

Ruled in one maintainer session on the first draft of
[`psa-module-plan.md`](./psa-module-plan.md), whose size did not fit the whole-tree token
gate. The rulings, verbatim and untranslated, in the order they were given:

> 「所以应该先分拆基础的crm, 比如 sales 和 support， token 门禁： 放到 sales」
> 「是不是拆的太细。是否可以去掉 packages 这一层」
> 「shared 有必要吗？是否后期会导致ai的混乱」
> 「为什么需要app ，我觉得是另外一种混乱」
> 「好，按这个方案把拆分计划写回文档，创建专题issue，然后开始用 项目经理技能派发」

The sections above are left as written: their measurements (the four rules, the 73 edges,
the R4 hooks, the token figures) all still hold and the shape below is judged by them. What
changes is the **package plan** — one `type: app` package and six modules becomes one
`type: app` package and three modules — and the **layout**, which item 2 of the 2026-09-02
decisions left to the compile path and this ruling settles.

4. **Sales is the app.** ADR-0019 requires exactly one `type: app` package per artifact and
   the artifact takes its identity from it; nothing requires that package to be an empty
   shell, and the platform's own fixture (`examples/app-multi-package`: `core` is the app and
   owns `crm_account` and the navigation, `orders` is the module) says the opposite. So
   `app.objectstack.hotcrm` stays the id, keeps `type: 'app'`, and **is the sales module**:
   it owns `crm_account`, `crm_contact`, `crm_lead`, `crm_opportunity`, `crm_forecast`,
   `crm_task`, `crm_event`, `crm_event_attendee` — the customer core and the activity objects
   fold into it, because a sales module without customers is not a sales CRM and activities
   are a cross-cutting capability no customer buys separately — together with the app and
   its navigation groups, the pages that are not record pages, the two cross-domain
   dashboards, the cross-domain skills, the permission sets, the positions, the four locale
   packs, the package docs, and every source file more than one package needs (item 7).
   The `core` and `activity` modules of the table above do not exist; `cpq` is renamed
   `revenue` after the product's own doc section.

5. **Three modules, all `type: module`, all `namespace: 'crm'`, all depending on the app:**
   `app.objectstack.hotcrm.service` (the ruling's "support": `crm_case`,
   `crm_knowledge_article`, `crm_article_feedback`), `app.objectstack.hotcrm.revenue`
   (`crm_product`, `crm_opportunity_line_item`, `crm_quote`, `crm_quote_line_item`,
   `crm_contract` — the unit ADR-0130 §1.3(c) says must be sellable on its own) and
   `app.objectstack.hotcrm.marketing` (`crm_campaign`, `crm_campaign_member`). The dependency
   graph is a star — every module → sales — with no edge between modules. The assignment rule
   is unchanged: an item lives with the object it is authored against. R4 is unchanged: the
   two campaign hooks attached to `crm_lead` and `crm_opportunity` live in sales
   (decision 1 above), beside the objects they hook.

6. **A directory is a package; there is no `packages/` level and no `shared/`.** The layout
   replaces item 2 of the 2026-09-02 decisions (flat tree, second barrel per type), which was
   chosen to avoid touching `AGENTS.md` and the gate, and is superseded because it hides the
   module boundary inside barrels — the thing ADR-0130's per-module context budget needs
   visible. Top-level directories under `src/` are exactly the packages:

   | Directory | Package | Type |
   | --- | --- | --- |
   | `src/sales/` | `app.objectstack.hotcrm` | `app` |
   | `src/service/` | `app.objectstack.hotcrm.service` | `module` |
   | `src/revenue/` | `app.objectstack.hotcrm.revenue` | `module` |
   | `src/marketing/` | `app.objectstack.hotcrm.marketing` | `module` |

   Inside each: one `index.ts` that calls `defineStack` with that package's manifest, and the
   metadata-type subdirectories the package actually uses (`objects/`, `views/`, `pages/`,
   `flows/`, `actions/`, `datasets/`, `reports/`, `dashboards/`, `mappings/`, `skills/`,
   `sharing/`, `data/`), each with its explicit barrel — registration stays file-by-file. A
   `*.hook.ts` sits beside its `*.object.ts`, so R4 is enforced by co-location rather than by
   reading. **One exception, measured by the layout PR (#1910):** `src/docs/` stays at the
   top of `src/`. `objectstack build` compiles the in-product package docs (ADR-0046) from
   `<config dir>/src/docs` and no other path, and moving the directory is silent — the build
   stays exit 0 and the artifact loses its `docs[]`. The gap is filed upstream; the app does
   not compensate for it. Root `objectstack.config.ts` does one thing:
   `composeStacks([...modules, salesStack], { manifest: 'preserve' })`, plus the existing
   `HOTCRM_COMPOSITION` knob. `AGENTS.md`'s prohibition targets `packages/<x>/src/` — the
   retired per-package-`package.json` monorepo — which this is not: one `package.json`, one
   `tsconfig.json`, one build. Its *Project Architecture* section is rewritten in the layout
   PR, which is therefore a governed PR (draft, the maintainer's own merge). A later module
   (PSA) is one more directory.

7. **Source imports follow the dependency edges; nothing else.** A file may import from its
   own directory or from `src/sales/`; never sideways between modules, never upward. Every
   cross-package source therefore has one deterministic home — the lowest package all its
   consumers depend on — which is the property a `shared/` directory lacks:

   | File today | ≈ tokens | Consumers after the split | Home |
   | --- | ---: | --- | --- |
   | `src/objects/_hook-api.ts` | 2,358 | every hook in every package | `sales/` — a platform gap: `@objectstack/spec` 17.4.0 exports no type for a hook's `ctx.api`; filed upstream, deleted when the platform exports it |
   | `src/objects/_picklists.ts` | 3,001 | sales objects, views, flows; revenue's contract and quote; sales' executive dashboard and locale packs | `sales/` — product vocabulary; a second platform gap (no global picklist metadata kind), filed upstream |
   | `src/dashboards/shared-widgets.ts` | 702 | the two cross-domain dashboards and the sales dashboard | `sales/` |
   | `src/data/_shared.ts` | 1,171 | every package's seed rows | `sales/` |
   | `src/objects/_thresholds.ts` | 1,290 | sales flows and sharing; revenue's quote | `sales/`; revenue imports it along its edge |
   | `src/actions/global.actions.ts` (the activity-action factory) | 6,681 | hosts: four objects in sales, `crm_case` in service | factory in `sales/actions/`; each package's actions barrel instantiates its own hosts; service imports the factory along its edge |
   | `src/mappings/_shared.ts` | 612 | the three import mappings, all sales | `sales/` — no longer shared at all |

8. **The token gate measures `src/sales/`.** `scripts/check-source-token-ratchet.mjs` walks
   that directory instead of the whole tree, in the same two layers by subdirectory name
   (`objects`, `flows`, `actions` = business semantics; `views`, `pages`, `dashboards`,
   `apps` = interaction), and prints a reading for every package directory so a per-module
   budget (ADR-0130 §4) has its starting figures; only sales carries ceilings. That is the
   claim the gate exists for, in ADR-0130 §1.3(b)'s words — *a CRM sales module fits whole
   in an AI context window* — measured on the package a customer actually installs. By the
   figures above the reading is roughly 68k (core + sales + activity) plus 21.6k (the shell
   items) ≈ 90k authored tokens against a 134k tree. Both ceilings are re-derived from that
   reading with the script's own `anchor()` rule unless the maintainer rules numbers;
   lowering the ruled business ceiling is what this ruling authorises, and the layout PR
   quotes it. `test/source-token-ratchet.test.ts` learns the new scope in the same PR.

   **✅ Landed, and superseded in its last clause (2026-09-16, #1928).** The gate walks
   `src/sales/` and the two layers exactly as described, but "only sales carries ceilings" is
   no longer true and was never meant to last: it was the state that produced the starting
   figures §4 asked for. Maintainer ruling, verbatim and untranslated:

   > 「1928 门禁 改为 多 sales 模块的门禁」

   Every package now carries its own `business semantics`, `interaction layer` and
   `authored total` ceiling — twelve in all — each `anchor()` of that package's own
   reading, which is the per-module budget §4 promises. They are four INDEPENDENT gates:
   a module over its own ceiling reddens that module alone, so headroom cannot be borrowed
   across a package boundary. The package roster is read off disk (a directory under `src/`
   with an `objects/` directory), so a fifth package is seen the day it lands and the gate
   refuses to run until it has ceilings — committing a package's FIRST ceiling is an
   anchoring, not a raise. The numbers are in that script's header, with a worked row each.

9. **Sequence — a move PR, then packaging PRs with no moves.**
   - **PR 0 — layout.** Every file moves to its final directory (`git mv`, history kept);
     `objectstack.config.ts` still registers one stack from the new paths. The artifact is
     bit-identical (ADR-0130 D7: same FQNs, same owners, same navigation). Re-pointed in the
     same PR: the gate (item 8), `test/**` path globs through one roster helper,
     `.github/labeler.yml` (its guard fails on a glob that matches nothing), every doc that
     names or draws `src/<dir>/` (`test/docs-src-tree-paths.test.ts` is the guard),
     `.github/tasks/*.md`, and `AGENTS.md` *Project Architecture* plus the import rule of
     item 7. No manifest, no `composeStacks`, no navigation change.
   - **PR 1 — sales is the app, service is a module.** `src/sales/index.ts` becomes the
     app-package `defineStack`; `src/service/index.ts` the module's, with `dependencies` and
     the `navigationContributions` that carry `nav_case`, `nav_knowledge`,
     `nav_service_dashboard`, `nav_my_cases` and `nav_report_sla` into the groups the app
     keeps; `revenue/` and `marketing/` stay registered by the sales stack until their turn;
     the root config composes with `manifest: 'preserve'`. Acceptance: `packages[]` carries
     exactly two entries, the app first; `GET /api/v1/packages` lists both `writable: false`;
     the boot log has no `nav_contribution_group_missing`; the sidebar is unchanged; every
     object keeps its FQN and owner. Two classes the four rules never measured are measured
     here and recorded in the PR: the sales-owned executive dashboard binding a service
     dataset, and a sales-owned page component listing a service object.
   - **Revenue and marketing** are packaged the same way when there is a reason to — the
     ruling asked for sales and support first; their directories are final from PR 0, so
     packaging either is a manifest, an `index.ts` and a navigation contribution, with no
     move.
   - **PSA** follows as `src/psa/` (`psa-module-plan.md`).

The three upstream blockers under *上游缺口* are no longer the reason to wait: the compile
path and per-package registration are carried by the 17.4.0 pin, and the Studio writable
verdict does not gate a module booted from an artifact — the version table in
`psa-module-plan.md`, *Where PSA sits*, cites the changelog entries. PR 1 is still the
measurement that proves it here.

## References

- ADR-0130 — the release artifact is the co-ownership boundary (one artifact, N packages)
- ADR-0129 — the object `name` is the canonical id (why a rename is a deep rewrite)
- ADR-0019 — the App is the consumer unit; D4, an App owns *a set of* namespaces
- ADR-0048 §3.5 — namespace rename-on-install is an explicit non-goal
- [objectstack#14122](https://github.com/objectstack-ai/objectstack/issues/14122) — the
  proposal, the measured cross-package matrix (§4), and the epic tracking this work
- [`module-split-inventory.json`](./module-split-inventory.json) — the inventory, hand-maintained
  and stamped with the commit it was measured at
