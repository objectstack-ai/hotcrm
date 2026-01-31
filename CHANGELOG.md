# Changelog

All notable changes to HotCRM will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
