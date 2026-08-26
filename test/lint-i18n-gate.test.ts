// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { REPO_ROOT } from './helpers/repo-root';

/**
 * `scripts/check-lint-i18n-gate.mjs` (#1018).
 *
 * `objectstack lint` exits 0 whenever it finds zero rule-level *errors* —
 * warnings and suggestions never affect the exit code, measured directly:
 *
 *   pnpm exec objectstack lint --json   # -> { errors: 0, warnings: 153, ... }
 *   echo $?                             # -> 0
 *
 * Most `i18n/missing-*` findings are warnings (only a default-locale gap is
 * an error), so `pnpm verify`'s `objectstack lint` step can never fail on
 * one. PR #1080 merged 25 enumerated `i18n/missing-page` warnings through a
 * green `Quality Checks` run as a dated instance of exactly this gap; #1084
 * zeroed that debt the same day.
 *
 * This suite covers the gate script two ways:
 *   1. Synthetic-fixture runs via the script's `--fixture <path>` testing
 *      seam — real subprocess invocations of the actual gate, fed a
 *      pre-built `objectstack lint --json`-shaped report, so the decision
 *      logic is exercised end-to-end without spawning the real CLI.
 *   2. One real, fixture-free invocation against this repo's current
 *      metadata, asserting today's true baseline is zero. That is the exact
 *      command CI runs (`pnpm run lint:i18n-gate`), so a regression is caught
 *      by `pnpm test` too, not only by the dedicated CI step.
 *
 * Reverse verification for this gate — proving it actually goes red on a
 * real translation gap, not just on a synthetic fixture — was done by hand
 * against a disposable, fully-isolated copy of this worktree with one
 * `src/translations/ja-JP.ts` view label temporarily deleted (never touching
 * the real `src/translations/**`, which #597 was concurrently editing): the
 * real `objectstack lint` process still exited 0, and
 * `node scripts/check-lint-i18n-gate.mjs` exited 1, reporting
 * `i18n/missing-view` for the deleted key. That transcript is in the PR body.
 * It is not encoded as an automated fixture here — doing so would mean either
 * carrying a disposable copy of the whole project inside the test suite
 * (heavy, and every future metadata change would need to keep it in sync) or
 * editing real translation files from a test (exactly what this card was
 * told never to do). The `--fixture` runs below cover the same decision
 * logic against the real, unmodified script.
 */

const SCRIPT = join(REPO_ROOT, 'scripts/check-lint-i18n-gate.mjs');

let tmpDir: string | null = null;

afterEach(() => {
  if (tmpDir) {
    rmSync(tmpDir, { recursive: true, force: true });
    tmpDir = null;
  }
});

/** Writes `report` as a fixture JSON file and returns its path. */
function fixture(report: unknown): string {
  tmpDir = mkdtempSync(join(tmpdir(), 'lint-i18n-gate-'));
  const path = join(tmpDir, 'lint-report.json');
  writeFileSync(path, JSON.stringify(report));
  return path;
}

/**
 * Runs the real script against a fixture, without throwing on a non-zero exit.
 *
 * `stdio` is pinned so the child's stderr is CAPTURED rather than echoed into
 * the parent's log (#1302). `err.stderr` below is populated either way — the
 * `no \`issues\` array` assertion reads exactly what it read before. See
 * test/verify-log-decoy-pin.test.ts.
 */
function run(fixturePath: string): { status: number; stdout: string; stderr: string } {
  try {
    const stdout = execFileSync('node', [SCRIPT, '--fixture', fixturePath], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { status: 0, stdout, stderr: '' };
  } catch (err: any) {
    return { status: err.status ?? 1, stdout: err.stdout ?? '', stderr: err.stderr ?? '' };
  }
}

describe('check-lint-i18n-gate.mjs — synthetic fixtures', () => {
  it('exits 0 when the lint report has zero i18n/missing-* issues', () => {
    const path = fixture({
      passed: true,
      total: 2,
      errors: 0,
      warnings: 1,
      suggestions: 1,
      issues: [
        { severity: 'warning', rule: 'component-props-invalid', message: 'd', path: 'w' },
        { severity: 'suggestion', rule: 'object/missing-name-field', message: 'c', path: 'z' },
      ],
    });
    const result = run(path);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('0 `i18n/missing-*` issues');
  });

  it('exits 1 and reports every violation when i18n/missing-* issues are present', () => {
    const path = fixture({
      passed: true,
      total: 2,
      errors: 0,
      warnings: 2,
      suggestions: 0,
      issues: [
        {
          severity: 'warning',
          rule: 'i18n/missing-view',
          message: 'View "crm_account" _views.at_risk_accounts.label missing translation for locale "ja-JP"',
          path: 'translations.ja-JP.objects.crm_account._views.at_risk_accounts.label',
        },
        { severity: 'warning', rule: 'component-props-invalid', message: 'd', path: 'w' },
      ],
    });
    const result = run(path);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('1 `i18n/missing-*` issue(s) found');
    expect(result.stderr).toContain('i18n/missing-view');
    expect(result.stderr).toContain('at_risk_accounts');
    // Confirms the unrelated warning is not swept in.
    expect(result.stderr).not.toContain('component-props-invalid');
  });

  it('counts a default-locale i18n/missing-* error the same as a warning', () => {
    // Default-locale gaps are already `severity: "error"` from the CLI, which
    // `pnpm lint` itself already fails on — this just confirms the gate does
    // not accidentally special-case severity and undercount.
    const path = fixture({
      passed: false,
      total: 1,
      errors: 1,
      warnings: 0,
      suggestions: 0,
      issues: [
        {
          severity: 'error',
          rule: 'i18n/missing-page',
          message: 'Page "x" missing translation for locale "en"',
          path: 'translations.en.pages.x.label',
        },
      ],
    });
    const result = run(path);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('1 `i18n/missing-*` issue(s) found');
  });

  it('does not gate a different i18n/ rule family (prefix must be i18n/missing-)', () => {
    const path = fixture({
      passed: true,
      total: 1,
      errors: 0,
      warnings: 1,
      suggestions: 0,
      issues: [{ severity: 'warning', rule: 'i18n/coverage-below-threshold', message: 'f', path: 'u' }],
    });
    const result = run(path);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('0 `i18n/missing-*` issues');
  });

  it('exits 1 with a clear message when the fixture has no issues array', () => {
    const path = fixture({ passed: true, total: 0 });
    const result = run(path);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('no `issues` array');
  });
});

describe("real end-to-end run against this repo (today's baseline)", () => {
  it('`pnpm run lint:i18n-gate` exits 0 against current metadata', () => {
    // Same command CI runs (no --fixture: spawns the real objectstack lint).
    // If this ever regresses, `pnpm test` catches it alongside the dedicated
    // CI step, not only there.
    // `stdio` pinned so the real lint's own stderr chatter stays out of the
    // parent log (#1302); the assertion below reads the returned stdout.
    const out = execFileSync('node', [SCRIPT], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    expect(out).toContain('i18n lint gate: 0 `i18n/missing-*` issues');
  }, 60_000);
});
