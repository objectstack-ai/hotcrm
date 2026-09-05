// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Per-iteration containment for `loop` bodies — the one spelling, in one place.
 *
 * ## The defect this closes
 *
 * `loop-node.ts` iterates its body with a bare `await` and has no `try`/`catch`
 * at all, so a body node that returns `success: false` or throws propagates
 * straight out of the container. The first failing item therefore ends the
 * WHOLE run: every later item is never processed, and the work already done is
 * not even reported. Measured by the platform on the real engine — a 5-item
 * sweep failing at item 3 touched 3 items and reported `acted: 0`.
 *
 * That is what `objectstack lint`'s `flow-loop-body-uncontained` names, and the
 * containment it prescribes is a `try_catch` INSIDE the body with the real work
 * moved into its `try` region.
 *
 * ## Why a helper rather than the literal 22x spelling
 *
 * Writing the `try_catch` out at each of the 22 warned loops re-indents every
 * body by two levels, and the re-indentation ALONE measured ~1,327 tokens over
 * the `business semantics` ceiling of `pnpm hygiene:tokens` — a ceiling that
 * moves only on a maintainer ruling. The ratchet strips comments, so slimming
 * prose cannot buy that back either.
 *
 * This helper wraps the body from OUTSIDE instead. At each site `body: {`
 * becomes `body: guarded('<key>', {` and the closing `},` becomes `}),`, so the
 * body keeps its own indentation byte-for-byte and the whole change costs a few
 * tokens per loop instead of sixty.
 *
 * ## Verified against the pinned `@objectstack/*` 17.3.0 this repo installs
 *
 * (Not against the platform source tree — the containment has to work on the
 * artifact that actually ships here.)
 *
 *   - `try_catch` is registered by the pinned engine (`registerTryCatchNode`),
 *     runs its `try` region, and on a caught failure runs `catch` and returns
 *     `success: true`. That `success: true` is what lets the loop continue.
 *   - A bare `assignment` node with no `config` returns `success: true`: its
 *     executor folds an absent config to zero assignments, and `config` is
 *     optional on `FlowNodeSchema`. That is why the minimal handler is legal,
 *     and it is the exact handler the lint rule's own hint prescribes.
 *   - The failed attempt's steps are kept in the run log AHEAD of the handler's
 *     (`childSteps: [...failedAttemptSteps, ...catchSteps]`), so a skipped item
 *     stays visible with its own `status: 'failure'` step and the handler does
 *     not need to re-record it.
 *   - `catch` needs no `edges` (`FlowRegionSchema.edges` carries `.default([])`)
 *     and no `errorVariable` (it defaults to `$error`). A one-node region is
 *     single-entry/single-exit, which is what `analyzeRegion` requires.
 *
 * ## What it deliberately does NOT do
 *
 * The handler swallows the item and moves on. It does not retry (no `retry`
 * policy is declared, so one attempt is made), does not notify, and does not
 * accumulate a failure list — a sweep that reports its skips is a product
 * feature this card does not have a ruling for. The run log is the record.
 *
 * ⛔ Not every loop wants this. A sweep MEANT to stop at its first failure is a
 * legitimate reading and keeps its warning; the per-flow reading for each loop
 * that DOES use this helper is stated in the PR that introduced it.
 */

/**
 * A control-flow region, structurally. Deliberately looser than the spec's
 * `FlowRegion`: the loop bodies this wraps live under `config`, which the flow
 * schema types as `Record<string, unknown>`, so tightening the parameter here
 * would type-check the bodies for the first time and turn a mechanical wrap
 * into a typing change. Same shape in, same shape out.
 */
type Region = { nodes: unknown[]; edges?: unknown[] };

/**
 * Wrap a loop body region so one failing item is contained to that iteration.
 *
 * `key` must be unique within its flow — it names the two nodes this adds
 * (`guard_<key>` and `handled_<key>`), and node ids collide flow-wide.
 */
export const guarded = (key: string, region: Region): Region => ({
  nodes: [{
    id: `guard_${key}`,
    type: 'try_catch',
    label: 'Guarded Iteration',
    config: {
      try: region,
      catch: { nodes: [{ id: `handled_${key}`, type: 'assignment', label: 'Skip This Item' }] },
    },
  }],
});
