# @objectstack Upgrade Notes

## Version 0.6.1 Upgrade (2026-01-29)

### Changes Made

1. **Upgraded all @objectstack packages from 0.6.0 to 0.6.1:**
   - @objectstack/spec: ^0.6.0 → ^0.6.1 (all packages: core, crm, support, products, finance, ui)

2. **Added @objectstack runtime dependencies to server package:**
   - @objectstack/core: ^0.6.1
   - @objectstack/runtime: ^0.6.1
   - @objectstack/objectql: ^0.6.1
   - @objectstack/driver-memory: ^0.6.1

### Current Status

The server is **ready to use @objectstack/runtime** but is currently using the local ObjectQL mock implementation from @hotcrm/core due to ESM compatibility issues in @objectstack/runtime@0.6.1.

### Known Issues with @objectstack/runtime@0.6.1

The published @objectstack packages have bugs that prevent them from being used in a Node.js ES modules environment:

1. **Missing .js extensions in imports**: The packages use ES module imports without .js extensions, which is required by Node.js ESM spec.
   - Example error: `Cannot find module '/path/to/@objectstack/runtime/dist/driver-plugin'`
   - Should be: `import { DriverPlugin } from './driver-plugin.js'`

2. **Affected packages:**
   - @objectstack/runtime@0.6.1
   - @objectstack/objectql@0.6.1

3. **Impact**: Cannot use `ObjectKernel`, `ObjectQLPlugin`, `DriverPlugin` from the official packages at runtime.

### Migration Path (Future)

Once @objectstack fixes the ESM compatibility issues, the server can be migrated to use the official runtime:

```typescript
import { ObjectKernel } from '@objectstack/core';
import { ObjectQLPlugin, ObjectQL } from '@objectstack/objectql';
import { DriverPlugin } from '@objectstack/runtime';
import { InMemoryDriver } from '@objectstack/driver-memory';

const kernel = new ObjectKernel();

// Register ObjectQL Plugin
kernel.use(new ObjectQLPlugin());

// Register In-Memory Driver
kernel.use(new DriverPlugin(new InMemoryDriver(), 'default'));

// Bootstrap the kernel
await kernel.bootstrap();

// Get ObjectQL service from kernel
const objectql = kernel.getService('objectql') as ObjectQL;
```

### Current Implementation

The server continues to use the local ObjectQL mock implementation:

```typescript
import { db } from '@hotcrm/core';

// Use db.query(), db.doc.create(), etc.
```

### Dependencies Status

✅ **All dependencies are up to date:**
- @objectstack/spec: ^0.6.1 (latest)
- @objectstack/core: ^0.6.1 (latest)
- @objectstack/runtime: ^0.6.1 (latest)
- @objectstack/objectql: ^0.6.1 (latest)
- @objectstack/driver-memory: ^0.6.1 (latest)

### Benefits

Even though we can't use the runtime directly yet, the upgrade provides:

1. Latest protocol definitions from @objectstack/spec
2. Latest type definitions for ObjectStack ecosystem
3. Ready for future migration when runtime is fixed
4. Dependencies are in place and tested

### Testing

The server has been tested and verified to work correctly:
- ✅ Server starts successfully
- ✅ Health endpoint responds: `GET /health`
- ✅ Dashboard endpoint responds: `GET /api/ui/dashboard/sales`
- ✅ All CRUD endpoints are functional

### Next Steps

1. Monitor @objectstack for new releases that fix ESM compatibility
2. Test new releases when available
3. Migrate to official runtime once compatible
4. Continue using the current implementation until then
