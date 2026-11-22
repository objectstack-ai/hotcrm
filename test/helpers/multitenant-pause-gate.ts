// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'vitest';
import { REPO_ROOT } from './repo-root';
import { MULTITENANT_PAUSE } from './multitenant-pause';

/*
 * The gate of the #2700 pause, apart from its list because `vitest.config.ts`
 * imports the list, and a config may not import `vitest` itself.
 */

/** Repo-relative, `/`-separated path of a test module, from its `import.meta.url`. */
export const repoPathOf = (moduleUrl: string): string =>
  relative(REPO_ROOT, fileURLToPath(moduleUrl)).split('\\').join('/');

/**
 * The gate a kept file routes a paused `describe` / `it` through. Called with
 * the file's own `import.meta.url`; a title the list names for this file is
 * skipped (and shows as skipped), every other title runs untouched.
 */
export const pauseGate = (moduleUrl: string) => {
  const file = repoPathOf(moduleUrl);
  const paused = (title: string): boolean =>
    MULTITENANT_PAUSE.some((e) => e.file === file && e.case === title);
  return {
    paused,
    describe: (title: string, fn: () => void): void => {
      (paused(title) ? describe.skip : describe)(title, fn);
    },
    it: (title: string, fn: () => unknown, timeout?: number): void => {
      (paused(title) ? it.skip : it)(title, fn as () => Promise<void>, timeout);
    },
  };
};
