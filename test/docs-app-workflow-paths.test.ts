// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './helpers/repo-root';

/**
 * `.github/workflows/docs-app.yml` path-filter coverage (#1169).
 *
 * `Docs App` is the only thing in this repo that compiles the Fumadocs site —
 * `apps/docs` carries its own package.json and lockfile and is not part of the
 * root pnpm project, so root `install` / `typecheck` / `lint` / `build` have
 * never opened one of its files. But the MDX it compiles does not live in
 * `apps/docs`: `apps/docs/source.config.ts` declares two collections that read
 * from the repo root (`content/docs`, `content/blog`). Until #1169 the
 * workflow's `paths:` filters listed only `apps/docs/**` and the workflow file,
 * so a PR touching only `content/docs/**` — the shape of nearly every
 * documentation change here — never ran the one job that would have compiled
 * it. A gate that cannot fire is indistinguishable from a gate that passes.
 *
 * The fix is two lists that must agree, so this asserts the agreement rather
 * than the diff. **`content/docs/**` appearing in the filter proves nothing on
 * its own** — "a path filter that does not cover its target" is precisely the
 * bug being fixed here, so the check below does not compare strings: it walks
 * the real files under each declared collection directory and requires each one
 * to be *matched* by the filter, through the same glob semantics GitHub applies.
 *
 * Both triggers are checked. `push` and `pull_request` carry separate lists and
 * nothing but this test stops one from being updated without the other — and a
 * `push` filter that misses `content/` is the second half of the original bug:
 * a bad page would not be caught on `main` either.
 *
 * The YAML is read with a regex rather than a YAML dependency, following
 * `test/labeler-config.test.ts`: the trigger block is a flat
 * `on: → <event>: → paths: → - '<glob>'` shape, and staying dependency-free
 * means this guard can never be the reason the suite is skipped.
 */

const WORKFLOW = '.github/workflows/docs-app.yml';
const SOURCE_CONFIG = 'apps/docs/source.config.ts';

/** Directories that hold no first-party, PR-diffable files. */
const SKIP_DIRS = new Set([
  'node_modules', 'dist', '.next', '.source', '.objectstack', '.git',
  'test-results', 'playwright-report',
]);

const read = (rel: string) => readFileSync(join(REPO_ROOT, rel), 'utf8');

/**
 * Repo-relative directories the Fumadocs collections source their MDX from,
 * read out of `source.config.ts` itself — this is the list the workflow has to
 * cover, and deriving it is what stops the two from drifting apart again.
 *
 * `dir:` values there are relative to `apps/docs/` (`'../../content/docs'`), so
 * they are resolved against that directory and normalised to POSIX, repo-relative.
 */
function collectionDirs(): string[] {
  const text = read(SOURCE_CONFIG);
  const dirs = [...text.matchAll(/^\s*dir:\s*'([^']+)',?\s*$/gm)].map((m) => m[1]);
  const resolved = dirs.map((d) => {
    const parts = 'apps/docs'.split('/');
    for (const segment of d.split('/')) {
      if (segment === '..') parts.pop();
      else if (segment !== '.' && segment !== '') parts.push(segment);
    }
    return parts.join('/');
  });
  return [...new Set(resolved)];
}

/**
 * The `paths:` globs for one trigger, or `null` when the trigger carries no
 * filter at all — that case fires on every change, which is total coverage.
 * A missing `on:` or a missing trigger throws: an unreadable workflow must fail
 * loudly here, never read as "nothing to cover".
 */
function triggerPaths(event: 'push' | 'pull_request'): string[] | null {
  const lines = read(WORKFLOW).split('\n');

  const onIdx = lines.findIndex((l) => /^on:\s*$/.test(l));
  if (onIdx === -1) throw new Error(`${WORKFLOW}: no top-level 'on:' block`);
  let onEnd = lines.length;
  for (let i = onIdx + 1; i < lines.length; i++) {
    if (/^\S/.test(lines[i])) { onEnd = i; break; }
  }
  const block = lines.slice(onIdx + 1, onEnd);

  const evIdx = block.findIndex((l) => new RegExp(`^ {2}${event}:\\s*$`).test(l));
  if (evIdx === -1) throw new Error(`${WORKFLOW}: no '${event}:' trigger`);
  let evEnd = block.length;
  for (let i = evIdx + 1; i < block.length; i++) {
    if (/^ {2}\S/.test(block[i])) { evEnd = i; break; }
  }
  const ev = block.slice(evIdx + 1, evEnd);

  if (ev.some((l) => /^ {4}paths-ignore:/.test(l))) {
    throw new Error(
      `${WORKFLOW}: '${event}:' uses paths-ignore, which this guard does not model — ` +
        'update the guard together with the filter.',
    );
  }

  const pIdx = ev.findIndex((l) => /^ {4}paths:\s*$/.test(l));
  if (pIdx === -1) return null;

  const globs: string[] = [];
  for (let i = pIdx + 1; i < ev.length; i++) {
    const line = ev[i];
    if (line.trim() === '' || /^\s*#/.test(line)) continue;
    const m = /^ {6}- *'?([^'#]+?)'? *$/.exec(line);
    if (!m) break;
    globs.push(m[1]);
  }
  return globs;
}

/**
 * Minimal minimatch subset covering the syntax these filters use: `**` spans
 * separators, `*` and `?` do not. Same shape as `test/labeler-config.test.ts`.
 */
function globToRegExp(glob: string): RegExp {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        re += '.*';
        i++;
        if (glob[i + 1] === '/') i++;
      } else {
        re += '[^/]*';
      }
    } else if (c === '?') re += '[^/]';
    else re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${re}$`);
}

/** Every repo-relative file path under `dir`, POSIX-separated. */
function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(join(REPO_ROOT, dir), { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) out.push(...walk(rel));
    else if (entry.isFile()) out.push(rel);
  }
  return out;
}

describe('Docs App workflow — the filter covers what the build compiles', () => {
  const dirs = collectionDirs();

  it('reads the collection directories out of source.config.ts', () => {
    // Refuse to treat an empty read as a pass: an extractor that silently
    // matches nothing would make every coverage assertion below vacuous.
    expect(dirs.length).toBeGreaterThanOrEqual(2);
    expect(dirs).toContain('content/docs');
    expect(dirs).toContain('content/blog');

    for (const dir of dirs) {
      expect(statSync(join(REPO_ROOT, dir)).isDirectory()).toBe(true);
      expect(walk(dir).length, `${dir} holds no files`).toBeGreaterThan(0);
    }
  });

  for (const event of ['push', 'pull_request'] as const) {
    describe(`on.${event}`, () => {
      const globs = triggerPaths(event);

      it('carries no negated pattern this guard would mis-read', () => {
        // `!glob` inverts a match, which `globToRegExp` does not model — such a
        // pattern must fail here rather than be silently read as coverage.
        expect(globs?.filter((g) => g.startsWith('!')) ?? []).toEqual([]);
      });

      it('still fires on changes to apps/docs itself', () => {
        if (globs === null) return; // no filter — fires on everything
        const matchers = globs.map(globToRegExp);
        const appFiles = walk('apps/docs').filter((f) => !f.startsWith('apps/docs/.'));
        expect(appFiles.length).toBeGreaterThan(0);
        const missed = appFiles.filter((f) => !matchers.some((re) => re.test(f)));
        expect(missed, `apps/docs files not matched by on.${event}.paths`).toEqual([]);
      });

      it('matches every real file under every collection directory', () => {
        if (globs === null) return; // no filter — fires on everything
        expect(globs.length).toBeGreaterThan(0);
        const matchers = globs.map(globToRegExp);

        for (const dir of dirs) {
          const files = walk(dir);
          const missed = files.filter((f) => !matchers.some((re) => re.test(f)));
          expect(
            missed.slice(0, 5),
            `${dir}: ${missed.length}/${files.length} file(s) are not matched by ` +
              `on.${event}.paths (${globs.join(', ')}) — a change touching only these ` +
              'files would not run `Docs App`, which is the only job that compiles them',
          ).toEqual([]);
        }
      });
    });
  }

  it('keeps the push and pull_request filters identical', () => {
    // Two hand-maintained copies of the same list. Nothing but this stops one
    // from being extended and the other left behind — and a `push` filter that
    // misses `content/` means a bad page is not caught on `main` either.
    expect(triggerPaths('push')).toEqual(triggerPaths('pull_request'));
  });
});
