# 📦 Version Management & Release Process

Complete guide for managing versions and releases in ObjectStack applications.

---

## Semantic Versioning

ObjectStack applications follow [SemVer 2.0.0](https://semver.org/) specification:

```
MAJOR.MINOR.PATCH

Example: 1.2.3
  │   │   └─ PATCH: Bug fixes (backward compatible)
  │   └───── MINOR: New features (backward compatible)
  └───────── MAJOR: Breaking changes (not backward compatible)
```

### Version Increment Rules

**PATCH (1.0.0 → 1.0.1)**
- Bug fixes
- Performance improvements
- Documentation updates
- No API changes

**MINOR (1.0.0 → 1.1.0)**
- New features
- New optional fields
- New views/actions
- Backward compatible

**MAJOR (1.0.0 → 2.0.0)**
- Breaking API changes
- Removed fields/objects
- Changed data types
- Renamed objects

---

## Release Process

### Step 1: Prepare Release

```bash
# Ensure working directory is clean
git status

# Pull latest changes
git pull origin main

# Ensure all tests pass
pnpm test

# Ensure build succeeds
pnpm build

# Run validation
node scripts/validate-protocol.js
```

### Step 2: Update Version

**Update objectstack.config.ts:**

```typescript
// File: objectstack.config.ts
export default defineStack({
  manifest: {
    id: 'com.mycompany.app',
    version: '1.1.0',  // ← Update version here
    type: 'app',
    name: 'My Application'
  },
  // ...
});
```

**Update package.json** (if publishing to npm):

```json
{
  "name": "@mycompany/app",
  "version": "1.1.0",
  "description": "My application"
}
```

### Step 3: Write Changelog

Create or update `CHANGELOG.md`:

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2024-01-30

### Added
- New Product object with inventory tracking (#45)
- Kanban view for Order management (#47)
- Sales dashboard with revenue metrics (#48)
- AI-powered lead scoring (#50)

### Changed
- Improved validation rules for Customer email (#46)
- Updated Contact form layout to tabbed view (#49)
- Enhanced Opportunity probability calculation (#51)

### Fixed
- Fixed calculation error in Order total amount (#52)
- Resolved permission issue for sales_user role (#53)
- Corrected timezone handling in Activity dates (#54)

### Deprecated
- Legacy `status` field in Account object (use `Status` instead)
- Will be removed in v2.0.0

### Security
- Added rate limiting to API endpoints (#55)
- Enhanced password validation rules (#56)

## [1.0.0] - 2024-01-15

### Added
- Initial release
- Core CRM objects: Account, Contact, Opportunity, Lead
- Basic sales pipeline
- Email integration
```

### Changelog Categories

**Added**: New features
- New objects, fields, views
- New actions, workflows
- New integrations

**Changed**: Modifications to existing functionality
- Updated UI layouts
- Improved algorithms
- Enhanced validations

**Fixed**: Bug fixes
- Resolved errors
- Fixed edge cases
- Corrected calculations

**Deprecated**: Soon-to-be removed features
- Mark what will be removed
- Provide migration path
- Set removal version

**Removed**: Deleted features
- Removed objects/fields
- Deleted deprecated features
- Breaking changes

**Security**: Security improvements
- Vulnerability fixes
- Security enhancements
- Permission updates

### Step 4: Commit and Tag

```bash
# Stage all changes
git add .

# Commit with conventional commit message
git commit -m "chore(release): version 1.1.0

- Add Product object with inventory tracking
- Add Sales dashboard with revenue metrics
- Fix Order calculation bug
- Improve Customer email validation

BREAKING CHANGE: Removed legacy status field from Account
"

# Create annotated tag
git tag -a v1.1.0 -m "Release version 1.1.0

Features:
- Product inventory tracking
- Sales dashboard
- AI lead scoring

Bug Fixes:
- Order total calculation
- Permission issues
- Timezone handling
"

# Push commits and tags
git push origin main
git push origin v1.1.0
```

### Step 5: Build Release

```bash
# Clean build
pnpm clean
pnpm install

# Build all packages
pnpm build

# Run final validation
pnpm test
pnpm lint

# Publish to npm (if applicable)
pnpm publish
```

### Step 6: Create GitHub Release

On GitHub:
1. Go to Releases → Draft a new release
2. Choose tag: `v1.1.0`
3. Release title: `v1.1.0 - Feature Name`
4. Copy changelog content to description
5. Attach build artifacts (if any)
6. Publish release

---

## Conventional Commits

Use [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Commit Types

```bash
# Features
git commit -m "feat(crm): add lead scoring algorithm"

# Bug fixes
git commit -m "fix(products): correct price calculation"

# Documentation
git commit -m "docs(readme): update installation steps"

# Code style
git commit -m "style(objects): format with prettier"

# Refactoring
git commit -m "refactor(core): optimize query builder"

# Tests
git commit -m "test(opportunity): add validation tests"

# Build
git commit -m "build(deps): upgrade @objectstack/spec to v0.6.1"

# CI/CD
git commit -m "ci(github): add automated release workflow"

# Chores
git commit -m "chore(release): version 1.1.0"
```

### Breaking Changes

```bash
git commit -m "feat(account)!: rename status to Status

BREAKING CHANGE: The 'status' field has been renamed to 'Status'
to comply with PascalCase naming convention.

Migration:
- Update all references from 'status' to 'Status'
- Run migration script: node scripts/migrate-field-names.js
"
```

---

## Feature Branch Workflow

### Creating Feature Branches

```bash
# Create feature branch from main
git checkout main
git pull origin main
git checkout -b feature/add-inventory-module

# Make changes
# ...

# Commit changes
git add .
git commit -m "feat(inventory): add product stock tracking"

# Push feature branch
git push origin feature/add-inventory-module
```

### Pull Request Process

1. **Create PR** on GitHub
2. **Title**: Use conventional commit format
3. **Description**: Link to issue, describe changes
4. **Review**: Get at least one approval
5. **CI**: Ensure all checks pass
6. **Merge**: Squash and merge to main

### Branch Naming

```bash
# Features
feature/add-product-variants
feature/ai-lead-scoring

# Bug fixes
fix/order-calculation-bug
fix/permission-issue

# Documentation
docs/update-api-guide
docs/add-examples

# Refactoring
refactor/optimize-queries
refactor/clean-up-types

# Experiments
experiment/new-ui-layout
experiment/alternative-algorithm
```

---

## Backward Compatibility

### Safe Changes (Backward Compatible)

```typescript
// ✅ Add new optional field
fields: {
  NewField: { 
    type: 'text', 
    required: false  // Optional is safe
  }
}

// ✅ Add new view
views: [
  {
    type: 'list',
    name: 'new_view',
    viewType: 'kanban'
  }
]

// ✅ Add new validation (not affecting existing data)
validations: [
  {
    type: 'script',
    name: 'new_validation',
    formula: 'NewField != null'
  }
]

// ✅ Add new workflow
workflows: [
  {
    type: 'fieldUpdate',
    name: 'new_workflow',
    trigger: { on: 'create' }
  }
]
```

### Breaking Changes (Major Version)

```typescript
// ❌ Remove existing field
// fields: {
//   OldField: { ... }  // Don't delete directly
// }

// ✅ Deprecate first, remove later
fields: {
  OldField: {
    type: 'text',
    deprecated: true,
    deprecationMessage: 'Use NewField instead. Will be removed in v2.0.0'
  },
  NewField: {
    type: 'text',
    label: 'New Field'
  }
}

// ❌ Change field type (breaks existing data)
// Status: { type: 'number' }  // Was 'select'

// ✅ Add new field, migrate data, deprecate old
fields: {
  StatusOld: {
    type: 'select',
    deprecated: true,
    deprecationMessage: 'Use StatusCode instead'
  },
  StatusCode: {
    type: 'number',
    label: 'Status Code'
  }
}

// ❌ Rename object
// name: 'new_object_name'  // Was 'old_object_name'

// ✅ Create new object, migrate data, deprecate old
// Then remove in major version with migration guide
```

### Deprecation Strategy

**Phase 1: Deprecation (Minor Version)**
```typescript
fields: {
  OldField: {
    type: 'text',
    deprecated: true,
    deprecationMessage: 'Use NewField instead. Will be removed in v2.0.0',
    migrationGuide: 'https://docs.example.com/migration-v2'
  }
}
```

**Phase 2: Removal (Major Version)**
```markdown
# Migration Guide v2.0.0

## Breaking Changes

### Removed Fields

1. **Account.OldField** → Use **Account.NewField**
   ```typescript
   // Before (v1.x)
   account.OldField
   
   // After (v2.x)
   account.NewField
   ```

2. Run migration script:
   ```bash
   node scripts/migrate-to-v2.js
   ```
```

---

## Changeset Management

For monorepos, use [@changesets/cli](https://github.com/changesets/changesets):

### Install Changesets

```bash
pnpm add -D @changesets/cli
pnpm changeset init
```

### Workflow

```bash
# 1. Make changes to packages
# ...

# 2. Add changeset
pnpm changeset add
# Select packages that changed
# Select version bump type (major/minor/patch)
# Write changelog summary

# 3. Review changeset
cat .changeset/new-changeset-id.md

# 4. Commit changeset
git add .changeset
git commit -m "chore: add changeset for new feature"

# 5. Version (when ready to release)
pnpm changeset version
# Updates package.json versions
# Updates CHANGELOG.md files
# Removes consumed changesets

# 6. Build and publish
pnpm build
pnpm changeset publish
```

### Changeset Example

```markdown
---
'@hotcrm/crm': minor
'@hotcrm/products': patch
---

Add product variant support to CRM package.

Fix price calculation bug in products package.
```

---

## Release Checklist

Before every release:

### Pre-Release
- [ ] All tests pass (`pnpm test`)
- [ ] Build succeeds (`pnpm build`)
- [ ] Lint passes (`pnpm lint`)
- [ ] Protocol validation passes (`node scripts/validate-protocol.js`)
- [ ] No TypeScript errors (`pnpm typecheck`)
- [ ] Dependencies up to date
- [ ] Security audit clean (`pnpm audit`)

### Documentation
- [ ] CHANGELOG.md updated
- [ ] Version bumped in objectstack.config.ts
- [ ] Version bumped in package.json
- [ ] Migration guide written (for breaking changes)
- [ ] API documentation updated
- [ ] Examples updated

### Git
- [ ] All changes committed
- [ ] Conventional commit format used
- [ ] Tag created (v1.x.x)
- [ ] Pushed to origin

### Release
- [ ] GitHub release created
- [ ] Release notes published
- [ ] npm package published (if applicable)
- [ ] Docker image built (if applicable)
- [ ] Documentation deployed

### Post-Release
- [ ] Smoke tests in production
- [ ] Monitor error logs
- [ ] Announce release (Slack, email, etc.)
- [ ] Update internal docs

---

## Version Matrix

Track compatibility between packages:

| App Version | @objectstack/spec | Node.js | TypeScript |
|-------------|-------------------|---------|------------|
| 2.0.0       | ^0.7.0            | >=20    | ^5.3       |
| 1.5.0       | ^0.6.1            | >=20    | ^5.3       |
| 1.0.0       | ^0.6.0            | >=18    | ^5.0       |

---

## Release Automation

### GitHub Actions Workflow

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: pnpm/action-setup@v2
        with:
          version: 9
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Run tests
        run: pnpm test
      
      - name: Build
        run: pnpm build
      
      - name: Publish to npm
        run: pnpm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
      
      - name: Create GitHub Release
        uses: softprops/action-gh-release@v1
        with:
          generate_release_notes: true
```

---

## Rollback Strategy

If a release causes issues:

### Immediate Rollback

```bash
# 1. Revert to previous version
git revert <commit-sha>
git push origin main

# 2. Tag new patch version
git tag -a v1.0.1 -m "Hotfix: Rollback breaking change"
git push origin v1.0.1

# 3. Rebuild and publish
pnpm build
pnpm publish
```

### Communication

1. **Alert users**: Post incident notice
2. **Explain issue**: What went wrong
3. **Provide workaround**: Temporary fix
4. **Timeline**: When permanent fix will be ready

---

## Best Practices

### DO
- ✅ Follow SemVer strictly
- ✅ Write detailed changelogs
- ✅ Test before releasing
- ✅ Deprecate before removing
- ✅ Provide migration guides
- ✅ Automate releases
- ✅ Maintain backward compatibility

### DON'T
- ❌ Skip version numbers
- ❌ Reuse version tags
- ❌ Make breaking changes in minor versions
- ❌ Delete deprecated features without warning
- ❌ Release without testing
- ❌ Forget to update documentation

---

## Related Guides

- [Development Workflow](./workflow.prompt.md)
- [Iterative Development](./iteration.prompt.md)
- [Best Practices](./best-practices.prompt.md)
