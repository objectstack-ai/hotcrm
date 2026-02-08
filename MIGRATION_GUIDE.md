# Migration Guide: @hotcrm/core and @hotcrm/server Deprecation

## Overview

This guide helps you migrate from the deprecated `@hotcrm/core` and `@hotcrm/server` packages to the new `@objectstack/cli`-based architecture.

## What Changed?

### Deprecated Packages

1. **@hotcrm/core** - Removed unnecessary abstraction layer
   - Previously provided shared utilities and type helpers
   - Now: Use `@objectstack/spec` directly
   
2. **@hotcrm/server** - Replaced with root-level configuration
   - Previously: Separate package that aggregated all plugins
   - Now: Single `objectstack.config.ts` at repository root

### New Architecture

```
Before:
  @hotcrm/server (package) → Aggregates plugins → Runs CLI

After:
  objectstack.config.ts (root file) → Aggregates plugins → Runs CLI directly
```

## Migration Steps

### 1. Update Your Scripts

**Old Commands:**
```bash
# Development
pnpm --filter @hotcrm/server dev
pnpm --filter @hotcrm/server studio

# Build
pnpm --filter @hotcrm/server build

# Validation
pnpm --filter @hotcrm/server validate
```

**New Commands:**
```bash
# Development (from root)
pnpm dev
pnpm dev:studio

# Build (from root)
pnpm build

# Validation (from root)
pnpm validate
pnpm compile
```

### 2. Individual Package Development

Each business package now has CLI commands:

```bash
# Work on a specific package
pnpm --filter @hotcrm/crm studio
pnpm --filter @hotcrm/crm validate
pnpm --filter @hotcrm/crm compile

# Works for all packages
pnpm --filter @hotcrm/{package-name} {command}
```

### 3. Configuration Files

**Old Structure:**
```
packages/server/objectstack.config.ts  # Plugin aggregation
packages/server/src/index.ts           # Server startup
```

**New Structure:**
```
objectstack.config.ts                  # Plugin aggregation (root level)
packages/{pkg}/objectstack.config.ts   # Individual package configs
```

### 4. Remove Deprecated Dependencies

If your package depended on `@hotcrm/core`:

**Before (package.json):**
```json
{
  "dependencies": {
    "@hotcrm/core": "workspace:*",
    "@objectstack/spec": "^1.1.0"
  }
}
```

**After (package.json):**
```json
{
  "dependencies": {
    "@objectstack/spec": "^1.1.0"
  },
  "peerDependencies": {
    "@objectstack/cli": "^1.1.0"
  }
}
```

### 5. Update Imports

**Before:**
```typescript
import { VERSION } from '@hotcrm/core';
import { defineObjectFromZod } from '@hotcrm/core';
```

**After:**
```typescript
// Use @objectstack/spec directly
import { ObjectSchema, Field } from '@objectstack/spec';

// Example object definition
export const MyObject = ObjectSchema.create({
  name: 'my_object',
  label: 'My Object',
  fields: {
    name: Field.text({ label: 'Name', required: true }),
    email: Field.email({ label: 'Email', required: true }),
  }
});
```

## Package-Specific Changes

### Business Packages

All business packages (crm, finance, hr, marketing, products, support) now have:

1. **Removed `@hotcrm/core` dependency**
2. **Added CLI scripts:**
   ```json
   {
     "scripts": {
       "studio": "objectstack studio",
       "validate": "objectstack validate",
       "compile": "objectstack compile"
     }
   }
   ```
3. **Added peerDependency on `@objectstack/cli`**

### AI Package

The `@hotcrm/ai` package is a utility library (not a plugin), so:
- No `objectstack.config.ts` needed
- No CLI commands added
- Still provides ML/AI utilities for other packages

## Configuration Reference

### Root objectstack.config.ts

The root configuration aggregates all business plugins:

```typescript
import { defineStack } from '@objectstack/spec';
import { CRMPlugin } from './packages/crm/src/plugin';
import { FinancePlugin } from './packages/finance/src/plugin';
// ... other imports

export default defineStack({
  manifest: {
    id: 'com.hotcrm.app',
    namespace: 'hotcrm',
    version: '1.0.0',
    type: 'app',
    name: 'HotCRM Enterprise',
    description: 'AI-Native Enterprise CRM',
  },
  plugins: [
    CRMPlugin,
    FinancePlugin,
    // ... other plugins
  ],
});
```

### Package-Level objectstack.config.ts

Each package can have its own configuration for standalone development:

```typescript
import { defineStack } from '@objectstack/spec';
import { CRMPlugin } from './src/plugin';

export default defineStack({
  manifest: {
    id: 'com.hotcrm.crm',
    namespace: 'crm',
    version: '1.0.0',
    type: 'plugin',
    name: 'Sales Cloud',
    description: 'Core Sales Cloud',
  },
  plugins: [CRMPlugin],
});
```

## Benefits

1. **Simplified Architecture**: Removed unnecessary abstraction layers
2. **Direct CLI Access**: Use `@objectstack/cli` commands directly
3. **Independent Development**: Each package can be developed/validated independently
4. **Reduced Dependencies**: Fewer packages to maintain
5. **Better DX**: CLI commands available at both root and package level

## Troubleshooting

### "Cannot find module '@hotcrm/core'"

**Problem**: Code still imports from deprecated package.

**Solution**: 
```typescript
// Remove
import { ... } from '@hotcrm/core';

// Use instead
import { ... } from '@objectstack/spec';
```

### "Package not found in workspace"

**Problem**: Deprecated packages are excluded from workspace.

**Solution**: Update `pnpm-workspace.yaml`:
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - '!packages/core'      # Excluded
  - '!packages/server'    # Excluded
```

### Build/Validation Issues

**Problem**: CLI commands fail.

**Solution**:
1. Ensure packages are built: `pnpm build`
2. Install dependencies: `pnpm install`
3. Run from root directory
4. Check that `@objectstack/cli` is installed: `pnpm list @objectstack/cli`

## Support

For issues or questions:
- Check the [README.md](./README.md) for updated documentation
- Review deprecated package READMEs for migration notes
- Check package.json scripts for correct commands

## Timeline

- **Deprecated**: February 2026
- **Migration Period**: Immediate (packages still exist but excluded from workspace)
- **Future Removal**: Packages will be physically removed in a future major version
