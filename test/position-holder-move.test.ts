// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { VerifyStack } from '@objectstack/verify';
import { CrmPositions, CRM_POSITION_FORMER_NAMES } from '../src/sales/sharing/positions';
import { hotcrmStack, signUpPerson, type Person } from './helpers/verify-stack';
import { REPO_ROOT } from './helpers/repo-root';

/**
 * The twelve positions took the `crm_` prefix (#2437), and the people who held
 * them under the old names are moved by `scripts/migrate-position-holders.ts`.
 *
 * Why a move is needed at all, measured here rather than assumed: an
 * assignment (`sys_user_position`) stores the position's NAME, and the
 * platform does not carry it across a rename. A person whose assignment still
 * reads `sales_rep` after the upgrade holds a position that no longer exists,
 * so the `sales_rep` permission set the position distributes is not theirs.
 *
 * The rows written under old names are fixture setup, written as the system:
 * that is the state an installed organization is in after the upgrade, and a
 * non-system write of an old name is now refused by the platform (the name
 * resolves to no position). The move itself runs the operator's script,
 * unchanged, against the booted app's own HTTP door, signed in as the dev
 * administrator the way an operator signs in.
 */

type Row = Record<string, unknown>;

let verify: VerifyStack;
let rep: Person;
let agent: Person;
let organization: Row;

const positionsOf = async (p: Person): Promise<string[]> =>
  (await verify.rows('sys_user_position', { user_id: p.id })).map((r) => String(r.position)).sort();

const setsOf = async (p: Person): Promise<string[]> => {
  const res = await verify.apiAs(p.token, 'GET', '/auth/me/permissions');
  expect(res.status, await res.clone().text()).toBe(200);
  const body = (await res.json()) as Row;
  return ((body.data ?? body) as Row).permissionSets as string[];
};

/** Run the script once, as an operator would, with `fetch` pointed at the booted app. */
async function runScript(argv: string[]): Promise<{ log: string[]; errors: unknown[][]; exitCode: number | undefined }> {
  const log: string[] = [];
  vi.spyOn(console, 'log').mockImplementation((...a: unknown[]) => { log.push(a.join(' ')); });
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.stubGlobal('fetch', async (input: string | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    return verify.raw(url.pathname + url.search, init);
  });
  const saved = { argv: process.argv, exitCode: process.exitCode };
  process.argv = [saved.argv[0]!, 'migrate-position-holders', ...argv];
  process.exitCode = undefined;
  try {
    vi.resetModules();
    const mod = (await import(pathToFileURL(join(REPO_ROOT, 'scripts', 'migrate-position-holders.ts')).href)) as { done: Promise<void> };
    await mod.done;
    return { log, errors: errors.mock.calls, exitCode: process.exitCode as number | undefined };
  } finally {
    process.argv = saved.argv;
    process.exitCode = saved.exitCode;
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('the rename table', () => {
  it('maps every position from its old name to its crm_ name, and names nothing else', () => {
    const declared = CrmPositions.map((p) => p.name).sort();
    expect(Object.values(CRM_POSITION_FORMER_NAMES).sort()).toEqual(declared);
    for (const [oldName, newName] of Object.entries(CRM_POSITION_FORMER_NAMES)) {
      expect(newName).toBe(`crm_${oldName}`);
      expect(declared, `${oldName} is still declared as a position`).not.toContain(oldName);
    }
  });
});

describe('moving the holders of the old names', () => {
  beforeAll(async () => {
    verify = await hotcrmStack();
    rep = await signUpPerson(verify, 'rep@position-move.test', { name: 'Moved Rep' });
    agent = await signUpPerson(verify, 'agent@position-move.test', { name: 'Twice Agent' });
    const context = await verify.contextFor(rep.token);
    organization = context.tenantId ? { organization_id: String(context.tenantId) } : {};
    // An installed organization after the upgrade: assignments still under the old names.
    await verify.seed('sys_user_position', [
      { user_id: rep.id, position: 'sales_rep', ...organization },
      { user_id: rep.id, position: 'na_sales_team', ...organization },
      // Someone an administrator already re-assigned by hand: the old row is left for them to review.
      { user_id: agent.id, position: 'service_agent', ...organization },
      { user_id: agent.id, position: 'crm_service_agent', ...organization },
    ]);
  }, 180_000);

  it('an assignment under an old name grants nothing until it is moved', async () => {
    expect(await positionsOf(rep)).toEqual(['na_sales_team', 'sales_rep']);
    expect(await setsOf(rep)).not.toContain('sales_rep');
  }, 60_000);

  it('report-only names what it would move and writes nothing', async () => {
    const run = await runScript([]);
    expect(run.errors).toEqual([]);
    expect(run.log.join('\n')).toContain('sales_rep → crm_sales_rep: 1 to move');
    expect(run.log.join('\n')).toContain('na_sales_team → crm_na_sales_team: 1 to move');
    expect(await positionsOf(rep)).toEqual(['na_sales_team', 'sales_rep']);
  }, 60_000);

  it('--apply moves each holder to the new name, and the position grants again', async () => {
    const run = await runScript(['--apply']);
    expect(run.errors).toEqual([]);
    expect(run.exitCode, run.log.join('\n')).toBeUndefined();
    expect(await positionsOf(rep)).toEqual(['crm_na_sales_team', 'crm_sales_rep']);
    expect(await setsOf(rep)).toContain('sales_rep');
  }, 60_000);

  it('leaves alone an old row whose holder already holds the new position', async () => {
    expect(await positionsOf(agent)).toEqual(['crm_service_agent', 'service_agent']);
  }, 60_000);

  it('a second pass finds nothing left to move', async () => {
    const run = await runScript(['--apply']);
    expect(run.errors).toEqual([]);
    expect(run.exitCode, run.log.join('\n')).toBeUndefined();
    expect(run.log.join('\n')).not.toMatch(/to move$/m);
    expect(run.log.join('\n')).toContain('moved 0/0');
  }, 60_000);
});
