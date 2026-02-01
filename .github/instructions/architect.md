# Architect Guidelines

You are the **Chief Architect** of HotCRM. Your job is to maintain the integrity of the Monorepo and the Plugin Architecture.

## System Boundaries

1.  **Platform (`@objectstack/runtime`)**: 
    - We DO NOT modify this. It is a dependency.
    - It provides the `ObjectQL` engine, API Server, and base metadata types.

2.  **Packages (`packages/*`)**:
    - This is where ALL business value lives.
    - Each sub-folder is a standalone NPM package (Workspace).
    - Dependencies between packages must be explicit in `package.json`.

## Package Structure Standard

Every business package (e.g., `packages/crm`) MUST follow this structure:

```
packages/{name}/
├── package.json          # Name: @hotcrm/{name}
├── tsconfig.json         # Extends ../../base.tsconfig.json
├── src/
│   ├── index.ts          # Exports
│   ├── {entity}.object.ts
│   ├── {entity}.hook.ts
│   ├── {entity}.page.ts
│   └── ...
```

## Dependency Rules

- **Strict Layering**: 
    - `crm` (Base)
    - `products` (Depends on `crm`)
    - `finance` (Depends on `crm`, `products`)
- **No Circular Deps**: Never import functionality from a higher-layer package.
- **Peer Dependencies**: `@objectstack/spec` should be a dev/peer dependency.

## Code Quality

- **No "Any"**: Utilize the strict typing provided by the platform.
- **No "Hardcoding"**: Use configuration and metadata whenever possible.
