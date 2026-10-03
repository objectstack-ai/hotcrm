// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './helpers/repo-root';
import { globToRegExp, walkRepo } from './helpers/config-globs';
import vitestConfig from '../vitest.config';

/**
 * Config-glob liveness (#1934).
 *
 * A path glob that matches nothing does not fail — it silently stops doing its
 * job, and everything downstream of it reads green. This repo has measured that
 * twice:
 *
 *  - `.github/labeler.yml` shipped rules pointed at `src/server.ts`,
 *    `src/engine` and `src/metadata` subtrees this repo has never had. The
 *    workflow stayed green; PRs simply came out unlabelled (#1925 / PR #1927).
 *  - `vitest.config.ts` carried a coverage `include` naming `src/objects`, a
 *    directory the ADR-0130 layout move had emptied. Vitest enforces no
 *    threshold over an empty include set, so `pnpm test:coverage` exited 0
 *    reporting 0% and the four floors (95/92/92/78) guarded nothing for a
 *    month (#1924 / PR #1932).
 *
 * The second one is the point: the first was caught by a guard, the second was
 * not, because that guard reads exactly one file. `test/labeler-config.test.ts`
 * states the invariant — **every glob must match something in the tree** — and
 * this file applies it to every other config in the repo that carries one.
 *
 * ## What is derived
 *
 * Nothing here hand-lists a glob. The three readers below take them from the
 * artefacts their consumers read:
 *
 *  - **`vitest.config.ts`** is IMPORTED, not scraped, so the globs asserted are
 *    the same object vitest itself resolves. A config rewritten as a function
 *    (`defineConfig(() => …)`) yields no arrays, which the vacuity guard below
 *    turns red rather than passing over.
 *  - **Every `tsconfig*.json` in the tree** is discovered by walking, so a new
 *    one is covered the day it appears.
 *  - **Every workflow under `.github/workflows/`** is scanned for `paths:` and
 *    `paths-ignore:` filters, for the same reason.
 *
 * `.github/labeler.yml` is deliberately NOT in that roster — see the last
 * describe. It has a stricter guard of its own, and covering it twice would
 * turn one typo into two reds.
 *
 * ## Globs are relative to the config that declares them
 *
 * A `tsconfig.json` under `apps/docs/` names paths relative to `apps/docs/`,
 * not to the repo root, so each glob set carries the base it resolves against
 * and is matched against the tree scoped to that base. Without it
 * `apps/docs/tsconfig.json`'s `**` patterns would be answered by the repo-wide
 * tree — live, but for the wrong reason, which is a vacuous green wearing a
 * different hat.
 *
 * ## Why some globs are exempt, and what keeps the exemptions honest
 *
 * Measured 2026-09-15 against `origin/main` (850 files, 121 directories): of
 * the 39 globs in the roster, eight match nothing, and every one of them is
 * deliberate — an installed or generated path (`node_modules`, `dist`,
 * `.next`, `next-env.d.ts`), or a trigger filter held open for a file type the
 * repo does not commit today. None is a typo. So this guard keeps an explicit
 * exemption door with a reason per entry, and two assertions stop that door
 * from becoming a graveyard: a named exemption whose glob has left the config
 * is flagged stale, and a `reserved` exemption that has STARTED matching is
 * flagged as no longer reserved.
 */

/* --------------------------------------------------------------- the tree */

const { files, dirs } = walkRepo();
const allPaths = [...files, ...dirs];

const scopeCache = new Map<string, string[]>();

/** The tree as the config at `base` sees it: base-relative, POSIX-separated. */
function scopeTo(base: string): string[] {
  if (!base) return allPaths;
  const cached = scopeCache.get(base);
  if (cached) return cached;
  const prefix = `${base}/`;
  const scoped = allPaths.filter((p) => p.startsWith(prefix)).map((p) => p.slice(prefix.length));
  scopeCache.set(base, scoped);
  return scoped;
}

/* ------------------------------------------------------------- the roster */

interface GlobSet {
  /** Repo-relative path of the config file the globs came from. */
  source: string;
  /** Directory the globs resolve against; `''` is the repo root. */
  base: string;
  /** Where in that file — the key path, or the key plus its line number. */
  key: string;
  globs: string[];
}

const asStrings = (value: unknown): string[] | null =>
  Array.isArray(value) && value.every((v) => typeof v === 'string') ? (value as string[]) : null;

/** `vitest.config.ts`, read off the resolved config object rather than its text. */
function vitestGlobSets(): GlobSet[] {
  const test = (vitestConfig as { test?: Record<string, unknown> }).test;
  if (!test) return [];
  const coverage = test.coverage as Record<string, unknown> | undefined;
  const candidates: Array<[string, unknown]> = [
    ['test.include', test.include],
    ['test.exclude', test.exclude],
    ['test.coverage.include', coverage?.include],
    ['test.coverage.exclude', coverage?.exclude],
  ];
  const out: GlobSet[] = [];
  for (const [key, value] of candidates) {
    const globs = asStrings(value);
    // Vite resolves a config's globs against its own directory, which is the
    // repo root here.
    if (globs) out.push({ source: 'vitest.config.ts', base: '', key, globs });
  }
  return out;
}

/**
 * `tsconfig.json` is JSON with comments — the root one carries several. Strip
 * them string-aware so a `//` inside a value is not mistaken for a comment.
 */
function stripJsonComments(text: string): string {
  let out = '';
  let inString = false;
  let escaped = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const d = text[i + 1];
    if (inString) {
      out += c;
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') { inString = true; out += c; continue; }
    if (c === '/' && d === '/') { while (i < text.length && text[i] !== '\n') i++; out += '\n'; continue; }
    if (c === '/' && d === '*') { const end = text.indexOf('*/', i + 2); i = end < 0 ? text.length : end + 1; continue; }
    out += c;
  }
  return out;
}

const TSCONFIGS = files.filter((f) => /(^|\/)tsconfig[^/]*\.json$/.test(f)).sort();

function tsconfigGlobSets(): GlobSet[] {
  const out: GlobSet[] = [];
  for (const source of TSCONFIGS) {
    const json = JSON.parse(
      stripJsonComments(readFileSync(join(REPO_ROOT, source), 'utf8')),
    ) as Record<string, unknown>;
    const base = source.includes('/') ? source.slice(0, source.lastIndexOf('/')) : '';
    for (const key of ['include', 'exclude'] as const) {
      const globs = asStrings(json[key]);
      if (globs) out.push({ source, base, key, globs });
    }
  }
  return out;
}

const WORKFLOWS = files
  .filter((f) => f.startsWith('.github/workflows/') && /\.ya?ml$/.test(f))
  .sort();

/**
 * Workflow `paths:` / `paths-ignore:` filters. Read with a regex rather than a
 * YAML dependency, following the two guards this one joins; both the inline
 * (`paths: ['x']`) and the block-list form appear in this repo today.
 *
 * A filter entry is repo-relative — GitHub matches it against the diff — so the
 * base stays the repo root.
 */
function workflowGlobSets(): GlobSet[] {
  const out: GlobSet[] = [];
  for (const source of WORKFLOWS) {
    const lines = readFileSync(join(REPO_ROOT, source), 'utf8').split('\n');
    for (let i = 0; i < lines.length; i++) {
      const header = /^(\s*)(paths|paths-ignore):\s*(.*?)\s*$/.exec(lines[i]);
      if (!header) continue;
      const [, indent, key, rest] = header;
      const globs: string[] = [];
      if (rest.startsWith('[')) {
        for (const raw of rest.replace(/^\[|\]$/g, '').split(',')) {
          const item = raw.trim().replace(/^['"]|['"]$/g, '');
          if (item) globs.push(item);
        }
      } else if (rest === '') {
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j].trim() === '' || /^\s*#/.test(lines[j])) continue;
          const item = /^(\s*)-\s*(.+?)\s*$/.exec(lines[j]);
          if (!item || item[1].length <= indent.length) break;
          globs.push(item[2].replace(/^['"]|['"]$/g, ''));
        }
      }
      if (globs.length) out.push({ source, base: '', key: `${key}@${i + 1}`, globs });
    }
  }
  return out;
}

const sets: GlobSet[] = [...vitestGlobSets(), ...tsconfigGlobSets(), ...workflowGlobSets()];

/* ---------------------------------------------------------- the exemptions */

/**
 * First path segments whose contents are installed or generated, never
 * committed. A glob rooted at one of these is allowed to match nothing: whether
 * it does depends on what has been run in this checkout, not on whether the
 * glob is correct. One reason per root.
 */
const GENERATED_ROOTS: Record<string, string> = {
  node_modules: 'installed by pnpm — present or absent depending on whether install has run in this checkout',
  dist: '`objectstack build` output, gitignored at the repo root',
  '.next': '`next build` / `next dev` output, gitignored by apps/docs/.gitignore',
};

interface Exemption {
  source: string;
  glob: string;
  /**
   * `generated` — the path exists only after a build; asserted in neither
   * direction. `reserved` — deliberately matches nothing today; asserted to
   * still match nothing, so the exemption cannot outlive its reason.
   */
  kind: 'generated' | 'reserved';
  reason: string;
}

/** Everything the roots above do not cover. One reason per entry. */
const EXEMPTIONS: Exemption[] = [
  {
    source: 'apps/docs/tsconfig.json',
    glob: 'next-env.d.ts',
    kind: 'generated',
    reason: 'written into apps/docs by `next dev` / `next build` and gitignored there — present only after a docs build',
  },
  {
    source: '.github/workflows/code-quality.yml',
    glob: '**.js',
    kind: 'reserved',
    reason: 'a trigger held open for a file type the repo does not commit — the tree is .ts and .mjs, and this entry is what would run Code Quality the day a .js lands',
  },
];

function exemptionFor(set: GlobSet, glob: string): Exemption | null {
  const named = EXEMPTIONS.find((e) => e.source === set.source && e.glob === glob);
  if (named) return named;
  const reason = GENERATED_ROOTS[glob.split('/')[0]];
  return reason ? { source: set.source, glob, kind: 'generated', reason } : null;
}

const matchesSomething = (base: string, glob: string): boolean => {
  const re = globToRegExp(glob);
  return scopeTo(base).some((p) => re.test(p));
};

/* ------------------------------------------------------------------ tests */

describe('config globs — the roster is derived', () => {
  it('walks a non-trivial tree', () => {
    // Every assertion below is "does this glob match anything in `files`". An
    // empty or truncated walk would answer "no" for everything, or "yes" for
    // nothing — either way the result would say nothing about the configs.
    expect(files.length, 'the repo walk found almost no files').toBeGreaterThan(100);
    expect(dirs.length, 'the repo walk found almost no directories').toBeGreaterThan(10);
  });

  it('parses every discovered config into at least one glob', () => {
    const empty = sets.filter((s) => s.globs.length === 0).map((s) => `${s.source} :: ${s.key}`);
    expect(empty, 'glob set parsed as empty — the reader stopped reading its config').toEqual([]);
    expect(sets.length, 'no glob sets parsed at all').toBeGreaterThan(0);
  });

  it('covers the configs this repo actually has', () => {
    // Anchors, not a hand-kept roster: each names a file that exists today, so
    // a rename fails here and is re-pointed deliberately instead of silently
    // dropping out of coverage.
    const sources = new Set(sets.map((s) => s.source));
    for (const anchor of ['vitest.config.ts', 'tsconfig.json', 'apps/docs/tsconfig.json']) {
      expect(sources.has(anchor), `${anchor} contributed no glob set — the file moved, or its reader did`).toBe(true);
    }
    expect(TSCONFIGS.length, 'fewer tsconfigs discovered than this repo has').toBeGreaterThanOrEqual(2);
    expect(
      sets.some((s) => s.key === 'test.coverage.include'),
      'vitest coverage include is unread — the exact set that sat vacuously green in #1924',
    ).toBe(true);
    expect(
      [...sources].filter((s) => s.startsWith('.github/workflows/')).length,
      'no workflow path filter parsed',
    ).toBeGreaterThan(0);
  });
});

describe('config globs — every glob matches something in the tree', () => {
  it('has no dead glob outside the exemption roster', () => {
    const dead: string[] = [];
    for (const set of sets) {
      for (const glob of set.globs) {
        if (exemptionFor(set, glob)) continue;
        if (!matchesSomething(set.base, glob)) dead.push(`${set.source} :: ${set.key} → ${glob}`);
      }
    }
    expect(
      dead,
      'config glob(s) that match nothing — whatever they were meant to select, ' +
        'they select nothing, and the gate reading them passes vacuously:\n  ' +
        `${dead.join('\n  ')}\n  Fix the path, or add it to EXEMPTIONS with a reason.`,
    ).toEqual([]);
  });

  it('detects a dead glob (guards the guard)', () => {
    // The exact pattern #1932 removed from vitest.config.ts, plus one of the
    // labeler patterns #1927 removed. If either starts matching, the assertion
    // above has stopped being able to tell the difference.
    for (const dead of ['src/objects/*.hook.ts', 'src/metadata/**', 'src/engine/**']) {
      expect(matchesSomething('', dead), `${dead} unexpectedly matches`).toBe(false);
    }
    // …and live patterns from three different dialects, so the matcher is not
    // simply answering "no" to everything.
    for (const live of ['src/*/objects/*.hook.ts', 'test/**/*.test.ts', '**.ts', 'content/docs/**']) {
      expect(matchesSomething('', live), `${live} unexpectedly matches nothing`).toBe(true);
    }
    // Base scoping works: this one is live for apps/docs and dead repo-wide.
    expect(matchesSomething('apps/docs', 'source.config.ts')).toBe(true);
    expect(matchesSomething('', 'source.config.ts')).toBe(false);
  });
});

// `reason` is a required field on both rosters, so an exemption without one is
// a compile error rather than a test that can only ever pass. What needs
// asserting is the opposite direction: that an exemption is still earning its
// place.
describe('config globs — the exemptions stay honest', () => {
  it('has no named exemption whose glob has left the config', () => {
    const stale = EXEMPTIONS.filter(
      (e) => !sets.some((s) => s.source === e.source && s.globs.includes(e.glob)),
    ).map((e) => `${e.source} :: ${e.glob}`);
    expect(
      stale,
      `exemption(s) for a glob the config no longer carries — drop them:\n  ${stale.join('\n  ')}`,
    ).toEqual([]);
  });

  it('has no generated-root exemption nothing references', () => {
    const referenced = new Set(sets.flatMap((s) => s.globs.map((g) => g.split('/')[0])));
    const unused = Object.keys(GENERATED_ROOTS).filter((root) => !referenced.has(root));
    expect(
      unused,
      `generated-root exemption(s) no config glob is rooted at any more — drop them: ${unused.join(', ')}`,
    ).toEqual([]);
  });

  it('has no reserved exemption that has started matching', () => {
    const live = EXEMPTIONS.filter((e) => e.kind === 'reserved')
      .filter((e) => {
        const set = sets.find((s) => s.source === e.source && s.globs.includes(e.glob));
        return set ? matchesSomething(set.base, e.glob) : false;
      })
      .map((e) => `${e.source} :: ${e.glob}`);
    expect(
      live,
      'exemption(s) recorded as matching nothing on purpose that now match something — ' +
        `the reason has expired, so remove the exemption and let the invariant cover them:\n  ${live.join('\n  ')}`,
    ).toEqual([]);
  });
});

describe('config globs — .github/labeler.yml is delegated, not dropped', () => {
  const LABELER_GUARD = 'test/labeler-config.test.ts';

  it('leaves labeler.yml out of this roster', () => {
    expect(sets.map((s) => s.source)).not.toContain('.github/labeler.yml');
  });

  it('still has a guard over there asserting the same invariant', () => {
    // Delegation that is not checked is how a surface goes uncovered: the
    // labeler guard could be deleted and nothing here would notice.
    const path = join(REPO_ROOT, LABELER_GUARD);
    expect(existsSync(path), `${LABELER_GUARD} is gone — labeler.yml globs are now guarded by nothing`).toBe(true);
    expect(
      readFileSync(path, 'utf8'),
      `${LABELER_GUARD} no longer asserts glob liveness — fold labeler.yml back into this roster`,
    ).toContain('every glob matches at least one file in the tree');
  });
});
