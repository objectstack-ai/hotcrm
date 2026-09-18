// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import {
  anchor,
  fmt,
  BUFFER,
  COMMITTED_CEILINGS,
  LAYERS,
  EXCLUDED,
  EXCLUDED_DIR_NAMES,
  PACKAGE_DIRS,
  requiredCeilings,
  layerDirs,
  SCOPE,
  TOTAL_LABEL,
} from '../scripts/check-source-token-ratchet.mjs';
import { REPO_ROOT } from './helpers/repo-root';

/**
 * `scripts/check-source-token-ratchet.mjs` (#1183, per-module since #1928).
 *
 * The gate puts a shrink-only ceiling on HotCRM's headline positioning claim —
 * the authored surface, in estimated tokens. Two things about it can rot
 * silently, and this suite pins both.
 *
 * **The measurement basis.** The number is only meaningful if the same rule is
 * applied on every run, so the stripping rule is asserted here rather than
 * described only in prose: comments go, string bodies stay, and the excluded
 * trees (every package's `translations/` and `data/`) are never measured at
 * all. That last one is a maintainer ruling, not an implementation detail
 * (「translations + seed 肯定是不需要算 token 的」) — a well-meaning "surely
 * translations count too" edit must fail a test, not merely surprise a reader.
 *
 * **The wiring.** #1169 is a live example in this repo of a workflow whose
 * triggers never fire for the files it checks — a gate that cannot run is
 * indistinguishable from a gate that passes. The `wiring` block below asserts
 * the script is actually invoked by both workflows and by `pnpm verify`, and
 * that the workflow carrying it has no `paths:` filter that could keep it from
 * firing on the very tree it measures.
 *
 * ## Since #1928 there are FOUR gates, and that is what most of this file is
 *
 * 「1928 门禁 改为 多 sales 模块的门禁」. Every package under `src/` carries its
 * own `business semantics`, `interaction layer` and `authored total` ceiling.
 * The property that makes that worth having is INDEPENDENCE: a module over its
 * own ceiling reddens that module and leaves the others green, so headroom
 * cannot be borrowed across a package boundary. A single summed ceiling passes
 * every assertion about "the gate goes red when the tree grows" while allowing
 * exactly that, which is why `four independent gates` below drives each package
 * over its own ceiling in turn and asserts the other three still print `✓`.
 *
 * The package ROSTER is read off disk by the gate (an `objects/` directory is
 * what makes a directory under `src/` a package), so this suite takes it from
 * the same producer rather than listing four names — the #1940 lesson, applied
 * to the file that would otherwise have re-introduced the list.
 *
 * Mechanics: the script derives its repo root from its own location
 * (`new URL('..', import.meta.url)`), so copying it into `<sandbox>/scripts/`
 * makes a throwaway directory its root — the same technique
 * `source-hygiene-scan-surface.test.ts` uses. That runs the real, unmodified
 * gate, with its real committed ceilings, against fixtures we control. The
 * script imports nothing outside `node:` builtins and its own
 * `scripts/lib/main-module.mjs` (copied alongside it by `beforeEach`), so the
 * sandbox needs no `node_modules`.
 *
 * ⚠️ Because the roster is derived, the sandbox has to MATERIALISE every
 * package the real tree holds, and seed each of them: a package directory that
 * exists and measures zero is red by design, so a sandbox holding only
 * `src/sales/` fixtures would fail every case for the three empty modules
 * rather than for the thing under test. `beforeEach` seeds the non-`SCOPE`
 * packages for exactly that reason, and leaves `SCOPE` empty so the cases that
 * are about the app package still drive it themselves.
 *
 * That sandbox lives under `mkdtempSync(tmpdir())`, which on macOS is
 * `/var/folders/…` — and `/var` is a symlink to `/private/var`. Until #1252 the
 * gate's own run-when-main guard compared `import.meta.url` (the realpath)
 * against `pathToFileURL(process.argv[1])` (the path as spelled), so every case
 * below spawned a gate that never called `main()`, printed zero bytes and
 * exited 0 — ten of the fifteen failing as `SyntaxError: Unexpected end of JSON
 * input` on any macOS checkout, and none of them on Linux CI where `/tmp` is a
 * real directory. The guard now canonicalises both sides; `script-main-guard.test.ts`
 * holds the whole class of scripts to it.
 *
 * ## The stripper's equivalence proof is a hand run, recorded here
 *
 * `stripComments()` is a hand-written character scanner (TypeScript 7's npm
 * package exposes no compiler API — `import ts from 'typescript'` yields
 * `{ version, versionMajorMinor }` and nothing else — so there is no scanner to
 * borrow). Its correctness over the *whole real tree* was proved by hand with
 * esbuild, which the ObjectStack CLI already builds with:
 *
 *   for every first-party .ts file f (src, test, e2e, scripts — 286 files):
 *     esbuild.transform(f, { loader: 'ts', minify: true }).code
 *       === esbuild.transform(stripComments(f), { loader: 'ts', minify: true }).code
 *
 *   -> 286 files, 0 divergent, 0 line-count drifts, 1,495,852 chars removed
 *
 * Byte-identical minified output means the strip removed comments and nothing
 * else — no string, regex or code byte moved. That run is in the PR body. It is
 * not automated here because `esbuild` is not a declared dependency of this
 * repo (it arrives under the ObjectStack CLI), and a test that fails when an
 * undeclared package is laid out differently would be reporting on pnpm, not on
 * this gate. The hazard classes it covers are pinned as fixtures below instead.
 */

const GATE = 'scripts/check-source-token-ratchet.mjs';

/** First-party modules the gate imports — the sandbox copy needs them too. */
const GATE_DEPENDENCIES = ['scripts/lib/main-module.mjs'];

/**
 * Every layer directory of every package, so a fixture run is not a
 * missing-dir run — read from the GATE rather than restated here.
 *
 * Hand-listed until the ADR-0130 layout moved all of them, and derived from the
 * roster since #1928 made the roster itself derived. A second copy of a
 * directory list is the failure this repo already paid for once next door, in
 * `scripts/lib/source-hygiene-surface.mjs`: three suites each kept their own
 * copy of the hygiene gate's surface and a fourth entry left all three green
 * while exercising nothing. So these come from the producer, and every fixture
 * path below is built from them.
 */
const LAYER_DIRS: string[] = PACKAGE_DIRS.flatMap((pkg: string) =>
  LAYERS.flatMap((layer: { dirs: string[] }) => layerDirs(pkg, layer)),
);

/** Outside the ratchet by maintainer ruling — never measured. */
const EXCLUDED_DIRS: string[] = [...EXCLUDED];

/** The business / interaction layer directory names, from the producer. */
const BUSINESS_DIRS: string[] = LAYERS[0].dirs;
const INTERACTION_DIRS: string[] = LAYERS[1].dirs;

/** A path in the APP package's business layer / interaction layer / residual. */
const biz = (file: string) => `${SCOPE}/${BUSINESS_DIRS[0]}/${file}`;
const flow = (file: string) => `${SCOPE}/${BUSINESS_DIRS[1]}/${file}`;
const action = (file: string) => `${SCOPE}/${BUSINESS_DIRS[2]}/${file}`;
const ux = (file: string) => `${SCOPE}/${INTERACTION_DIRS[0]}/${file}`;
const residual = (file: string) => `${SCOPE}/reports/${file}`;
const excluded = (i: number, file: string) => `${EXCLUDED_DIRS[i]}/${file}`;

interface Scope {
  label: string;
  files: number;
  lines: number;
  chars: number;
  tokens: number;
  ceiling: number | null;
  kind: string | null;
}

interface Package {
  dir: string;
  ratcheted: boolean;
  headline: boolean;
  scopes: Scope[];
  total: { files: number; lines: number; chars: number; tokens: number };
}

/**
 * The committed ceiling for one package's scope, read from the producer.
 *
 * Every figure below that used to be a literal comes from here instead. The
 * ceilings sit on a shrink-only ratchet whose own discipline is to tighten
 * opportunistically, so a literal calibrated against today's constant is in
 * permanent tension with the gate it tests: it reads correctly until the next
 * legitimate re-anchoring and then goes red for having been right (#1317 had to
 * buy a fence extension to rewrite one). Throws rather than returning
 * `undefined`, so a row that stops being a ceiling names itself.
 */
function ceilingOf(module: string, label: string): number {
  const row = COMMITTED_CEILINGS.find(
    (entry: { module: string; label: string }) => entry.module === module && entry.label === label,
  );
  if (!row) {
    throw new Error(`'${module} ${label}' is not a committed ceiling — the COMMITTED table moved`);
  }
  return row.ceiling;
}

/** The verdict line's label, exactly as the gate spells it. */
const verdictLabel = (module: string, label: string) => `${module} ${label}`;

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'token-ratchet-'));
  for (const dir of [...LAYER_DIRS, ...EXCLUDED_DIRS, ...PACKAGE_DIRS, 'scripts']) {
    mkdirSync(join(root, dir), { recursive: true });
  }
  copyFileSync(join(REPO_ROOT, GATE), join(root, GATE));
  for (const dep of GATE_DEPENDENCIES) {
    mkdirSync(dirname(join(root, dep)), { recursive: true });
    copyFileSync(join(REPO_ROOT, dep), join(root, dep));
  }
  seedModules();
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

function write(rel: string, contents: string): void {
  const path = join(root, rel);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents);
}

/**
 * One token-bearing file in every ceilinged scope of every package BUT `SCOPE`.
 *
 * A package on disk that measures zero is RED — deliberately, since a scope
 * that reads as empty is the shape of a gate that has lost its input. So the
 * sandbox cannot leave the modules empty and still be testing anything else.
 * `SCOPE` is left alone because the cases about the app package drive it
 * themselves, and one of them is specifically about an empty read being red.
 */
function seedModules(): void {
  for (const pkg of PACKAGE_DIRS) {
    if (pkg === SCOPE) continue;
    for (const layer of LAYERS as { key: string; dirs: string[] }[]) {
      write(`${pkg}/${layer.dirs[0]}/seed.ts`, `export const seed_${layer.key} = 1;\n`);
    }
  }
}

/** The same, for `SCOPE`: the cases that need all four packages green. */
function seedScope(): void {
  write(biz('crm_seed.object.ts'), 'export const seedBusiness = 1;\n');
  write(ux('seed.view.ts'), 'export const seedInteraction = 1;\n');
}

/**
 * Run a gate copy against `at`; never throws, never inherits stderr.
 *
 * `stdio` is pinned so the fixture-driven `✗ source token ratchet …` lines are
 * CAPTURED rather than echoed into the parent's log (#1302). `error.stderr` is
 * populated either way, so every assertion on the failure text below is
 * unchanged. See test/verify-log-decoy-pin.test.ts.
 */
function run(at: string, args: string[] = []): { status: number; output: string } {
  try {
    const stdout = execFileSync(process.execPath, [join(at, GATE), ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { status: 0, output: stdout };
  } catch (error) {
    const failure = error as { status?: number; stdout?: string; stderr?: string };
    return {
      status: failure.status ?? -1,
      output: `${failure.stdout ?? ''}${failure.stderr ?? ''}`,
    };
  }
}

/** The whole `--json` report. */
function report(at: string = root): { packages: Package[]; scopes: Scope[] } {
  const { output } = run(at, ['--json']);
  return JSON.parse(output) as { packages: Package[]; scopes: Scope[] };
}

/** The APP package's measurement, by scope label — the README pin's view. */
function measure(at: string = root): Record<string, Scope> {
  return Object.fromEntries(report(at).scopes.map((s) => [s.label, s]));
}

/** One package's measurement, by scope label. */
function measureIn(dir: string, at: string = root): Record<string, Scope> {
  const pkg = report(at).packages.find((p) => p.dir === dir);
  if (!pkg) throw new Error(`the gate reported no package '${dir}'`);
  return Object.fromEntries(pkg.scopes.map((s) => [s.label, s]));
}

/** A file whose stripped reading is exactly `tokens` under `dir`. */
const filler = (tokens: number) => `export const a = "${'x'.repeat(tokens * 4 - 21)}";\n`;

describe('source token ratchet — measurement basis', () => {
  it('routes a file to the layer that owns its directory, and sums to the total', () => {
    write(biz('crm_thing.object.ts'), 'export const a = 1;\n'); // 19 chars retained
    write(flow('thing.flow.ts'), 'export const b = 22;\n'); //        20
    write(ux('thing.view.ts'), 'export const c = 333;\n'); //       21
    write(residual('thing.report.ts'), 'export const d = 4444;\n'); //  22

    const scopes = measure();
    expect(scopes['business semantics']).toMatchObject({ files: 2, lines: 2, chars: 19 + 20 });
    expect(scopes['interaction layer']).toMatchObject({ files: 1, lines: 1, chars: 21 });
    expect(scopes['other authored metadata']).toMatchObject({ files: 1, chars: 22 });
    // Nothing under a package can hide from its total by living outside both layers.
    expect(scopes[TOTAL_LABEL].chars).toBe(19 + 20 + 21 + 22);
    expect(scopes[TOTAL_LABEL].files).toBe(4);
  });

  it('reads the same two layers on every package, by subdirectory name', () => {
    // Before #1928 the layer list held PATHS under the one ceilinged package and
    // the per-package readings were produced by slicing that prefix back off.
    // The names are the producer now, so this asserts the property directly:
    // each package routes its own files by the same directory names.
    seedScope();
    for (const pkg of PACKAGE_DIRS) {
      write(`${pkg}/${BUSINESS_DIRS[0]}/routed.object.ts`, 'export const a = 1;\n'); // 19
      write(`${pkg}/${INTERACTION_DIRS[0]}/routed.view.ts`, 'export const cc = 22;\n'); // 21
    }

    for (const pkg of PACKAGE_DIRS) {
      const scopes = measureIn(pkg);
      expect(scopes['business semantics'].chars, pkg).toBeGreaterThanOrEqual(19);
      expect(scopes['interaction layer'].chars, pkg).toBeGreaterThanOrEqual(21);
      expect(scopes[TOTAL_LABEL].chars, pkg).toBe(
        scopes['business semantics'].chars +
          scopes['interaction layer'].chars +
          scopes['other authored metadata'].chars,
      );
    }
  });

  it('strips line, trailing and block comments, and blank lines with them', () => {
    write(
      biz('commented.object.ts'),
      [
        '// a leading comment',
        'export const a = 1; // a trailing comment',
        '',
        '/**',
        ' * a block comment',
        ' */',
        'export const b = 2;',
        '   ',
      ].join('\n'),
    );

    const scopes = measure();
    // Only the two declarations survive, each right-trimmed, joined by \n.
    expect(scopes['business semantics']).toMatchObject({
      lines: 2,
      chars: 'export const a = 1;\nexport const b = 2;'.length,
    });
  });

  it('keeps a comment that lives inside a string — the case a line matcher gets wrong', () => {
    // Not hypothetical: src/*/actions/*.ts ship QuickJS action bodies as template
    // literals, and those bodies carry their own `//` commentary. It is authored
    // surface that an agent reads, so it counts; a line-oriented measurement
    // silently discards it (measured: ~2.8k tokens across five files).
    const body = 'export const BODY = `// not a comment\n  * nor this\n  /* nor this */`;';
    write(action('thing.actions.ts'), `${body}\n`);

    const scopes = measure();
    expect(scopes['business semantics']).toMatchObject({ lines: 3, chars: body.length });
  });

  it('keeps a regex literal that contains quote and comment characters', () => {
    const line = String.raw`export const re = /['"]\/\/[/*]/g;`;
    write(biz('re.object.ts'), `${line} // stripped\n`);

    expect(measure()['business semantics']).toMatchObject({ lines: 1, chars: line.length });
  });

  /**
   * The property the gate's own header calls its measurement basis: the count
   * is COMMENT-STRIPPED, so comment mass cannot move it in either direction.
   *
   * "If a change to this script ever makes comment mass affect the number, the
   * measurement basis has been broken" — and the reason is in the same
   * paragraph: comments are for the humans and agents reading the repo, and a
   * gate that rewarded deleting them would be a gate against explanation. The
   * ratchet would then be paid in the one currency nobody should spend.
   *
   * The stripping cases above pin the SCANNER against fixtures for the hazard
   * classes. This pins the INVARIANT, on every ceilinged row of every package,
   * because #1928 multiplied the number of readings by four and a regression
   * that moved only `src/marketing`'s would pass every one of those cases.
   */
  it('never lets comment mass move any package\'s number', () => {
    const CODE = 'export const measured = 1;\n';
    for (const pkg of PACKAGE_DIRS) write(`${pkg}/${BUSINESS_DIRS[0]}/basis.ts`, CODE);
    seedScope();
    const before = report();

    // An explanation an order of magnitude larger than the code it explains —
    // every comment shape the stripping rule names, in one file.
    const COMMENT = [
      '/**',
      ...Array.from({ length: 200 }, (_, i) => ` * explanation line ${i}, written for a reader`),
      ' */',
      '// a leading line comment',
    ].join('\n');
    for (const pkg of PACKAGE_DIRS) {
      write(`${pkg}/${BUSINESS_DIRS[0]}/basis.ts`, `${COMMENT}\n${CODE} // and a trailing one\n`);
    }
    const after = report();

    // Non-vacuity: the comment really does dwarf the measured surface, so an
    // unstripped count could not possibly match.
    expect(COMMENT.length).toBeGreaterThan(
      before.packages.reduce((n, pkg) => n + pkg.total.chars, 0),
    );

    for (const pkg of PACKAGE_DIRS) {
      const was = before.packages.find((p) => p.dir === pkg)!;
      const now = after.packages.find((p) => p.dir === pkg)!;
      for (const row of was.scopes) {
        expect(
          now.scopes.find((s) => s.label === row.label),
          `${pkg} ${row.label} moved when only comments changed — the measurement basis is ` +
            'comment-stripped, and a gate that rewarded deleting comments would be a gate ' +
            'against explanation. See the gate header, "Because the measure is comment-stripped".',
        ).toMatchObject({ label: row.label, chars: row.chars, tokens: row.tokens, lines: row.lines });
      }
    }
  });

  it('never measures translations/ or seed data, in ANY package, however large they grow', () => {
    // 「translations + seed 肯定是不需要算 token 的」. #1928 gave every package a
    // ceiling, so the ruling has to hold per package: a module's own seed rows
    // must not eat the module's own budget either.
    const bulk = `export const t = "${'x'.repeat(400 * 1024)}";\n`;
    seedScope();
    const before = report();
    for (const [i, dir] of EXCLUDED_DIRS.entries()) write(`${dir}/bulk-${i}.ts`, bulk);
    const after = report();

    // Non-vacuity: every excluded directory of every package really was written
    // to, and each write really is enormous.
    expect(EXCLUDED_DIRS.length).toBeGreaterThan(0);
    expect(new Set(EXCLUDED_DIRS.map((d) => d.split('/').slice(0, 2).join('/'))).size).toBe(
      PACKAGE_DIRS.filter((pkg) =>
        EXCLUDED_DIRS.some((d) => d.startsWith(`${pkg}/`)),
      ).length,
    );

    for (const pkg of PACKAGE_DIRS) {
      const was = before.packages.find((p) => p.dir === pkg)!;
      const now = after.packages.find((p) => p.dir === pkg)!;
      expect(now.total, `${pkg} counted an excluded tree`).toMatchObject({
        chars: was.total.chars,
        files: was.total.files,
      });
    }

    // Green: a new locale must never compete with business logic for budget.
    const { status, output } = run(root);
    expect(status).toBe(0);
    expect(output).toContain('outside the ratchet by ruling');
    expect(output).toContain('source token ratchet clean');
  });

  it('resolves the exclusion against each package root, never by trailing segment', () => {
    // The ruling's content is two directory NAMES under a package. A match on
    // the segment anywhere would quietly grow to cover `objects/data/` the day
    // someone writes one — a different rule from the one that was ruled.
    seedScope();
    const before = measure()[TOTAL_LABEL].chars;
    const body = 'export const nested = 1;\n';
    for (const name of EXCLUDED_DIR_NAMES) {
      write(`${SCOPE}/${BUSINESS_DIRS[0]}/${name}/nested.ts`, body);
    }
    expect(EXCLUDED_DIR_NAMES.length).toBeGreaterThan(0);
    expect(measure()[TOTAL_LABEL].chars).toBe(before + EXCLUDED_DIR_NAMES.length * (body.length - 1));
  });

  it('prints the headline layers in the form a doc can cite', () => {
    write(biz('crm_thing.object.ts'), `export const a = "${'x'.repeat(8000)}";\n`);
    write(ux('thing.view.ts'), `export const c = "${'x'.repeat(4000)}";\n`);

    const { output } = run(root);
    expect(output).toContain(`Headline (${SCOPE}): business semantics ~2k · interaction layer ~1k`);
    expect(output).toContain('authored total ~3k');
  });
});

describe('source token ratchet — four independent gates (#1928)', () => {
  /**
   * The property the per-module budget exists for, driven rather than read.
   *
   * 「1928 门禁 改为 多 sales 模块的门禁」 is not "the gate measures more" — a
   * single ceiling over the four packages summed would measure exactly the same
   * surface. It is that the four budgets are SEPARATE: `src/marketing/` cannot
   * spend headroom `src/sales/` is not using, and a sales feature cannot be paid
   * for by a quiet module. A summed ceiling permits both while staying green,
   * and every assertion of the form "the gate reddens when the tree grows"
   * passes against it. So each package is driven over its OWN ceiling in turn
   * and the other three are asserted still green, by name.
   *
   * Derived over `PACKAGE_DIRS`, never over four literals: a fifth package is
   * covered by this case the day it lands, which is the whole reason the roster
   * is read off disk.
   */
  for (const layerIndex of [0, 1]) {
    const layerLabel = LAYERS[layerIndex].label;
    it(`reddens only the package whose ${layerLabel} went over`, () => {
      seedScope();
      expect(run(root).status, 'the seeded sandbox must start green').toBe(0);

      const dirName = LAYERS[layerIndex].dirs[0];
      for (const pkg of PACKAGE_DIRS) {
        const ceiling = ceilingOf(pkg, layerLabel);
        const bloat = `${pkg}/${dirName}/bloat.ts`;
        write(bloat, filler(ceiling + 1000));

        const { status, output } = run(root);
        expect(status, `${pkg} over its ${layerLabel} ceiling must fail the gate`).toBe(1);

        const over = measureIn(pkg)[layerLabel].tokens;
        expect(over).toBeGreaterThan(ceiling);
        expect(output).toContain(`✗ ${verdictLabel(pkg, layerLabel)} is ~${fmt(over)}`);
        expect(output).toContain(`the ratchet ceiling is ~${fmt(ceiling)}`);

        // The point of the case: nobody else moved, and nobody else is red.
        for (const other of PACKAGE_DIRS) {
          if (other === pkg) continue;
          expect(
            output,
            `${pkg} going over its ${layerLabel} ceiling reddened ${other} as well — the four ` +
              'budgets are not independent, which is the state #1928 was opened to end.',
          ).toContain(`✓ ${verdictLabel(other, layerLabel)} ~`);
          expect(output).toContain(`✓ ${verdictLabel(other, TOTAL_LABEL)} ~`);
        }

        rmSync(join(root, bloat), { force: true });
        expect(run(root).status, `${pkg} should be green again once the bloat is gone`).toBe(0);
      }
    });
  }

  it('carries the overflow into that package\'s own total, and no other', () => {
    seedScope();
    const pkg = PACKAGE_DIRS[PACKAGE_DIRS.length - 1];
    write(`${pkg}/${BUSINESS_DIRS[0]}/bloat.ts`, filler(ceilingOf(pkg, TOTAL_LABEL) + 1000));

    const { status, output } = run(root);
    expect(status).toBe(1);
    expect(output).toContain(`✗ ${verdictLabel(pkg, TOTAL_LABEL)} is ~`);
    for (const other of PACKAGE_DIRS) {
      if (other === pkg) continue;
      expect(output).toContain(`✓ ${verdictLabel(other, TOTAL_LABEL)} ~`);
    }
  });

  it('commits a ceiling for every scope every package on disk owes, and for nothing else', () => {
    // The ledger both ways. A package with no ceiling reads exactly like a
    // package under its ceiling; a ceiling with no package guards a surface
    // that is gone. Derived from the same producer the gate refuses on.
    const owed = PACKAGE_DIRS.flatMap((pkg: string) =>
      requiredCeilings(pkg).map((label: string) => verdictLabel(pkg, label)),
    ).sort();
    const committed = COMMITTED_CEILINGS.map((row: { module: string; label: string }) =>
      verdictLabel(row.module, row.label),
    ).sort();

    expect(committed).toEqual(owed);
    // Non-vacuity, and the headline of the card: more than one package is ratcheted.
    expect(PACKAGE_DIRS.length).toBeGreaterThan(1);
    expect(committed.length).toBeGreaterThanOrEqual(PACKAGE_DIRS.length * 2);
  });
});

describe('source token ratchet — the ratchet itself', () => {
  it('fails when a scope exceeds its ceiling, naming the scope and the only way up', () => {
    // Sized from the committed ceiling, never from a copy of it, and the two
    // figures the message quotes are read back off the gate's own measurement.
    seedScope();
    const ceiling = ceilingOf(SCOPE, 'business semantics');
    write(biz('crm_bloat.object.ts'), `export const a = "${'x'.repeat((ceiling + 1000) * 4)}";\n`);

    const { status, output } = run(root);
    expect(status).toBe(1);
    const over = measure()['business semantics'].tokens;
    expect(over).toBeGreaterThan(ceiling);
    expect(output).toContain(`${verdictLabel(SCOPE, 'business semantics')} is ~${fmt(over)}`);
    expect(output).toContain(`the ratchet ceiling is ~${fmt(ceiling)}`);
    expect(output).toContain(`over by ~${fmt(over - ceiling)}`);
    expect(output).toContain('quotes a maintainer ruling');
    // And it says WHOSE budget was spent. Before #1928 the remedy read "this
    // surface is the app's headline claim", which was true of the one ceilinged
    // package and is false on the eleven rows that are not it: a `src/marketing`
    // failure telling an author they had breached the app's headline claim
    // sends them to argue about the wrong number.
    expect(output).toContain("no other package's headroom can pay for it");
    // The buffer is spent before the gate ever goes red, and the message says
    // so — otherwise a red run reads as "the ratchet is too tight" when it
    // actually means the surface grew past a deliberate 5% allowance.
    expect(output).toContain('already carries the ruled 5% working buffer');
    // The remedy must not send anyone comment-hunting: comments are stripped
    // before the count, so #1184's work cannot move this number.
    expect(output).toContain('deleting comments will not help');
    expect(output).toContain('✗ source token ratchet failed');
  });

  it('nags to re-anchor only when headroom is over twice the ruled buffer', () => {
    // Under 「给 5% 缓冲」 a healthy scope carries thousands of tokens of
    // headroom by design. An advisory that fired on that would instruct every
    // author to undo the ruling, so it triggers on relative drift instead — and
    // when it does, it names the ceiling `anchor()` would commit today.
    write(biz('crm_thing.object.ts'), 'export const a = 1;\n');
    write(ux('thing.view.ts'), 'export const c = 2;\n');

    const tiny = run(root);
    expect(tiny.status).toBe(0);
    expect(tiny.output).toContain('over twice the 5% buffer');
    expect(tiny.output).toContain('re-anchor this ceiling to ~1,000');

    // A scope sitting inside the buffer says nothing at all: it draws a clean ✓
    // and no advisory under it. Size that scope from the COMMITTED ceiling
    // rather than from a literal — the largest reading whose `anchor()` is
    // exactly this ceiling is the freshly-anchored one, the canonical "inside
    // the buffer", and that is what this case is about. It stays true at every
    // ceiling: the headroom it leaves is BUFFER/(1 + BUFFER) of the reading,
    // always under the advisory's 2 × BUFFER trigger.
    //
    // ⚠️ FLOOR, not round. Rounding up makes `reading × (1 + BUFFER)` exceed the
    // ceiling, and `anchor()` then rounds that over the next 1k boundary and
    // hands back ceiling + 1,000 — so a rounded fixture is NOT the reading this
    // ceiling was anchored from. It happens to agree at 40,000, which is why
    // only re-anchoring exposes it: at a 39,000 or 41,000 ceiling
    // `Math.round` is off by one token and `anchor()` is off by a thousand.
    // `expect(anchor(...))` below is the assertion that catches it.
    const ceiling = ceilingOf(SCOPE, 'interaction layer');
    const target = Math.floor(ceiling / (1 + BUFFER));

    // Fill to exactly `target` tokens. `~tokens` is stripped chars / 4, so
    // subtract what the layer already holds and the wrapper the stripper keeps
    // — the reading is then exact rather than approximately sized, and it
    // re-derives itself the next time the ceiling is tightened.
    const view = (fill: string) => `export const v = "${fill}";\n`;
    const held = measure()['interaction layer'].chars;
    write(ux('bulk.view.ts'), view('y'.repeat(target * 4 - held - view('').trimEnd().length)));

    const inBuffer = run(root);
    expect(inBuffer.status).toBe(0);

    const scope = measure()['interaction layer'];
    expect(scope.ceiling).toBe(ceiling);
    expect(scope.tokens).toBe(target);
    // What the case pins, as the property rather than as two calibrated
    // numbers: under the ceiling, and clear of the advisory's trigger.
    expect(scope.tokens).toBeLessThanOrEqual(ceiling);
    expect(ceiling - scope.tokens).toBeLessThanOrEqual(scope.tokens * 2 * BUFFER);
    expect(anchor(scope.tokens)).toBe(ceiling);

    const lines = inBuffer.output.split('\n');
    const at = lines.findIndex((l) => l.includes(`✓ ${verdictLabel(SCOPE, 'interaction layer')}`));
    expect(at).toBeGreaterThan(-1);
    expect(lines[at]).toContain(`headroom ~${fmt(ceiling - scope.tokens)}`);
    expect(lines[at + 1] ?? '').not.toContain('over twice the 5% buffer');
  });

  /**
   * The second half of that advisory, and #1928 is what made it necessary.
   *
   * `anchor()` rounds up to the next 1,000. On `src/sales`'s 59,000 that step is
   * noise; on `src/marketing`'s interaction ceiling of 1,000 it IS the ceiling —
   * every reading from 1 to 952 anchors to exactly 1,000. So a freshly anchored
   * small module sits permanently past the relative trigger (headroom is 14% of
   * a reading of 876) while `anchor()` has nothing lower to offer. Before this,
   * four of the twelve committed rows printed, on a clean run and on ceilings
   * committed that same day, an instruction to re-anchor a ceiling to the number
   * it already carried. An advisory that cries wolf on every green run teaches a
   * reader to skip the line on the run where it means something.
   */
  it('offers a re-anchor only when `anchor()` would commit a LOWER number', () => {
    write(biz('crm_thing.object.ts'), 'export const a = 1;\n');
    write(ux('thing.view.ts'), 'export const c = 2;\n');

    const { status, output } = run(root);
    expect(status).toBe(0);
    const lines = output.split('\n');

    let offered = 0;
    let suppressed = 0;
    for (const row of COMMITTED_CEILINGS as { module: string; label: string; ceiling: number }[]) {
      const tokens = measureIn(row.module)[row.label].tokens;
      const at = lines.findIndex((l) => l.includes(`✓ ${verdictLabel(row.module, row.label)} ~`));
      expect(at, `no ✓ row for '${verdictLabel(row.module, row.label)}'`).toBeGreaterThan(-1);
      const under = lines[at + 1] ?? '';

      // Every row here is past the RELATIVE trigger — that half is unchanged,
      // and this is its non-vacuity: the only thing deciding the two groups
      // below is whether `anchor()` has a lower number to offer.
      expect(row.ceiling - tokens, verdictLabel(row.module, row.label)).toBeGreaterThan(
        tokens * 2 * BUFFER,
      );

      if (anchor(tokens) < row.ceiling) {
        offered++;
        expect(under, verdictLabel(row.module, row.label)).toContain('over twice the 5% buffer');
        expect(under).toContain(`re-anchor this ceiling to ~${fmt(anchor(tokens))}`);
      } else {
        suppressed++;
        expect(
          under,
          `${verdictLabel(row.module, row.label)}: the gate offered to re-anchor a ceiling to ` +
            `the ~${fmt(row.ceiling)} it already carries. anchor() of this reading is ` +
            `~${fmt(anchor(tokens))}, so there is nothing to tighten.`,
        ).not.toContain('re-anchor this ceiling to');
      }
    }

    // Both branches measured, neither constructed: the committed table really
    // does hold ceilings of both sizes, which is what makes this case a test.
    expect(offered).toBeGreaterThan(0);
    expect(suppressed).toBeGreaterThan(0);
  });

  it('exempts a RULED ceiling from that nag, and exempts only the ruled kind', () => {
    // The #1607 hazard, run rather than read. Tiny fixtures put the app
    // package's layers far past the advisory's trigger, so before the exemption
    // existed every row carried `re-anchor this ceiling to ~1,000` — and on a
    // ruled row that is an instruction, printed as this gate's own
    // recommendation, to hand back the headroom a maintainer had just granted.
    //
    // ⚠️ No committed ceiling is RULED today. #1905 re-anchored onto the
    // `src/sales/` reading, retiring the #1601 grant along with the surface it
    // was about, and #1928 anchored all twelve. The kind is still the one the
    // next grant declares, so the branch is exercised against a sandbox gate
    // that declares it, rather than against whatever the committed table
    // happens to hold. That is strictly stronger than pinning a real ruled row:
    // it no longer passes by accident the day the table has one, and no longer
    // goes vacuous the day it does not.
    //
    // Which rows nag is still DERIVED from the kinds the gate under test
    // declares, never listed here: the exemption keys on the ruled/anchored
    // distinction rather than on a label, so a case naming a layer would pass
    // for the wrong reason.
    write(biz('crm_thing.object.ts'), 'export const a = 1;\n');
    write(ux('thing.view.ts'), 'export const c = 2;\n');

    // The ANCHORED control, against the real gate: the app package's rows nag.
    const { status, output } = run(root);
    expect(status).toBe(0);
    const scopes = measure();

    const RULED_LABEL = 'interaction layer';
    const appRows = (COMMITTED_CEILINGS as { module: string; label: string; kind: string }[]).filter(
      (row) => row.module === SCOPE && row.label !== 'authored total',
    );
    for (const row of appRows) {
      const tokens = scopes[row.label].tokens;
      // Non-vacuity: the row really is past the trigger AND `anchor()` really
      // has a lower number to offer, so it WOULD nag if the kind were not
      // consulted. Both halves, since #1928 added the second one.
      expect(ceilingOf(SCOPE, row.label) - tokens, row.label).toBeGreaterThan(tokens * 2 * BUFFER);
      expect(anchor(tokens), row.label).toBeLessThan(ceilingOf(SCOPE, row.label));

      expect(row.kind, `${row.label} — this control assumes every committed ceiling is anchored`)
        .toBe('anchored');
      const lines = output.split('\n');
      const at = lines.findIndex((l) => l.includes(`✓ ${verdictLabel(SCOPE, row.label)} ~`));
      expect(at, `no ✓ row for '${row.label}'`).toBeGreaterThan(-1);
      const under = lines[at + 1] ?? '';
      // ⛔ Unchanged for the anchored kind. This is the control: a change that
      // silenced the advisory generally would be a weakened ratchet, and it
      // would pass every other assertion in this case.
      expect(under, row.label).toContain('over twice the 5% buffer');
      expect(under, row.label).toContain(`re-anchor this ceiling to ~${fmt(anchor(tokens))}`);
      expect(lines[at], row.label).toContain(`ceiling ~${fmt(ceilingOf(SCOPE, row.label))}`);
      expect(lines[at], row.label).toContain(
        `headroom ~${fmt(ceilingOf(SCOPE, row.label) - tokens)}`,
      );
    }

    // The RULED branch, against a sandbox gate that declares one. Patched by
    // the KIND alone — the label, the constant and every other line are the
    // gate's own — so the only difference between the two runs is the kind.
    // Located by regex rather than by an exact string so that realigning the
    // COMMITTED table is not a test failure; the assertion below is what keeps
    // a patch that matched nothing from passing silently.
    const gatePath = join(root, GATE);
    const target = new RegExp(
      `(\\{ module: '${SCOPE}', label: '${RULED_LABEL}', ceiling: ${ceilingOf(SCOPE, RULED_LABEL)}, kind: CEILING_KIND\\.)ANCHORED`,
    );
    const before = readFileSync(gatePath, 'utf8');
    const patched = before.replace(target, '$1RULED');
    expect(
      patched,
      'the COMMITTED table no longer carries a row in the shape this case patches — ' +
        'teach it the new shape rather than dropping the ruled branch from the suite',
    ).not.toBe(before);
    expect(patched).toContain('kind: CEILING_KIND.RULED');
    writeFileSync(gatePath, patched);

    const ruled = run(root);
    expect(ruled.status).toBe(0);
    const ruledLines = ruled.output.split('\n');
    const at = ruledLines.findIndex((l) =>
      l.includes(`✓ ${verdictLabel(SCOPE, RULED_LABEL)} ~`),
    );
    expect(at, `no ✓ row for '${RULED_LABEL}'`).toBeGreaterThan(-1);
    const under = ruledLines[at + 1] ?? '';
    // Never the instruction — and never merely blank either. The row says which
    // kind of ceiling it is and who may lower it, because an exemption a reader
    // cannot see reads like a ceiling nobody weighed. The INSTRUCTION is what
    // must be gone, not the word: the ruled row says the gate does not offer to
    // re-anchor it, so a bare 're-anchor' substring is present on purpose and
    // asserting its absence would pin the sentence's wording, not its content.
    expect(under).not.toContain('re-anchor this ceiling to');
    expect(under).not.toContain('over twice the 5% buffer');
    expect(under).toContain('ruled ceiling');
    expect(under).toContain('Lowering it needs a ruling');
    // The ✓ row itself is untouched by the kind: the ceiling and the headroom
    // are still reported, so exempting a row is not hiding it.
    const ceiling = ceilingOf(SCOPE, RULED_LABEL);
    expect(ruledLines[at]).toContain(`ceiling ~${fmt(ceiling)}`);
    expect(ruledLines[at]).toContain(`headroom ~${fmt(ceiling - scopes[RULED_LABEL].tokens)}`);

    // And the anchored rows of that SAME run still nag — the exemption is the
    // kind's, not the run's. Including the rows of OTHER packages: a kind is a
    // property of one committed row, never of a layer name across the tree.
    const other = appRows.find((row) => row.label !== RULED_LABEL)!;
    const otherAt = ruledLines.findIndex((l) =>
      l.includes(`✓ ${verdictLabel(SCOPE, other.label)} ~`),
    );
    expect(ruledLines[otherAt + 1] ?? '', other.label).toContain('over twice the 5% buffer');

    const sibling = PACKAGE_DIRS.find((pkg: string) => pkg !== SCOPE)!;
    const siblingAt = ruledLines.findIndex((l) =>
      l.includes(`✓ ${verdictLabel(sibling, RULED_LABEL)} ~`),
    );
    expect(siblingAt, `no ✓ row for '${verdictLabel(sibling, RULED_LABEL)}'`).toBeGreaterThan(-1);
    expect(ruledLines[siblingAt + 1] ?? '').not.toContain('ruled ceiling');
  });

  it('is red — not silently green — when a measured scope reads as empty', () => {
    write(residual('thing.report.ts'), 'export const d = 1;\n');

    const { status, output } = run(root);
    expect(status).toBe(1);
    expect(output).toContain(`${verdictLabel(SCOPE, 'business semantics')} measured 0 tokens`);
    expect(output).toContain('refusing to treat an empty read as a pass');
  });
});

/**
 * The states the gate REFUSES to run in, rather than printing a number.
 *
 * Before #1928 there was one of them — a hand-listed measured directory gone
 * missing — because every list the gate stood on was hand-written and the only
 * failure mode was a stale entry. The roster is read off disk now, which
 * retires that failure and creates three new ones, all of which are quiet:
 *
 *   - a package on disk with no committed ceiling reads exactly like a package
 *     under its ceiling;
 *   - a ceiling committed for a package that is gone guards nothing;
 *   - a layer whose directory names no longer exist anywhere reads, per
 *     package, as "this package authors no interaction metadata" — which is a
 *     legitimate state, so nothing else here would notice half the surface
 *     going unmeasured.
 *
 * Each is asserted by CAUSING it, because a refusal nobody runs is a paragraph.
 */
describe('source token ratchet — the states it refuses to run in', () => {
  it('names a package that carries no committed ceiling', () => {
    seedScope();
    expect(run(root).status).toBe(0);

    const NEW_PACKAGE = 'src/psa';
    write(`${NEW_PACKAGE}/${BUSINESS_DIRS[0]}/crm_project.object.ts`, 'export const p = 1;\n');
    const { status, output } = run(root);
    expect(status).toBe(1);
    expect(output).toContain('refusing to run');
    expect(output).toContain(`${NEW_PACKAGE} carries no committed ceiling for`);
    // And it says the one thing an author needs: this is not a raise.
    expect(output).toContain('FIRST');
    expect(output).toContain('needs no ruling');
  });

  it('does not treat a directory without objects/ as a package — src/docs stays out', () => {
    // ADR-0046's in-product documentation path: four `.md` files, no `objects/`.
    // It falls out of the predicate rather than out of an exception list, which
    // is the point — a hand-kept exception list is the thing #1940 broke on.
    seedScope();
    write('src/docs/crm_overview.md', '# Overview\n');
    write('src/docs/crm_sales.md', '# Sales\n');

    const { status, output } = run(root);
    expect(status).toBe(0);
    expect(output).not.toContain('src/docs');
    expect(report().packages.map((p) => p.dir)).toEqual([...PACKAGE_DIRS]);
  });

  it('names a ceiling committed for a package that is no longer on disk', () => {
    seedScope();
    const doomed = PACKAGE_DIRS.find((pkg: string) => pkg !== SCOPE)!;
    rmSync(join(root, doomed), { recursive: true, force: true });

    const { status, output } = run(root);
    expect(status).toBe(1);
    expect(output).toContain('refusing to run');
    expect(output).toContain(`a ceiling is committed for ${doomed}`);
  });

  it('names the app package when its directory moves out from under the headline claim', () => {
    seedScope();
    rmSync(join(root, SCOPE), { recursive: true, force: true });

    const { status, output } = run(root);
    expect(status).toBe(1);
    expect(output).toContain(`${SCOPE} is not one of the packages on disk`);
  });

  it('names a headline layer whose directories have vanished from every package', () => {
    // The replacement for the old missing-directory check, and strictly wider:
    // that one named a path, this one catches a rename of the metadata-type
    // directories themselves — the case where each package honestly reports
    // "no interaction metadata" and the gate goes green over half the surface.
    //
    // Driven on the layers it CAN be driven on, which is the ones whose
    // directories are not the roster predicate. `objects/` is that predicate,
    // so a tree with no `objects/` anywhere has no packages at all and the
    // empty-roster refusal fires first; the case below asserts exactly that
    // rather than pretending this refusal covers a state it cannot reach.
    seedScope();
    const layers = LAYERS as { label: string; dirs: string[] }[];
    const reachable = layers.filter((layer) => !layer.dirs.includes('objects'));
    expect(reachable.length, 'no headline layer is independent of the roster predicate').toBe(
      layers.length - 1,
    );

    for (const layer of reachable) {
      const dirs = PACKAGE_DIRS.flatMap((pkg: string) => layerDirs(pkg, layer));
      for (const dir of dirs) rmSync(join(root, dir), { recursive: true, force: true });

      const { status, output } = run(root);
      expect(status, layer.label).toBe(1);
      expect(output).toContain(`no package holds any '${layer.label}' directory`);

      for (const dir of dirs) mkdirSync(join(root, dir), { recursive: true });
      seedModules();
      seedScope();
    }
  });

  it('falls to the empty-roster refusal when objects/ itself disappears', () => {
    // `objects/` is load-bearing twice over: it is a business-semantics
    // directory AND it is what makes a directory under `src/` a package. Losing
    // it everywhere is therefore not "the business layer vanished", it is "there
    // are no packages" — a strictly louder state, and the one the gate must
    // report, because a roster that reads as empty is how a ratchet passes by
    // measuring nothing.
    seedScope();
    for (const pkg of PACKAGE_DIRS) {
      rmSync(join(root, `${pkg}/objects`), { recursive: true, force: true });
    }

    const { status, output } = run(root);
    expect(status).toBe(1);
    expect(output).toContain('carries an objects/ directory');
    expect(output).toContain('green over an empty tree');
  });

  it('refuses when src/ holds no package at all, rather than measuring nothing', () => {
    for (const pkg of PACKAGE_DIRS) rmSync(join(root, pkg), { recursive: true, force: true });

    const { status, output } = run(root);
    expect(status).toBe(1);
    expect(output).toContain('carries an objects/ directory');
    expect(output).toContain('green over an empty tree');
  });
});

describe('source token ratchet — this repository, today', () => {
  /**
   * The real, fixture-free run — the exact command CI runs, so a breach is
   * caught by `pnpm test` too and not only by the dedicated CI step.
   *
   * When this goes red, a package grew past its committed claim. The fix is to
   * shrink it, or to raise that package's ceiling in a PR quoting a maintainer
   * ruling — never to relax this assertion.
   */
  it('is green, and every package carries a ceiling for every scope it owes', () => {
    const { status, output } = run(REPO_ROOT);
    expect(status).toBe(0);
    expect(output).toContain('✓ source token ratchet clean');

    const { packages } = report(REPO_ROOT);
    expect(packages.map((pkg) => pkg.dir)).toEqual([...PACKAGE_DIRS]);

    for (const pkg of packages) {
      for (const label of requiredCeilings(pkg.dir) as string[]) {
        const row = pkg.scopes.find((s) => s.label === label);
        expect(row, `${pkg.dir} reports no row for '${label}'`).toBeDefined();
        expect(row!.ceiling, `${pkg.dir} ${label}`).toBeGreaterThan(0);
        expect(row!.tokens, `${pkg.dir} ${label}`).toBeLessThanOrEqual(row!.ceiling as number);
        // Vacuity guard: an empty scope would satisfy the inequality above.
        expect(row!.tokens, `${pkg.dir} ${label}`).toBeGreaterThan(0);
      }
      // The residual is reported but deliberately un-ceilinged: it is carried by
      // the package's authored total, which is ratcheted.
      expect(pkg.scopes.find((s) => s.label === 'other authored metadata')!.ceiling).toBeNull();
      // Every verdict row prints under the package's own name.
      for (const label of requiredCeilings(pkg.dir) as string[]) {
        expect(output).toContain(`✓ ${verdictLabel(pkg.dir, label)} ~`);
      }
    }
  });

  it('accounts for every authored file exactly once, in every package', () => {
    const { packages } = report(REPO_ROOT);
    const parts = [...LAYERS.map((l: { label: string }) => l.label), 'other authored metadata'];
    for (const pkg of packages) {
      const at = (label: string) => pkg.scopes.find((s) => s.label === label)!;
      expect(parts.reduce((n, l) => n + at(l).chars, 0), pkg.dir).toBe(at(TOTAL_LABEL).chars);
      expect(parts.reduce((n, l) => n + at(l).files, 0), pkg.dir).toBe(at(TOTAL_LABEL).files);
    }
  });

  it('keeps the app package\'s rows under bare labels, for the README pin', () => {
    // `test/docs-readme-token-figures.test.ts` reads the top-level `scopes`
    // key, and the banner is a claim about the package a customer installs —
    // ADR-0130 §1.3(b) — not about the four summed. A refactor that pointed
    // that key at the whole tree would check the banner against a surface the
    // banner never described, silently.
    const parsed = report(REPO_ROOT);
    const app = parsed.packages.find((pkg) => pkg.dir === SCOPE)!;
    expect(app.headline).toBe(true);
    expect(parsed.packages.filter((pkg) => pkg.headline)).toHaveLength(1);
    expect(parsed.scopes).toEqual(app.scopes);
  });
});

/**
 * The header's worked table — the second hand-calibrated copy of the ceilings,
 * and until #1321 the one with no producer-side pin at all.
 *
 * The gate computes every figure in that table: `anchor()` turns a reading into
 * the ceiling, `COMMITTED_CEILINGS` holds what was committed, and the headroom
 * and percentage fall out of the two. The table restates all of it in prose
 * beside the constants, so it rots the moment one moves — which is exactly what
 * #1317 found when it re-anchored the interaction layer and the row went false.
 *
 * Since #1601 the table carries TWO shapes, because a ceiling can now be
 * reached two ways. An ANCHORED row shows its arithmetic — `anchor()` of a
 * reading this gate printed — and every case below still holds it to that. A
 * RULED row is a maintainer grant: no reading derives it, so there is no
 * arithmetic to show and the row states the constant and the date it was ruled.
 * Both kinds are pinned and neither may go missing. The kind is not a free
 * choice either: the ruled case checks that no reading recorded here could have
 * anchored the constant, which is what stops a ceiling being filed as "ruled"
 * to dodge arithmetic that did in fact apply.
 *
 * Since #1928 every row also carries the PACKAGE it is about, because
 * `business semantics` is no longer one ceiling but four. A row that lost its
 * package column would parse as a different row's, so the column is captured
 * and asserted like every other field.
 *
 * ⚠️ `headroom` on a row is the headroom **at anchor time** — that row's own
 * reading against its own ceiling — and is deliberately NOT what the gate prints
 * today: the tree keeps moving between re-anchorings, and since #1320 the rows
 * need not come from one run (hence the per-row date column). So every
 * assertion here is internal to the row plus the committed constant, and none of
 * them reads a live measurement. Comparing a row's headroom against a live run
 * would be wrong by design, not merely flaky.
 */
describe('source token ratchet — the header table is derived from the ceilings, not transcribed beside them', () => {
  const source = () => readFileSync(join(REPO_ROOT, GATE), 'utf8');
  const num = (figure: string) => Number(figure.replace(/,/g, ''));

  /**
   * One worked row of the header table, in its post-#1928 shape:
   *
   *   *   src/service    interaction layer     6,228 × 1.05 =   6,539 -> ceil 1k ->   7,000  (headroom 772, 12.4%)  2026-09-16
   *
   * Column widths are free — the rows are hand-aligned and realigning them must
   * not be a test failure — but every field is captured, the package and the
   * date columns included, so a row that quietly loses one stops parsing
   * instead of passing.
   *
   * The `(headroom …)` group is also what keeps the HISTORY rows below the live
   * table out of this parser: they carry no headroom column, by design, because
   * they restate no committed constant.
   */
  const TABLE_ROW =
    / \* {2,}(?<module>src\/\S+) {2,}(?<label>\S.*?\S) {2,}(?<reading>[\d,]+) × (?<multiplier>\d+\.\d+) = +(?<product>[\d,]+) -> ceil 1k -> +(?<ceiling>[\d,]+) +\(headroom (?<headroom>[\d,]+), (?<pct>\d+\.\d)%\) +(?<date>\d{4}-\d{2}-\d{2})\s*$/;

  interface Row {
    module: string;
    label: string;
    reading: number;
    multiplier: string;
    product: number;
    ceiling: number;
    headroom: number;
    pct: string;
    date: string;
    line: string;
    index: number;
  }

  function rows(): Row[] {
    return source()
      .split('\n')
      .flatMap((line, index) => {
        const found = TABLE_ROW.exec(line);
        if (!found?.groups) return [];
        const g = found.groups;
        return [
          {
            index,
            module: g.module,
            label: g.label,
            reading: num(g.reading),
            multiplier: g.multiplier,
            product: num(g.product),
            ceiling: num(g.ceiling),
            headroom: num(g.headroom),
            pct: g.pct,
            date: g.date,
            line: line.trim(),
          },
        ];
      });
  }

  /**
   * A recorded anchoring run: the command, the date it was run, and the reading
   * it produced per package and layer. Since #1320 each table row is dated with
   * the run its reading came from, so these are what makes that column mean
   * something; since #1928 a run records one reading LINE per package, because
   * twelve readings do not fit on one.
   *
   * The ref the run was taken on is captured, not required to be `main`. An
   * anchoring that RE-SCOPES the gate cannot be measured on `main` at all — the
   * reading it commits does not exist there, because the directories it
   * measures do not (#1905 moved the scope to `src/sales/`). Naming the ref and
   * its sha keeps the row reproducible, which is the property the stamp is for;
   * insisting on `main` would have forced either a false stamp or a ceiling with
   * no recorded reading behind it.
   */
  const RUN =
    / \* +node scripts\/check-source-token-ratchet\.mjs +# (?<date>\d{4}-\d{2}-\d{2}) [\d:]+ UTC, `(?<ref>[^`]+)` at (?<sha>[0-9a-f]{7,40})\s*$/;
  const RUN_READINGS = / \* +(?<module>src\/\S+) +(?<readings>\S[^~]*~[\d,]+.*)$/;

  function runs(): { date: string; readings: Map<string, number> }[] {
    const lines = source().split('\n');
    return lines.flatMap((line, i) => {
      const found = RUN.exec(line);
      if (!found?.groups) return [];
      const readings = new Map<string, number>();
      for (const next of lines.slice(i + 1, i + 9)) {
        const hit = RUN_READINGS.exec(next);
        if (!hit?.groups) continue;
        for (const part of hit.groups.readings.split('·')) {
          const pair = /^\s*(?<label>\S.*?)\s+~(?<tokens>[\d,]+)\s*$/.exec(part);
          if (pair?.groups) {
            readings.set(`${hit.groups.module} ${pair.groups.label}`, num(pair.groups.tokens));
          }
        }
      }
      return [{ date: found.groups.date, readings }];
    });
  }

  /**
   * One RULED row — a ceiling granted by a maintainer rather than anchored:
   *
   *   *   src/sales      business semantics   ruled 100,000 — a maintainer grant, no reading derives it   2026-09-05
   *
   * There is no arithmetic in it because there is none to state: the constant
   * comes from a ruling, not from a reading. The reason it is captured at all
   * is that it still restates a committed ceiling in prose, which is the whole
   * hazard this describe block exists for. Same discipline as `TABLE_ROW`: the
   * column widths and the prose between the constant and the date are free, but
   * the package, the label, the ceiling and the date are captured, so a row that
   * quietly loses one stops parsing instead of passing.
   *
   * ⛔ Never widen this to make an anchored row match it. A ceiling that a
   * recorded reading anchors to is an anchored ceiling and owes a worked row;
   * the case below is what holds that line.
   */
  const RULED_ROW =
    / \* {2,}(?<module>src\/\S+) {2,}(?<label>\S.*?\S) {2,}ruled (?<ceiling>[\d,]+) — (?<why>\S.*?\S) +(?<date>\d{4}-\d{2}-\d{2})\s*$/;

  interface Ruled {
    module: string;
    label: string;
    ceiling: number;
    why: string;
    date: string;
    line: string;
    index: number;
  }

  function ruledRows(): Ruled[] {
    return source()
      .split('\n')
      .flatMap((line, index) => {
        const found = RULED_ROW.exec(line);
        if (!found?.groups) return [];
        const g = found.groups;
        return [
          {
            index,
            module: g.module,
            label: g.label,
            ceiling: num(g.ceiling),
            why: g.why,
            date: g.date,
            line: line.trim(),
          },
        ];
      });
  }

  /**
   * One worked line for a re-anchoring that was DECLINED as a raise:
   *
   *   *   src/sales      business semantics  anchor( 82,489) =  87,000  > ceiling  85,000  2026-08-26
   *
   * #1341 reflowed these out of a wrapped sentence into rows shaped like the
   * table above, which is what makes them pinnable at all — so they are located
   * by content, never by line number. Same discipline as TABLE_ROW: the column
   * widths are free, but every field is captured, and when the header's shape
   * changes the fix is to teach this regex the new shape — never to relax it.
   */
  const DECLINED_ROW =
    / \* {2,}(?<module>src\/\S+) {2,}(?<label>\S.*?\S) {2,}anchor\( *(?<reading>[\d,]+)\) = +(?<anchored>[\d,]+) +> ceiling +(?<ceiling>[\d,]+) +(?<date>\d{4}-\d{2}-\d{2})\s*$/;

  interface Declined {
    module: string;
    label: string;
    reading: number;
    anchored: number;
    ceiling: number;
    date: string;
    line: string;
  }

  function declined(): Declined[] {
    return source()
      .split('\n')
      .flatMap((line) => {
        const found = DECLINED_ROW.exec(line);
        if (!found?.groups) return [];
        const g = found.groups;
        return [
          {
            module: g.module,
            label: g.label,
            reading: num(g.reading),
            anchored: num(g.anchored),
            ceiling: num(g.ceiling),
            date: g.date,
            line: line.trim(),
          },
        ];
      });
  }

  /** The (package, label) key every pin below compares on. */
  const key = (row: { module: string; label: string }) => `${row.module} ${row.label}`;

  it('carries exactly one row per committed ceiling, of either kind, in the committed order', () => {
    // A failure here means the table did not parse, not that a figure is wrong.
    // The fix is to teach TABLE_ROW or RULED_ROW the header's new shape — never
    // to relax either, and never to drop the row: a ceiling with no row at all
    // is a ceiling nobody can check.
    //
    // This is also the vacuity guard for BOTH parsers. Every case below is
    // trivially true against a table its regex cannot read, so a ruled row that
    // stops parsing has to surface HERE, as a missing label, rather than as an
    // empty set that passes. Merged on document position so the header's
    // reading order is still what is asserted, whichever kind each row is.
    const documented = [
      ...rows().map((row) => ({ key: key(row), index: row.index })),
      ...ruledRows().map((row) => ({ key: key(row), index: row.index })),
    ].sort((a, b) => a.index - b.index);

    expect(documented.map((entry) => entry.key)).toEqual(
      (COMMITTED_CEILINGS as { module: string; label: string }[]).map(key),
    );
  });

  it('declares in code the same kinds the header states in prose', () => {
    // The ruled/anchored distinction has two halves now. The header's rows are
    // the half a reader meets; the committed table's `kind` is the half the
    // advisory asks at run time (#1607). Until that card the concept lived only
    // in this prose, so nothing could disagree with it — now something can, and
    // the two ways to disagree are both silent. A row rewritten as ruled while
    // the constant stays anchored documents an exemption that never fires; the
    // reverse drops the advisory for a layer that owes it, which is a weakened
    // ratchet.
    //
    // Read off the parsers above rather than listed, so a future ruling moves
    // the header and the constant together and this case follows both.
    const declared = (kind: string) =>
      (COMMITTED_CEILINGS as { module: string; label: string; kind: string }[])
        .filter((row) => row.kind === kind)
        .map(key)
        .sort();

    expect(ruledRows().map(key).sort()).toEqual(declared('ruled'));
    expect(rows().map(key).sort()).toEqual(declared('anchored'));

    // Non-vacuity — one half measured, one half constructed.
    //
    // The anchored half is measured: at least one committed ceiling is
    // anchored, so that comparison is never empty-to-empty.
    //
    // The ruled half cannot be, any more. #1905 re-anchored onto the
    // `src/sales/` reading, which retired the #1601 grant along with the
    // whole-tree surface it was about, and #1928 anchored all twelve. That is
    // the finished state of the table, not a disabled mechanism. What an
    // empty-to-empty pass WOULD hide is a `RULED_ROW` that has quietly stopped
    // parsing, so that is asserted directly instead: the parser is proven live
    // against a row in the shape the header carried one, even while the header
    // carries none.
    expect(declared('anchored').length).toBeGreaterThan(0);
    expect(
      RULED_ROW.exec(
        ' *   src/sales      business semantics   ruled 100,000 — a maintainer grant, no reading derives it   2026-09-05',
      )?.groups,
      'RULED_ROW no longer parses a ruled row in the shape the header carries one. Teach it the ' +
        'new shape — leaving the ruled comparison above to pass on two empty sets is exactly the ' +
        'vacuity this block exists to prevent.',
    ).toMatchObject({
      module: 'src/sales',
      label: 'business semantics',
      ceiling: '100,000',
      date: '2026-09-05',
    });
  });

  it('states a ruled ceiling as ruled, and proves no recorded reading anchored it', () => {
    for (const row of ruledRows()) {
      // The number printed in the row IS the constant committed below it …
      expect(row.ceiling, row.line).toBe(ceilingOf(row.module, row.label));

      // … and the row's own claim, that no reading derives this ceiling, is
      // checked rather than taken on trust.
      //
      // NOT as "no integer anchors here": that is false of every multiple of
      // 1,000 — readings 94,286 through 95,238 all anchor to 100,000 — so a
      // case asserting it could never pass, and one asserting its negation
      // would pass on every ceiling and mean nothing. The honest form is
      // header-internal, like every other assertion in this block: none of the
      // readings recorded above for that row produces this constant. If one
      // did, the ceiling would be an ordinary anchoring wearing a grant's
      // clothes, and it owes the worked arithmetic instead — which is the one
      // way "ruled" could be used to dodge a discipline that did apply.
      for (const record of runs()) {
        const reading = record.readings.get(key(row));
        if (reading === undefined) continue;
        expect(
          anchor(reading),
          `${row.line}\n  the ${record.date} run read ${reading.toLocaleString('en-US')} for ` +
            `'${key(row)}', and that anchors to exactly the ceiling this row calls a grant. ` +
            'It is an anchored ceiling: give it a worked row rather than a ruling.',
        ).not.toBe(row.ceiling);
      }
    }
  });

  it('commits exactly `anchor(reading)` on every row', () => {
    expect(rows().length).toBeGreaterThan(0);
    for (const row of rows()) {
      // The number printed in the row IS the constant committed below it …
      expect(row.ceiling, row.line).toBe(ceilingOf(row.module, row.label));
      // … and that constant is what `anchor()` makes of the row's own reading.
      expect(anchor(row.reading), row.line).toBe(ceilingOf(row.module, row.label));
    }
  });

  it('derives the buffered product, the headroom and the percentage it prints', () => {
    for (const row of rows()) {
      // The `× 1.05` in the row is the ruled buffer, not a number of its own.
      expect(Number(row.multiplier), row.line).toBe(1 + BUFFER);
      expect(row.product, row.line).toBe(Math.round(row.reading * (1 + BUFFER)));
      // Headroom and percentage are at ANCHOR time: the row's own reading
      // against the row's own ceiling, never against a live run.
      expect(row.headroom, row.line).toBe(row.ceiling - row.reading);
      expect(row.pct, row.line).toBe(((row.headroom / row.reading) * 100).toFixed(1));
    }
  });

  it('dates every row with the anchoring run its reading came from', () => {
    // #1320 split the table across runs and added this column. It is only worth
    // the space if it points at something, so the row's reading must be the
    // reading that run recorded for that package and layer.
    const recorded = runs();
    expect(recorded.length).toBeGreaterThan(0);
    // The parser really did read readings, not just find a command line.
    expect(recorded.some((record) => record.readings.size > 0)).toBe(true);

    for (const row of rows()) {
      const record = recorded.find((r) => r.date === row.date);
      expect(record, `${row.line}\n  no anchoring run is recorded for ${row.date}`).toBeDefined();
      expect(record?.readings.get(key(row)), row.line).toBe(row.reading);
    }
  });

  it('carries a declined row for every ceiling the latest anchoring run left alone', () => {
    // Non-vacuity, derived rather than listed: a row that re-anchored carries
    // that run's own date in the table above, so every OTHER committed ceiling
    // was left alone on that run and owes a worked line saying why.
    //
    // Read off `rows()`, so RULED ceilings are outside this ledger by
    // construction, and that is deliberate (#1601): "declined as a raise" is
    // reasoning inside the shrink-only discipline, and a maintainer grant is
    // not a re-anchoring that was weighed and declined. A ruled ceiling owes no
    // line here; it owes the ruling, which is in the header beside it. A header
    // whose sentence stops parsing therefore fails here instead of passing as
    // an empty set — and a legitimate future re-anchoring retires its own row
    // without this list having to be edited by hand.
    const latest = [...runs()].sort((a, b) => a.date.localeCompare(b.date)).at(-1);
    expect(latest, 'no anchoring run is recorded in the header').toBeDefined();
    const leftAlone = rows().filter((row) => row.date !== latest?.date).map(key);
    expect(declined().map(key)).toEqual(leftAlone);

    // #1928 anchored every committed ceiling on one run, so `leftAlone` is
    // empty and the comparison above is empty-to-empty. What that would hide is
    // a `DECLINED_ROW` that has stopped parsing, so the parser is proven live
    // against a row in the shape the header carried one — the same defence the
    // ruled comparison carries, for the same reason.
    expect(
      DECLINED_ROW.exec(
        ' *   src/sales      business semantics  anchor( 82,489) =  87,000  > ceiling  85,000  2026-08-26',
      )?.groups,
      'DECLINED_ROW no longer parses a declined row in the shape the header carries one. Teach ' +
        'it the new shape — leaving the comparison above to pass on two empty sets is exactly ' +
        'the vacuity this block exists to prevent.',
    ).toMatchObject({ module: 'src/sales', label: 'business semantics', ceiling: '85,000' });
  });

  it('proves every declined re-anchoring really would have been a raise', () => {
    const recorded = runs();
    for (const row of declined()) {
      // The figure stated IS `anchor()` of the reading beside it …
      expect(anchor(row.reading), row.line).toBe(row.anchored);
      // … the ceiling it is weighed against is the constant committed below …
      expect(row.ceiling, row.line).toBe(ceilingOf(row.module, row.label));
      // … and it lands ABOVE that ceiling. This inequality is the claim itself:
      // it is what makes the row a re-anchoring DECLINED as a raise, rather
      // than arithmetic that merely parses.
      expect(row.anchored, row.line).toBeGreaterThan(ceilingOf(row.module, row.label));
      // And the reading is the one the run named on the row actually produced,
      // so the row cannot quietly be re-dated onto a run that never read it.
      const record = recorded.find((r) => r.date === row.date);
      expect(record, `${row.line}\n  no anchoring run is recorded for ${row.date}`).toBeDefined();
      expect(record?.readings.get(key(row)), row.line).toBe(row.reading);
    }
  });

  it('quotes the ruling that authorises a raise, in the file the raise lives in', () => {
    // The gate's own discipline, applied to the gate: two of `src/sales`'s three
    // ceilings went UP in #1928 as the re-anchoring carried them onto today's
    // reading, and raising one "requires a maintainer ruling quoted in the
    // raising PR's body". The PR body is not a thing a test can read; the header
    // beside the constants is, and it is where the next reader will look.
    expect(
      source(),
      "the gate's header no longer carries the ruling that authorises its own per-module " +
        'ceilings. It is not decoration: two committed ceilings were raised under it.',
    ).toContain('1928 门禁 改为 多 sales 模块的门禁');
    expect(source()).toContain('给 5% 缓冲');
    expect(source()).toContain('translations + seed 肯定是不需要算 token 的');
  });
});

describe('source token ratchet — wiring (a gate that cannot run is not a gate)', () => {
  const read = (rel: string) => readFileSync(join(REPO_ROOT, rel), 'utf8');

  it('runs in both CI workflows', () => {
    for (const workflow of ['.github/workflows/ci.yml', '.github/workflows/code-quality.yml']) {
      expect(read(workflow)).toContain(`node ${GATE}`);
    }
  });

  it('runs on every pull request that can touch src/', () => {
    // #1169: `Code Quality` filters on paths, so it fires for `**.ts` (which
    // covers all of src/) but would not for a hypothetical non-.ts metadata
    // file. `CI` carries no path filter at all, so the ratchet always runs —
    // that is the copy this assertion protects.
    const ci = read('.github/workflows/ci.yml');
    expect(ci).toContain('pull_request:');
    expect(ci.slice(0, ci.indexOf('jobs:'))).not.toContain('paths:');
  });

  it('is part of `pnpm verify` and has its own script', () => {
    const pkg = JSON.parse(read('package.json')) as { scripts: Record<string, string> };
    expect(pkg.scripts['hygiene:tokens']).toBe(`node ${GATE}`);
    expect(pkg.scripts.verify).toContain('pnpm hygiene:tokens');
  });
});
