# Changelog

All notable changes to HotCRM will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
