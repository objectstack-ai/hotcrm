# ObjectStack v0.7.2 Upgrade Notes

## Overview

HotCRM has been successfully upgraded from @objectstack/spec v0.7.1 to v0.7.2, with a new CLI-based server startup mechanism.

## Changes

### Package Upgrades

All @objectstack packages have been upgraded to version 0.7.2:

- `@objectstack/spec`: v0.7.1 → v0.7.2
- `@objectstack/core`: v0.6.1 → v0.7.2
- `@objectstack/runtime`: v0.6.1 → v0.7.2
- `@objectstack/objectql`: v0.6.1 → v0.7.2
- `@objectstack/driver-memory`: v0.6.1 → v0.7.2
- `@objectstack/cli`: New dependency at v0.7.2
- `@objectstack/plugin-hono-server`: New dependency at v0.7.2

### New CLI-Based Startup

The server now supports CLI-based startup using the ObjectStack runtime:

#### Configuration File

Created `packages/server/objectstack.config.ts` which defines:
- Metadata configuration (name, version, description)
- Business objects (20 objects from CRM, Products, and Finance packages)
- Plugin configuration

#### Custom CLI Wrapper

Due to compatibility issues with the official @objectstack/cli (expects `ObjectStackKernel` but @objectstack/core exports `ObjectKernel`), we created a custom wrapper:

- `packages/server/src/cli-server.ts` - Custom startup script using ObjectKernel directly
- Uses `bundle-require` to load configuration dynamically
- Provides colored console output with `chalk`
- Supports graceful shutdown

### Package Structure Changes

#### Server Package (`packages/server`)

- **Type**: Changed to ESM with `"type": "module"` in package.json
- **Dependencies**: Added `bundle-require`, `chalk`, `tsx` for CLI support
- **Scripts**: Updated to use new CLI-based startup

**Available Commands:**
```bash
pnpm dev              # CLI-based development (recommended)
pnpm dev:official-cli # Official ObjectStack CLI (has compatibility issues)
pnpm dev:legacy       # Legacy Express server
pnpm start            # CLI-based production
pnpm start:legacy     # Legacy Express server (production)
```

#### Object Loading

The configuration explicitly loads 20 objects:

**CRM Objects (13):**
- account, activity, contact, lead, opportunity
- campaign_member, task, note
- email_template, landing_page, form, marketing_list, unsubscribe

**Products Objects (6):**
- quote, quote_line_item, product_bundle
- price_rule, approval_request, discount_schedule

**Finance Objects (1):**
- contract

## Known Issues & Workarounds

### 1. Official CLI Compatibility Issue

**Problem:** @objectstack/cli@0.7.2 expects `ObjectStackKernel` but @objectstack/core@0.7.2 exports `ObjectKernel`

**Impact:** Cannot use official `objectstack serve` command directly

**Workaround:** Created custom wrapper (`cli-server.ts`) that uses `ObjectKernel` directly

**Status:** Reported to ObjectStack team

### 2. ESM Import Issues in Driver Packages

**Problem:** @objectstack/driver-memory@0.7.2 has missing .js extensions in ESM imports

**Impact:** Cannot directly import and use memory driver in configuration

**Workaround:** Removed driver from initial configuration; plugins array is empty

**Status:** Known ESM compatibility issue in ObjectStack v0.7.2 packages

### 3. Support Package Build Errors

**Problem:** @hotcrm/support package has TypeScript errors related to ObjectQL API changes

**Impact:** Support objects not loaded in current configuration

**Workaround:** Temporarily excluded from server dependencies and configuration

**Next Steps:** Need to update support package hooks to match new ObjectQL API

### 4. Watch Mode Restarts

**Problem:** tsx watch mode triggers on bundled configuration files

**Impact:** Server restarts continuously during development

**Workaround:** Added `objectstack.config.bundled_*.mjs` to .gitignore

## Migration Guide

### For Developers

If you're working with the codebase:

1. **Install dependencies:**
   ```bash
   pnpm install --no-frozen-lockfile
   ```

2. **Build packages:**
   ```bash
   pnpm build
   ```

3. **Start development server:**
   ```bash
   pnpm dev  # Uses new CLI-based startup
   ```

4. **Fallback to legacy server if needed:**
   ```bash
   pnpm --filter @hotcrm/server dev:legacy
   ```

### For Package Developers

If you're developing domain packages (crm, support, products, finance):

1. Ensure your package.json uses `@objectstack/spec`: `^0.7.2`
2. Build your package before testing with server
3. Export objects properly from your package's index.ts
4. Update any ObjectQL usage to match new API

### New Object Integration

To add new objects to the configuration:

1. Create your object definition file: `*.object.ts`
2. Build the package: `pnpm --filter @hotcrm/your-package build`
3. Import the object in `packages/server/objectstack.config.ts`
4. Add to the `allObjects` mapping

Example:
```typescript
import MyNewObject from '@hotcrm/your-package/dist/my_new.object.js';

const allObjects = {
  // ... existing objects
  my_new: MyNewObject,
};
```

## Testing

### Manual Testing

1. **Start server:**
   ```bash
   cd packages/server
   pnpm dev
   ```

2. **Verify output:**
   ```
   🚀 HotCRM Server
   ------------------------
   📂 Config: objectstack.config.ts
   🌐 Port: 3000

   📦 Loading configuration...
   [Config] Loaded 20 objects: account, activity, contact, ...
   ✓ Configuration loaded
   🔧 Initializing ObjectStack kernel...

   🚀 Starting ObjectStack...

   ✅ HotCRM server is running!
      ObjectStack v0.7.2
      20 objects loaded
      Press Ctrl+C to stop
   ```

3. **Expected warnings (safe to ignore):**
   - `[Logger] Pino not available, falling back to console` - Logger fallback is working correctly
   - `⚠ Boot method not available` - ObjectKernel v0.7.2 uses different lifecycle

### Legacy Server Testing

Verify backward compatibility:
```bash
pnpm --filter @hotcrm/server dev:legacy
```

Should start Express server on port 3000 with all API endpoints functional.

## Rollback Plan

If you need to rollback to the previous version:

```bash
git checkout <commit-before-upgrade>
pnpm install --no-frozen-lockfile
pnpm build
```

## Future Improvements

1. **Fix Support Package**: Update ObjectQL usage in support hooks
2. **Add Driver Support**: Once ESM issues are resolved, add memory driver to configuration
3. **Enable HTTP Server Plugin**: Add @objectstack/plugin-hono-server for HTTP endpoints
4. **Official CLI**: Switch to official CLI once compatibility issues are resolved
5. **More Objects**: Add remaining objects from all packages

## References

- ObjectStack Documentation: https://objectstack.org
- ObjectStack GitHub: https://github.com/objectstack
- Issue Tracker: Report issues specific to this upgrade

## Support

If you encounter issues:

1. Check the "Known Issues" section above
2. Try the legacy server as fallback
3. Review console output for specific error messages
4. Open an issue on GitHub with full error details

---

**Last Updated:** 2026-01-31
**Version:** ObjectStack v0.7.2
**Status:** ✅ Stable with known workarounds
