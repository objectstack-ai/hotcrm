# @hotcrm/core

> ⚠️ **DEPRECATED**: This package is deprecated and no longer maintained. All functionality has been migrated to use `@objectstack/spec` directly. Please remove this dependency from your projects.

## Migration Guide

If you are using `@hotcrm/core`, please migrate to `@objectstack/spec`:

1. Remove `@hotcrm/core` from your dependencies
2. Update imports to use `@objectstack/spec` directly
3. Use ObjectStack's built-in validation and type system

### Before
```typescript
import { VERSION } from '@hotcrm/core';
```

### After
```typescript
// Use @objectstack/spec for all type definitions and utilities
import { ObjectSchema } from '@objectstack/spec';
```

## Deprecation Notice

This package was deprecated in favor of:
- Using `@objectstack/spec` directly for all type definitions
- Removing unnecessary abstraction layers
- Simplifying the dependency tree

All HotCRM business packages now depend directly on `@objectstack/spec` and `@objectstack/cli`.

---

<details>
<summary>Original Documentation (Archived)</summary>

# @hotcrm/core

Shared core utilities and type helpers for HotCRM packages.

## Overview

This package provides common utilities, type helpers, and shared dependencies used across all HotCRM business packages. It acts as a lightweight foundation layer for the HotCRM ecosystem.

**Package Purpose:** Shared utilities and type system integration

## What's Included

### Utilities

- **zod-helper.ts**: Zod schema utilities and type helpers for validation
- **VERSION**: Package version constant

### Dependencies

This package provides shared dependencies:
- `@objectstack/spec` - ObjectStack protocol specifications
- `zod` - TypeScript-first schema validation

## Usage

### Importing Utilities
```typescript
import { VERSION } from '@hotcrm/core';
import { /* zod helpers */ } from '@hotcrm/core';

console.log('HotCRM Core Version:', VERSION);
```

### Zod Integration
```typescript
// The core package provides zod helpers for schema validation
// used across all HotCRM business packages
import { z } from 'zod';
// Core zod helpers available for validation
```

## Purpose

The `@hotcrm/core` package serves as:

1. **Shared Type System**: Common TypeScript types and interfaces
2. **Utility Functions**: Helper functions used across packages
3. **Dependency Management**: Centralized version management of shared dependencies
4. **Validation Helpers**: Zod schema utilities for data validation

## Integration

All HotCRM business packages (`@hotcrm/crm`, `@hotcrm/finance`, `@hotcrm/hr`, `@hotcrm/marketing`, `@hotcrm/products`, `@hotcrm/support`) depend on `@hotcrm/core` for shared utilities and type definitions.

## Development

```bash
# Build the package
pnpm --filter @hotcrm/core build

# This package has no tests (utilities only)
```

## Architecture Note

`@hotcrm/core` is intentionally kept minimal and lightweight. It provides only essential shared utilities without business logic. Business-specific functionality belongs in the respective business packages.

For the runtime engine and server infrastructure, see `@hotcrm/server` and `@objectstack/runtime`.

</details>
