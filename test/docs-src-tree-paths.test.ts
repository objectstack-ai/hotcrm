// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './helpers/repo-root';

/*
 * Repo-tree drift — the `src/<dir>/` paths a doc names or draws (#512, #984).
 *
 * Split out of `test/docs-drift.test.ts` whole (#1196); see the SPLIT BY
 * FAMILY table there for the other families. The three rules below share the
 * two parsers and the three doc lists directly beneath this note, which is why
 * they moved together: they are one subject read on two axes — which docs are
 * checked (maintainer / product) and in which form the claim is written
 * (inline in a sentence / drawn in an ASCII tree).
 */

/**
 * Repo-tree drift — a doc must not advertise a directory that is gone.
 *
 * `src/agents/` outlived its deletion by three PRs. #512 removed the two
 * copilots and the whole directory, but seven maintainer docs kept printing
 * `src/agents/*.agent.ts` in their tree diagrams and registration tables, so
 * the next reader (human or agent) was told to put a file somewhere that does
 * not exist. `src/cubes/` had the same shape: dropped in favour of datasets
 * (ADR-0021, see the note in objectstack.config.ts), still drawn in two trees.
 *
 * Nothing checked, because a path in prose is just prose. This walks the
 * maintainer docs, pulls every `src/<dir>/` they mention, and resolves it
 * against the real tree. `docs/archive/` is deliberately excluded — it is a
 * historical record and is allowed to describe a repo that no longer exists.
 *
 * A doc states the tree in TWO forms, and that check — the first one below —
 * reads only one of them (#984: `getting-started/for-developers.mdx` kept
 * drawing `agents/` right through the deletion, under a guard whose own comment
 * names `src/agents/` as the defect it exists to catch):
 *
 *   inline — `src/skills/index.ts` written into a sentence. `inlineSrcDirs()`.
 *   drawn  — an ASCII tree, whose entries under the `src/` node carry no
 *            `src/` prefix at all (`├── agents/`). `treeSrcDirs()`.
 *
 * Both forms are checked below, on both doc sets: the maintainer docs keep
 * their inline check unchanged, the product pages get the same inline check,
 * and every doc that DRAWS a tree — maintainer or product — gets the drawn one.
 */

/** `src/<dir>/` written inline in a sentence. */
const inlineSrcDirs = (text: string): string[] =>
  [...text.matchAll(/\bsrc\/([a-z][a-z0-9_]*)\//g)].map((m) => m[1]);

/**
 * The entries an ASCII tree draws directly under its `src/` node.
 *
 * A tree makes the same claim as the inline form, with the prefix stripped by
 * the drawing itself — both roots occur here, the maintainer docs at `hotcrm/`
 * and the product docs at `src/`:
 *
 *     hotcrm/                    src/
 *     ├── src/                   ├── objects/
 *     │   ├── objects/           └── data/
 *     │   └── data/
 *
 * so `src/objects/` never appears as a literal anywhere on the page and the
 * inline regex sees nothing at all.
 *
 * Only the DIRECT children of `src/` are returned: a deeper level claims
 * `src/<dir>/<sub>/`, which no tree in this repo draws, and resolving it would
 * need the parent's name threaded through. One line may draw several entries
 * (`apps/, views/, pages/` — comma- or space-separated), and a trailing `#`
 * comment is not part of any of them.
 */
const treeSrcDirs = (text: string): string[] => {
  const BRANCH = /^([\s│]*)(?:├──|└──)\s?(.*)$/;
  const dirs: string[] = [];
  /** Indent width of the `src/` node itself; -1 when the tree is rooted at it. */
  let srcIndent: number | null = null;
  /** Indent width of its direct children — the first child line sets it. */
  let childIndent: number | null = null;

  for (const line of text.split('\n')) {
    const branch = BRANCH.exec(line);
    if (!branch) {
      // A tree ROOTED at `src/` writes that one line without a branch glyph.
      // Every other non-branch line (prose, the closing fence) ends the tree.
      srcIndent = /^src\/\s*$/.test(line) ? -1 : null;
      childIndent = null;
      continue;
    }
    const indent = branch[1].length;
    const entry = branch[2].replace(/#.*$/, '').trim();
    if (srcIndent !== null && indent <= srcIndent) {
      // Back out to a sibling of `src/` (`├── apps/docs/`, `└── content/docs/`).
      srcIndent = null;
      childIndent = null;
    }
    if (srcIndent === null) {
      if (entry === 'src/') srcIndent = indent;
      continue;
    }
    if (childIndent === null) childIndent = indent;
    if (indent !== childIndent) continue;
    for (const token of entry.split(/[\s,]+/)) {
      const dir = /^([a-z][a-z0-9_]*)\/$/.exec(token);
      if (dir) dirs.push(dir[1]);
    }
  }
  return dirs;
};

const TREE_DOCS = [
  'README.md',
  'AGENTS.md',
  'docs/README.md',
  'docs/STATUS.md',
  'docs/ARCHITECTURE.md',
  'docs/MAINTENANCE.md',
  'docs/DEPLOYMENT.md',
  'docs/developers/code_examples.md',
  'docs/developers/api_reference.md',
];

describe('maintainer docs do not point at directories that no longer exist', () => {
  for (const docFile of TREE_DOCS) {
    it(`${docFile}: every src/<dir>/ it names exists`, () => {
      // Anchored on REPO_ROOT for the same reason as FLOWS/DOC above: a
      // cwd-relative read turns this guard into an ENOENT the moment vitest is
      // launched from anywhere but the repo root.
      const text = readFileSync(join(REPO_ROOT, docFile), 'utf8');
      const named = new Set(inlineSrcDirs(text));
      const missing = [...named].filter((dir) => !existsSync(join(REPO_ROOT, 'src', dir)));
      expect(
        missing,
        `${docFile} advertises src/ directories that do not exist: ${missing.join(', ')}. ` +
          'Delete the reference (or restore the directory) — a path in prose is still a promise.',
      ).toEqual([]);
    });
  }
});

/**
 * The product pages that point readers at `src/` — the file axis of #984.
 *
 * Deliberately a LIST, not a walk of `content/docs`: a product page may name a
 * directory in the negative and be right to. `customization/ai-skills.mdx`
 * says "there is no `src/agents/` directory", which is the current truth and
 * would be a false positive under "named ⇒ exists". Whether every `src/` path
 * on a page is a pointer is an editorial fact about that page, so pages opt in
 * here one at a time.
 *
 * `customization/index.{mdx,zh-Hans,zh-Hant}` drew the same tree with the same
 * retired `agents/` entry and `*.agent.ts` row; #988 redrew all three and they
 * joined here, as the note left above by #984 anticipated.
 *
 * Membership costs a page something, and the customization page had to pay it:
 * the inline check below refuses to pass vacuously, and that page named no
 * `src/<dir>/` inline at all — its one candidate, the golden rule "export from
 * the relevant `src/**\/index.ts`", is a glob and matches nothing. What made it
 * eligible is the barrel sentence #988 added under the tree, which names
 * `src/skills/index.ts` outright. A page that only DRAWS a tree belongs in
 * TREE_DIAGRAM_DOCS; being here additionally asserts it points into `src/` in
 * prose.
 */
const PRODUCT_TREE_DOCS = [
  'content/docs/getting-started/for-developers.mdx',
  'content/docs/getting-started/for-developers.zh-Hans.mdx',
  'content/docs/getting-started/for-developers.zh-Hant.mdx',
  'content/docs/customization/index.mdx',
  'content/docs/customization/index.zh-Hans.mdx',
  'content/docs/customization/index.zh-Hant.mdx',
];

/** Every doc that DRAWS a `src/` tree — the form axis, maintainer and product alike. */
const TREE_DIAGRAM_DOCS = ['README.md', 'AGENTS.md', 'docs/README.md', ...PRODUCT_TREE_DOCS];

describe('product docs do not point at directories that no longer exist', () => {
  for (const docFile of PRODUCT_TREE_DOCS) {
    it(`${docFile}: every src/<dir>/ it names exists`, () => {
      const text = readFileSync(join(REPO_ROOT, docFile), 'utf8');
      const named = [...new Set(inlineSrcDirs(text))];
      expect(
        named.length,
        `${docFile} names no src/<dir>/ at all — this guard has gone vacuous over it. ` +
          'A page listed here is one that points readers into the tree; if this one stopped ' +
          'doing that, drop it from PRODUCT_TREE_DOCS instead of leaving it green over nothing.',
      ).toBeGreaterThan(0);
      const missing = named.filter((dir) => !existsSync(join(REPO_ROOT, 'src', dir)));
      expect(
        missing,
        `${docFile} advertises src/ directories that do not exist: ${missing.join(', ')}. ` +
          'Delete the reference (or restore the directory) — a path in prose is still a promise.',
      ).toEqual([]);
    });
  }
});

describe('docs that draw the src/ tree only draw directories that exist', () => {
  for (const docFile of TREE_DIAGRAM_DOCS) {
    it(`${docFile}: every directory under its src/ node exists`, () => {
      const text = readFileSync(join(REPO_ROOT, docFile), 'utf8');
      const drawn = [...new Set(treeSrcDirs(text))];
      expect(
        drawn.length,
        `${docFile} is listed as drawing a src/ tree, but no entry was parsed under a src/ node. ` +
          'Either the diagram was reformatted (teach treeSrcDirs() the new shape) or the page no ' +
          'longer draws one (drop it from TREE_DIAGRAM_DOCS) — a parser that matches nothing ' +
          'passes by asserting nothing, which is the state that let #984 through.',
      ).toBeGreaterThan(0);
      const missing = drawn.filter((dir) => !existsSync(join(REPO_ROOT, 'src', dir)));
      expect(
        missing,
        `${docFile} draws src/ directories that do not exist: ${missing.join(', ')}. ` +
          'Delete the branch (or restore the directory) — a directory in a tree diagram is ' +
          'the same promise as one in a sentence.',
      ).toEqual([]);
    });
  }
});
