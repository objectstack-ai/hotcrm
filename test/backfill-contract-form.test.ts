// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { REPO_ROOT } from './helpers/repo-root';

type Rec = Record<string, any>;

/**
 * `scripts/backfill-contract-form.ts` (hotcrm#2804) writes each contract an
 * upgraded database holds without a form, once, carrying no choice: the rule
 * that picks the form is the contract hook's (`contract_form_and_change`,
 * pinned on a booted stack by `contract-form-change.test.ts`). It never writes
 * a contract that has a form, never writes a value, and lists the order
 * contracts whose value differs from their order.
 *
 * Run as an operator runs it, with `--apply`, against a stubbed REST door; the
 * stub stands in for the hook by giving each written row a form.
 */

const ROWS: Rec[] = [
  { id: 'c1', contract_number: 'CTR-0001', name: 'Old one', contract_form: null, contract_value: 5_000, order_amount: 0 },
  { id: 'c2', contract_number: 'CTR-0002', name: 'Differs', contract_form: 'order', contract_value: 1_100, order_amount: 1_300 },
  { id: 'c3', contract_number: 'CTR-0003', name: 'Agrees', contract_form: 'order', contract_value: 900, order_amount: 900 },
  { id: 'c4', contract_number: 'CTR-0004', name: 'Framework', contract_form: 'framework', contract_value: 2_000, order_amount: 0 },
];

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('scripts/backfill-contract-form.ts --apply', () => {
  it('writes each contract without a form once, with no choice, and lists the order contracts that differ', async () => {
    const rows = structuredClone(ROWS);
    const patches: Array<{ id: string; body: Rec }> = [];
    const reply = (status: number, json: unknown) => ({
      status, headers: { getSetCookie: (): string[] => [] }, text: async () => JSON.stringify(json),
    });
    const stub = vi.fn(async (input: string | URL, init?: { method?: string; body?: unknown }) => {
      const { pathname } = new URL(String(input));
      if (pathname === '/api/v1/auth/sign-in/email') return reply(200, { user: { id: 'admin', email: 'admin@hotcrm.test' } });
      if (pathname === '/api/v1/data/crm_contract/query' && init?.method === 'POST') return reply(200, { records: rows });
      const patch = /^\/api\/v1\/data\/crm_contract\/([^/]+)$/.exec(pathname);
      if (patch && init?.method === 'PATCH') {
        patches.push({ id: patch[1]!, body: JSON.parse(String(init.body)) as Rec });
        rows.find((c) => c.id === patch[1])!.contract_form = 'framework'; // the hook's rule
        return reply(200, { record: { id: patch[1] } });
      }
      return reply(404, { error: `no route for ${init?.method} ${pathname}` });
    });
    vi.stubGlobal('fetch', stub);
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const failed = vi.spyOn(console, 'error').mockImplementation(() => {});

    const argv = process.argv;
    const exitCode = process.exitCode;
    process.argv = [argv[0]!, 'backfill-contract-form-probe', '--apply'];
    try {
      await import(pathToFileURL(join(REPO_ROOT, 'scripts', 'backfill-contract-form.ts')).href);
      let seen = -1;
      for (let turn = 0; turn < 200 && seen !== stub.mock.calls.length; turn++) {
        seen = stub.mock.calls.length;
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      expect(process.exitCode ?? 0, 'the script reported a failure').toBe(0);
    } finally {
      process.argv = argv;
      process.exitCode = exitCode;
    }

    expect(failed).not.toHaveBeenCalled();
    expect(patches).toEqual([{ id: 'c1', body: { contract_form: null } }]);
    const printed = log.mock.calls.map((c) => String(c[0])).join('\n');
    expect(printed).toContain('differs from the order amount: 1.');
    expect(printed).toContain('CTR-0002 "Differs": contract 1100, order 1300');
    expect(printed).not.toContain('CTR-0003 "Agrees":');
  });
});
