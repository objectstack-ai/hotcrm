// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './repo-root';

/**
 * Shared machinery for the guards that ask whether a path glob in a config file
 * still points at something in this repo.
 *
 * Two guards ask that question — `test/labeler-config.test.ts` for
 * `.github/labeler.yml`, `test/config-glob-liveness.test.ts` for every other
 * config that carries one — and they have to answer it the same way, or a glob
 * could be live for one and dead for the other. The tree walk and the matcher
 * therefore live here rather than in either suite.
 *
 * Both are deliberately dependency-free: no YAML parser, no minimatch. A drift
 * guard that can be skipped because an optional dependency failed to install is
 * the failure mode these guards exist to catch.
 */

/**
 * Directories that hold no first-party, PR-diffable files.
 *
 * Every entry is either installed (`node_modules`), generated (`dist`,
 * `.next`, `.source`, `.objectstack`, `coverage`, `test-results`,
 * `playwright-report`) or git's own (`.git`). Descending into them would make
 * the answer to "does this glob match anything?" depend on whether a build or a
 * coverage run happened to have been executed in this checkout.
 */
export const SKIP_DIRS = new Set([
  'node_modules', 'dist', '.next', '.source', '.objectstack', '.git',
  'test-results', 'playwright-report', 'coverage',
]);

export interface RepoTree {
  /** Every repo-relative file path, POSIX-separated. */
  files: string[];
  /**
   * Every repo-relative directory path, POSIX-separated. A skipped directory is
   * recorded by name but not descended into, so a config naming it as a bare
   * path still resolves.
   */
  dirs: string[];
}

/** Walk the repository once, collecting files and directories separately. */
export function walkRepo(dir = ''): RepoTree {
  const files: string[] = [];
  const dirs: string[] = [];
  for (const entry of readdirSync(join(REPO_ROOT, dir), { withFileTypes: true })) {
    const rel = dir ? `${dir}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      dirs.push(rel);
      if (SKIP_DIRS.has(entry.name)) continue;
      const nested = walkRepo(rel);
      files.push(...nested.files);
      dirs.push(...nested.dirs);
    } else if (entry.isFile()) {
      files.push(rel);
    }
  }
  return { files, dirs };
}

/**
 * Minimal minimatch subset covering the syntax these configs use: a double star
 * spans separators, a single star and `?` do not.
 *
 * The dialects differ in the corners — GitHub path filters, minimatch and
 * TypeScript each have their own — but they agree on the part this invariant
 * reads: the literal path segments a glob names have to exist. A glob that
 * matches nothing under this matcher names a path the repo does not have.
 */
export function globToRegExp(glob: string): RegExp {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        re += '.*';
        i++;
        if (glob[i + 1] === '/') i++; // `docs` + `/**/x` — the separator is already consumed
      } else {
        re += '[^/]*';
      }
    } else if (c === '?') re += '[^/]';
    else re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${re}$`);
}
