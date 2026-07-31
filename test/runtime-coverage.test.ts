// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './helpers/repo-root';
import { allHooks } from '../src/hooks';
import * as flows from '../src/flows';

/**
 * Runtime-coverage guard.
 *
 * The gap this closes is the one that let 20 of 24 hooks and 17 of 20 flows
 * ship with no runtime test at all: nothing anywhere failed when a new hook or
 * flow arrived untested. `os validate` proves a hook is WIRED; the
 * metadata-contract suites prove it is SHAPED correctly; only a runtime test
 * proves it BEHAVES.
 *
 * Line coverage cannot enforce this on its own. A flow file is an object
 * literal, so importing it scores 100% whether or not any test ever executes
 * the flow — which is exactly why `vitest.config.ts` scopes v8 coverage to the
 * hook handlers and defers flow coverage to this structural check.
 *
 * The rule: every registered hook name and every registered flow name must
 * appear somewhere in a runtime test file. That is a deliberately low bar —
 * naming a flow is not the same as testing it well — but it is a bar that
 * cannot be cleared by accident, and it makes a new untested hook or flow fail
 * CI on the PR that adds it.
 */

/** Test files that execute real handler/flow code (as opposed to reading metadata). */
const RUNTIME_TEST_FILES = [
  'hooks-runtime.test.ts',
  'hooks-runtime-sales.test.ts',
  'hooks-runtime-service.test.ts',
  'flow-conversion.test.ts',
  'flow-quote.test.ts',
  'flow-followup.test.ts',
  'flow-scheduled.test.ts',
  'flow-record-change.test.ts',
  'flow-case-actions.test.ts',
  'flow-campaign-enrollment.test.ts',
];

/**
 * Flows knowingly still without a runtime test.
 *
 * This list may only ever SHRINK. Adding to it is a conscious admission, not a
 * shortcut — and a stale entry (a flow that has since gained coverage) fails
 * the suite too, so it cannot rot.
 */
const PENDING_FLOWS = new Set([
  // Spans a 24h `wait` node; needs timer-resume support in the harness.
  'case_csat_followup',
  // First-boot demo seeding. Exercised end to end every time the e2e suite
  // boots a cold database (e2e/smoke.spec.ts asserts the seeded records).
  'demo_bootstrap',
]);

const testSource = (() => {
  const dir = join(REPO_ROOT, 'test');
  const present = new Set(readdirSync(dir));
  const missing = RUNTIME_TEST_FILES.filter((f) => !present.has(f));
  if (missing.length) {
    throw new Error(
      `runtime-coverage guard is stale: ${missing.join(', ')} no longer exist(s). ` +
        'Update RUNTIME_TEST_FILES — a guard reading files that are gone checks nothing.',
    );
  }
  // Comments are stripped before matching. Several of these files DISCUSS
  // flows they do not exercise (the loop-nested-condition defect note names
  // three), and a name that appears only in prose is not coverage.
  return RUNTIME_TEST_FILES.map((f) => readFileSync(join(dir, f), 'utf8'))
    .join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
})();

const hookNames = allHooks.map((h) => h.name).filter(Boolean) as string[];
const flowNames = Object.values(flows as Record<string, unknown>)
  .filter((f): f is { name: string } =>
    typeof f === 'object' && f !== null && typeof (f as { name?: unknown }).name === 'string')
  .map((f) => f.name);

describe('runtime coverage', () => {
  it('sees a non-trivial set of hooks and flows', () => {
    // Guards the guard: if the barrels ever stop exporting, the assertions
    // below would pass vacuously.
    expect(hookNames.length, 'no hooks discovered').toBeGreaterThanOrEqual(20);
    expect(flowNames.length, 'no flows discovered').toBeGreaterThanOrEqual(20);
  });

  it('every registered hook is named in a runtime test', () => {
    const untested = hookNames.filter((name) => !testSource.includes(name));
    expect(
      untested,
      `hooks with no runtime test:\n  ${untested.join('\n  ')}\n` +
        'Add cases to test/hooks-runtime-*.test.ts — `os validate` only proves the hook is wired.',
    ).toEqual([]);
  });

  it('every registered flow is named in a runtime test', () => {
    const untested = flowNames
      .filter((name) => !PENDING_FLOWS.has(name))
      .filter((name) => !testSource.includes(name));
    expect(
      untested,
      `flows with no runtime test:\n  ${untested.join('\n  ')}\n` +
        'Add cases to test/flow-*.test.ts, or add the flow to PENDING_FLOWS with a reason.',
    ).toEqual([]);
  });

  it('the pending list contains no stale entries', () => {
    const stale = [...PENDING_FLOWS].filter((name) => testSource.includes(name));
    expect(
      stale,
      `these flows now HAVE runtime tests — remove them from PENDING_FLOWS: ${stale.join(', ')}`,
    ).toEqual([]);
  });

  it('the pending list only names flows that exist', () => {
    const ghosts = [...PENDING_FLOWS].filter((name) => !flowNames.includes(name));
    expect(ghosts, `PENDING_FLOWS names non-existent flow(s): ${ghosts.join(', ')}`).toEqual([]);
  });
});
