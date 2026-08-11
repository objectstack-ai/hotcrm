#!/usr/bin/env node
// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * i18n zero-tolerance gate (#1018).
 *
 * `objectstack lint` only fails the process when it finds a rule-level
 * *error*; warnings and suggestions are printed and the exit code stays 0
 * regardless of how many there are — measured directly against this repo:
 *
 *   pnpm exec objectstack lint --json | node -e \
 *     "console.log(JSON.parse(require('fs').readFileSync(0,'utf8')).warnings)"  # -> 153
 *   echo $?                                                                     # -> 0
 *
 * Most `i18n/missing-*` findings are exactly this: a non-default-locale
 * translation gap is a *warning* (only the default locale is an error — see
 * `@objectstack/cli`'s `i18n-coverage.js`), so `pnpm verify`'s lint step can
 * never go red on one. PR #1080 shipped 25 enumerated `i18n/missing-page`
 * warnings through a green `Quality Checks` run as a direct, dated instance
 * of this gap; #1084 zeroed that debt the same day, which is what makes today
 * the moment to gate it — the baseline is zero.
 *
 * This script is the app-side half of the fix: it runs the real lint pass
 * with `--json`, counts issues whose rule starts with `i18n/missing-`
 * (regardless of severity — a default-locale *error* is already caught by
 * `pnpm lint` itself, but folding it in here too costs nothing and keeps the
 * assertion about the rule family, not about severity plumbing), and fails
 * the process when that count is not zero. Making the underlying lint rule
 * itself error-severity is a `packages/lint` (upstream, platform) change and
 * out of this repo's reach — see #1018.
 *
 * Deliberately NOT a general warning-count baseline: the other ~153 existing
 * warnings/suggestions in this repo (component-props-*, absolute-colspan-*,
 * etc.) are untouched by this gate and are not this card's scope. Widening
 * this script to cover other rule families is a separate, deliberate change,
 * not a side effect of this one.
 *
 * Testing seam: `--fixture <path>` reads a pre-built `objectstack lint --json`
 * report from a file instead of spawning the real CLI. Used only by
 * `test/lint-i18n-gate.test.ts`, which cannot spawn a real translation gap
 * without either editing real `src/translations/**` files from a test
 * (forbidden for this card — #597 was concurrently editing them) or carrying
 * a full disposable copy of the project inside the test suite.
 */

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

/** Only this rule family gates. Everything else lint reports is out of scope. */
const GATED_RULE_PREFIX = 'i18n/missing-';

/** Reads the fixture path following `--fixture` in argv, if present. */
function fixtureArg(argv) {
  const i = argv.indexOf('--fixture');
  return i === -1 ? null : argv[i + 1];
}

/**
 * Returns the parsed `objectstack lint --json` report — either from a real
 * spawn of the CLI, or (test-only) from a `--fixture` JSON file on disk.
 */
export function getLintReport(argv = process.argv.slice(2)) {
  const fixture = fixtureArg(argv);
  if (fixture) {
    return JSON.parse(readFileSync(fixture, 'utf8'));
  }

  const result = spawnSync('pnpm', ['exec', 'objectstack', 'lint', '--json'], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
  if (result.error) {
    throw new Error(`failed to spawn \`objectstack lint --json\`: ${result.error.message}`);
  }
  const stdout = (result.stdout ?? '').trim();
  if (!stdout) {
    throw new Error(
      `\`objectstack lint --json\` produced no stdout (exit ${result.status}).\n` +
        `stderr:\n${result.stderr ?? '(empty)'}`
    );
  }
  let report;
  try {
    report = JSON.parse(stdout);
  } catch (err) {
    throw new Error(
      `\`objectstack lint --json\` did not print valid JSON: ${err.message}\n` +
        `--- stdout (first 2000 chars) ---\n${stdout.slice(0, 2000)}`
    );
  }
  return report;
}

/** Pure filter, exercised directly by `test/lint-i18n-gate.test.ts`. */
export function findI18nMissingIssues(issues) {
  return issues.filter((issue) => typeof issue.rule === 'string' && issue.rule.startsWith(GATED_RULE_PREFIX));
}

export function main(argv = process.argv.slice(2), { log = console.log, error = console.error } = {}) {
  let report;
  try {
    report = getLintReport(argv);
  } catch (err) {
    error(`✗ i18n lint gate: ${err.message}`);
    return 1;
  }

  if (!Array.isArray(report.issues)) {
    error(
      `✗ i18n lint gate: \`objectstack lint --json\` output has no \`issues\` array — the CLI's JSON ` +
        `shape may have changed; this gate needs updating.\nGot keys: ${Object.keys(report).join(', ')}`
    );
    return 1;
  }

  const violations = findI18nMissingIssues(report.issues);

  if (violations.length === 0) {
    log(
      `✓ i18n lint gate: 0 \`${GATED_RULE_PREFIX}*\` issues ` +
        `(${report.total} total lint issue(s) reported, unaffected by this gate)`
    );
    return 0;
  }

  error(`✗ i18n lint gate: ${violations.length} \`${GATED_RULE_PREFIX}*\` issue(s) found — must be zero.`);
  error('');
  for (const issue of violations) {
    error(`  [${issue.severity}] ${issue.rule}  ${issue.message}`);
    error(`    at ${issue.path}`);
  }
  error('');
  error(
    "These are translation-coverage gaps that `objectstack lint`'s own exit code does not fail on " +
      '(non-default-locale misses are warnings, not errors) — see #1018. Run:'
  );
  error('  pnpm exec objectstack lint --json');
  error('to see the full report, or `pnpm exec objectstack i18n extract` to scaffold the missing keys.');
  return 1;
}

/* c8 ignore start -- exercised via the CLI and via test/lint-i18n-gate.test.ts's subprocess calls */
if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(main());
}
/* c8 ignore stop */
