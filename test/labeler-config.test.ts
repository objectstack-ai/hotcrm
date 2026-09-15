// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, posix } from 'node:path';
import { REPO_ROOT } from './helpers/repo-root';

/**
 * `.github/labeler.yml` drift guard.
 *
 * A labeler rule whose glob matches nothing is invisible: the workflow stays
 * green, the PR just never gets the label. Before this test, three of the seven
 * rules were in exactly that state — `backend` pointed at `src/server.ts`,
 * `src/engine/**` and `src/triggers/**`, `ui` at `src/ui/**` and
 * `tailwind.config.cjs`, and `metadata` at `src/metadata/**`, none of which
 * this repo has ever contained.
 *
 * The config is deliberately parsed with a regex rather than a YAML dependency:
 * the file is a flat `label: → changed-files: → any-glob-to-any-file: [...]`
 * shape, and keeping the guard dependency-free means it can never be the reason
 * the suite is skipped.
 */

const CONFIG = join(REPO_ROOT, '.github/labeler.yml');

/** Directories that hold no first-party, PR-diffable files. */
const SKIP_DIRS = new Set([
  'node_modules', 'dist', '.next', '.source', '.objectstack', '.git',
  'test-results', 'playwright-report',
]);

/** Every repo-relative file path, POSIX-separated. */
function walk(dir = ''): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(join(REPO_ROOT, dir), { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const rel = dir ? `${dir}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...walk(rel));
    else if (entry.isFile()) out.push(rel);
  }
  return out;
}

/**
 * Minimal minimatch subset covering the syntax this config uses:
 * `**` spans separators, `*` and `?` do not.
 */
function globToRegExp(glob: string): RegExp {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        re += '.*';
        i++;
        if (glob[i + 1] === '/') i++; // `docs/**/x` → `docs/` already consumed
      } else {
        re += '[^/]*';
      }
    } else if (c === '?') re += '[^/]';
    else re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${re}$`);
}

/** label → globs, straight out of the YAML. */
function parseLabelerConfig(): Map<string, string[]> {
  const text = readFileSync(CONFIG, 'utf8');
  const rules = new Map<string, string[]>();
  let current: string | null = null;

  for (const raw of text.split('\n')) {
    const line = raw.replace(/\r$/, '');
    if (!line.trim() || line.trim().startsWith('#')) continue;

    // A top-level `label:` key (column 0, no leading dash).
    const label = /^([^\s#][^:]*):\s*$/.exec(line);
    if (label) {
      current = label[1].trim();
      rules.set(current, []);
      continue;
    }

    const globs = /any-glob-to-any-file:\s*\[(.*)\]\s*$/.exec(line);
    if (globs && current) {
      const list = globs[1]
        .split(',')
        .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean);
      rules.get(current)!.push(...list);
    }
  }
  return rules;
}

const rules = parseLabelerConfig();
const files = walk();

/**
 * The labels that exist in the repository. `actions/labeler` does not create
 * labels — a key with no matching repo label silently applies nothing, which is
 * how the old `ui:` rule went unnoticed. Adding a key to labeler.yml means
 * creating the label in repo settings and listing it here.
 */
const REPO_LABELS = new Set([
  'documentation', 'dependencies', 'ci/cd', 'backend', 'metadata', 'configuration',
]);

describe('.github/labeler.yml', () => {
  it('parses into a non-trivial rule set', () => {
    expect(rules.size, 'no label rules parsed — the parser or the file shape changed').toBeGreaterThan(0);
    for (const [label, globs] of rules) {
      expect(globs.length, `label '${label}' has no globs`).toBeGreaterThan(0);
    }
  });

  it('only uses labels that exist in the repository', () => {
    const unknown = [...rules.keys()].filter((l) => !REPO_LABELS.has(l));
    expect(
      unknown,
      `labeler.yml references label(s) that do not exist: ${unknown.join(', ')}. ` +
        'Create them in repo settings and add them to REPO_LABELS, or drop the rule.',
    ).toEqual([]);
  });

  it('every glob matches at least one file in the tree', () => {
    const dead: string[] = [];
    for (const [label, globs] of rules) {
      for (const glob of globs) {
        const re = globToRegExp(glob);
        if (!files.some((f) => re.test(f))) dead.push(`${label} → ${glob}`);
      }
    }
    expect(
      dead,
      `labeler globs that match nothing (the label can never be applied):\n  ${dead.join('\n  ')}`,
    ).toEqual([]);
  });

  it('detects a dead glob (guards the guard)', () => {
    // The exact patterns the old config shipped. If these ever start matching,
    // the check above has stopped being able to tell the difference.
    for (const dead of ['src/server.ts', 'src/engine/**', 'src/ui/**', 'tailwind.config.cjs']) {
      const re = globToRegExp(dead);
      expect(files.some((f) => re.test(f)), `${dead} unexpectedly matches`).toBe(false);
    }
    // …and that a live pattern does match, so the matcher isn't simply broken.
    expect(files.some((f) => globToRegExp('src/*/objects/*.hook.ts').test(f))).toBe(true);
    expect(files.some((f) => globToRegExp('docs/**').test(f))).toBe(true);
    expect(files.some((f) => globToRegExp('*.md').test(f))).toBe(true);
  });
});

/**
 * Reverse assertion: coverage, not just liveness.
 *
 * The suite above asks "does every glob match something?". That direction alone
 * cannot see a documentation surface no glob points at, which is how the whole
 * published doc site went unlabelled: `content/docs/**` appeared nowhere in
 * `.github/labeler.yml`, every glob that *was* there matched fine, and a 48-file
 * docs-only PR (#1921) came out of the labeler with no label at all.
 *
 * The roster is derived, not hand-written: `apps/docs/source.config.ts` declares
 * each content root the site publishes (`dir:` on a fumadocs collection), so a
 * new root added there is covered by this guard the day it appears. A hand-kept
 * list here would have exactly the drift the guard exists to catch.
 */

const DOCS_SOURCE_CONFIG = join(REPO_ROOT, 'apps/docs/source.config.ts');

/** Repo-relative content roots the published documentation site sources. */
function publishedDocRoots(): string[] {
  const text = readFileSync(DOCS_SOURCE_CONFIG, 'utf8');
  const roots = new Set<string>();
  for (const [, dir] of text.matchAll(/\bdir:\s*['"]([^'"]+)['"]/g)) {
    // `dir` is resolved by fumadocs relative to the config file's own directory.
    roots.add(posix.normalize(posix.join('apps/docs', dir)).replace(/\/$/, ''));
  }
  return [...roots];
}

describe('.github/labeler.yml — documentation coverage', () => {
  const roots = publishedDocRoots();
  const docGlobs = rules.get('documentation') ?? [];

  it('derives the doc site content roots from apps/docs/source.config.ts', () => {
    // Without this, a config the regex can no longer read would make the
    // coverage assertion below pass over an empty roster — green, and blind.
    expect(roots.length, `no 'dir:' collection root parsed from ${DOCS_SOURCE_CONFIG}`).toBeGreaterThan(0);
    for (const root of roots) {
      expect(
        files.some((f) => f.startsWith(`${root}/`)),
        `derived content root '${root}' holds no files — the config moved or the parser did`,
      ).toBe(true);
    }
    expect(docGlobs.length, "no globs parsed for the 'documentation' label").toBeGreaterThan(0);
  });

  it("every published doc root is covered by the 'documentation' rule", () => {
    const res = docGlobs.map(globToRegExp);
    const gaps: string[] = [];
    for (const root of roots) {
      const missed = files.filter((f) => f.startsWith(`${root}/`) && !res.some((re) => re.test(f)));
      if (missed.length) gaps.push(`${root} → ${missed.length} file(s) match no glob, e.g. ${missed[0]}`);
    }
    expect(
      gaps,
      'published documentation content matched by no `documentation` glob — a docs-only PR there gets no label:\n  ' +
        `${gaps.join('\n  ')}\n  Add the root to the documentation rule in .github/labeler.yml.`,
    ).toEqual([]);
  });
});
