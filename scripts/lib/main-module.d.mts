// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Types for `scripts/lib/main-module.mjs`.
 *
 * The implementation is `.mjs` because `scripts/*.mjs` gates run under bare
 * `node` with no build step — CI invokes them as `node scripts/<gate>.mjs`.
 * `scripts/scan-field-consumers.ts` runs under `tsx` and imports the same
 * helper, and `tsconfig.json` typechecks `scripts/**\/*.ts`, so the helper needs
 * a declaration. One shared guard beats two spellings of the same comparison.
 */

/**
 * True when `moduleUrl` names the very file Node was launched with.
 *
 * @param moduleUrl - the calling module's `import.meta.url`.
 */
export declare function isMainModule(moduleUrl: string): boolean;
