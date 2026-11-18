// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, afterAll } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { bootStack, type VerifyStack } from '@objectstack/verify';
import { bootOptions, buildArtifactAgain, switchFlow } from './helpers/verify-stack';

type Rec = Record<string, any>;

/**
 * Measurement (2) of hotcrm#2558: an administrator's switch of a packaged flow
 * survives a restart and an upgrade.
 *
 * How it is measured: three boots of the shipped artifact, in sequence, over
 * ONE SQLite database file (`databaseFile`), each stopped before the next.
 *
 *   1. a fresh install — the shipped defaults: `quote_accepted_order` on,
 *      `quote_accepted_contract_draft` off. The administrator then switches
 *      both the other way through the packaged-flow switch
 *      (`POST /api/v1/automation/:name/toggle`);
 *   2. a RESTART — the same artifact, a fresh kernel, the same database;
 *   3. an UPGRADE — every package of the artifact re-installed at a new
 *      version (the shipped one → `6.99.0`, the version an install reads off
 *      each package's manifest, as the packages door then serves it), on the
 *      same database.
 *
 * After 2 and 3 the engine still reports each flow the way the administrator
 * left it, and its trigger is bound or unbound to match. The choice is a row
 * of the activation ledger, `sys_metadata_activation`, naming the package
 * (objectstack#34655: a row naming the package that holds the flow wins over
 * `defaultActive` across a restart, an upgrade and a reinstall).
 */

const FLOWS = ['quote_accepted_order', 'quote_accepted_contract_draft'] as const;
const databaseFile = join(mkdtempSync(join(tmpdir(), 'hotcrm-flow-switch-')), 'install.db');

/** The artifact with every package's manifest at `version` — an upgrade of the same packages. */
const atVersion = (base: Rec, version: string): Rec => ({
  ...base,
  ...(base.manifest ? { manifest: { ...base.manifest, version } } : {}),
  packages: (base.packages as Rec[]).map((p) => ({ ...p, manifest: { ...p.manifest, version } })),
});

let live: VerifyStack | undefined;
/** The version the artifact ships the revenue package at, read off its manifest. */
let shipped: string | undefined;
const boot = async (version?: string): Promise<VerifyStack> => {
  const fresh = await buildArtifactAgain();
  shipped ??= ((fresh as Rec).packages as Rec[]).find((p) => p.manifest?.id === 'app.objectstack.hotcrm.revenue')?.manifest?.version;
  live = await bootStack((version ? atVersion(fresh as Rec, version) : fresh) as never, bootOptions({ databaseFile }));
  return live;
};
const stop = async (): Promise<void> => {
  await live?.stop();
  live = undefined;
};
afterAll(stop);

/** `{ enabled, bound }` of each flow, as the booted engine reports it. */
const states = (stack: VerifyStack): Record<string, { enabled: boolean; bound: boolean }> => {
  const automation = stack.kernel.getService<Rec>('automation');
  const rows = (automation.getFlowRuntimeStates() as Rec[]).filter((r) => (FLOWS as readonly string[]).includes(r.name));
  return Object.fromEntries(rows.map((r) => [r.name, { enabled: r.enabled, bound: r.bound }]));
};

/** The version the install serves for the package that ships both flows, off the packages door. */
const revenueVersion = async (stack: VerifyStack): Promise<string | undefined> => {
  const res = await stack.apiAs(await stack.signIn(), 'GET', '/packages');
  const body = (await res.json()) as Rec;
  return (body.data?.packages as Rec[] | undefined)
    ?.find((p) => p.manifest?.id === 'app.objectstack.hotcrm.revenue')?.manifest?.version;
};

describe('an administrator\'s switch survives a restart and an upgrade', { timeout: 300_000 }, () => {
  it('fresh install: the shipped defaults, then the administrator switches both', async () => {
    const stack = await boot();
    expect(shipped).toMatch(/^\d+\.\d+\.\d+$/);
    expect(await revenueVersion(stack)).toBe(shipped);
    expect(states(stack)).toEqual({
      quote_accepted_order: { enabled: true, bound: true },
      quote_accepted_contract_draft: { enabled: false, bound: false },
    });
    await switchFlow(stack, 'quote_accepted_contract_draft', true);
    await switchFlow(stack, 'quote_accepted_order', false);
    expect(states(stack)).toEqual({
      quote_accepted_order: { enabled: false, bound: false },
      quote_accepted_contract_draft: { enabled: true, bound: true },
    });
    const ledger = await stack.rows('sys_metadata_activation');
    for (const [name, active] of [['quote_accepted_contract_draft', true], ['quote_accepted_order', false]] as const) {
      expect(ledger.filter((r) => r.name === name), `the ledger's record of the switch of ${name}`).toEqual([
        expect.objectContaining({ metadata_type: 'flow', package_id: 'app.objectstack.hotcrm.revenue', active }),
      ]);
    }
    await stop();
  });

  it('restart: the same artifact on the same database keeps both switches', async () => {
    const stack = await boot();
    expect(states(stack)).toEqual({
      quote_accepted_order: { enabled: false, bound: false },
      quote_accepted_contract_draft: { enabled: true, bound: true },
    });
    await stop();
  });

  it('upgrade: every package re-installed at a new version keeps both switches', async () => {
    const stack = await boot('6.99.0');
    expect(await revenueVersion(stack), 'the boot did not install the new version').toBe('6.99.0');
    expect(states(stack)).toEqual({
      quote_accepted_order: { enabled: false, bound: false },
      quote_accepted_contract_draft: { enabled: true, bound: true },
    });
    await stop();
  });
});
