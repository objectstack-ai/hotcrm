// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
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
    expect(files.some((f) => globToRegExp('src/objects/*.hook.ts').test(f))).toBe(true);
    expect(files.some((f) => globToRegExp('docs/**').test(f))).toBe(true);
    expect(files.some((f) => globToRegExp('*.md').test(f))).toBe(true);
  });
});
