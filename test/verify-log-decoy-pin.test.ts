// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * The verify-log decoy pin (#1302).
 *
 * ## What was wrong
 *
 * A green `pnpm verify` run emitted **64 lines carrying the `✗` failure
 * marker**, and every one of them was a gate's own failure path driven by a
 * fixture. The run exited 0. Measured on `ec4c5ac6`, by source file:
 *
 * | `✗` lines | test file |
 * | --: | :-- |
 * | 29 | `test/source-hygiene-scan-surface.test.ts` |
 * | 16 | `test/source-token-ratchet.test.ts` |
 * |  7 | `test/source-hygiene-header-position.test.ts` |
 * |  6 | `test/field-consumer-scan.test.ts` — retired in #1543 |
 * |  3 | `test/lint-i18n-gate.test.ts` |
 * |  3 | `test/script-main-guard.test.ts` — fixtures are copies of the real gates |
 * |  0 | `test/docs-readme-token-figures.test.ts` — spawns a gate, but only its green leg |
 * |  0 | `test/source-hygiene-size-advisory.test.ts` — already pinned (#1299) |
 * | **64** | **total — reconciles exactly with the whole-run count** |
 *
 * This is not tidiness. Two independent devs lost time to these lines on
 * 2026-08-25 alone, and the lane's own seat post carried "two verify-log lines
 * read like failures" for weeks — an under-count repeated to every dev on
 * shift. **A reader who learns to skim `✗` in this log will skim a real one.**
 *
 * ## The mechanism, exactly
 *
 * Node's `execFileSync`/`execSync` compute `inheritStderr = !options.stdio`.
 * With no explicit `stdio`, the `spawnSync` underneath still pipes the child's
 * stderr into `ret.stderr` **and** the wrapper then re-writes those bytes to
 * the parent's stderr. So the failure text was always available to the
 * assertion; it was *additionally* echoed into the log.
 *
 * That is why this fix cannot cost a single assertion: pinning `stdio` removes
 * only the echo. `error.stderr` and `error.stdout` are populated identically
 * either way — asserted in rule B as a live control, not taken on faith.
 *
 * Plain `spawnSync` has no such echo, so it is **out of scope by mechanism,
 * not by exemption** — also asserted in rule B, so a rule scoped to two
 * functions stays honest if Node ever changes.
 *
 * ## What this file pins, and why it is shaped this way
 *
 * The leaked-line count is a product of two factors:
 *
 *     leaked failure-marker lines  =  (sites that inherit stderr)
 *                                     × (lines each such site echoes)
 *
 * **Rule A** pins the left factor at **0** by reading every call site under
 * `test/`. **Rule B** measures the right factor on a real child process: 1
 * line leaks from the inherited shape, 0 from the pinned shape. Together they
 * pin the product — the number of gate-shaped `✗` lines the vitest stage can
 * emit — at **0**.
 *
 * ⚠️ **Why this rather than counting the vitest stage's own output.** A pin
 * that re-ran the stage and counted `✗` would have to nest vitest inside
 * vitest, re-run the eight heaviest spawning files on every `pnpm test`, and
 * would go red for things that are not leaks — a gate rewording its message, a
 * fixture gaining a case. A pin that people re-baseline to get green is not a
 * pin. Rule A instead fails at the moment leak #65 is *written*, and names the
 * offending file and line.
 *
 * ⛔ A violation is not fixed by adding a file to an exception list, and not by
 * dropping the assertion that reads the failure text. Pass
 * `stdio: ['ignore', 'pipe', 'pipe']` and keep asserting on the captured
 * output — the shape every site in this repo already uses.
 */

/** The two functions that echo a child's stderr into the parent's log. */
const ECHO_FAMILY = ['execFileSync', 'execSync'] as const;

/** Measured on `ec4c5ac6`, before this card's conversion. */
const DECOY_LINES_BEFORE = 64;

/** Files known to spawn a gate. The scanner must keep finding all of them. */
const KNOWN_SPAWNING_FILES = [
  'test/docs-readme-token-figures.test.ts',
  'test/lint-i18n-gate.test.ts',
  'test/script-main-guard.test.ts',
  'test/source-hygiene-header-position.test.ts',
  'test/source-hygiene-scan-surface.test.ts',
  'test/source-hygiene-size-advisory.test.ts',
  'test/source-token-ratchet.test.ts',
];

const TEST_DIR = join(process.cwd(), 'test');

const testFiles = (dir: string, out: string[] = []): string[] => {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) testFiles(p, out);
    else if (p.endsWith('.ts')) out.push(p);
  }
  return out;
};

/**
 * Blank out comments and the BODIES of strings/templates, keeping newlines so
 * line numbers still line up.
 *
 * Not optional here: this file's prose names the scanned functions repeatedly,
 * and rule B builds child sources that call them. A scan that read those would
 * report itself. Same technique as `test/hook-input-shape.test.ts`,
 * deliberately — one scanner idiom in `test/`.
 */
const codeOnly = (src: string): string => {
  let out = '';
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    const d = src[i + 1];
    if (c === '/' && d === '/') {
      while (i < src.length && src[i] !== '\n') {
        out += ' ';
        i++;
      }
      continue;
    }
    if (c === '/' && d === '*') {
      out += '  ';
      i += 2;
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) {
        out += src[i] === '\n' ? '\n' : ' ';
        i++;
      }
      out += '  ';
      i += 2;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      out += c;
      i++;
      while (i < src.length && src[i] !== c) {
        if (src[i] === '\\') {
          out += '  ';
          i += 2;
          continue;
        }
        out += src[i] === '\n' ? '\n' : ' ';
        i++;
      }
      out += c;
      i++;
      continue;
    }
    out += c;
    i++;
  }
  return out;
};

/** The balanced `( … )` argument list beginning at `open`. */
const argsAt = (code: string, open: number): string => {
  let depth = 0;
  for (let i = open; i < code.length; i++) {
    if (code[i] === '(') depth++;
    else if (code[i] === ')') {
      depth--;
      if (depth === 0) return code.slice(open, i + 1);
    }
  }
  return code.slice(open);
};

/**
 * Built from pieces so the scanned names never appear next to `(` in this
 * file's own executable text — a literal regex would be its own first
 * offender.
 */
const CALL = new RegExp(`(?<![\\w$])(?:${ECHO_FAMILY.join('|')})\\s*\\(`, 'g');
const HAS_STDIO = /(^|[{,\s])stdio\s*:/;

type Site = { file: string; line: number; explicit: boolean };

const scan = (file: string, raw: string): Site[] => {
  const code = codeOnly(raw);
  const sites: Site[] = [];
  CALL.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = CALL.exec(code))) {
    const args = argsAt(code, code.indexOf('(', m.index));
    sites.push({
      file,
      line: code.slice(0, m.index).split('\n').length,
      explicit: HAS_STDIO.test(args),
    });
  }
  return sites;
};

const sources = testFiles(TEST_DIR).map((path) => ({
  file: relative(process.cwd(), path),
  raw: readFileSync(path, 'utf8'),
}));

const allSites = sources.flatMap(({ file, raw }) => scan(file, raw));

describe('no test may echo a gate failure into the verify log (#1302)', () => {
  it('A · every stderr-echoing spawn under test/ pins `stdio` — the count is ZERO', () => {
    const inheriting = allSites.filter((s) => !s.explicit).map((s) => `${s.file}:${s.line}`);

    expect(
      inheriting.length,
      `${inheriting.length} spawn site(s) under test/ still inherit the child's stderr, so a ` +
        `gate's fixture-driven "✗ …" lines are echoed into the pnpm verify log and read as ` +
        `real failures (${DECOY_LINES_BEFORE} such lines were measured before this pin). ` +
        `Offending site(s): ${inheriting.join(', ') || '(none)'}. Fix: pass ` +
        `stdio: ['ignore', 'pipe', 'pipe'] and keep asserting on the captured output — ` +
        `error.stderr is populated either way, so no assertion has to change. ` +
        `⛔ Do not redirect to /dev/null, and do not add an exception here.`,
    ).toBe(0);
  });

  it('B · control: the pinned shape leaks 0 lines, the default shape leaks 1', () => {
    const MARKER = 'DECOY-MARKER';
    // A grandchild that fails the way a gate fails: marker on stderr, exit 1.
    const grandchild = `process.stderr.write(${JSON.stringify(`${MARKER}\n`)}); process.exit(1);`;

    /**
     * Runs a wrapper that spawns `grandchild` with the given call shape, then
     * separates what the wrapper LEAKED (its own stderr — this is what reaches
     * the verify log) from what it CAPTURED (reported on its stdout).
     *
     * The outer spawn is `spawnSync`, which reports both channels and — as
     * asserted below — never echoes. Using the echoing family here would put
     * the measurement inside the thing being measured.
     */
    const probe = (body: string): { leaked: number; captured: boolean } => {
      const res = spawnSync(process.execPath, ['-e', body], { encoding: 'utf8' });
      const leaked = (res.stderr ?? '').split('\n').filter((l) => l.includes(MARKER)).length;
      return { leaked, captured: (res.stdout ?? '').includes(`CAPTURED:${MARKER}`) };
    };

    const viaEchoFamily = (options: string): string =>
      `const cp = require('node:child_process');` +
      `try { cp.execFileSync(process.execPath, ['-e', ${JSON.stringify(grandchild)}], ` +
      `{ encoding: 'utf8'${options} }); } catch (e) {` +
      `process.stdout.write('CAPTURED:' + String(e.stderr || '')); }`;

    const inherited = probe(viaEchoFamily(''));
    const pinned = probe(viaEchoFamily(`, stdio: ['ignore', 'pipe', 'pipe']`));

    // The leak, and its removal — the two numbers rule A multiplies by 0.
    expect(inherited.leaked, 'the default call shape stopped leaking; rule A may be moot').toBe(1);
    expect(pinned.leaked, 'the pinned call shape LEAKED — the fix no longer works').toBe(0);

    // …and the half that makes the fix free: both shapes still capture the
    // text, so no assertion on a gate's failure message had to be weakened.
    expect(inherited.captured, 'the default shape stopped capturing stderr').toBe(true);
    expect(
      pinned.captured,
      'the pinned shape no longer captures the failure text — this fix would then be ' +
        'suppression, not capture, and every assertion reading it would be gutted',
    ).toBe(true);

    // Why the rule names two functions and not three: plain spawnSync captures
    // without echoing, so it cannot contribute a decoy line.
    const viaSpawnSync = probe(
      `const cp = require('node:child_process');` +
        `const r = cp.spawnSync(process.execPath, ['-e', ${JSON.stringify(grandchild)}], ` +
        `{ encoding: 'utf8' });` +
        `process.stdout.write('CAPTURED:' + String(r.stderr || ''));`,
    );
    expect(
      viaSpawnSync.leaked,
      'plain spawnSync started echoing stderr — it now leaks too, and rule A must grow ' +
        'to cover it',
    ).toBe(0);
    expect(viaSpawnSync.captured, 'spawnSync stopped capturing stderr').toBe(true);
  });

  it('C · the scanner is not vacuous: it finds every known gate-spawning file', () => {
    const scanned = new Set(allSites.map((s) => s.file));
    const missing = KNOWN_SPAWNING_FILES.filter((f) => !scanned.has(f));

    expect(
      missing,
      'The scanner stopped seeing test files that are known to spawn a gate. A scan that ' +
        'matches nothing passes rule A vacuously — the same "scanned nothing, reported ' +
        'clean" shape the sibling gates exist to prevent. Fix the scanner; do not shorten ' +
        'this list.',
    ).toEqual([]);

    expect(allSites.length, 'the scan found no spawn sites at all').toBeGreaterThanOrEqual(
      KNOWN_SPAWNING_FILES.length,
    );
  });

  it('D · self-test: the rule reports a known-bad site and clears a known-good one', () => {
    const bad = "const out = execFileSync(node, [GATE], { encoding: 'utf8' });";
    const good =
      "const out = execFileSync(node, [GATE], { encoding: 'utf8', " +
      "stdio: ['ignore', 'pipe', 'pipe'] });";

    const badSites = scan('sample-bad.ts', bad);
    const goodSites = scan('sample-good.ts', good);

    expect(badSites, 'the rule stopped seeing a spawn call at all').toHaveLength(1);
    expect(badSites[0].explicit, 'the rule stopped reporting an inheriting site').toBe(false);

    expect(goodSites, 'the rule stopped seeing a spawn call at all').toHaveLength(1);
    expect(goodSites[0].explicit, 'the rule wrongly reports a pinned site as inheriting').toBe(
      true,
    );
  });
});
