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
   * red path — stated per entry, never left implicit. No entry uses it today:
   * the last one that did was `scan-field-consumers.ts`, and #1255 handed it a
   * fixture-free refusal path (#1268). The escape hatch and the `it.skipIf`
   * that honours it stay, so a future guarded script can state "no red path"
   * with its reason rather than quietly shipping a green leg alone.
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
    // This script is a ledger rather than a gate, and it has two non-zero
    // exits. `✗ no field reference resolved anywhere` fires only when the
    // registered stack resolves nothing at all, so staging it means standing up
    // a broken copy of `objectstack.config` — a fixture about the stack, not
    // about the entry-point guard this file is holding, which is why this entry
    // carried `red: null` until #1255 landed. The second one needs no fixture:
    // `--sites` refuses a name that does not exist, on stderr and with exit 1.
    //
    // What this leg proves is the GUARD, not the argument check. The refusal
    // lives inside `main()`, so with the entry-point guard broken the spawn
    // reaches neither: it prints zero bytes and exits 0, and both assertions
    // below fail. Measured, not assumed — with `isMainModule()` forced to
    // return `false` this leg fails as `expected 0 to be 1` with empty output.
    red: { args: ['--sites', 'no_such_object.no_such_field'], status: 1, says: 'no object named' },
  },
];

/**
 * Spawns `script` through `root` (a symlink), never throwing on a non-zero exit.
 *
 * `stdio` is pinned so the child's stderr is CAPTURED rather than echoed into
 * the parent's log (#1302) — these fixtures are copies of the REAL gate
 * scripts, so their red legs printed gate-shaped `✗` lines straight into
 * `pnpm verify`. `error.stderr` is populated either way; every assertion on the
 * failure text is unchanged. See test/verify-log-decoy-pin.test.ts.
 */
function runThroughSymlink(
  runner: string,
  root: string,
  script: string,
  args: string[],
): { status: number; output: string } {
  try {
    const stdout = execFileSync(runner, [join(root, script), ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
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
  /**
   * One spawn per case, with the budget stated rather than defaulted.
   *
   * The `.ts` entry is the expensive one: `tsx` compiles the script and the
   * script imports `objectstack.config`, i.e. the whole registered metadata
   * stack. Measured here, one spawn per case: 1281–1379ms. Vitest's default is
   * 5000ms, and CI measures the same import work ~1.7x slower — margin that
   * holds today but is not stated anywhere, and `field-consumer-scan.test.ts`
   * has already paid a patch cycle for leaning on it.
   *
   * Deliberately far above the real cost, for the same reason as there: this
   * timeout exists to catch a spawn that HANGS, not to police how fast a script
   * starts. A startup regression should be argued on its own evidence, never
   * discovered as a flaky timeout in an entry-point test.
   */
  const SPAWN_TIMEOUT_MS = 30_000;

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
    }, SPAWN_TIMEOUT_MS);

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
    }, SPAWN_TIMEOUT_MS);
  }
});
