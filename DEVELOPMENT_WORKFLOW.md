# HotCRM Development Workflow

> A single-page quickstart for new developers covering setup, package development, testing, and contribution flow.

## ⚡ Quick Start (60 Seconds)

```bash
# Prerequisites: Node.js >= 20.9.0, pnpm >= 9.0.0
git clone https://github.com/objectstack-ai/hotcrm.git
cd hotcrm
pnpm install
pnpm test          # Run all 1,759 tests
pnpm dev           # Start development server
```

## 🏗️ Project Structure

```
hotcrm/
├── packages/               # Business Capability Plugins
│   ├── crm/               # Sales Cloud — Account, Lead, Opportunity, Contact
│   ├── marketing/         # Marketing Cloud — Campaign, Email, Attribution
│   ├── finance/           # Revenue Cloud — Contract, Invoice, Payment
│   ├── products/          # CPQ Cloud — Product, Quote, Pricing
│   ├── support/           # Service Cloud — Case, SLA, Knowledge Base
│   ├── hr/                # HR Cloud — Employee, Recruitment, Performance
│   ├── ai/                # AI Services — ML Models, Predictions
│   ├── core/              # Shared utilities and types
│   └── server/            # Application server and REST API
├── content/docs/           # Documentation site (MDX)
├── docs/                   # Strategic planning documents
├── scripts/                # Development utility scripts
└── objectstack.config.ts   # Root plugin configuration
```

## 📦 Package Development

### File Suffix Protocol

Every business package follows strict file naming conventions in `packages/{pkg}/src/`:

| Suffix | Purpose | Schema Validation |
|--------|---------|-------------------|
| `*.object.ts` | Data Model (Schema) | `ObjectSchema.create()` |
| `*.hook.ts` | Server-side Business Logic | — |
| `*.action.ts` | API Endpoints & AI Tools | — |
| `*.page.ts` | UI Page Layouts | `PageSchema.parse()` |
| `*.view.ts` | List View Configurations | `ViewSchema.parse()` |
| `*.dashboard.ts` | Dashboard Definitions | `DashboardSchema.parse()` |
| `*.form.ts` | Form View Definitions | `FormViewSchema.parse()` |
| `*.workflow.ts` | Workflow Rules | `WorkflowRuleSchema.parse()` |
| `*.statemachine.ts` | State Machine Definitions | `StateMachineSchema.parse()` |
| `*.permission.ts` | Permission Sets | `PermissionSetSchema.parse()` |
| `*.capabilities.ts` | Plugin Capability Manifests | `PluginCapabilityManifestSchema.parse()` |
| `*.events.ts` | Domain Event Definitions | `EventSchema.parse()` |

### Creating a New Object

1. Define the object schema:

```typescript
// packages/{pkg}/src/my_entity.object.ts
import { ObjectSchema, Field } from '@objectstack/spec/data';

export default ObjectSchema.create({
  name: 'my_entity',
  label: 'My Entity',
  description: 'Description of the entity',
  fields: {
    name: Field.text({ label: 'Name', required: true }),
    status: Field.select({
      label: 'Status',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Active', value: 'active' },
      ],
      defaultValue: 'draft',
    }),
    parent_account: Field.lookup('account', { label: 'Parent Account' }),
    amount: Field.currency({ label: 'Amount', precision: 18, scale: 2 }),
  },
});
```

2. Add business logic hooks:

```typescript
// packages/{pkg}/src/my_entity.hook.ts
export function beforeInsert(context: any) {
  const { doc, broker } = context;
  // Validation and business logic
  if (!doc.name) {
    throw new Error('Name is required');
  }
}

export function afterInsert(context: any) {
  const { doc, broker } = context;
  // Post-creation side effects (notifications, related records, etc.)
}
```

3. Register in the plugin:

```typescript
// packages/{pkg}/src/plugin.ts
import myEntity from './my_entity.object';
import * as myEntityHooks from './my_entity.hook';

export default PluginSchema.parse({
  name: 'my_package',
  objects: { my_entity: myEntity },
  hooks: { my_entity: myEntityHooks },
});
```

4. Add tests:

```typescript
// packages/{pkg}/src/__tests__/my_entity.hook.test.ts
import { describe, it, expect } from 'vitest';
import { beforeInsert } from '../my_entity.hook';

describe('my_entity hooks', () => {
  it('should validate name is required', () => {
    expect(() => beforeInsert({ doc: {}, broker: {} })).toThrow('Name is required');
  });
});
```

## 🧪 Testing

### Commands

```bash
pnpm test                    # Run all tests
pnpm test:watch              # Watch mode — re-run on file changes
pnpm test:coverage           # Run with coverage report
pnpm typecheck               # TypeScript type checking (tsc --noEmit)
pnpm test:changed            # Run tests only for changed packages

# Run tests for a specific package
pnpm --filter @hotcrm/crm test

# Run a specific test file
pnpm exec vitest run packages/crm/src/__tests__/account.hook.test.ts
```

### Test Organization

Tests live alongside source code in `__tests__/` directories:

```
packages/crm/src/
├── account.object.ts
├── account.hook.ts
└── __tests__/
    ├── account.object.test.ts    # Schema validation tests
    └── account.hook.test.ts      # Business logic tests
```

### Writing Tests

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('object_name hooks', () => {
  // Test hook behavior
  it('should calculate field on insert', () => {
    const doc = { amount: 100, quantity: 5 };
    const context = { doc, broker: { find: vi.fn() } };
    beforeInsert(context);
    expect(doc.total).toBe(500);
  });

  // Test schema compliance
  it('should pass ObjectSchema validation', () => {
    expect(() => ObjectSchema.create(objectDef)).not.toThrow();
  });
});
```

## 🎯 First Contribution Tutorial

Follow these steps to make your first contribution — adding a new field to an existing object:

### Step 1: Pick an Object

Choose an object to extend, e.g., `packages/crm/src/account.object.ts`.

### Step 2: Add a Field

```typescript
// Add to the fields section of the object definition
fields: {
  // ... existing fields ...
  website_url: Field.url({ label: 'Website URL', description: 'Company website' }),
}
```

### Step 3: Update Related Hook (if needed)

If the field needs validation or side effects, add logic to the hook file:

```typescript
// packages/crm/src/account.hook.ts
export function beforeInsert(context: any) {
  const { doc } = context;
  // Validate URL format if provided
  if (doc.website_url && !doc.website_url.startsWith('http')) {
    doc.website_url = 'https://' + doc.website_url;
  }
}
```

### Step 4: Add a Test

```typescript
// packages/crm/src/__tests__/account.hook.test.ts
it('should auto-prefix website URL with https', () => {
  const doc = { website_url: 'example.com' };
  beforeInsert({ doc, broker: {} });
  expect(doc.website_url).toBe('https://example.com');
});
```

### Step 5: Validate & Submit

```bash
pnpm typecheck               # Ensure no TypeScript errors
pnpm test                    # Ensure all tests pass
git checkout -b feat/add-website-field
git add .
git commit -m "feat(crm): add website_url field to account object"
git push origin feat/add-website-field
# Open a Pull Request on GitHub
```

## 📦 Creating a New Business Package

### Step 1: Create Package Directory

```bash
mkdir -p packages/my_package/src/__tests__
```

### Step 2: Create `package.json`

```json
{
  "name": "@hotcrm/my_package",
  "version": "1.0.0",
  "private": true,
  "main": "src/plugin.ts",
  "scripts": {
    "dev": "objectstack dev",
    "build": "objectstack build",
    "test": "vitest run",
    "lint": "eslint src --ext .ts"
  },
  "peerDependencies": {
    "@objectstack/spec": "^3.0.0"
  },
  "devDependencies": {
    "@objectstack/cli": "^3.0.0",
    "@objectstack/spec": "^3.0.0"
  }
}
```

### Step 3: Create Objects and Plugin

Create your `*.object.ts` files (see "Creating a New Object" above), then create the plugin entry:

```typescript
// packages/my_package/src/plugin.ts
import { PluginSchema } from '@objectstack/spec/kernel';
import myEntity from './my_entity.object';

export default PluginSchema.parse({
  name: 'my_package',
  label: 'My Package',
  objects: { my_entity: myEntity },
});
```

### Step 4: Register in Root Config

```typescript
// objectstack.config.ts — add your package
import myPackage from './packages/my_package/src/plugin';
```

### Step 5: Install and Test

```bash
pnpm install
pnpm typecheck
pnpm test
```

## ❓ Troubleshooting FAQ

### `pnpm install` fails

**Symptom**: Dependency resolution errors or lockfile conflicts.

```bash
# Clear cache and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

**Cause**: Often happens when switching branches with different dependency versions.

### TypeScript errors after pulling changes

**Symptom**: `tsc --noEmit` reports type errors that weren't there before.

```bash
# Reinstall dependencies (spec version may have changed)
pnpm install

# Rebuild to clear stale artifacts
pnpm clean && pnpm install

# Check the specific error
pnpm exec tsc --noEmit 2>&1 | head -20
```

### Tests fail with "Cannot find module"

**Symptom**: Vitest reports missing module errors.

```bash
# Ensure all packages are installed
pnpm install

# Run just the failing test with verbose output
pnpm exec vitest run --reporter=verbose path/to/failing.test.ts
```

### `ObjectSchema.create()` validation fails

**Symptom**: Object definition fails schema validation.

**Common causes**:
- **Field name not snake_case**: Use `my_field` not `myField` or `MyField`
- **Lookup reference not snake_case**: Use `Field.lookup('account', ...)` not `Field.lookup('Account', ...)`
- **Missing required properties**: `name`, `label`, and `fields` are required
- **Invalid field type**: Check `@objectstack/spec/data` for available `Field.*` methods

### How to check protocol compliance

```bash
# Run the validation script
node scripts/validate-protocol.js

# Type-check all packages
pnpm typecheck

# Run all tests
pnpm test
```

## 📖 Key Commands Reference

| Command | Description |
|---------|-------------|
| `pnpm install` | Install all dependencies |
| `pnpm dev` | Start development server |
| `pnpm dev:studio` | Start with ObjectStack Studio UI |
| `pnpm build` | Build all packages |
| `pnpm test` | Run all tests (vitest) |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm test:coverage` | Run tests with coverage report |
| `pnpm typecheck` | TypeScript type checking |
| `pnpm test:changed` | Run tests for packages with uncommitted changes |
| `pnpm lint` | Run ESLint on all packages |
| `pnpm validate` | Validate ObjectStack configuration |
| `pnpm compile` | Compile metadata |
| `pnpm clean` | Remove all build artifacts |

## 🔗 Further Reading

- **[CONTRIBUTING.md](CONTRIBUTING.md)** — Contribution guidelines, PR process, and coding standards
- **[TESTING.md](TESTING.md)** — Detailed testing strategy and patterns
- **[ROADMAP.md](ROADMAP.md)** — Full development roadmap and phased plan
- **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** — Quick lookup for conventions and patterns
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — Architecture guide and plugin system overview
