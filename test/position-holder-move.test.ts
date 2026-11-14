// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { bootStack, type VerifyStack } from '@objectstack/verify';
import artifact from '../objectstack.config';
import { CrmPositions } from '../src/sales/sharing/positions';
import { bootOptions, buildArtifactAgain } from './helpers/verify-stack';

/**
 * The people who held a position before 6.2.0 still hold it after the upgrade
 * (#2458).
 *
 * 6.2.0 gave all twelve positions the `crm_` prefix (#2437). An assignment
 * (`sys_user_position`) stores the position's NAME, so an installed
 * organization's holders kept naming positions that no longer existed and lost
 * every permission set those positions gave them. Each position now declares
 * its earlier name in `renamedFrom`, and the platform moves the holders at boot
 * (ObjectStack 18.4.0).
 *
 * Measured the way an install meets it: one database file, two boots.
 *
 *  1. The ablation. The app as 6.2.0 shipped it, every `renamedFrom` taken
 *     out, boots over a database whose holder rows still name the old
 *     positions. Those rows are fixture setup written as the system: that is
 *     the state any organization assigned on 6.1.x is in, and a non-system
 *     write of an old name is refused now (the name resolves to no position).
 *     The rows stay where they are and grant nothing, which is the defect
 *     measured on staging.
 *  2. The fix. The kernel stops, and the shipped app cold-boots over the same
 *     file (`databaseFile`, the handle's restart seam).
 *
 * People sign in by password on both boots, so the reading after the restart
 * is a new session over the moved rows, not a token minted before it.
 */

type Row = Record<string, any>;

/**
 * The twelve position names HotCRM shipped through 6.1.2, before the `crm_`
 * prefix. Frozen history, written out here on purpose: it is what an
 * organization installed on 6.1.x has in `sys_user_position`, so it does not
 * follow the source.
 */
const NAMES_BEFORE_6_2 = [
  'executive', 'sales_director', 'sales_manager', 'sales_rep',
  'service_director', 'service_manager', 'service_agent',
  'marketing_director', 'marketing_manager', 'marketing_user',
  'na_sales_team', 'eu_sales_team',
];

describe('every position declares the name it had before 6.2.0', () => {
  it('each old name is claimed by exactly one position, its crm_ name, and nothing else is claimed', () => {
    const claims = CrmPositions.flatMap((p) => ((p as Row).renamedFrom ?? []).map((old: string) => [old, p.name]));
    expect(Object.fromEntries(claims)).toEqual(Object.fromEntries(NAMES_BEFORE_6_2.map((old) => [old, `crm_${old}`])));
    expect(claims, 'an old name is claimed twice, so the platform carries neither').toHaveLength(NAMES_BEFORE_6_2.length);
  });

  it('no old name is still a position, or the platform would refuse to carry it', () => {
    const declared = CrmPositions.map((p) => p.name);
    for (const old of NAMES_BEFORE_6_2) expect(declared, `${old} is still declared`).not.toContain(old);
  });
});

/** The shipped artifact without any `renamedFrom`: the positions as 6.2.0 shipped them. */
const withoutRenamedFrom = (base: typeof artifact): typeof artifact => {
  const a = base as unknown as Row;
  let stripped = 0;
  const packages = (a.packages as Row[]).map((p) => !Array.isArray(p.manifest?.positions) ? p : {
    ...p,
    manifest: {
      ...p.manifest,
      positions: (p.manifest.positions as Row[]).map(({ renamedFrom, ...rest }) => {
        if (renamedFrom !== undefined) stripped += 1;
        return rest;
      }),
    },
  });
  expect(stripped, 'fixture: the shipped positions declare renamedFrom').toBe(NAMES_BEFORE_6_2.length);
  return { ...a, packages } as typeof artifact;
};

const PASSWORD = 'Position-move-2458';

interface Reading {
  positions: string[];
  sets: string[];
  forecastStatus: number;
}

/** What a person holds and reaches, read through a fresh password sign-in. */
async function readingOf(stack: VerifyStack, email: string, userId: string): Promise<Reading> {
  const token = await stack.signIn(email, PASSWORD);
  const perms = await stack.apiAs(token, 'GET', '/auth/me/permissions');
  expect(perms.status, await perms.clone().text()).toBe(200);
  const body = (await perms.json()) as Row;
  const forecasts = await stack.apiAs(token, 'GET', '/data/crm_forecast');
  return {
    positions: (await stack.rows('sys_user_position', { user_id: userId })).map((r) => String(r.position)).sort(),
    sets: [...(((body.data ?? body) as Row).permissionSets as string[])].sort(),
    forecastStatus: forecasts.status,
  };
}

describe('holders of the old names move to the crm_ positions at boot', () => {
  let dir: string;
  let after: VerifyStack | undefined;
  const people: Record<'manager' | 'rep' | 'agent', { email: string; id: string }> = {
    manager: { email: 'manager@position-move.test', id: '' },
    rep: { email: 'rep@position-move.test', id: '' },
    agent: { email: 'agent@position-move.test', id: '' },
  };
  const before: Partial<Record<keyof typeof people, Reading>> = {};
  let managerRowBefore: Row | undefined;

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'position-holder-move-'));
    const databaseFile = join(dir, 'crm.db');

    const ablation = await bootStack(withoutRenamedFrom(await buildArtifactAgain()), bootOptions({ databaseFile }));
    for (const [key, person] of Object.entries(people)) {
      const token = await ablation.signUp(person.email, PASSWORD, `Moved ${key}`);
      person.id = String((await ablation.contextFor(token)).userId);
    }
    const context = await ablation.contextFor(await ablation.signIn(people.manager.email, PASSWORD));
    const organization = context.tenantId ? { organization_id: String(context.tenantId) } : {};
    // An organization assigned on 6.1.x: every row still names an old position.
    await ablation.seed('sys_user_position', [
      { user_id: people.manager.id, position: 'sales_manager', ...organization },
      { user_id: people.rep.id, position: 'sales_rep', ...organization },
      { user_id: people.rep.id, position: 'na_sales_team', ...organization },
      // Someone an administrator already assigned again by hand under the new name.
      { user_id: people.agent.id, position: 'service_agent', ...organization },
      { user_id: people.agent.id, position: 'crm_service_agent', ...organization },
    ]);
    for (const key of Object.keys(people) as (keyof typeof people)[]) {
      before[key] = await readingOf(ablation, people[key].email, people[key].id);
    }
    [managerRowBefore] = await ablation.rows('sys_user_position', { user_id: people.manager.id });
    await ablation.stop();

    after = await bootStack(await buildArtifactAgain(), bootOptions({ databaseFile }));
  }, 300_000);

  afterAll(async () => {
    await after?.stop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it('ablation: without renamedFrom the rows keep the old names and grant nothing', () => {
    expect(before.manager).toEqual({ positions: ['sales_manager'], sets: expect.not.arrayContaining(['sales_manager']), forecastStatus: 403 });
    expect(before.rep?.positions).toEqual(['na_sales_team', 'sales_rep']);
    expect(before.rep?.sets).not.toContain('sales_rep');
  });

  it('a sales manager holds crm_sales_manager after the restart and reads forecasts again', async () => {
    const reading = await readingOf(after!, people.manager.email, people.manager.id);
    expect(reading.positions).toEqual(['crm_sales_manager']);
    expect(reading.sets).toContain('sales_manager');
    expect(reading.forecastStatus).toBe(200);
  }, 60_000);

  it('a rep with two old positions holds both crm_ positions, and the rep set again', async () => {
    const reading = await readingOf(after!, people.rep.email, people.rep.id);
    expect(reading.positions).toEqual(['crm_na_sales_team', 'crm_sales_rep']);
    expect(reading.sets).toContain('sales_rep');
  }, 60_000);

  it('a person already reassigned by hand keeps both rows, and nothing is deleted', async () => {
    const reading = await readingOf(after!, people.agent.email, people.agent.id);
    expect(reading.positions).toEqual(['crm_service_agent', 'service_agent']);
    expect(reading.sets).toContain('service_agent');
  }, 60_000);

  it('the move rewrites the row in place: same id, holder and organization, only the position changes', async () => {
    const [row] = await after!.rows('sys_user_position', { user_id: people.manager.id });
    const pick = (r: Row | undefined) => ({ id: r?.id, user_id: r?.user_id, organization_id: r?.organization_id ?? null });
    expect(pick(row)).toEqual(pick(managerRowBefore));
    expect({ before: managerRowBefore?.position, after: row?.position }).toEqual({ before: 'sales_manager', after: 'crm_sales_manager' });
  });
});
