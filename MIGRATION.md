# Migration Guide to Monorepo Structure

This guide explains the migration from a single-package to a multi-package monorepo architecture.

## Overview

HotCRM has been restructured into a **pnpm workspaces monorepo** with multiple independent packages. This enables:

- **Better separation of concerns**: Each package has a clear responsibility
- **Independent versioning**: Packages can be versioned independently
- **Parallel development**: Teams can work on different packages simultaneously
- **Easier testing**: Packages can be tested in isolation
- **Flexible deployment**: Deploy only what's needed for specific use cases

## Package Structure

### Before (Single Package)

```
hotcrm/
├── src/
│   ├── engine/
│   ├── metadata/
│   ├── hooks/
│   ├── actions/
│   ├── ui/
│   └── server.ts
├── package.json
└── tsconfig.json
```

### After (Multi-Package Monorepo)

```
hotcrm/
├── packages/
│   ├── core/          # @hotcrm/core
│   ├── metadata/      # @hotcrm/metadata
│   ├── hooks/         # @hotcrm/hooks
│   ├── actions/       # @hotcrm/actions
│   ├── ui/            # @hotcrm/ui
│   └── server/        # @hotcrm/server
├── pnpm-workspace.yaml
├── package.json       # Root package with workspace scripts
└── tsconfig.json      # Root TypeScript configuration
```

## Changes to Development Workflow

### Package Manager

**Before:**
```bash
npm install
npm run dev
npm run build
```

**After:**
```bash
pnpm install          # Install all packages
pnpm dev              # Start dev server
pnpm build            # Build all packages
pnpm --filter @hotcrm/core build  # Build specific package
```

### Import Paths

**Before:**
```typescript
import { db } from './engine/objectql';
import { AccountSchema } from './metadata/account.object';
```

**After:**
```typescript
import { db } from '@hotcrm/core';
import { AccountSchema } from '@hotcrm/metadata';
```

### Adding Dependencies

**Before:**
```bash
npm install express
```

**After:**
```bash
# Add to root (dev dependencies)
pnpm add -D typescript

# Add to specific package
pnpm --filter @hotcrm/server add express
pnpm --filter @hotcrm/actions add axios

# Add workspace dependency
pnpm --filter @hotcrm/server add @hotcrm/core@workspace:*
```

## Building and Testing

### Build Order

Packages are built in dependency order automatically:

1. `@hotcrm/core` (no dependencies)
2. `@hotcrm/metadata` (depends on core)
3. `@hotcrm/hooks`, `@hotcrm/actions`, `@hotcrm/ui` (depend on core and metadata)
4. `@hotcrm/server` (depends on all packages)

### Build Commands

```bash
# Build all packages
pnpm build

# Build specific package and its dependencies
pnpm --filter @hotcrm/server... build

# Clean all builds
pnpm -r exec rm -rf dist

# Watch mode for development
pnpm --filter @hotcrm/core dev
```

## Package Independence

Each package can be:

### Developed Independently

```bash
cd packages/core
pnpm build
pnpm test
```

### Versioned Independently

Each package has its own `package.json` with independent versioning:

```json
{
  "name": "@hotcrm/core",
  "version": "1.0.0"
}
```

### Published Independently (Future)

Packages can be published to npm separately:

```bash
pnpm --filter @hotcrm/core publish
pnpm --filter @hotcrm/metadata publish
```

## TypeScript Configuration

### Root tsconfig.json

The root `tsconfig.json` defines project references and path mappings:

```json
{
  "compilerOptions": {
    "paths": {
      "@hotcrm/core": ["packages/core/src"],
      "@hotcrm/metadata": ["packages/metadata/src"]
    }
  },
  "references": [
    { "path": "./packages/core" },
    { "path": "./packages/metadata" }
  ]
}
```

### Package tsconfig.json

Each package extends the base configuration:

```json
{
  "extends": "../core/tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "references": [
    { "path": "../core" }
  ]
}
```

## Adding New Packages

To add a new package to the monorepo:

1. **Create package directory:**
```bash
mkdir -p packages/new-package/src
```

2. **Create package.json:**
```json
{
  "name": "@hotcrm/new-package",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "dependencies": {
    "@hotcrm/core": "workspace:*"
  }
}
```

3. **Create tsconfig.json:**
```json
{
  "extends": "../core/tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "references": [
    { "path": "../core" }
  ]
}
```

4. **Create source files:**
```bash
touch packages/new-package/src/index.ts
```

5. **Install dependencies:**
```bash
pnpm install
```

## Benefits of This Architecture

### 1. Modularity
- Each package has a single, well-defined responsibility
- Easier to understand and maintain
- Better code organization

### 2. Scalability
- Add new packages without affecting existing ones
- Parallel development across teams
- Independent testing and deployment

### 3. Reusability
- Packages can be used in other projects
- Share common packages across multiple applications
- Publish packages to npm for wider use

### 4. Performance
- pnpm uses hard links for efficient disk usage
- Faster installations with content-addressable storage
- Better caching and dependency resolution

### 5. Type Safety
- TypeScript project references ensure type safety across packages
- Incremental builds for faster development
- Better IDE support and intellisense

## Common Tasks

### Running the Development Server

```bash
pnpm dev
```

This starts the server in watch mode with hot reload.

### Building for Production

```bash
pnpm build
pnpm start
```

### Running Tests

```bash
pnpm test
```

### Linting

```bash
pnpm lint
```

### Cleaning Build Artifacts

```bash
pnpm clean
```

## Troubleshooting

### Issue: "Cannot find module '@hotcrm/core'"

**Solution:** Ensure all packages are built:
```bash
pnpm build
```

### Issue: "Workspace dependency not found"

**Solution:** Install dependencies:
```bash
pnpm install
```

### Issue: TypeScript errors in VSCode

**Solution:** Reload the TypeScript server:
1. Open Command Palette (Cmd/Ctrl + Shift + P)
2. Run "TypeScript: Reload Project"

### Issue: Build fails with circular dependencies

**Solution:** Check package.json dependencies and ensure no circular references.

## Next Steps

1. **Explore packages**: Review each package's README for specific documentation
2. **Customize**: Add custom packages for your specific needs
3. **Deploy**: Use the monorepo structure for flexible deployment options
4. **Contribute**: Follow the new structure when contributing code

## Resources

- [pnpm Workspaces Documentation](https://pnpm.io/workspaces)
- [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)
- [Monorepo Best Practices](https://monorepo.tools/)
