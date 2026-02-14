# HotCRM Release & Distribution Strategy

This document describes the release strategy for HotCRM packages, designed to:

1. **Protect source code** — third parties receive only compiled JavaScript, never TypeScript source
2. **Enable metadata loading** — the ObjectStack runtime can load and execute compiled plugin metadata
3. **Support selective installation** — customers install only the modules they need

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    HotCRM Monorepo                          │
│                                                             │
│  Source (private)          Published (dist/ only)            │
│  ┌──────────────┐         ┌──────────────────────┐          │
│  │ src/*.ts      │  tsc   │ dist/*.js             │  npm    │
│  │ (TypeScript)  │ ─────► │ dist/*.d.ts           │ ─────►  │
│  │ hooks, logic  │        │ (JavaScript + types)  │ Registry│
│  └──────────────┘         └──────────────────────┘          │
│                                                             │
│  NOT shipped:              Shipped:                         │
│  - src/ directory          - dist/*.js (compiled)           │
│  - *.ts source files       - dist/*.d.ts (declarations)     │
│  - __tests__/              - dist/*.d.ts.map (source maps)  │
│  - objectstack.config.ts   - package.json                   │
│  - tsconfig.json           - README.md / LICENSE            │
└─────────────────────────────────────────────────────────────┘
```

## Source Code Protection

### How it works

Each package's `package.json` includes a `files` field that restricts what gets published:

```json
{
  "files": ["dist"]
}
```

When `changeset publish` (or `npm publish`) runs, **only** the files listed in `files` plus standard files (`package.json`, `README.md`, `LICENSE`, `CHANGELOG.md`) are included in the tarball. The `src/` directory, test files, and build configs are **excluded**.

### What customers receive

| Included in package | NOT included |
|---|---|
| `dist/*.js` (compiled JavaScript) | `src/*.ts` (TypeScript source) |
| `dist/*.d.ts` (type declarations) | `__tests__/` (test files) |
| `dist/*.d.ts.map` (declaration maps) | `objectstack.config.ts` |
| `package.json` | `tsconfig.json` |
| `README.md`, `LICENSE` | `.changeset/` |

### Additional protections

- **Private registry**: Packages are published to GitHub Packages (`https://npm.pkg.github.com`) with `restricted` access, requiring authentication
- **No source maps for JS**: The `sourceMap` setting in `tsconfig.json` produces declaration maps (`.d.ts.map`) but `.js.map` files map back to type declarations, not original source
- **Minification** (optional): For additional protection, a minification step can be added to the build pipeline

## Selective Module Installation

### Package independence

Each HotCRM module is an independent npm package. Customers install only what they need:

```bash
# Install just CRM (Sales Cloud)
npm install @hotcrm/crm

# Install CRM + Finance
npm install @hotcrm/crm @hotcrm/finance

# Install industry vertical
npm install @hotcrm/healthcare

# Install everything
npm install @hotcrm/crm @hotcrm/finance @hotcrm/marketing @hotcrm/products @hotcrm/support @hotcrm/hr
```

### Dependency resolution

Inter-package dependencies are declared in `package.json` and resolved automatically:

| Package | Dependencies |
|---|---|
| `@hotcrm/ai` | (standalone) |
| `@hotcrm/crm` | `@hotcrm/ai` |
| `@hotcrm/finance` | (standalone) |
| `@hotcrm/support` | (standalone) |
| `@hotcrm/marketing` | (standalone) |
| `@hotcrm/products` | (standalone) |
| `@hotcrm/hr` | (standalone) |
| `@hotcrm/analytics` | `@hotcrm/ai` |
| `@hotcrm/integration` | `@hotcrm/ai` |
| `@hotcrm/community` | (standalone) |
| `@hotcrm/education` | (standalone) |
| `@hotcrm/healthcare` | (standalone) |
| `@hotcrm/financial-services` | (standalone) |
| `@hotcrm/real-estate` | (standalone) |

When a customer installs `@hotcrm/crm`, npm automatically installs `@hotcrm/ai` as a transitive dependency.

### Customer integration example

A customer creates their own `objectstack.config.ts` selecting only the modules they need:

```typescript
import { defineStack } from '@objectstack/spec';
import { CRMPlugin } from '@hotcrm/crm/plugin';
import { FinancePlugin } from '@hotcrm/finance/plugin';

export default defineStack({
  manifest: {
    id: 'com.customer.app',
    version: '1.0.0',
    type: 'app',
    name: 'My CRM App',
  },
  objects: [],
  plugins: [CRMPlugin, FinancePlugin],
});
```

## Build Pipeline

### Per-package build

Each package has a `build` script that produces distribution-ready output:

**Plugin packages** (crm, finance, support, etc.):
```bash
# Runs: tsc && objectstack compile
pnpm --filter @hotcrm/crm build
```

1. `tsc` — Compiles TypeScript to JavaScript in `dist/`, producing `.js`, `.d.ts`, and `.d.ts.map` files
2. `objectstack compile` — Validates metadata against `@objectstack/spec` schemas

**Library packages** (ai):
```bash
# Runs: tsc
pnpm --filter @hotcrm/ai build
```

### Monorepo build

Build all packages in dependency order:

```bash
pnpm build
```

## Version Management

### Linked releases

All `@hotcrm/*` packages use [Changesets](https://github.com/changesets/changesets) with **linked releases** — all packages share the same version number.

```json
// .changeset/config.json
{
  "linked": [["@hotcrm/*"]],
  "access": "restricted"
}
```

### Release workflow

```bash
# 1. Developer adds a changeset describing their changes
pnpm changeset

# 2. Maintainer consumes changesets and bumps versions
pnpm version

# 3. Maintainer builds and publishes all packages
pnpm release
```

### Excluded packages

The following packages are **never published** (marked `private: true`):

- `@hotcrm/core` — Internal shared utilities (excluded from workspace)
- `@hotcrm/server` — Deprecated server package (excluded from workspace)

## Registry Configuration

### GitHub Packages (default)

Packages are published to GitHub Packages with restricted access:

```json
// package.json (per package)
{
  "publishConfig": {
    "access": "restricted",
    "registry": "https://npm.pkg.github.com"
  }
}
```

### Customer setup

Customers must configure their npm client to authenticate with the private registry:

```bash
# .npmrc (customer project)
@hotcrm:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

### Alternative registries

To use a different private registry (e.g., Verdaccio, Artifactory, or npm Enterprise), update `publishConfig.registry` in each package:

```json
{
  "publishConfig": {
    "access": "restricted",
    "registry": "https://your-registry.example.com"
  }
}
```

## Package Structure (Published)

After build, a published package contains:

```
@hotcrm/crm/
├── dist/
│   ├── index.js              # Main entry (barrel exports)
│   ├── index.d.ts            # Type declarations
│   ├── index.d.ts.map        # Declaration source map
│   ├── plugin.js             # Plugin definition
│   ├── plugin.d.ts           # Plugin types
│   ├── account.object.js     # Compiled object definitions
│   ├── account.object.d.ts
│   ├── hooks/
│   │   ├── lead.hook.js      # Compiled hooks
│   │   └── lead.hook.d.ts
│   └── actions/
│       ├── lead_convert.action.js
│       └── lead_convert.action.d.ts
├── package.json
├── README.md
└── LICENSE
```

Note: The `src/` directory, `objectstack.config.ts`, `tsconfig.json`, and `__tests__/` are **not** included.

## Security Considerations

| Concern | Mitigation |
|---|---|
| Source code exposure | `files: ["dist"]` ensures only compiled JS is published |
| Unauthorized access | Private registry with token-based authentication |
| Version tampering | Changesets + linked releases ensure version consistency |
| Dependency confusion | Scoped packages (`@hotcrm/*`) with restricted access |
| Reverse engineering | Compiled JS without comments; optional minification for additional protection |

## FAQ

### Can customers see the original TypeScript source?

No. Only compiled JavaScript (`.js`) and type declarations (`.d.ts`) are published. The `.d.ts.map` files map to declaration files, not source. The actual business logic is compiled and stripped of comments.

### What if a customer only needs one module?

Each module is independently installable. Install only what you need:

```bash
npm install @hotcrm/finance
```

Dependencies (like `@hotcrm/ai` for `@hotcrm/crm`) are resolved automatically.

### How do we handle breaking changes?

Changesets enforce semantic versioning. All packages are version-linked, so a major version bump in one package triggers a major bump across all packages, ensuring compatibility.

### Can we switch to a different registry later?

Yes. Update `publishConfig.registry` in each package's `package.json`. The build and distribution process is registry-agnostic.
