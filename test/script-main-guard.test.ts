// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { REPO_ROOT } from './helpers/repo-root';

/**
 * Every script in `scripts/` that decides whether to run must decide correctly,
 * and must speak when it decides "yes" (#1252).
 *
 * ## The class this file closes
 *
 * Three scripts hand-rolled the "am I the entry point?" test, each with its own
 * spelling and each wrong in its own way:
 *
 *   check-source-token-ratchet.mjs  import.meta.url === pathToFileURL(process.argv[1]).href
 *   check-lint-i18n-gate.mjs        import.meta.url === `file://${process.argv[1]}`
 *   scan-field-consumers.ts         process.argv[1].includes('scan-field-consumers')
 *
 * The first two compare a canonicalised path (`import.meta.url` is the
 * realpath — Node's ESM loader resolves symlinks for the entry module) against
 * an un-canonicalised one (`process.argv[1]` is absolute but keeps every
 * symlink the caller spelled). Through any symlinked path they are false,
 * `main()` never runs, and the process prints **zero bytes and exits 0**. That
 * is strictly worse than no gate: a gate that measures nothing reads as a pass.
 *
 * It was not theoretical. `mkdtempSync(tmpdir())` returns `/var/folders/…` on
 * macOS and `/var` is a symlink to `/private/var`, so ten of
 * `source-token-ratchet.test.ts`'s fifteen cases failed on every macOS
 * checkout — each as `SyntaxError: Unexpected end of JSON input` from
 * `JSON.parse('')`, which reads like a bug in the gate's `--json` output rather
 * than the gate never having run. Linux CI stayed green (`/tmp` is a real
 * directory there), so the farm could not see it.
 *
 * The third spelling survives symlinks by accident — a basename is preserved
 * through one — but stops matching the day the file is renamed, and then
 * `pnpm scan:fields` prints nothing and exits 0, which is indistinguishable
 * from a clean ledger. Same failure mode, different trigger.
 *
 * ## How this file closes it rather than fixing three files
 *
 * Two assertions, one structural and one behavioural:
 *
 *   1. `process.argv[1]` may be read in exactly ONE file —
 *      `scripts/lib/main-module.mjs`. A fourth script that hand-rolls a fourth
 *      spelling turns this red at author time, before it can be silent in CI.
 *   2. Every guarded script is spawned **through a symlinked path** and must
 *      print, and must exit 1 with a message when it should be red. A guard
 *      that declines to run cannot pass a test that reads its output.
 *
 * Assertion 2 is the one that matters: a helper nobody is forced to exercise is
 * a helper somebody re-implements. `GUARDED` is asserted below to cover exactly
 * the set of guarded scripts found on disk, so a new one cannot land untested.
 */

/** Files under `scripts/` that Node or tsx can execute. `.sh` and `.d.mts` are neither. */
function executableScripts(): string[] {
  const out: string[] = [];
  const walk = (rel: string) => {
    for (const entry of readdirSync(join(REPO_ROOT, rel), { withFileTypes: true })) {
      const child = `${rel}/${entry.name}`;
      if (entry.isDirectory()) walk(child);
      else if (/\.(mjs|ts)$/.test(entry.name) && !entry.name.endsWith('.d.mts')) out.push(child);
    }
  };
  walk('scripts');
  return out.sort();
}

/**
 * `source` with whole-line comments removed.
 *
 * Deliberately line-oriented and deliberately not exact: the three broken
 * spellings above are quoted verbatim in the doc comments of the files that
 * used to carry them (that is the record of why the helper exists), and a raw
 * grep would read those quotes as live code. Anything hiding inside a block
 * comment is not executable, so a line filter is the right granularity here —
 * unlike the token ratchet, which is measuring bytes and needs a real scanner.
 */
function executableLines(source: string): string[] {
  return source
    .split('\n')
    .filter((line) => !/^\s*(\/\/|\/\*|\*)/.test(line));
}

const SCRIPTS = executableScripts();
const read = (rel: string) => readFileSync(join(REPO_ROOT, rel), 'utf8');

/** The one file allowed to read `process.argv[1]`. */
const HELPER = 'scripts/lib/main-module.mjs';

/** Scripts whose executable code calls the shared guard. */
const guardedOnDisk = SCRIPTS.filter((f) =>
  executableLines(read(f)).some((l) => l.includes('isMainModule(')),
).filter((f) => f !== HELPER);

interface Case {
  /** argv after the script path. */
  args: string[];
  /** Expected process exit status. */
  status: number;
  /** A substring the run must print — proof `main()` actually ran. */
  says: string;
}

interface Guarded {
  script: string;
  /** `node` for `.mjs`, the repo's `tsx` binary for `.ts`. */
  runner: string;
  /** A run that must be green — and must still say something. */
  green: Case;
  /**
   * A run that must be RED. The point of the card: silence and exit 0 are the
   * same observation, so "it is green" proves nothing on its own.
   *
   * `null` only for a script that is not a gate and has no cheaply stageable
   * red path — stated per entry, never left implicit.
   */
  red: Case | null;
}

let sandbox: string;
/** `<sandbox>/via-symlink` -> `<sandbox>/real`, so the spawn path is symlinked on Linux too. */
let linkedRepo: string;
/** A repo-shaped tree with no `src/`, reached through its own symlink. */
let linkedEmptyRoot: string;
let greenFixture: string;
let redFixture: string;

beforeAll(() => {
  sandbox = mkdtempSync(join(tmpdir(), 'script-main-guard-'));

  // macOS `mkdtemp` is already under a symlink (/var -> /private/var); Linux
  // `/tmp` is a real directory. An explicit link makes the spawn path symlinked
  // on both, so this suite measures the same thing everywhere.
  linkedRepo = join(sandbox, 'linked-repo');
  symlinkSync(REPO_ROOT, linkedRepo, 'dir');

  // The ratchet derives its root from its own location, so a copy in an empty
  // tree finds no `src/` and must say so loudly instead of measuring nothing.
  const emptyRoot = join(sandbox, 'empty-root');
  mkdirSync(join(emptyRoot, 'scripts', 'lib'), { recursive: true });
  copyFileSync(
    join(REPO_ROOT, 'scripts/check-source-token-ratchet.mjs'),
    join(emptyRoot, 'scripts/check-source-token-ratchet.mjs'),
  );
  copyFileSync(join(REPO_ROOT, HELPER), join(emptyRoot, HELPER));
  linkedEmptyRoot = join(sandbox, 'linked-empty-root');
  symlinkSync(emptyRoot, linkedEmptyRoot, 'dir');

  // `objectstack lint --json`-shaped reports for the i18n gate's `--fixture` seam.
  greenFixture = join(sandbox, 'lint-green.json');
  writeFileSync(
    greenFixture,
    JSON.stringify({ passed: true, total: 0, errors: 0, warnings: 0, suggestions: 0, issues: [] }),
  );
  redFixture = join(sandbox, 'lint-red.json');
  writeFileSync(
    redFixture,
    JSON.stringify({
      passed: true,
      total: 1,
      errors: 0,
      warnings: 1,
      suggestions: 0,
      issues: [
        {
          severity: 'warning',
          rule: 'i18n/missing-view',
          message: 'missing ja-JP label',
          path: 'views/crm_account.list',
        },
      ],
    }),
  );
});

afterAll(() => {
  rmSync(sandbox, { recursive: true, force: true });
});

const GUARDED: Guarded[] = [
  {
    script: 'scripts/check-source-token-ratchet.mjs',
    runner: process.execPath,
    green: { args: ['--json'], status: 0, says: '"label"' },
    red: { args: [], status: 1, says: 'missing: src/objects' },
  },
  {
    script: 'scripts/check-lint-i18n-gate.mjs',
    runner: process.execPath,
    green: { args: [], status: 0, says: '0 `i18n/missing-*` issues' },
    red: { args: [], status: 1, says: '✗ i18n lint gate' },
  },
  {
    script: 'scripts/scan-field-consumers.ts',
    runner: join(REPO_ROOT, 'node_modules/.bin/tsx'),
    green: { args: ['--json'], status: 0, says: '"field"' },
    // No red leg, and that is a measured statement rather than an omission.
    // This script says of itself "This is a ledger, not a gate"; its only
    // non-zero exit is `✗ no field reference resolved anywhere`, which fires
    // when the registered stack resolves nothing at all. Staging that means
    // standing up a broken copy of `objectstack.config` — a fixture about the
    // stack, not about the entry-point guard this file is holding. The green
    // leg carries the property that matters here: invoked through a symlink it
    // must print, and before #1252 it would have printed nothing.
    red: null,
  },
];

/** Spawns `script` through `root` (a symlink), never throwing on a non-zero exit. */
function runThroughSymlink(
  runner: string,
  root: string,
  script: string,
  args: string[],
): { status: number; output: string } {
  try {
    const stdout = execFileSync(runner, [join(root, script), ...args], { encoding: 'utf8' });
    return { status: 0, output: stdout };
  } catch (error) {
    const failure = error as { status?: number; stdout?: string; stderr?: string };
    return { status: failure.status ?? -1, output: `${failure.stdout ?? ''}${failure.stderr ?? ''}` };
  }
}

describe('scripts/ entry-point guards — structural', () => {
  it('finds the scripts it is supposed to be holding', () => {
    // A walk that quietly returns nothing would make every assertion below
    // vacuously true — the same "scanned nothing, reported clean" shape this
    // whole file exists to prevent.
    expect(SCRIPTS.length).toBeGreaterThanOrEqual(8);
    expect(SCRIPTS).toContain(HELPER);
  });

  it('reads `process.argv[1]` in exactly one file', () => {
    const readers = SCRIPTS.filter((f) =>
      executableLines(read(f)).some((l) => l.includes('process.argv[1]')),
    );
    expect(readers).toEqual([HELPER]);
  });

  it('routes every guarded script through the shared helper', () => {
    for (const script of guardedOnDisk) {
      const source = read(script);
      expect(source, `${script} must import isMainModule`).toMatch(
        /import \{ isMainModule \} from '\.(\/|\.\/)?[^']*lib\/main-module\.mjs';/,
      );
      expect(executableLines(source).join('\n'), `${script} guard shape`).toContain(
        'isMainModule(import.meta.url)',
      );
    }
  });

  it('exercises every guarded script found on disk', () => {
    // The coverage assertion. Without it a fourth guarded script could land
    // using the helper correctly and still never be run through a symlink here.
    expect(GUARDED.map((g) => g.script).sort()).toEqual(guardedOnDisk);
  });
});

describe('scripts/ entry-point guards — behavioural, through a symlinked path', () => {
  for (const { script, runner, green, red } of GUARDED) {
    it(`${script} runs and speaks when invoked through a symlink`, () => {
      const { status, output } = runThroughSymlink(
        runner,
        linkedRepo,
        script,
        script === 'scripts/check-lint-i18n-gate.mjs'
          ? ['--fixture', greenFixture, ...green.args]
          : green.args,
      );
      // Zero bytes was the whole defect: before #1252 this assertion, not the
      // status one, is what caught it.
      expect(output.length, `${script} printed nothing`).toBeGreaterThan(0);
      expect(output).toContain(green.says);
      expect(status).toBe(green.status);
    });

    it.skipIf(red === null)(`${script} goes RED through a symlink, and says why`, () => {
      const expected = red as Case;
      const isRatchet = script === 'scripts/check-source-token-ratchet.mjs';
      const isI18n = script === 'scripts/check-lint-i18n-gate.mjs';
      const { status, output } = runThroughSymlink(
        runner,
        isRatchet ? linkedEmptyRoot : linkedRepo,
        script,
        isI18n ? ['--fixture', redFixture, ...expected.args] : expected.args,
      );
      expect(status, `${script} should have failed`).toBe(expected.status);
      expect(output).toContain(expected.says);
    });
  }
});
