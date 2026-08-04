// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import {
  CLAIMABLE_PROBE_OBJECT,
  OWNERSHIP_BLIND_PROBE_OBJECT,
  SEEDS_UNREADABLE_MID_RUN,
  assertSeedPrecondition,
  classifySeedVisibility,
  seedPreconditionMessage,
  type SeedProbeContext,
} from '../e2e/seed-precondition';
import { Account } from '../src/objects/account.object';
import { Product } from '../src/objects/product.object';
import { DemoBootstrapFlow } from '../src/flows/demo-bootstrap.flow';
import { CrmSeedData } from '../src/data/index';

/**
 * The e2e seed-visibility guard (#665).
 *
 * `e2e/global-setup.ts` now refuses to start a run whose seeded rows the e2e
 * account cannot read, instead of letting eleven specs fail on "no seeded
 * accounts returned" — a message about a seed that had loaded perfectly well.
 *
 * Two things are worth pinning, and Playwright can pin neither: the guard's
 * METADATA PREMISES (which object goes dark when the seeds are claimed and
 * which one cannot), and the branch that must never fire on CI. The guard is
 * therefore written against a structural request-context interface so it runs
 * here against a stub — no browser, no server, no database.
 */

type Rec = Record<string, any>;

describe('the premises the guard reads the two probes by', () => {
  const seeded = new Set((CrmSeedData as unknown as Array<{ object: string }>).map((d) => d.object));

  /**
   * Every `objectName` `demo_bootstrap` touches, loop bodies included. The
   * sweep is what makes a seeded row stop being visible to a non-owner, so
   * membership of this set is exactly the property the claimable probe needs.
   */
  const swept = new Set<string>();
  const collect = (nodes: Rec[]): void => {
    for (const node of nodes) {
      const objectName = node?.config?.objectName;
      if (typeof objectName === 'string') swept.add(objectName);
      const body = node?.config?.body?.nodes;
      if (Array.isArray(body)) collect(body as Rec[]);
    }
  };
  collect((DemoBootstrapFlow.nodes ?? []) as unknown as Rec[]);

  it('both probes are actually seeded — an unseeded probe reads zero always', () => {
    expect(seeded.has(CLAIMABLE_PROBE_OBJECT)).toBe(true);
    expect(seeded.has(OWNERSHIP_BLIND_PROBE_OBJECT)).toBe(true);
  });

  it('the claimable probe is private AND swept, so it goes dark when the seeds are claimed', () => {
    expect((Account as Rec).sharingModel).toBe('private');
    expect(swept.has(CLAIMABLE_PROBE_OBJECT)).toBe(true);
  });

  it('the ownership-blind probe is public_read AND swept by nothing, so it never goes dark', () => {
    // Either half failing would collapse the guard's two states into one: a
    // probe that can itself be hidden reports "the seed did not load" for an
    // org whose seed loaded and was claimed, which is the exact misdiagnosis
    // #665 is about. Adding `crm_product` to `CLAIMED_OBJECTS` must fail here.
    expect((Product as Rec).sharingModel).toBe('public_read');
    expect(swept.has(OWNERSHIP_BLIND_PROBE_OBJECT)).toBe(false);
  });
});

describe('classifySeedVisibility', () => {
  it('reads any readable private row as the state the specs are written for', () => {
    expect(classifySeedVisibility({ claimable: 1, ownershipBlind: 0 })).toBe('visible');
    expect(classifySeedVisibility({ claimable: 5, ownershipBlind: 12 })).toBe('visible');
  });

  it('reads "products but no accounts" as seeds claimed by another user', () => {
    expect(classifySeedVisibility({ claimable: 0, ownershipBlind: 12 })).toBe('claimed');
  });

  it('reads "neither" as no seed at all — a different problem', () => {
    expect(classifySeedVisibility({ claimable: 0, ownershipBlind: 0 })).toBe('absent');
  });
});

describe('the messages', () => {
  it('name the cause and the remedy for a claimed seed', () => {
    const msg = seedPreconditionMessage('claimed', 'e2e-admin@hotcrm.test');
    expect(msg).toContain('INVISIBLE');
    expect(msg).toContain('demo_bootstrap');
    expect(msg).toContain('pnpm demo:reset');
    expect(msg).toContain('e2e-admin@hotcrm.test');
    // The one thing it must not say, because it is what the old failure said.
    expect(msg).not.toContain('the demo seed did not load');
  });

  it('say something different, and true, when nothing is seeded', () => {
    const msg = seedPreconditionMessage('absent', 'e2e-admin@hotcrm.test');
    expect(msg).toContain('no demo seed data');
    expect(msg).toContain('pnpm demo:reset');
    expect(msg).not.toContain('INVISIBLE');
  });

  it('gives the mid-run assertions a cause instead of "the seed did not load"', () => {
    // The guard runs once; `demo_bootstrap` fires every ten minutes, so the
    // spec-level assertions stay reachable and carry this instead.
    expect(SEEDS_UNREADABLE_MID_RUN).toContain('demo_bootstrap');
    expect(SEEDS_UNREADABLE_MID_RUN).toContain('pnpm demo:reset');
  });
});

/** A request context answering a scripted number of rows per probe pass. */
function stubContext(passes: Array<Record<string, number | { status: number; body?: string }>>) {
  const requested: string[] = [];
  // The claimable probe opens every pass, so counting it advances the script.
  let pass = -1;
  const ctx: SeedProbeContext = {
    async get(url) {
      requested.push(url);
      const objectName = url.replace('/api/v1/data/', '').split('?')[0];
      if (objectName === CLAIMABLE_PROBE_OBJECT) pass++;
      const scripted = passes[Math.min(pass, passes.length - 1)][objectName];
      if (typeof scripted === 'object') {
        return {
          ok: () => false,
          status: () => scripted.status,
          text: async () => scripted.body ?? '',
          json: async () => ({}),
        };
      }
      return {
        ok: () => true,
        status: () => 200,
        text: async () => '',
        json: async () => ({ object: objectName, records: Array.from({ length: scripted }, () => ({ id: 'x' })) }),
      };
    },
  };
  return { ctx, requested };
}

const noWait = { timeoutMs: 0, pollMs: 0, sleep: async () => {} };

describe('assertSeedPrecondition', () => {
  it('passes — and costs one request — when the private rows are readable', async () => {
    // This is CI's state and a freshly reset local server's state. The second
    // probe is never even issued, so nothing about the ownership-blind object
    // can influence a run that was going to be green.
    const { ctx, requested } = stubContext([{ [CLAIMABLE_PROBE_OBJECT]: 5 }]);
    await expect(assertSeedPrecondition(ctx, 'tok', 'e2e-admin@hotcrm.test', noWait)).resolves.toBeUndefined();
    expect(requested).toEqual([`/api/v1/data/${CLAIMABLE_PROBE_OBJECT}?limit=1`]);
  });

  it('fails with the claimed-seed instruction when only the blind probe returns rows', async () => {
    const { ctx } = stubContext([{ [CLAIMABLE_PROBE_OBJECT]: 0, [OWNERSHIP_BLIND_PROBE_OBJECT]: 12 }]);
    await expect(
      assertSeedPrecondition(ctx, 'tok', 'e2e-admin@hotcrm.test', noWait),
    ).rejects.toThrow(/INVISIBLE[\s\S]*pnpm demo:reset/);
  });

  it('fails with the missing-seed message when neither returns rows', async () => {
    const { ctx } = stubContext([{ [CLAIMABLE_PROBE_OBJECT]: 0, [OWNERSHIP_BLIND_PROBE_OBJECT]: 0 }]);
    await expect(
      assertSeedPrecondition(ctx, 'tok', 'e2e-admin@hotcrm.test', noWait),
    ).rejects.toThrow(/no demo seed data/);
  });

  it('waits out a seed still loading rather than calling it absent', async () => {
    // `waitForQuiet` infers "the seed storm has passed" from health latency,
    // which is a proxy. A cold database still inserting when global setup
    // reaches the guard would answer zero rows on the first pass — and a guard
    // that failed there would turn a green CI run red, which is the one thing
    // it must not do. It returns the instant the rows appear.
    const { ctx } = stubContext([
      { [CLAIMABLE_PROBE_OBJECT]: 0, [OWNERSHIP_BLIND_PROBE_OBJECT]: 0 },
      { [CLAIMABLE_PROBE_OBJECT]: 9 },
    ]);
    await expect(
      assertSeedPrecondition(ctx, 'tok', 'e2e-admin@hotcrm.test', { timeoutMs: 5_000, pollMs: 0, sleep: async () => {} }),
    ).resolves.toBeUndefined();
  });

  it('reports an unhappy API as an API problem, not as a seed-data state', async () => {
    const { ctx } = stubContext([{ [CLAIMABLE_PROBE_OBJECT]: { status: 500, body: 'boom' } }]);
    await expect(assertSeedPrecondition(ctx, 'tok', 'e2e-admin@hotcrm.test', noWait)).rejects.toThrow(
      /probe failed:.*→ 500/,
    );
  });

  it('rejects a 200 that is not a list envelope instead of reading it as zero rows', async () => {
    const ctx: SeedProbeContext = {
      async get() {
        return { ok: () => true, status: () => 200, text: async () => '', json: async () => ({ data: [] }) };
      },
    };
    await expect(assertSeedPrecondition(ctx, 'tok', 'e2e-admin@hotcrm.test', noWait)).rejects.toThrow(
      /without a `records` array/,
    );
  });
});
