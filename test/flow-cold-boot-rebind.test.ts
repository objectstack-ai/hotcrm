// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { AutomationEngine } from '@objectstack/service-automation';
import { METADATA_READ_DECORATIONS, stripReadDecorations } from '@objectstack/spec/kernel';
import { allFlows } from '../src/flows';

/**
 * ═══ The cold-boot flow re-bind must register EVERY flow (#653) ════════════
 *
 * At `kernel:ready` the automation service re-binds flows from the protocol's
 * flattened view (`syncFlowsFromProtocol` → `readFlowDefsFromProtocol` →
 * `engine.registerFlow`). On 17.0.0-rc.1 that path failed for **all 24** flows
 * on every `objectstack dev --fresh`, and the warning it printed was the
 * single character `[` — so nobody could act on it.
 *
 * ### What the `[` actually said (measured)
 *
 * `registerFlow` parses with `FlowSchema`, and #4001 closed the metadata
 * schemas: an unrecognized key now THROWS instead of being dropped. `err.message`
 * was therefore a Zod issue array, and interpolating it into a one-line
 * `logger.warn` left only its opening bracket:
 *
 * ```
 * [ { "code": "unrecognized_keys",
 *     "keys": [ "_diagnostics" ],
 *     "path": [],
 *     "message": "Unrecognized key(s) on this flow: `_diagnostics`. …" } ]
 * ```
 *
 * The rejected key was **not ours**. `getMetaItems({ type: 'flow' })` decorates
 * every served item with `_diagnostics` (and `_draft` on a preview read), and
 * the bind fed that served document straight back into the strict schema — the
 * read path failing its own output. 17.0.0-rc.2 fixed it at the read seam
 * (`stripReadDecorations`, cloud#971) rather than by loosening `FlowSchema`,
 * and this app inherited the fix with the rc.2 upgrade (#663). Measured on
 * current `main`: `INFO [Automation] Bound 24 flow(s) from the protocol at
 * kernel:ready`, zero warnings.
 *
 * ### Why this file exists anyway
 *
 * The bind stayed broken for a whole release line because its only symptom was
 * an unreadable boot warning, and the boot pull covered for it — flows kept
 * firing, so the re-bind path was never proven. Any host that boots from the
 * stored view alone (a metadata reload, a `sys_metadata`-first host) has only
 * this path, and it would have inherited a flow set of zero, silently.
 *
 * So the app-side half is pinned here instead of in a log line: every flow we
 * author survives the exact `registerFlow` call the re-bind makes, in `pnpm
 * test`, with the **whole** validation error in the failure message. The
 * platform-side half (the truncated warning, still live in rc.2) is filed
 * upstream — this test cannot fix a log line in `@objectstack/service-automation`,
 * but it does mean a HotCRM flow can never be the thing that log line is
 * hiding.
 */

const silentLogger: any = {
  info() {}, warn() {}, error() {}, debug() {}, trace() {}, fatal() {},
};
silentLogger.child = () => silentLogger;

/**
 * Register one flow the way the cold-boot bind does, returning the FULL error
 * message on rejection. The whole point of #653 is that a one-line render of a
 * Zod issue array tells you nothing, so nothing here is truncated.
 */
function registerFailure(def: unknown, name: string): string | null {
  const engine = new AutomationEngine(silentLogger);
  try {
    engine.registerFlow(name, def as never);
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
}

/**
 * The re-bind never sees the TypeScript object — it sees what came back out of
 * the artifact / `sys_metadata`, i.e. a JSON round-trip. Doing the same here
 * keeps a value that only survives in memory (a `Date`, an `undefined` that
 * masks a required key, a function) from passing a test it would fail at boot.
 */
const storedForm = (flow: unknown) => JSON.parse(JSON.stringify(flow));

describe('cold-boot flow re-bind (#653)', () => {
  it('registers every authored flow through the real engine', () => {
    const failures = allFlows
      .map((flow) => ({ name: flow.name, error: registerFailure(storedForm(flow), flow.name) }))
      .filter((r) => r.error !== null);

    expect(
      failures.map((f) => `\n─── ${f.name} ───\n${f.error}`).join('\n'),
      `${failures.length} of ${allFlows.length} flow(s) failed the cold-boot bind`,
    ).toBe('');
  });

  it('covers the whole flow set, not a subset', () => {
    expect(allFlows.length).toBeGreaterThan(0);
    expect(new Set(allFlows.map((f) => f.name)).size).toBe(allFlows.length);
  });

  /**
   * The failure class #653 reported, reconstructed: a flow is fine, the READ
   * decorates it, and the strict schema rejects the decoration. Both halves are
   * asserted because each guards a different regression —
   *
   *   - `FlowSchema` still rejecting an unknown key proves the strictness
   *     #4001 introduced is intact (a lenient schema would hide real authoring
   *     errors, which is the opposite of what this app wants); and
   *   - `stripReadDecorations` still removing every key in
   *     `METADATA_READ_DECORATIONS` proves the rc.2 remedy is still the remedy.
   *
   * It does NOT prove the automation service still calls the strip — that seam
   * lives upstream and needs a kernel. What it does prove is that if a future
   * upgrade adds a decoration key the strip does not cover, or drops the strip
   * from the spec, this fails in `pnpm test` rather than as 24 boot warnings
   * rendered as `[`.
   */
  it('rejects a read-decorated flow, and the platform strip is what makes it registrable again', () => {
    expect(METADATA_READ_DECORATIONS.length).toBeGreaterThan(0);
    const sample = storedForm(allFlows[0]);

    for (const decoration of METADATA_READ_DECORATIONS) {
      const decorated = { ...sample, [decoration]: { note: 'served by getMetaItems' } };

      const error = registerFailure(decorated, sample.name);
      expect(error, `\`${decoration}\` no longer fails FlowSchema — is the schema still closed?`)
        .not.toBeNull();
      expect(error).toContain(decoration);

      expect(registerFailure(stripReadDecorations(decorated), sample.name)).toBeNull();
    }
  });
});
