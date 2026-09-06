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
  // #597 — the campaign_member hooks (response lockstep, the opt-out
  // round-trip, and the live metric refresh) run their real handlers here
  // rather than in hooks-runtime-service.test.ts, because the same file also
  // carries the metadata half of the trim they pair with.
  'campaign-member-lifecycle.test.ts',
  // #600 — the two outbound billing hand-off flows, driven through the real
  // engine and the real builtin `http` executor's durable branch.
  'flow-billing-handoff.test.ts',
  // #592 — the activity model's own runtime file: both `crm_event` hooks, the
  // parity check that keeps the duplicated bubble body from drifting, and the
  // readonly-strip regression proof against a real engine.
  'activity-recency.test.ts',
  // #596 — case intake assignment. Same precedent as the line above: a feature
  // whose runtime evidence is one story (the transfer-gate measurement, the
  // assigned and pool-empty paths, the strip-then-assign ordering, and the
  // triage view that makes the no-op visible) gets its own runtime file rather
  // than being scattered across the by-domain ones.
  'case-assignment.test.ts',
  // #601 — the knowledge loop. Same precedent as the two lines above: each of
  // these files carries one feature's runtime evidence together with the
  // metadata half it only makes sense beside. `knowledge-feedback` runs the
  // vote actions under the real sandbox and the recount hook against a real
  // store; `knowledge-deflection` runs the close-case flow through the real
  // automation engine, the normalisation hook, and the shipped deflection
  // measures through the real analytics executor on both drivers.
  'knowledge-feedback.test.ts',
  'knowledge-deflection.test.ts',
  // #1096 — the triage claim seam. Same precedent as the lines above, and a
  // stronger case for it than most: `case_self_claim` cannot be exercised by a
  // hook harness at all, because the behaviour under test is what the PLATFORM
  // does either side of the hook (the transfer gate refusing a hand-written
  // `owner_id` upstream of the hook phase, and accepting the hook's own stamp).
  // Only a boot of the real stack can ask that, so the hook's runtime evidence
  // lives beside the sharing rule it completes.
  'unassigned-case-triage-reach.test.ts',
  // #1180 — the `do_not_call` guards on `crm_task` and `crm_event`. Same
  // precedent as the feature files above: one field's enforcement is one story,
  // and it is only legible with both halves side by side — the refusals AND the
  // deliberate non-refusals (`log_call`, a completed Call task, a held Call
  // event) that draw the line between preventing a call and hiding one. Both
  // hooks run their SHIPPED lowered bodies through the real QuickJS runner
  // there, not their handlers.
  'do-not-call-enforcement.test.ts',
];

/**
 * Flows knowingly still without a runtime test.
 *
 * This list may only ever SHRINK. Adding to it is a conscious admission, not a
 * shortcut — and a stale entry (a flow that has since gained coverage) fails
 * the suite too, so it cannot rot.
 */
const PENDING_FLOWS = new Set<string>([
  // Empty, and the "no stale entries" case below is what emptied it. The last
  // entry was `case_csat_followup`, pending because it spanned a 24h `wait`
  // node — #684 showed the part that needed proving was reachable without
  // timer-resume support, and #1428 then retired the flow outright along with
  // the two fields it existed to collect.
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
