// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { REPO_ROOT } from './helpers/repo-root';
import {
  SCANNED,
  TEXT_SCANNED,
  ROOT_TEXT_FILES,
} from '../scripts/lib/source-hygiene-surface.mjs';

/**
 * `scripts/check-source-hygiene.mjs` size-ADVISORY guard (#1287).
 *
 * The 100KB cap is silent at 99% and red at 101%, so for three cards running
 * the signal arrived as a failed run on an unrelated change: #814 found
 * `test/metadata-references.test.ts` with 817 B of headroom, #635 found
 * `src/data/index.ts` with ~1.5 KB, #1196 found `test/docs-drift.test.ts` with
 * 2,654 B and made #1187 re-home a rule mid-implementation. The advisory band
 * at 70% of the cap names a file while splitting it is still a scheduled job.
 *
 * **What this file pins is the VALUE, not the presence of a check.** A test
 * asserting "hygiene passed" would pass identically before and after the
 * advisory existed and would prove nothing. So every case below asserts a
 * behaviour that is different on the two sides of the change:
 *
 *   - a file inside the band is NAMED, and the run still EXITS 0;
 *   - a file over the cap still FAILS, and is not quietly downgraded;
 *   - the two coexist — an advisory alongside a red neither softens it nor is
 *     swallowed by it;
 *   - the advisory is visibly NOT a failure (ruling 3): no `✗`, no
 *     "violation", and it says so in its own headline.
 *
 * Mechanics are the sandbox the sibling scan-surface guard uses: the gate
 * derives its repo root from its own location (`new URL('..', import.meta.url)`),
 * so copying it into `<sandbox>/scripts/` makes a throwaway directory its root.
 * That runs the real, unmodified gate against fixtures we control.
 *
 * ⚠️ One deliberate difference from that sibling: `runGate` below pins
 * `stdio` so the child's **stderr is captured rather than inherited**.
 * `execFileSync` inherits stderr by default, which is why a `pnpm verify` log
 * already carries `✗ source hygiene failed: …` lines that are fixture output
 * rather than real failures. This file plants an over-cap fixture too, and
 * capturing stderr is what keeps it from adding more of them.
 */

/**
 * The gate's scan surface, imported from the gate's own producer instead of
 * copied (#1314).
 *
 * All three lists used to be spelled out here by hand, and nothing checked them
 * against the gate. #1236 made that load-bearing: `rootFixture()` below
 * branches on `ROOT_TEXT_FILES` to decide which fixtures need a copyright
 * header, so a root file added to the gate and not to this copy left every case
 * in this file green while silently never exercising it. The fixtures now
 * follow the surface.
 */

/** Trees the gate's code-level checks — including the cap and the advisory — judge. */
const CODE_TREES = SCANNED;

/** Trees only the control-byte check judges; created so the gate does not abort. */
const TEXT_TREES = TEXT_SCANNED;

// `ROOT_TEXT_FILES` — the root files the gate requires to exist before it will
// run at all — is used below under the gate's own name.

const GATE = 'scripts/check-source-hygiene.mjs';

/**
 * First-party modules the gate imports — the sandbox copy needs them too.
 *
 * Hand-maintained, and safe to be: an import the sandbox does not carry makes
 * the spawned gate die with `ERR_MODULE_NOT_FOUND` and takes every case in this
 * file down with it. It cannot rot quietly, which is exactly the property the
 * surface lists lacked while they were copied by hand (#1314).
 */
const GATE_DEPENDENCIES = ['scripts/lib/source-hygiene-surface.mjs'];

/** The gate's own numbers, restated here so a change to either side is loud. */
const CAP = 100 * 1024;
const ADVISORY_AT = Math.floor(CAP * 0.7);

/**
 * A `.ts` fixture of an EXACT byte length, carrying the copyright header the
 * gate's own header check requires — without it these fixtures would go red for
 * an unrelated reason and every "exits 0" assertion below would be vacuous.
 */
const HEADER = '// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.\n';

/**
 * Root fixture contents. The root `.ts` files joined the copyright-header and
 * marker checks in #1236, so a bare `placeholder` there would fail this
 * suite's runs on a header finding rather than on anything about the band.
 */
function rootFixture(file: string): string {
  return file.endsWith('.ts') ? `${HEADER}placeholder\n` : 'placeholder\n';
}
function sizedTs(bytes: number): string {
  return HEADER + 'x'.repeat(bytes - HEADER.length);
}

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'hygiene-advisory-'));
  for (const dir of [...CODE_TREES, ...TEXT_TREES]) mkdirSync(join(root, dir), { recursive: true });
  for (const file of ROOT_TEXT_FILES) writeFileSync(join(root, file), rootFixture(file));
  for (const dep of [GATE, ...GATE_DEPENDENCIES]) {
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

/** Run the gate against the sandbox root; never throws, never inherits stderr. */
function runGate(): { status: number; output: string } {
  try {
    const stdout = execFileSync(process.execPath, [join(root, GATE)], {
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

describe('source hygiene — size advisory band', () => {
  it('names a file inside the band AND still exits 0', () => {
    // 75% of the cap: past the advisory, nowhere near failing.
    write('src/warm.ts', sizedTs(Math.floor(CAP * 0.75)));

    const { status, output } = runGate();

    // The value: it exits 0 *and* the file is named. Either alone is not it.
    expect(status).toBe(0);
    expect(output).toContain('✓ source hygiene clean');
    expect(output).toContain('src/warm.ts');
    // Named with the two numbers a reader acts on, not merely listed.
    expect(output).toContain('75.0% of cap');
    expect(output).toContain('of headroom left');
  });

  it('says in its own headline that it is an advisory and does not fail the gate', () => {
    write('src/warm.ts', sizedTs(Math.floor(CAP * 0.75)));

    const { output } = runGate();

    expect(output).toContain('advisory, this does not fail the gate');
    // The headline states the band in the reader's units, derived from the
    // same two numbers the gate uses — 70% of a 100KB cap.
    expect(output).toContain(`${(ADVISORY_AT * 100) / CAP}% of the ${CAP / 1024}KB cap`);
  });

  it('is visibly distinct from a failure — no ✗ and no "violation" (ruling 3)', () => {
    write('src/warm.ts', sizedTs(Math.floor(CAP * 0.75)));

    const { status, output } = runGate();
    expect(status).toBe(0);

    // The advisory block, isolated from the ✓/✗ check lines around it.
    const advisory = output
      .split('\n')
      .filter((l) => /ℹ️|src\/warm\.ts|headroom/.test(l))
      .join('\n');

    expect(advisory).toContain('ℹ️');
    expect(advisory).not.toContain('✗');
    expect(advisory).not.toContain('violation');
    // A clean run must not be describable as failed anywhere in the output.
    expect(output).not.toContain('source hygiene failed');
  });

  it('stays silent when nothing is in the band', () => {
    write('src/small.ts', sizedTs(Math.floor(CAP * 0.5)));

    const { status, output } = runGate();

    expect(status).toBe(0);
    expect(output).not.toContain('ℹ️');
    expect(output).not.toContain('headroom');
    expect(output).not.toContain('src/small.ts');
  });

  it('a file over the cap still FAILS, and is not downgraded to an advisory', () => {
    write('src/huge.ts', sizedTs(CAP + 1));

    const { status, output } = runGate();

    expect(status).toBe(1);
    expect(output).toContain('✗ no source file over 100KB');
    expect(output).toContain('src/huge.ts');
    expect(output).toContain('source hygiene failed');
    // The over-cap file is the cap's business, never listed as merely warm.
    expect(output).not.toContain('of headroom left');
  });

  it('an advisory alongside a red neither softens it nor is swallowed by it', () => {
    write('src/warm.ts', sizedTs(Math.floor(CAP * 0.75)));
    write('src/huge.ts', sizedTs(CAP + 1));

    const { status, output } = runGate();

    // The red still decides the exit code — an advisory cannot rescue a file.
    expect(status).toBe(1);
    expect(output).toContain('✗ no source file over 100KB');
    expect(output).toContain('src/huge.ts');
    // And the advisory still reports its own file.
    expect(output).toContain('ℹ️');
    expect(output).toContain('src/warm.ts');
    expect(output).toContain('75.0% of cap');
  });

  it.each<[string, number, boolean]>([
    ['exactly at the threshold, not named', ADVISORY_AT, false],
    ['one byte past the threshold, named', ADVISORY_AT + 1, true],
    ['exactly at the cap — named, and still not a failure', CAP, true],
  ])('boundary: %s', (_label, bytes, named) => {
    write('src/edge.ts', sizedTs(bytes));

    const { status, output } = runGate();

    // Every one of these is at or below the cap, so none of them may fail.
    expect(status).toBe(0);
    expect(output.includes('src/edge.ts')).toBe(named);
  });

  it('watches the same trees the cap does, and no more', () => {
    // A band-sized file in each code tree is named…
    write('test/warm-test.ts', sizedTs(Math.floor(CAP * 0.75)));
    write('e2e/warm-e2e.ts', sizedTs(Math.floor(CAP * 0.75)));
    // …and one in a text tree is not: the advisory rides the cap check's
    // surface (`codeFiles`), and #814 kept documentation out of the cap.
    write('content/docs/warm.mdx', 'x'.repeat(Math.floor(CAP * 0.75)));

    const { status, output } = runGate();

    expect(status).toBe(0);
    expect(output).toContain('test/warm-test.ts');
    expect(output).toContain('e2e/warm-e2e.ts');
    expect(output).not.toContain('content/docs/warm.mdx');
  });

  it('orders the band by size, so the nearest file to the cap reads first', () => {
    write('src/nearer.ts', sizedTs(Math.floor(CAP * 0.85)));
    write('src/farther.ts', sizedTs(Math.floor(CAP * 0.72)));

    const { status, output } = runGate();

    expect(status).toBe(0);
    expect(output.indexOf('src/nearer.ts')).toBeLessThan(output.indexOf('src/farther.ts'));
  });
});
