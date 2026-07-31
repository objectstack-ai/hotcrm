// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { fileURLToPath } from 'node:url';

/**
 * Absolute path to the repository root, derived from this file's own location.
 *
 * Tests that read source files off disk previously resolved them relative to
 * `process.cwd()` (e.g. `join('src/flows', f)` in docs-drift.test.ts). That is
 * only correct when vitest happens to be invoked from the repo root — running
 * the suite from a subdirectory, or from an editor/IDE runner with a different
 * working directory, turned a real drift check into an ENOENT. Anchoring on
 * `import.meta.url` makes the path independent of how the runner was launched.
 */
export const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));
