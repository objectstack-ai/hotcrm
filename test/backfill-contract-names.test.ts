// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { REPO_ROOT } from './helpers/repo-root';

type Rec = Record<string, any>;

/**
 * `scripts/backfill-contract-names.ts` (hotcrm#2746) names the contracts an
 * upgraded database holds without one: the source quote's name — the quote of
 * an order naming the contract, else the one accepted quote of its
 * opportunity — otherwise the account's name and the start date. It writes
 * only `name`, only on unnamed rows.
 *
 * The script is run as an operator runs it, with `--apply`, against a stubbed
 * REST door holding the rows below; what it PATCHes is what is checked. Its
 * query bodies are held to the installed query schema by
 * `backfill-query-bodies.test.ts`.
 */

const ROWS: Record<string, Rec[]> = {
  crm_contract: [
    { id: 'c1', contract_number: 'CTR-0001', name: null, crm_account: 'a1', crm_opportunity: 'o1', start_date: '2026-01-05' },
    { id: 'c2', contract_number: 'CTR-0002', name: '', crm_account: 'a1', crm_opportunity: 'o2', start_date: '2026-02-01' },
    { id: 'c3', contract_number: 'CTR-0003', crm_account: 'a1', crm_opportunity: 'o3', start_date: '2027-03-01' },
    { id: 'c4', contract_number: 'CTR-0004', name: 'Already Named', crm_account: 'a2', crm_opportunity: 'o2', start_date: '2026-04-01' },
    { id: 'c5', contract_number: 'CTR-0005', name: null, crm_account: 'a2', crm_opportunity: null, start_date: '2026-11-24' },
  ],
  crm_account: [{ id: 'a1', name: 'Acme Corporation' }, { id: 'a2', name: 'Globex' }],
  crm_quote: [
    // o1's accepted quote is NOT the order's: the order wins.
    { id: 'q1', name: 'Order Quote', status: 'accepted', crm_opportunity: 'o9' },
    { id: 'q0', name: 'Other Accepted', status: 'accepted', crm_opportunity: 'o1' },
    { id: 'q2', name: 'Annual Service 2026', status: 'accepted', crm_opportunity: 'o2' },
    { id: 'q2b', name: 'Lost Draft', status: 'rejected', crm_opportunity: 'o2' },
    { id: 'q3', name: 'First Accepted', status: 'accepted', crm_opportunity: 'o3' },
    { id: 'q3b', name: 'Second Accepted', status: 'accepted', crm_opportunity: 'o3' },
  ],
  crm_sales_order: [
    { id: 's1', crm_contract: 'c1', crm_quote: 'q1' },
    { id: 's2', crm_contract: null, crm_quote: 'q2' },
  ],
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('scripts/backfill-contract-names.ts --apply', () => {
  it('names each unnamed contract by its source quote, else by account and start date, and nothing else', async () => {
    const rows = structuredClone(ROWS);
    const patches: Array<{ id: string; body: Rec }> = [];
    const reply = (status: number, json: unknown) => ({
      status, headers: { getSetCookie: (): string[] => [] }, text: async () => JSON.stringify(json),
    });
    const stub = vi.fn(async (input: string | URL, init?: { method?: string; body?: unknown }) => {
      const { pathname } = new URL(String(input));
      if (pathname === '/api/v1/auth/sign-in/email') return reply(200, { user: { id: 'admin', email: 'admin@hotcrm.test' } });
      const query = /^\/api\/v1\/data\/([^/]+)\/query$/.exec(pathname);
      if (query && init?.method === 'POST') return reply(200, { records: rows[query[1]!] ?? [] });
      const patch = /^\/api\/v1\/data\/crm_contract\/([^/]+)$/.exec(pathname);
      if (patch && init?.method === 'PATCH') {
        const body = JSON.parse(String(init.body)) as Rec;
        patches.push({ id: patch[1]!, body });
        Object.assign(rows.crm_contract!.find((c) => c.id === patch[1])!, body);
        return reply(200, { record: { id: patch[1] } });
      }
      return reply(404, { error: `no route for ${init?.method} ${pathname}` });
    });
    vi.stubGlobal('fetch', stub);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const failed = vi.spyOn(console, 'error').mockImplementation(() => {});

    const argv = process.argv;
    const exitCode = process.exitCode;
    process.argv = [argv[0]!, 'backfill-contract-names-probe', '--apply'];
    try {
      await import(pathToFileURL(join(REPO_ROOT, 'scripts', 'backfill-contract-names.ts')).href);
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
    expect(patches).toEqual([
      { id: 'c1', body: { name: 'Order Quote' } }, // the quote of the order naming it
      { id: 'c2', body: { name: 'Annual Service 2026' } }, // its opportunity's one accepted quote
      { id: 'c3', body: { name: 'Acme Corporation 2027-03-01' } }, // two accepted quotes name none
      { id: 'c5', body: { name: 'Globex 2026-11-24' } }, // no source quote
    ]);
  });
});
