/**
 * @deprecated This package is deprecated and no longer maintained.
 * Please use the root objectstack.config.ts with @objectstack/cli instead.
 * 
 * Migration Guide:
 * - Use `pnpm dev` from the root directory
 * - Use `pnpm start` for production
 * - See README.md for full migration instructions
 */

import { createLogger } from '@hotcrm/core';
const logger = createLogger('server:index');

logger.error(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    DEPRECATION WARNING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  The @hotcrm/server package is DEPRECATED and no longer maintained.
  
  This package should not be used directly. It has been replaced by the
  @objectstack/cli tool used with the root objectstack.config.ts.
  
  Migration Instructions:
  ─────────────────────────────────────────────────────────────────────────
  
  BEFORE (Deprecated):
    $ pnpm --filter @hotcrm/server dev
    $ pnpm --filter @hotcrm/server start
  
  AFTER (Current):
    $ pnpm dev           # Development mode
    $ pnpm start         # Production mode
    $ pnpm dev:studio    # Studio interface
  
  For more information, see packages/server/README.md
  
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

process.exit(1);
