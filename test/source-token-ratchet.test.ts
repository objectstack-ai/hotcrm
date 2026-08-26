// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { anchor, fmt, BUFFER, CEILINGS } from '../scripts/check-source-token-ratchet.mjs';
import { REPO_ROOT } from './helpers/repo-root';

/**
 * `scripts/check-source-token-ratchet.mjs` (#1183).
 *
 * The gate puts a shrink-only ceiling on HotCRM's headline positioning claim —
 * the authored surface, in estimated tokens. Two things about it can rot
 * silently, and this suite pins both.
 *
 * **The measurement basis.** The number is only meaningful if the same rule is
 * applied on every run, so the stripping rule is asserted here rather than
 * described only in prose: comments go, string bodies stay, and the two
 * excluded trees (`src/translations/`, `src/data/`) are never measured at all.
 * That last one is a maintainer ruling, not an implementation detail
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
 * Mechanics: the script derives its repo root from its own location
 * (`new URL('..', import.meta.url)`), so copying it into `<sandbox>/scripts/`
 * makes a throwaway directory its root — the same technique
 * `source-hygiene-scan-surface.test.ts` uses. That runs the real, unmodified
 * gate, with its real committed ceilings, against fixtures we control. The
 * script imports nothing outside `node:` builtins and its own
 * `scripts/lib/main-module.mjs` (copied alongside it by `beforeEach`), so the
 * sandbox needs no `node_modules`.
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

/** Every directory the gate insists on finding, so a fixture run is not a missing-dir run. */
const LAYER_DIRS = [
  'src/objects',
  'src/flows',
  'src/actions',
  'src/hooks',
  'src/views',
  'src/pages',
  'src/dashboards',
  'src/apps',
];

/** Outside the ratchet by maintainer ruling — never measured. */
const EXCLUDED_DIRS = ['src/translations', 'src/data'];

interface Scope {
  label: string;
  files: number;
  lines: number;
  chars: number;
  tokens: number;
  ceiling: number | null;
}

/**
 * The committed ceiling for a label, read from the producer.
 *
 * Every figure below that used to be a literal comes from here instead. The
 * ceilings sit on a shrink-only ratchet whose own discipline is to tighten
 * opportunistically, so a literal calibrated against today's constant is in
 * permanent tension with the gate it tests: it reads correctly until the next
 * legitimate re-anchoring and then goes red for having been right (#1317 had to
 * buy a fence extension to rewrite one). Throws rather than returning
 * `undefined`, so a label that stops being a ceiling names itself.
 */
function ceilingOf(label: string): number {
  const ceiling = CEILINGS.get(label);
  if (typeof ceiling !== 'number') {
    throw new Error(`'${label}' is not a committed ceiling — the gate's CEILINGS keys moved`);
  }
  return ceiling;
}

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'token-ratchet-'));
  for (const dir of [...LAYER_DIRS, ...EXCLUDED_DIRS, 'scripts']) {
    mkdirSync(join(root, dir), { recursive: true });
  }
  copyFileSync(join(REPO_ROOT, GATE), join(root, GATE));
  for (const dep of GATE_DEPENDENCIES) {
    mkdirSync(dirname(join(root, dep)), { recursive: true });
    copyFileSync(join(REPO_ROOT, dep), join(root, dep));
  }
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
    return { status: failure.status ?? -1, output: `${failure.stdout ?? ''}${failure.stderr ?? ''}` };
  }
}

/** The sandbox measurement, by scope label. */
function measure(at: string = root): Record<string, Scope> {
  const { output } = run(at, ['--json']);
  const parsed = JSON.parse(output) as { scopes: Scope[] };
  return Object.fromEntries(parsed.scopes.map((s) => [s.label, s]));
}

describe('source token ratchet — measurement basis', () => {
  it('routes a file to the layer that owns its directory, and sums to the total', () => {
    write('src/objects/crm_thing.object.ts', 'export const a = 1;\n'); // 19 chars retained
    write('src/flows/thing.flow.ts', 'export const b = 22;\n'); //        20
    write('src/views/thing.view.ts', 'export const c = 333;\n'); //       21
    write('src/reports/thing.report.ts', 'export const d = 4444;\n'); //  22

    const scopes = measure();
    expect(scopes['business semantics']).toMatchObject({ files: 2, lines: 2, chars: 19 + 20 });
    expect(scopes['interaction layer']).toMatchObject({ files: 1, lines: 1, chars: 21 });
    expect(scopes['other authored metadata']).toMatchObject({ files: 1, chars: 22 });
    // Nothing under src/ can hide from the total by living outside both layers.
    expect(scopes['authored total'].chars).toBe(19 + 20 + 21 + 22);
    expect(scopes['authored total'].files).toBe(4);
  });

  it('strips line, trailing and block comments, and blank lines with them', () => {
    write(
      'src/objects/commented.object.ts',
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
    // Not hypothetical: src/actions/*.ts ship QuickJS action bodies as template
    // literals, and those bodies carry their own `//` commentary. It is authored
    // surface that an agent reads, so it counts; a line-oriented measurement
    // silently discards it (measured: ~2.8k tokens across five files).
    const body = 'export const BODY = `// not a comment\n  * nor this\n  /* nor this */`;';
    write('src/actions/thing.actions.ts', `${body}\n`);

    const scopes = measure();
    expect(scopes['business semantics']).toMatchObject({ lines: 3, chars: body.length });
  });

  it('keeps a regex literal that contains quote and comment characters', () => {
    const line = String.raw`export const re = /['"]\/\/[/*]/g;`;
    write('src/objects/re.object.ts', `${line} // stripped\n`);

    expect(measure()['business semantics']).toMatchObject({ lines: 1, chars: line.length });
  });

  it('never measures translations/ or seed data, however large they grow', () => {
    const bulk = `export const t = "${'x'.repeat(400 * 1024)}";\n`;
    write('src/translations/fr-FR.ts', bulk);
    write('src/data/sales.seed.ts', bulk);
    write('src/objects/crm_thing.object.ts', 'export const a = 1;\n');
    write('src/views/thing.view.ts', 'export const c = 2;\n');

    const scopes = measure();
    expect(scopes['authored total'].chars).toBe(19 + 19);

    // Green: a new locale must never compete with business logic for budget.
    const { status, output } = run(root);
    expect(status).toBe(0);
    expect(output).toContain('outside the ratchet by ruling');
    expect(output).toContain('source token ratchet clean');
  });

  it('prints the headline layers in the form a doc can cite', () => {
    write('src/objects/crm_thing.object.ts', `export const a = "${'x'.repeat(8000)}";\n`);
    write('src/views/thing.view.ts', `export const c = "${'x'.repeat(4000)}";\n`);

    const { output } = run(root);
    expect(output).toContain('Headline: business semantics ~2k · interaction layer ~1k');
    expect(output).toContain('authored total ~3k');
  });
});

describe('source token ratchet — the ratchet itself', () => {
  it('fails when a scope exceeds its ceiling, naming the scope and the only way up', () => {
    // Sized from the committed ceiling, never from a copy of it, and the two
    // figures the message quotes are read back off the gate's own measurement.
    const ceiling = ceilingOf('business semantics');
    write('src/objects/crm_bloat.object.ts', `export const a = "${'x'.repeat((ceiling + 1000) * 4)}";\n`);

    const { status, output } = run(root);
    expect(status).toBe(1);
    const over = measure()['business semantics'].tokens;
    expect(over).toBeGreaterThan(ceiling);
    expect(output).toContain(`business semantics is ~${fmt(over)}`);
    expect(output).toContain(`the ratchet ceiling is ~${fmt(ceiling)}`);
    expect(output).toContain(`over by ~${fmt(over - ceiling)}`);
    expect(output).toContain('quotes a maintainer ruling');
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
    write('src/objects/crm_thing.object.ts', 'export const a = 1;\n');
    write('src/views/thing.view.ts', 'export const c = 2;\n');

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
    const ceiling = ceilingOf('interaction layer');
    const target = Math.floor(ceiling / (1 + BUFFER));

    // Fill to exactly `target` tokens. `~tokens` is stripped chars / 4, so
    // subtract what the layer already holds and the wrapper the stripper keeps
    // — the reading is then exact rather than approximately sized, and it
    // re-derives itself the next time the ceiling is tightened.
    const view = (filler: string) => `export const v = "${filler}";\n`;
    const held = measure()['interaction layer'].chars;
    write('src/views/bulk.view.ts', view('y'.repeat(target * 4 - held - view('').trimEnd().length)));

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
    const at = lines.findIndex((l) => l.includes('✓ interaction layer'));
    expect(at).toBeGreaterThan(-1);
    expect(lines[at]).toContain(`headroom ~${fmt(ceiling - scope.tokens)}`);
    expect(lines[at + 1] ?? '').not.toContain('over twice the 5% buffer');
  });

  it('is red — not silently green — when a measured scope reads as empty', () => {
    write('src/reports/thing.report.ts', 'export const d = 1;\n');

    const { status, output } = run(root);
    expect(status).toBe(1);
    expect(output).toContain('business semantics measured 0 tokens');
    expect(output).toContain('refusing to treat an empty read as a pass');
  });

  it('fails loudly when a measured directory disappears', () => {
    for (const dir of [...LAYER_DIRS, ...EXCLUDED_DIRS]) {
      rmSync(join(root, dir), { recursive: true, force: true });

      const { status, output } = run(root);
      expect(status).toBe(1);
      expect(output).toContain(`missing: ${dir}`);

      mkdirSync(join(root, dir), { recursive: true });
    }
  });
});

describe('source token ratchet — this repository, today', () => {
  /**
   * The real, fixture-free run — the exact command CI runs, so a breach is
   * caught by `pnpm test` too and not only by the dedicated CI step.
   *
   * When this goes red, the tree grew past the committed claim. The fix is to
   * shrink it, or to raise the ceiling in a PR quoting a maintainer ruling —
   * never to relax this assertion.
   */
  it('is green, and the ceilings cover exactly the ratcheted scopes', () => {
    const { status, output } = run(REPO_ROOT);
    expect(status).toBe(0);
    expect(output).toContain('✓ source token ratchet clean');

    const scopes = measure(REPO_ROOT);
    for (const label of ['business semantics', 'interaction layer', 'authored total']) {
      expect(scopes[label].ceiling).toBeGreaterThan(0);
      expect(scopes[label].tokens).toBeLessThanOrEqual(scopes[label].ceiling as number);
    }
    // The residual is reported but deliberately un-ceilinged: it is carried by
    // the authored total, which is ratcheted.
    expect(scopes['other authored metadata'].ceiling).toBeNull();
  });

  it('accounts for every authored file exactly once', () => {
    const scopes = measure(REPO_ROOT);
    const parts = ['business semantics', 'interaction layer', 'other authored metadata'];
    expect(parts.reduce((n, l) => n + scopes[l].chars, 0)).toBe(scopes['authored total'].chars);
    expect(parts.reduce((n, l) => n + scopes[l].files, 0)).toBe(scopes['authored total'].files);
  });
});

/**
 * The header's worked table — the second hand-calibrated copy of the ceilings,
 * and until now the one with no producer-side pin at all (#1321).
 *
 * The gate computes every figure in that table: `anchor()` turns a reading into
 * the ceiling, `CEILINGS` holds what was committed, and the headroom and
 * percentage fall out of the two. The table restates all of it in prose beside
 * the constants, so it rots the moment one moves — which is exactly what #1317
 * found when it re-anchored the interaction layer and the row went false.
 *
 * ⚠️ `headroom` on a row is the headroom **at anchor time** — that row's own
 * reading against its own ceiling — and is deliberately NOT what the gate prints
 * today: the tree keeps moving between re-anchorings, and since #1320 the three
 * rows do not even come from one run (hence the per-row date column). So every
 * assertion here is internal to the row plus the committed constant, and none of
 * them reads a live measurement. Comparing a row's headroom against a live run
 * would be wrong by design, not merely flaky.
 */
describe('source token ratchet — the header table is derived from the ceilings, not transcribed beside them', () => {
  const source = () => readFileSync(join(REPO_ROOT, GATE), 'utf8');
  const num = (figure: string) => Number(figure.replace(/,/g, ''));

  /**
   * One worked row of the header table, in its post-#1320 shape:
   *
   *   *   interaction layer    37,424 × 1.05 =  39,295 -> ceil 1k ->  40,000  (headroom 2,576, 6.9%)  2026-08-26
   *
   * Column widths are free — the rows are hand-aligned and realigning them must
   * not be a test failure — but every field is captured, the date column
   * included, so a row that quietly loses one stops parsing instead of passing.
   */
  const TABLE_ROW =
    / \* {2,}(?<label>\S.*?\S) {2,}(?<reading>[\d,]+) × (?<multiplier>\d+\.\d+) = +(?<product>[\d,]+) -> ceil 1k -> +(?<ceiling>[\d,]+) +\(headroom (?<headroom>[\d,]+), (?<pct>\d+\.\d)%\) +(?<date>\d{4}-\d{2}-\d{2})\s*$/;

  interface Row {
    label: string;
    reading: number;
    multiplier: string;
    product: number;
    ceiling: number;
    headroom: number;
    pct: string;
    date: string;
    line: string;
  }

  function rows(): Row[] {
    return source()
      .split('\n')
      .flatMap((line) => {
        const found = TABLE_ROW.exec(line);
        if (!found?.groups) return [];
        const g = found.groups;
        return [
          {
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
   * it produced per layer. Since #1320 each table row is dated with the run its
   * reading came from, so these are what makes that column mean something.
   */
  const RUN = / \* +node scripts\/check-source-token-ratchet\.mjs +# (?<date>\d{4}-\d{2}-\d{2}) [\d:]+ UTC, `main` at (?<sha>[0-9a-f]{7,40})\s*$/;
  const RUN_READINGS = / \* +(?<readings>\S[^~]*~[\d,]+.*)$/;

  function runs(): { date: string; readings: Map<string, number> }[] {
    const lines = source().split('\n');
    return lines.flatMap((line, i) => {
      const found = RUN.exec(line);
      if (!found?.groups) return [];
      const next = lines.slice(i + 1, i + 4).find((l) => RUN_READINGS.test(l));
      const readings = new Map<string, number>();
      for (const part of (next ? (RUN_READINGS.exec(next)?.groups?.readings ?? '') : '').split('·')) {
        const pair = /^\s*(?<label>\S.*?)\s+~(?<tokens>[\d,]+)\s*$/.exec(part);
        if (pair?.groups) readings.set(pair.groups.label, num(pair.groups.tokens));
      }
      return [{ date: found.groups.date, readings }];
    });
  }

  it('carries exactly one worked row per committed ceiling, in the committed order', () => {
    // A failure here means the table did not parse, not that a figure is wrong.
    // The fix is to teach TABLE_ROW the header's new shape — never to relax it,
    // and never to drop the row: a ceiling with no worked row is a ceiling
    // nobody can check the arithmetic of.
    expect(rows().map((row) => row.label)).toEqual([...CEILINGS.keys()]);
  });

  it('commits exactly `anchor(reading)` on every row', () => {
    for (const row of rows()) {
      // The number printed in the row IS the constant committed below it …
      expect(row.ceiling, row.line).toBe(ceilingOf(row.label));
      // … and that constant is what `anchor()` makes of the row's own reading.
      expect(anchor(row.reading), row.line).toBe(ceilingOf(row.label));
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
    // reading that run recorded for that layer.
    const recorded = runs();
    expect(recorded.length).toBeGreaterThan(0);

    for (const row of rows()) {
      const run = recorded.find((r) => r.date === row.date);
      expect(run, `${row.line}\n  no anchoring run is recorded for ${row.date}`).toBeDefined();
      expect(run?.readings.get(row.label), row.line).toBe(row.reading);
    }
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
