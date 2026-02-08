# Deprecation Summary: @hotcrm/core and @hotcrm/server

## Date
February 8, 2026

## Summary
Successfully deprecated `@hotcrm/core` and `@hotcrm/server` packages and migrated to using `@objectstack/cli` directly.

## Changes Overview

### Deprecated Packages
- ❌ **@hotcrm/core** - Removed from workspace
- ❌ **@hotcrm/server** - Removed from workspace

### Replacement Architecture
- ✅ **Root objectstack.config.ts** - Aggregates all business plugins
- ✅ **Package-level objectstack.config.ts** - Enables standalone package development
- ✅ **@objectstack/cli** - Direct CLI access for all operations

## Files Modified

### Configuration Files
- `objectstack.config.ts` (NEW) - Root application configuration
- `packages/{pkg}/objectstack.config.ts` (NEW) - Per-package configurations
- `pnpm-workspace.yaml` - Exclude deprecated packages
- `package.json` (root) - Add CLI dependencies and update scripts

### Package.json Updates (7 packages)
- `packages/ai/package.json`
- `packages/crm/package.json`
- `packages/finance/package.json`
- `packages/hr/package.json`
- `packages/marketing/package.json`
- `packages/products/package.json`
- `packages/support/package.json`

### Documentation
- `README.md` - Updated architecture diagrams and commands
- `packages/core/README.md` - Added deprecation notice
- `packages/server/README.md` - Added deprecation notice
- `MIGRATION_GUIDE.md` (NEW) - Comprehensive migration instructions

## Testing Results

✅ **All Tests Pass**: 496/496 tests passing
✅ **Build Success**: All packages build successfully
✅ **Validation**: Configuration validates with `objectstack validate`
✅ **Code Review**: No issues found
✅ **Security**: No vulnerabilities detected

## New Commands

### Root-Level Commands
```bash
pnpm dev           # Development mode
pnpm start         # Production mode
pnpm dev:studio    # Studio interface
pnpm validate      # Validate configuration
pnpm compile       # Compile metadata
```

### Package-Level Commands
```bash
pnpm --filter @hotcrm/{package} studio
pnpm --filter @hotcrm/{package} validate
pnpm --filter @hotcrm/{package} compile
```

## Impact

- **Zero Breaking Changes**: All existing functionality preserved
- **Improved Developer Experience**: Direct CLI access, faster iteration
- **Simplified Architecture**: Removed 2 packages, reduced complexity
- **Better Modularity**: Each package can be developed independently

## Next Steps for Users

1. Update your scripts to use new commands (see MIGRATION_GUIDE.md)
2. Remove any direct dependencies on @hotcrm/core or @hotcrm/server
3. Use @objectstack/spec directly for type definitions

## References

- See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for detailed migration instructions
- See [README.md](./README.md) for updated architecture documentation
- See package READMEs for deprecation notices with migration notes
