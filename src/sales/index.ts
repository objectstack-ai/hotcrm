// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { defineStack, type ObjectStackDefinition, type ObjectStackDefinitionInput } from '@objectstack/spec';

/**
 * Everything the app package REGISTERS, as opposed to what it IS.
 *
 * The four identity keys are not in it and cannot be passed: `manifest`,
 * `requires` and `i18n` are this package's own statement about itself, and
 * `packages` belongs to the artifact envelope one level up.
 */
export type HotCrmAppCollections = Omit<
  ObjectStackDefinitionInput,
  'manifest' | 'packages' | 'requires' | 'i18n'
>;

/**
 * `app.objectstack.hotcrm` — the App package of this artifact, and the sales
 * module (ADR-0130 D4, `module-split-plan.md` decision 4).
 *
 * ADR-0019 requires exactly one `type: 'app'` package per artifact and the
 * artifact takes its identity from it; nothing requires that package to be an
 * empty shell, and the platform's own two-package fixture
 * (`examples/app-multi-package`) says the opposite — its App package owns the
 * customer object and the navigation. So sales IS the app: it keeps the id
 * `app.objectstack.hotcrm`, owns the customer core and the activity objects,
 * the app and its navigation GROUPS, the cross-domain dashboards and skills,
 * the permission sets, the positions, the four locale packs, the import
 * mappings, and every source file more than one package needs.
 *
 * ## Why this file takes its collections instead of importing them
 *
 * Two reasons, and both dissolve on their own schedule.
 *
 *  1. `src/revenue/` and `src/marketing/` are packages in the LAYOUT but not
 *     yet packages in the ARTIFACT — the ruling asked for sales and support
 *     first — so the app package registers their collections for now. A file
 *     under `src/sales/` may not import from a module directory (AGENTS.md
 *     *Project Architecture* rule 2: own directory or `src/sales/`, never
 *     sideways), so the assembly of those two cannot happen here. It happens
 *     in `objectstack.composition.ts`, the root module that is allowed to see
 *     every package.
 *  2. That root module is also where about a dozen suites read the AUTHORED
 *     collections, upstream of any `defineStack`. Splitting the lists between
 *     here and there would give them two places to read and this repo two
 *     places to keep in step.
 *
 * When revenue and marketing become packages of their own, the argument
 * shrinks to the sales barrels and this file can import them directly.
 *
 * ## What is deliberately NOT here
 *
 * The `HOTCRM_COMPOSITION` knob (#1361). It selects flows, permission sets and
 * seed families, and it is resolved once at the root and handed down already
 * applied — `objectstack.config.ts` carries the full audit of what the knob
 * changes and why, because the answer is about the ARTIFACT, not about this
 * package.
 */
export const createHotCrmAppStack = (collections: HotCrmAppCollections): ObjectStackDefinition =>
  defineStack({
    manifest: {
      id: 'app.objectstack.hotcrm',
      namespace: 'crm',
      version: '3.1.0',
      type: 'app',
      name: 'HotCRM',
      description: 'AI-Native CRM for the ObjectStack marketplace — Accounts, Contacts, Leads, Opportunities, Cases, Knowledge, Forecasts, Campaigns, Contracts.',
      // ADR-0087 protocol handshake (ADR-0025 §3.2): the metadata/runtime
      // protocol major this app's metadata is authored against. Only the major
      // participates in the check — a runtime on a different major refuses the
      // load with a structured OS_PROTOCOL_INCOMPATIBLE diagnostic (naming the
      // `objectstack migrate meta` replay) instead of failing deep in a schema
      // parse. Bump together with `specVersion` on every platform upgrade
      // (docs/MAINTENANCE.md §3) — `test/docs-declared-versions.test.ts` now
      // enforces that pairing against `objectstack.manifest.json` instead of
      // trusting this comment, because two platform upgrades in a row (rc.2,
      // then rc.3) moved the manifest and left this line behind (#728). Every
      // package of this artifact states the same major; `src/service/index.ts`
      // repeats it for the same reason.
      engines: { protocol: '^17.4.0' },
    },

    // ─── Platform capabilities this app needs ─────────────────────────
    // The runtime resolves each capability name to a built-in service plugin
    // and auto-loads it (with extras like Automation's node packs). No need
    // to hand-instantiate plugins or pass `--preset` flags. See
    // packages/cli/src/commands/serve.ts CAPABILITY_PROVIDERS for the
    // complete map; explicit `plugins: [...]` always shadows the resolver.
    // `auth` enables the auth/login surface (login/register) via @objectstack/plugin-auth.
    // `ui`   serves the unified Console shell and CRM apps under /_console/
    //        (login at /_console/login). ObjectStack 7.x replaced the legacy
    //        /_studio/ and /_account/ mounts with this single /_console/ surface.
    // Both are required for a clickable login flow when running `objectstack start`
    // off the compiled artifact.
    // Note: the foundational slate (queue, job, cache, settings, email,
    // storage) is auto-injected by the CLI for every non-`minimal`
    // preset — see `ALWAYS_CAPS` in packages/cli/src/commands/serve.ts.
    // Listed below only the *opt-in* capabilities this stack actually
    // wants on top of that slate.
    // `triggers` installs the record-change + schedule trigger providers that
    // actually fire autolaunched flows (record_change & schedule types). Without
    // it the `automation` engine registers flows but nothing ever launches them.
    // Schedule triggers run via the job service (in the always-on slate).
    //
    // Declared HERE, on the App package, and nowhere else: `requires` composes
    // by CONCATENATION, so a module repeating a capability would ship it twice,
    // and the capability slate is a property of the artifact a customer
    // installs — which is what an App package is (ADR-0019 D1).
    //
    // `ai` is deliberately NOT listed. ObjectStack 11.3.0 (ADR-0025 S2) removed
    // `@objectstack/service-ai` from the open edition — the AI runtime now ships
    // only in the closed cloud package, and the framework CLI does not depend on
    // it. Under ObjectStack 16, `requires: ['ai']` is a *fail-fast* capability:
    // the serve command hard-aborts boot when the package is absent, so keeping it
    // here would break `objectstack start`/`dev` for this open-edition app (the AI
    // block runs before every other capability resolves). The AI metadata is
    // unaffected — the skills still validate, build into the artifact, and run
    // wherever a runtime provides the `ai` tier (cloud's objectos-runtime). There
    // are no app-authored agents: they were retired in #512 and the surface is
    // skills-only (ADR-0063 §2); skills attach to a platform agent by `surface`.
    // A local open-edition boot simply omits the AI service and hides its console
    // surface. To run AI locally, declare `@objectstack/service-ai` (cloud) in
    // package.json — its mere presence best-effort auto-loads it.
    // `hierarchy-security` is the ONE enterprise-edition capability this app
    // declares (#880). `sales_manager` authors `writeScope: 'own_and_reports'` on
    // `crm_contract`, an ADR-0057 HIERARCHY scope resolved by the
    // `hierarchy-scope-resolver` service that ships only in
    // `@objectstack/security-enterprise`. Declaring the capability is REQUIRED to
    // author that scope at all — `defineStack` refuses the grant outright without
    // it — and the pair is one declaration: move them together or not at all.
    //
    // Maintainer ruling, 2026-08-11, verbatim: 「本项目是元数据app，在企业版运行就
    // 具备企业版相关的能力，不重复开发。」 The app states what it MEANS and the
    // edition supplies the capability, rather than approximating it with a broader
    // open-edition value.
    //
    // UNLIKE `ai` above, this is SAFE to declare on an open-edition boot and does
    // NOT fail fast. Verified against `@objectstack/cli`'s serve command: the
    // capability resolver looks the token up in `CAPABILITY_PROVIDERS`, finds no
    // entry, and because `hierarchy-security` IS in the known
    // `PLATFORM_CAPABILITY_TOKENS` vocabulary it takes the deliberate "stay quiet"
    // branch — no warning, no abort — since the capability arrives via an explicit
    // enterprise plugin in `plugins[]`. Only tier-gated tokens (ai / ai-studio /
    // i18n / ui / auth) have the dedicated hard-abort blocks the note above
    // describes. `objectstack validate` does print one informational line naming
    // the package to install; that is expected output, asserted by
    // `test/contract-write-depth.test.ts`, not a defect to silence.
    //
    // What an OPEN-edition boot gets: the resolver is absent, so the scope fails
    // CLOSED to owner-only and a Sales Manager still cannot edit a rep's contract.
    // That is an edition boundary, and the docs say so per edition.
    requires: ['automation', 'triggers', 'analytics', 'auth', 'ui', 'approvals', 'sharing', 'hierarchy-security'],

    // The locale configuration is the ARTIFACT's, and `i18n` is a
    // `'single'`-disposition key: two stacks declaring different values make
    // `composeStacks` throw, and declaring identical ones twice is a second
    // place to drift. It lives on the App package, alone.
    i18n: {
      defaultLocale: 'en',
      supportedLocales: ['en', 'zh-CN', 'ja-JP', 'es-ES'],
      fallbackLocale: 'en',
    },

    ...collections,
  });
