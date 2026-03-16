# Changelog

All notable changes to HotCRM will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
