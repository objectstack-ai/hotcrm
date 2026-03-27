# Changelog

All notable changes to HotCRM will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- **Optimize static file access paths — serve SPA assets directly from Vercel CDN** — Console
  and Studio SPA static assets (JS, CSS, fonts, images) are now copied to `public/console/` and
  `public/_studio/` during the Vercel build step. Vercel's filesystem-first routing serves these
  files directly from its CDN edge network, bypassing the `api/[[...route]]` serverless function
  entirely. This eliminates unnecessary cold-start latency for asset requests, enables browser
  and CDN caching with `Cache-Control: public, max-age=31536000, immutable` headers for
  content-hashed assets, and reduces serverless function invocations. The API handler retains
  its static SPA plugin for non-Vercel deployments (Docker, local dev) and SPA HTML fallback.
  - Updated `scripts/build-vercel.sh` to copy SPA dist assets to `public/` after package builds
  - Added `headers` configuration in `vercel.json` for long-lived cache on asset paths
  - Updated `.gitignore` to exclude `public/console/` and `public/_studio/` (build artifacts)

### Changed
- **Vercel deployment — switched from InMemoryDriver to TursoDriver** — The Vercel serverless
  handler (`api/[[...route]].ts`) now uses `@objectstack/driver-turso` (TursoDriver) instead of
  `@objectstack/driver-memory` (InMemoryDriver). In production, set `TURSO_DATABASE_URL` and
  `TURSO_AUTH_TOKEN` environment variables to connect to a Turso cloud database for persistent
  data across cold starts. Without those variables, falls back to `:memory:` (ephemeral SQLite,
  same behavior as before). Added `@objectstack/driver-turso@^3.3.0` to devDependencies and
  updated `vercel.json` `includeFiles` to bundle the Turso driver and its dependencies.
- **Upgrade all dependencies recursively** — Ran `pnpm upgrade -r` across the monorepo.
  - `@objectstack/*` packages upgraded from `^3.2.8` to `^3.3.0` (spec, cli, runtime, objectql, driver-memory, plugin-auth, plugin-hono-server, service-i18n, studio)
  - `@object-ui/console` upgraded from `^3.1.3` to `^3.1.4`
  - `hono` upgraded from `^4.12.8` to `^4.12.9`
  - Added `@opentelemetry/api@^1.9.0` as a devDependency — required peer dependency of
    `@better-auth/core@1.5.6` (transitive via `@objectstack/plugin-auth` → `better-auth`).
    Without it, Vercel deployments crash with `ERR_MODULE_NOT_FOUND` on cold start.
  - Updated `vercel.json` `includeFiles` to bundle `@opentelemetry/api` into the serverless function
  - All 210 test files (4104 tests) continue to pass

### Fixed
- **Fix dashboard metadata columns/options compliance across all packages** — All `table`-type
  dashboard widgets now include `options.columns` specifying the fields to display, preventing
  rendering errors (`Cannot read properties of undefined (reading 'columns')`). Additionally,
  converted all widget `filter` fields from the non-compliant ObjectQL array format
  (`['field', 'op', 'value']`) to the MongoDB-style `FilterCondition` record format
  (`{ field: { $op: value } }`) expected by `DashboardSchema`. All 15 dashboards across CRM,
  Finance, Support, Marketing, Products, HR, Analytics, Integration, Community, Healthcare,
  Real-Estate, Financial-Services, and Education now pass `DashboardSchema.parse()` validation
  at module load time.
  - Affected files: `sales.dashboard.ts`, `crm.dashboard.ts`, `executive.dashboard.ts`,
    `support.dashboard.ts`, `finance.dashboard.ts`, `marketing.dashboard.ts`, `cpq.dashboard.ts`,
    `hr.dashboard.ts`, `analytics.dashboard.ts`, `integration.dashboard.ts`,
    `community.dashboard.ts`, `healthcare.dashboard.ts`, `brokerage.dashboard.ts`,
    `wealth_management.dashboard.ts`, `admissions.dashboard.ts`
  - Updated test expectations in CRM, Support, HR to reflect successful validation
  - Added dashboard validation tests with `options.columns` checks for all 12 packages that have
    `table`-type widgets: CRM (3 dashboards), Support, Finance, Marketing, Products, Analytics,
    Integration, Community, Healthcare, Real-Estate, Financial-Services, Education (HR dashboards
    contain no `table` widgets; HR tests assert only successful module load / schema validation)
  - Extracted shared `assertTableWidgetsHaveColumns()` test helper to
    `packages/core/__tests__/helpers/dashboard-test-utils.ts`
  - Also audited `*_enhanced.ts` (6 files) and `*.blank_page.ts` (3 files) — confirmed compliant

### Added
- **Load `@objectstack/plugin-auth` in Vercel deployment** — The Auth Plugin (better-auth based)
  is now registered in the Vercel serverless handler (`api/[[...route]].ts`), providing
  authentication & identity services (session management, user registration/login, OAuth,
  organization support, 2FA, magic links, passkeys) in production deployments.
  - Added `@objectstack/plugin-auth@^3.2.6` to devDependencies
  - Updated `vercel.json` `includeFiles` to bundle the Auth Plugin dist with the serverless function

### Fixed
- **Fix i18n translations not loading in Console** — Register `I18nServicePlugin` from
  `@objectstack/service-i18n` in `api/[[...route]].ts` (Vercel serverless handler) before
  `AppPlugin` so the kernel has a live i18n service when `AppPlugin.loadTranslations()` runs.
  Without this, object/field labels in the Console SPA showed raw English-only keys instead of
  translated strings. Also pass aggregated `translations` and `i18n` config to the root
  `AppPlugin` so all business plugin translation bundles are loaded on startup.
  Added `I18nServicePlugin` to `objectstack.config.ts` for consistency in local `pnpm dev`.
  - Added `@objectstack/service-i18n@^3.2.8` to devDependencies
  - `GET /api/v1/i18n/translations/:locale` now returns merged translation bundles
- **Fix Vercel POST request timeout (login hangs for 60 s)** — Replaced `handle()` from
  `@hono/node-server/vercel` with `getRequestListener()` from `@hono/node-server` and added an
  `extractBody()` helper. Vercel's Node.js runtime pre-buffers the entire request body onto
  `IncomingMessage.rawBody` / `.body` before invoking the handler, so the original readable stream
  is already drained when our code runs. The previous `handle()` adapter tried to re-read that
  consumed stream, causing `req.json()` inside Hono to hang indefinitely and triggering Vercel's
  60 s timeout on all POST/PUT/PATCH requests (e.g. `/api/v1/auth/sign-in/email`). The new
  `extractBody()` helper reads `rawBody`/`body` synchronously from the pre-buffered properties and
  builds a fresh `Request` object, resolving the hang. GET/HEAD/OPTIONS requests are unaffected and
  continue to call `app.fetch(request)` directly. (Fixes #295)
- **Fix Vercel login timeout (60 s serverless handler hang)** — The serverless handler bootstrap
  could hang indefinitely when a plugin's `init`/`start` returned a never-resolving promise (e.g.
  missing dependency, unresolved network call, or coding error). Added three layers of timeout
  protection:
  - Each `kernel.use()` call is wrapped with a **10 s** per-plugin timeout.
  - `kernel.bootstrap()` (runs init + start on all plugins) has a **30 s** timeout.
  - The entire `bootstrap()` function has a **50 s** budget (leaving 10 s margin for Vercel's 60 s
    function limit).
  - On timeout or any bootstrap error the handler now returns **503 Service Unavailable** with a
    JSON body instead of silently consuming the full 60 s limit.
  - Added timestamped diagnostic logging (`[HotCRM] [<elapsed>ms] …`) at every bootstrap step so
    that the blocking plugin can be identified from Vercel function logs.
- **Fail-fast on missing `AUTH_SECRET` in Vercel** — When running on Vercel (`VERCEL` env var set),
  the handler now throws immediately if `AUTH_SECRET` is not configured, instead of silently falling
  back to an insecure dev placeholder. The error message directs to Vercel Dashboard settings.
- **Fix `vercel.json` buildCommand exceeding 256-character limit** — Vercel schema validation
  rejects `buildCommand` values longer than 256 characters. The previous inline command was
  454 characters. Extracted the build steps into `scripts/build-vercel.sh` and referenced it
  from `vercel.json` (`bash scripts/build-vercel.sh`, 28 characters).
- **Fix AuthPlugin 500 error on Vercel** — The AuthPlugin requires a `secret` option for signing
  sessions/tokens. Previously it was initialized without options (`new AuthPlugin()`), which caused
  the server to crash with `Error("AuthPlugin: secret is required")` during bootstrap. Now reads
  `process.env.AUTH_SECRET` with a development fallback.

### Changed
- **Upgraded @objectstack/* to v3.2.6 and @object-ui/console to v3.1.3** (March 2026)
  - @objectstack/spec: ^3.2.1 → ^3.2.6
  - @objectstack/cli: ^3.2.1 → ^3.2.6
  - @objectstack/runtime: ^3.2.1 → ^3.2.6
  - @objectstack/plugin-hono-server: ^3.2.1 → ^3.2.6
  - @objectstack/objectql: ^3.2.1 → ^3.2.6
  - @objectstack/driver-memory: ^3.2.1 → ^3.2.6
  - @objectstack/studio: ^3.2.1 → ^3.2.6
  - @objectstack/core: ^3.2.1 → ^3.2.6
  - @objectstack/metadata: ^3.2.1 → ^3.2.6
  - @object-ui/console: ^3.1.2 → ^3.1.3
  - All 4036 tests passing (196 test files) with zero breaking changes

- **Upgraded @objectstack to v3.0.6 and @object-ui/console to v3.0.3** (February 16, 2026)
  - @objectstack/spec: ^3.0.3 → ^3.0.6
  - @objectstack/cli: ^3.0.3 → ^3.0.6
  - @objectstack/runtime: ^3.0.3 → ^3.0.6
  - @objectstack/plugin-hono-server: ^3.0.3 → ^3.0.6
  - @objectstack/objectql: ^3.0.3 → ^3.0.6
  - @objectstack/driver-memory: ^3.0.3 → ^3.0.6
  - @objectstack/studio: ^3.0.3 → ^3.0.6
  - @objectstack/core: ^3.0.2 → ^3.0.6
  - @objectstack/metadata: ^3.0.2 → ^3.0.6
  - @object-ui/console: ^3.0.2 → ^3.0.3
- All 3318 tests passing (173 test files) with zero breaking changes
- Upgrade history: v0.8.1 → ... → v2.0.6 → v3.0.0 → v3.0.3 → v3.0.6

- **Upgraded @objectstack to v3.0.0**: Major version upgrade (February 12, 2026)
  - @objectstack/spec: ^2.0.6 → ^3.0.0 (Zod 4 validation engine, new ObjectSchema.create() API)
  - @objectstack/cli: ^2.0.6 → ^3.0.0
  - @objectstack/studio: ^2.0.6 → ^3.0.0 (new Studio plugin extensibility API)
  - @objectstack/core: ^2.0.6 → ^3.0.0
  - @objectstack/runtime: ^2.0.6 → ^3.0.0
  - @objectstack/plugin-hono-server: ^2.0.6 → ^3.0.0
  - @objectstack/metadata: ^2.0.6 → ^3.0.0
  - @objectstack/objectql: ^2.0.6 → ^3.0.0
- All 10 packages upgraded to @objectstack v3.0.0 dependencies
- Updated pnpm lockfile for v3.0.0
- All 1604 tests passing (108 test files) with zero breaking changes
- Protocol compliance validated: All 94 business objects fully compliant with v3.0.0
- Updated ROADMAP.md with Phase 7 (v3.0.0 Upgrade) and re-organized Phase 8 (UI Completeness)
- Updated documentation version references across README.md, roadmap.mdx, spec evaluation
- Upgrade history: v0.8.1 → ... → v2.0.6 → v3.0.0

### Notable in @objectstack/spec v3.0.0
- **New API**: `ObjectSchema.create()` — recommended lighter alternative to `ObjectSchema.parse()`
- **Zod 4**: Internal validation engine upgraded from Zod 3 to Zod 4.3.6
- **Studio Module**: New `@objectstack/spec/studio` with `defineStudioPlugin()`, contribution schemas
- **Removed Modules**: `hub`, `auth`, `driver`, `permission` (none used by HotCRM)
- **Streamlined Exports**: 12 modules (down from 16), contracts module now empty

## [Previous - v2.0.6]

### Fixed
- Fixed 4 remaining PascalCase `Field.lookup()` references in CRM package
  - `activity.object.ts`: `"Contact"` → `"contact"`, `"Account"` → `"account"`
  - `task.object.ts`: `"Account"` → `"account"`, `"Contact"` → `"contact"`
- All `Field.lookup()` references now consistently use snake_case across all 65 objects

## [Previous]

### Changed
- **Upgraded @objectstack core to v1.0.0**: All packages upgraded to v1.0.0 (February 4, 2026)
  - @objectstack/spec: ^1.0.0
  - @objectstack/runtime: 1.0.0
  - @objectstack/core: 1.0.0
  - @objectstack/cli: ^1.0.0
  - @objectstack/plugin-hono-server: 1.0.0
- All packages (9 total) now use latest @objectstack v1.0.0 dependencies
- Updated pnpm lockfile with new dependencies
- All 378 tests passing with zero breaking changes
- Protocol compliance validated: All 65 business objects fully compliant
- Previous upgrades: v0.8.1 → v0.9.0 (Feb 2) → v0.9.1 → v0.9.2 (Feb 3) → v1.0.0 (Feb 4, 2026)

### Removed
- Removed outdated summary files (PHASE1_SUMMARY.md, DOCUMENTATION_UPDATE_SUMMARY.md)
- Removed duplicate plugin implementation summary from docs/

### Documentation
- Updated README.md to reflect v0.9.0 upgrade
- Updated CHANGELOG.md with upgrade details

## [Previous] - Before February 2, 2026

### Added
- **Plugin Architecture**: Each business package is now an independent plugin
  - CRM Plugin: Core CRM functionality (Account, Contact, Lead, Opportunity, Marketing)
  - Products Plugin: Product catalog and CPQ (depends on CRM)
  - Finance Plugin: Contract and payment management (depends on CRM)
  - Support Plugin: Customer support and knowledge base (depends on CRM)
- Plugin dependency management with topological sort
- Automatic plugin loading in dependency order
- Comprehensive plugin architecture documentation (docs/PLUGIN_ARCHITECTURE.md)
- Enhanced CLI server with plugin loading information
- Plugin structure validation

### Changed
- Restructured business packages as independent plugins with plugin.ts files
- Updated objectstack.config.ts to use plugin-based architecture
- Enhanced CLI server startup output to show plugin loading details
- Updated README with plugin architecture section

### Documentation
- Added docs/PLUGIN_ARCHITECTURE.md - Comprehensive plugin architecture guide
- Updated README.md with plugin architecture overview
- Added plugin creation guide with examples
- Documented plugin dependency management
- Added troubleshooting section for plugin issues

## [Unreleased - Previous]

### Added
- Comprehensive development workflow documentation
- Iterative development strategy guide (5-week MVP path)
- Version management and release process guide
- Best practices guide for data modeling, security, and performance
- Troubleshooting guide with common issues and solutions
- Application templates for CRM, ERP, and Project Management
- DEVELOPMENT_WORKFLOW.md as central development guide
- Enhanced GitHub Copilot instructions with workflow references

### Changed
- Updated .github/copilot-instructions.md with comprehensive guide references

### Documentation
- Added .github/prompts/workflow.prompt.md - Complete development workflow
- Added .github/prompts/iteration.prompt.md - Iterative development strategy
- Added .github/prompts/versioning.prompt.md - Version management guide
- Added .github/prompts/best-practices.prompt.md - Comprehensive best practices
- Added .github/prompts/troubleshooting.prompt.md - Common issues and solutions
- Added .github/prompts/templates.prompt.md - Application templates

## [1.0.0] - 2024-01-28

### Added
- Initial release of HotCRM
- Core CRM objects: Account, Contact, Lead, Opportunity
- Products package with Quote and CPQ functionality
- Finance package with Contract management
- Support package with Case management
- Protocol validation script
- Monorepo structure with pnpm workspaces
- TypeScript-based metadata definitions
- @objectstack/spec v0.6.1 compliance

### Changed
- Migrated from YAML to TypeScript object definitions
- Updated all field names to PascalCase convention
- Upgraded to @objectstack/spec v0.6.1

### Fixed
- Protocol compliance issues in all object definitions
- Field type naming (autoNumber instead of autonumber)

---

## How to Use This Changelog

### For Developers

When making changes, add entries under `[Unreleased]` section:

```markdown
### Added
- New feature description (#PR_NUMBER)

### Changed
- Modified feature description (#PR_NUMBER)

### Fixed
- Bug fix description (#PR_NUMBER)
```

### For Release Managers

When releasing a new version:

1. Rename `[Unreleased]` to the new version number and date
2. Add a new `[Unreleased]` section at the top
3. Update version in objectstack.config.ts
4. Create git tag: `git tag -a v1.x.x -m "Release v1.x.x"`

### Categories

- **Added** - New features
- **Changed** - Changes to existing functionality
- **Deprecated** - Soon-to-be removed features
- **Removed** - Removed features
- **Fixed** - Bug fixes
- **Security** - Security improvements

---

## Version History

### [1.0.0] - 2024-01-28
- Initial release

---

For the complete version management guide, see [Version Management](.github/prompts/versioning.prompt.md).
