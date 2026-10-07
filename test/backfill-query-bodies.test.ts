// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { FindDataRequestSchema } from '@objectstack/spec/api';
import { REPO_ROOT } from './helpers/repo-root';

/**
 * Every `scripts/backfill-*.ts` sends only query bodies the installed query
 * door accepts (#1999).
 *
 * These scripts are instructions this repo hands to operators: a changeset
 * tells them to run one, `package.json` exposes another as `backfill:owner`.
 * Each one pages through `POST /api/v1/data/OBJECT/query`, and on 17.6.0 that
 * door validates the body against `FindDataRequestSchema` before it reads
 * anything. Two scripts sent `filters: []` (`min_items`) and `sort: 'id asc'`
 * (`invalid_shape`), so both died on their first query and wrote nothing:
 *
 *   backfill-line-number.ts  Backfill failed: query crm_opportunity_line_item → 400: Invalid query request
 *   backfill-owner-id.ts     Backfill failed: cannot read sys_user (400)
 *
 * Nothing in `pnpm verify` ran these scripts, so the schema tightening reached
 * an operator's terminal first. This file is where the next one turns red.
 *
 * ## How
 *
 * Each script is imported with `fetch` stubbed, so its own `main()` runs its
 * real request code and every query body it sends is captured. Nothing is
 * exported from the scripts for this, so what gets checked is what the script
 * actually sends; a body built inline somewhere new is caught too. The stub
 * answers sign-in, and judges each query body the way the REST door does
 * (`@objectstack/rest`, the `POST .../:object/query` route; read on 17.6.0 and
 * again on 17.7.0): it adds
 * `object` to the body, then `FindDataRequestSchema.safeParse({ object, query })`.
 * An accepted body gets `{ records: [] }`, so the script goes through each of
 * its objects once and finishes. A refused one gets the door's 400.
 *
 * The run is report-only (no `--apply` in `argv`) and the door returns no
 * rows, so no script ever reaches a write.
 */

const BACKFILL_SCRIPTS = readdirSync(join(REPO_ROOT, 'scripts'))
  .filter((f) => /^backfill-.+\.ts$/.test(f))
  .sort();

/** The query door's own check (read on 17.6.0 and 17.7.0): `object` merged into the body, then the spec schema. */
function door(object: string, body: unknown) {
  const query = body && typeof body === 'object' && !Array.isArray(body) ? { ...body, object } : body;
  return FindDataRequestSchema.safeParse({ object, query });
}

interface Sent {
  object: string;
  body: unknown;
  /** `path: code` for each issue the schema raised; empty when the door accepts the body. */
  refused: string[];
}

function stubDoor(sent: Sent[]) {
  const reply = (status: number, json: unknown) => ({
    status,
    headers: { getSetCookie: (): string[] => [] },
    text: async () => JSON.stringify(json),
  });
  return vi.fn(async (input: string | URL, init?: { method?: string; body?: unknown }) => {
    const { pathname } = new URL(String(input));
    if (pathname === '/api/v1/auth/sign-in/email') {
      return reply(200, { user: { id: 'probe-admin', email: 'probe@hotcrm.test' } });
    }
    const query = /^\/api\/v1\/data\/([^/]+)\/query$/.exec(pathname);
    if (query && init?.method === 'POST') {
      const body = init.body === undefined ? undefined : JSON.parse(String(init.body));
      const verdict = door(query[1], body);
      const refused = verdict.success ? [] : verdict.error.issues.map((i) => `${i.path.join('.')}: ${i.code}`);
      sent.push({ object: query[1], body, refused });
      return verdict.success
        ? reply(200, { records: [] })
        : reply(400, { error: 'Invalid query request', code: 'VALIDATION_FAILED' });
    }
    return reply(404, { error: `probe: no route for ${init?.method ?? 'GET'} ${pathname}` });
  });
}

/**
 * Lets the script's un-awaited `main()` finish. The stub answers on
 * microtasks, so one macrotask turn drains it. The loop waits until the call
 * count stops moving, in case a script awaits a timer between requests.
 */
async function quiesce(stub: ReturnType<typeof stubDoor>): Promise<void> {
  let seen = -1;
  for (let turn = 0; turn < 200 && seen !== stub.mock.calls.length; turn++) {
    seen = stub.mock.calls.length;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('scripts/backfill-*.ts query bodies, against the installed query schema', () => {
  it('finds the backfill scripts', () => {
    // A walk that returns nothing makes every case below vanish, and an empty
    // suite reads as a pass.
    expect(BACKFILL_SCRIPTS.length).toBeGreaterThan(0);
  });

  for (const file of BACKFILL_SCRIPTS) {
    it(`scripts/${file} sends only query bodies the door accepts`, async () => {
      const sent: Sent[] = [];
      const stub = stubDoor(sent);
      vi.stubGlobal('fetch', stub);
      // The scripts narrate to the console; keep it out of the verify log.
      vi.spyOn(console, 'log').mockImplementation(() => {});
      const failed = vi.spyOn(console, 'error').mockImplementation(() => {});

      const argv = process.argv;
      const exitCode = process.exitCode;
      // Report-only, default URL: the scripts read `--apply` and `--url` from here.
      process.argv = [argv[0], 'backfill-query-bodies-probe'];
      try {
        await import(pathToFileURL(join(REPO_ROOT, 'scripts', file)).href);
        await quiesce(stub);
      } finally {
        process.argv = argv;
        process.exitCode = exitCode;
      }

      // Zero bodies means the probe never reached the door (a new entry-point
      // guard, a different transport), which would let every body pass unseen.
      expect(sent.length, `scripts/${file} sent no query body`).toBeGreaterThan(0);
      expect(sent.filter((s) => s.refused.length > 0)).toEqual([]);
      // The scripts report a failure only through `console.error`.
      expect(failed).not.toHaveBeenCalled();
    });
  }
});
