// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
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
 * (ADR-0021, see the note in objectstack.composition.ts), still drawn in two trees.
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
 *   inline — `src/skills/index.ts` written into a sentence, a table cell, or a
 *            diagram node label. `inlineSrcDirs()`.
 *   drawn  — an ASCII tree, whose entries under the `src/` node carry no
 *            `src/` prefix at all (`├── agents/`). `treeSrcDirs()`.
 *
 * Both forms are checked below, on both doc sets: the maintainer docs keep
 * their inline check unchanged, the product pages get the same inline check,
 * and every doc that DRAWS a tree — maintainer or product — gets the drawn one.
 *
 * #1923 is the third time this file has been green over the defect it names,
 * and it moved both of the axes above. The form axis: the inline extractor
 * required a TRAILING SLASH, which a Mermaid node label does not write, so the
 * diagram in `docs/ARCHITECTURE.md` named 13 deleted directories under a guard
 * that had the page enrolled. The file axis: the product roster was six
 * hand-listed files out of the eighty-seven that point into `src/`, so the 426
 * dead paths #1922 repointed were never in front of it. Both rosters below are
 * derived now; neither is a list anyone has to remember to extend.
 */

/**
 * `src/<dir>` written inline — in a sentence, a table cell, or a diagram node
 * label.
 *
 * ⚠️ The trailing slash is NOT required, and that is the whole of #1923. This
 * read `/\bsrc\/([a-z][a-z0-9_]*)\//` until then, and a Mermaid node label
 * writes the path without one:
 *
 *     Stack --> Objects["src/objects"]
 *
 * so `docs/ARCHITECTURE.md` sat in TREE_DOCS, green, while that diagram named
 * 13 directories ADR-0130 had deleted. The drawn extractor did not cover it
 * either — it reads ASCII trees, not Mermaid — so a doc could state the tree in
 * a third form and be seen by neither. Measured over that diagram: `[]` before
 * the loosening, all 13 after it.
 *
 * The two lookaheads are what keep the loosening honest, and they work as a
 * pair rather than as two independent filters:
 *
 *   (?!\.[a-z])    rejects a FILE sitting directly under `src/` — `src/index.ts`
 *                  is not a claim that `src/index/` exists. A dot that ends a
 *                  sentence is not a file extension, so `… lives in src/sales.`
 *                  still yields `sales`.
 *   (?![a-z0-9_])  stops the engine BACKTRACKING out of that rejection. Without
 *                  it, `src/index.ts` fails on the full capture and retries the
 *                  shorter `inde`, which is followed by `x` and passes — a
 *                  directory name that was never written anywhere.
 *
 * The cost was measured over the whole repo before it was taken (the reading is
 * in the PR for #1923). Across the guarded doc surface the loosening added
 * exactly two things: the 13 dead directories in the ARCHITECTURE diagram, and
 * `sales` · `service` · `revenue` · `marketing` on the three
 * `marketplace/fork-hotcrm` pages, all four of which exist. No false positive.
 */
const inlineSrcDirs = (text: string): string[] =>
  [...text.matchAll(/\bsrc\/([a-z][a-z0-9_]*)(?!\.[a-z])(?![a-z0-9_])/g)].map((m) => m[1]);

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

/**
 * The extractors, pinned against the forms a doc actually writes.
 *
 * Every earlier failure in this file was an extractor that returned `[]` over
 * the defect and a suite that read the empty result as "nothing wrong" — #984
 * for the drawn form, #1233 for a file path, #1923 for a Mermaid node label.
 * Those are unit-sized facts about two regexes, so they are pinned as unit
 * facts: a future tightening that puts the trailing slash back goes red HERE,
 * naming the form it stopped reading, instead of going quietly green over the
 * next diagram.
 */
describe('the extractors read the forms a doc really writes', () => {
  it('inlineSrcDirs reads a Mermaid node label, which carries no trailing slash (#1923)', () => {
    expect(inlineSrcDirs('  Stack --> Objects["src/objects"]')).toEqual(['objects']);
    expect(inlineSrcDirs('  Stack --> UI["src/apps, src/views, src/pages"]')).toEqual([
      'apps',
      'views',
      'pages',
    ]);
  });

  it('inlineSrcDirs reads the slashed form, and only the first segment', () => {
    expect(inlineSrcDirs('export it from `src/sales/objects/index.ts`')).toEqual(['sales']);
  });

  it('inlineSrcDirs reads a path that ends a sentence', () => {
    expect(inlineSrcDirs('the barrel lives in src/sales.')).toEqual(['sales']);
  });

  it('inlineSrcDirs does not read a FILE under src/ as a directory', () => {
    // Both halves of the lookahead pair: the extension is rejected, and the
    // engine may not backtrack to a truncated capture (`inde` of `index.ts`).
    expect(inlineSrcDirs('src/index.ts, src/objectstack.config.ts')).toEqual([]);
  });

  it('inlineSrcDirs does not truncate one directory name into another', () => {
    expect(inlineSrcDirs('src/salesforce')).toEqual(['salesforce']);
  });

  it('inlineSrcDirs reads no directory out of a glob', () => {
    expect(inlineSrcDirs('src/*/objects/*.object.ts')).toEqual([]);
  });

  it('treeSrcDirs reads the direct children of an ASCII src/ node', () => {
    expect(treeSrcDirs(['hotcrm/', '├── src/', '│   ├── sales/', '│   └── service/'].join('\n'))).toEqual([
      'sales',
      'service',
    ]);
  });
});

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

const PRODUCT_DOCS_DIR = 'content/docs';

/** Every page the documentation site publishes, repo-relative and sorted. */
const productDocPages = (): string[] => {
  const walk = (dir: string): string[] =>
    readdirSync(join(REPO_ROOT, dir), { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory()
        ? walk(`${dir}/${entry.name}`)
        : /\.mdx?$/.test(entry.name)
          ? [`${dir}/${entry.name}`]
          : [],
    );
  return walk(PRODUCT_DOCS_DIR).sort();
};

/**
 * Pages that name a `src/<dir>` in the NEGATIVE, and are right to.
 *
 * This is the one editorial fact a walk cannot read off a page, and it is the
 * reason the roster below stayed a hand-kept list for as long as it did:
 * `customization/ai-skills` says "there is no `src/agents/` directory", which
 * is the current truth and is a false positive under "named ⇒ exists".
 *
 * Declaring the three pages that do this is far cheaper than declaring the
 * eighty-seven that point into the tree, and it is a RATCHET, not a mute — the
 * roster test below fails if an entry names a page that is gone, a directory
 * the page no longer mentions, or a directory that has come BACK, so an entry
 * cannot outlive the sentence it was granted for.
 *
 * ⛔ Do not add an entry to turn a red page green. A page naming a directory
 * that no longer exists is the defect this file is for; an entry here says the
 * page names it in order to say it is NOT there.
 */
const NEGATED_SRC_DIRS: Record<string, string[]> = {
  'content/docs/customization/ai-skills.mdx': ['agents'],
  'content/docs/customization/ai-skills.zh-Hans.mdx': ['agents'],
  'content/docs/customization/ai-skills.zh-Hant.mdx': ['agents'],
};

/**
 * The product pages that point readers at `src/` — the file axis of #984,
 * DERIVED since #1923.
 *
 * This was six hand-listed files, and what that cost was measured rather than
 * argued: 87 pages under `content/docs/` name a real `src/<dir>` path, and 81
 * of them were not on the list. The six that were are the two page families
 * that had already been repaired, so this block had never once been red — not
 * because it was looking and finding nothing, but because it was not looking.
 * #1922 repointed 426 dead paths across those 81 pages with nothing here
 * moving at any point, and nothing here would have moved on the 427th either.
 *
 * So membership is now the fact itself: a page is enrolled BECAUSE it names a
 * `src/<dir>` path. That retires three things at once — the enrolment step
 * nobody remembered; the per-page vacuity assertion that existed to catch a
 * page which had stopped pointing into the tree (a page naming nothing is now
 * simply not in the roster); and the drift a hand-kept list of doc paths has
 * by construction, which is the very drift this file exists to catch in the
 * docs themselves.
 *
 * `customization/index.{mdx,zh-Hans,zh-Hant}` is still here for the reason
 * #988 put it here — the barrel sentence under its tree names
 * `src/*\/skills/index.ts` outright — but nothing now depends on anyone having
 * noticed. A page that only DRAWS a tree is covered by TREE_DIAGRAM_DOCS
 * below; being here additionally asserts it points into `src/` in prose.
 */
const PRODUCT_TREE_DOCS = productDocPages().filter(
  (docFile) => inlineSrcDirs(readFileSync(join(REPO_ROOT, docFile), 'utf8')).length > 0,
);

/**
 * The `src/` NODE of an ASCII tree — a line that is `src/` and nothing else,
 * with or without the branch glyph that hangs it off a parent.
 */
const SRC_TREE_NODE = /^(?:[\s│]*(?:├──|└──)\s?)?src\/\s*$/m;

/**
 * Every doc that DRAWS a `src/` tree — the form axis, maintainer and product
 * alike, derived (#1923) rather than listed.
 *
 * The enrolment signal is the tree's `src/` node, and deliberately NOT
 * `treeSrcDirs()` returning something. Deriving from the parser would mean a
 * page whose diagram the parser can no longer read quietly LEAVES the roster —
 * which is precisely the state the vacuity assertion below exists to catch, so
 * deriving that way would delete the check while appearing to automate it.
 * Keying on the node instead leaves such a page enrolled, and red.
 *
 * Derived over the tree this landed on, it reproduces the previous hand list
 * exactly: the three maintainer docs and the six product pages, none added and
 * none dropped.
 */
const TREE_DIAGRAM_DOCS = [...TREE_DOCS, ...PRODUCT_TREE_DOCS].filter((docFile) =>
  SRC_TREE_NODE.test(readFileSync(join(REPO_ROOT, docFile), 'utf8')),
);

describe('product docs do not point at directories that no longer exist', () => {
  it('derives its roster from the pages that really point into src/', () => {
    // The roster is a filter over a walk, so it can go empty two ways — the
    // content root moving, or inlineSrcDirs() ceasing to read the form the
    // pages write. Either would leave every assertion below passing over
    // nobody, which is the #984 shape in its purest form and is what the
    // six-file hand list was doing for eighty-one pages.
    const pages = productDocPages();
    expect(
      pages.length,
      `no .md/.mdx pages found under ${PRODUCT_DOCS_DIR}/ — the documentation root moved.`,
    ).toBeGreaterThan(0);
    expect(
      PRODUCT_TREE_DOCS.length,
      `not one page under ${PRODUCT_DOCS_DIR}/ names a src/<dir> path — either the product ` +
        'docs stopped pointing readers into the tree, or inlineSrcDirs() stopped reading the ' +
        'form they write it in. Both are red here on purpose.',
    ).toBeGreaterThan(0);

    for (const [docFile, dirs] of Object.entries(NEGATED_SRC_DIRS)) {
      expect(
        pages,
        `NEGATED_SRC_DIRS excuses a page that does not exist: ${docFile}. Delete the entry.`,
      ).toContain(docFile);
      const named = inlineSrcDirs(readFileSync(join(REPO_ROOT, docFile), 'utf8'));
      for (const dir of dirs) {
        expect(
          named,
          `NEGATED_SRC_DIRS excuses src/${dir} on ${docFile}, which no longer names it. ` +
            'Delete the entry — an exception that excuses nothing hides the day it starts to.',
        ).toContain(dir);
        expect(
          existsSync(join(REPO_ROOT, 'src', dir)),
          `src/${dir} exists again, so ${docFile} telling readers it does not is now WRONG. ` +
            'Fix the page and delete the NEGATED_SRC_DIRS entry; do not leave the exception ' +
            'standing over prose that has become false.',
        ).toBe(false);
      }
    }
  });

  for (const docFile of PRODUCT_TREE_DOCS) {
    it(`${docFile}: every src/<dir> it names exists`, () => {
      const text = readFileSync(join(REPO_ROOT, docFile), 'utf8');
      const negated = NEGATED_SRC_DIRS[docFile] ?? [];
      const named = [...new Set(inlineSrcDirs(text))].filter((dir) => !negated.includes(dir));
      const missing = named.filter((dir) => !existsSync(join(REPO_ROOT, 'src', dir)));
      expect(
        missing,
        `${docFile} advertises src/ directories that do not exist: ${missing.join(', ')}. ` +
          'Repoint it at the package that owns the file (a directory under `src/` IS a ' +
          'package since ADR-0130) or delete the reference — a path in prose is still a ' +
          'promise. If the page names the directory in order to say it is GONE, declare it ' +
          'in NEGATED_SRC_DIRS.',
      ).toEqual([]);
    });
  }
});

describe('docs that draw the src/ tree only draw directories that exist', () => {
  it('derives its roster from the docs that really draw a src/ node', () => {
    expect(
      TREE_DIAGRAM_DOCS.length,
      'no doc draws a `src/` tree node any more — either every diagram was reformatted, or ' +
        'SRC_TREE_NODE stopped recognising the shape they are drawn in. This roster going ' +
        'empty is how the drawn axis would disappear without a single test failing, so it ' +
        'fails here instead.',
    ).toBeGreaterThan(0);
  });

  for (const docFile of TREE_DIAGRAM_DOCS) {
    it(`${docFile}: every directory under its src/ node exists`, () => {
      const text = readFileSync(join(REPO_ROOT, docFile), 'utf8');
      const drawn = [...new Set(treeSrcDirs(text))];
      expect(
        drawn.length,
        `${docFile} draws a src/ node, but no entry was parsed under it. The page is enrolled ` +
          'by the node itself, not by this parser, precisely so that a reformatted diagram ' +
          'lands here rather than dropping out of the roster: teach treeSrcDirs() the new ' +
          'shape — a parser that matches nothing passes by asserting nothing, which is the ' +
          'state that let #984 through.',
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

/*
 * The `.github/instructions/*.md` agent-brief block (#1233) was retired with
 * the briefs themselves (#1832): AGENTS.md is the one instruction set, and it
 * is already enrolled in TREE_DOCS above.
 */
