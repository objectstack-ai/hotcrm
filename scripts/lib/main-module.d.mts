// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Types for `scripts/lib/main-module.mjs`.
 *
 * The implementation is `.mjs` because `scripts/*.mjs` gates run under bare
 * `node` with no build step — CI invokes them as `node scripts/<gate>.mjs`.
 * A declaration is still needed because first-party TypeScript reaches this
 * helper THROUGH those gates: `test/source-token-ratchet.test.ts` imports
 * `scripts/check-source-token-ratchet.mjs` under `allowJs`, and tsc resolves
 * that gate's own `./lib/main-module.mjs` import to this file — measured with
 * `tsc --noEmit --listFiles`, which lists it. The last `.ts` script to import
 * the helper directly was `scripts/scan-field-consumers.ts`, retired in #1543.
 * One shared guard beats two spellings of the same comparison.
 */

/**
 * True when `moduleUrl` names the very file Node was launched with.
 *
 * @param moduleUrl - the calling module's `import.meta.url`.
 */
export declare function isMainModule(moduleUrl: string): boolean;
