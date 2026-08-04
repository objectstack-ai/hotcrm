// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { test as base, expect, type APIRequestContext } from '@playwright/test';
import { TOKEN_ENV } from './global-setup';
import { SEEDS_UNREADABLE_MID_RUN } from './seed-precondition';

/**
 * Authenticated e2e fixtures.
 *
 * The CRM data API is auth-gated: an anonymous `GET /api/v1/data/crm_account`
 * returns 401. Both specs used to treat that 401 as a pass — `smoke.spec.ts`
 * accepted `[200, 401, 403]` and `opportunity-lifecycle.spec.ts` called
 * `test.skip()` on it — so the suite could only ever prove that a route was
 * mounted, never that the CRM behaved. And since it also pointed at the wrong
 * port, every run took the tolerant branch.
 *
 * `e2e/global-setup.ts` establishes one session for the whole run; this fixture
 * hands each spec a request context carrying that bearer token, so assertions
 * can be unconditional. A 401 is now a failure, because it is one.
 */

export const test = base.extend<{ api: APIRequestContext }>({
  /**
   * A request context carrying the session bearer token. Use this for every
   * `/api/v1/data/**` call; the built-in unauthenticated `request` fixture
   * stays available for asserting that a route *is* gated.
   */
  api: async ({ playwright, baseURL }, use) => {
    const token = process.env[TOKEN_ENV];
    expect(
      token,
      `no session token on process.env.${TOKEN_ENV} — e2e/global-setup.ts did not run`,
    ).toBeTruthy();

    const ctx = await playwright.request.newContext({
      baseURL,
      extraHTTPHeaders: { Authorization: `Bearer ${token}` },
    });
    await use(ctx);
    await ctx.dispose();
  },
});

export { expect } from '@playwright/test';

/** Response envelopes the REST API returns for single-record writes/reads. */
interface RecordEnvelope {
  object?: string;
  id?: string;
  record?: Record<string, unknown>;
}

/**
 * Unwrap a single-record response.
 *
 * The API answers writes with `{ object, id, record }`. The old lifecycle spec
 * read `json.data ?? json`, which yields the envelope rather than the record —
 * so `rec.probability` was `undefined` and the assertions would have passed
 * only by never running.
 */
export function recordOf(body: unknown): Record<string, unknown> {
  const env = body as RecordEnvelope | null;
  if (env && typeof env === 'object' && env.record && typeof env.record === 'object') {
    return env.record as Record<string, unknown>;
  }
  return (env ?? {}) as Record<string, unknown>;
}

/** Unwrap a list response (`{ object, records }`). */
export function recordsOf(body: unknown): Record<string, unknown>[] {
  const records = (body as { records?: unknown } | null)?.records;
  return Array.isArray(records) ? (records as Record<string, unknown>[]) : [];
}

/**
 * The id of any seeded account.
 *
 * `crm_opportunity.crm_account` is required, so an opportunity cannot be
 * created without one — the old spec omitted it and would have failed
 * validation with a 400 even after authenticating.
 */
export async function seededAccountId(api: APIRequestContext): Promise<string> {
  const res = await api.get('/api/v1/data/crm_account?limit=1');
  expect(res.ok(), `could not read seeded accounts: ${res.status()}`).toBeTruthy();
  const [first] = recordsOf(await res.json());
  expect(first, `no seeded crm_account — ${SEEDS_UNREADABLE_MID_RUN}`).toBeTruthy();
  return first.id as string;
}
