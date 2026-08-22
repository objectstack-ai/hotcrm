// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { test as base, expect, type APIRequestContext } from '@playwright/test';
import { TOKEN_ENV, USER_ID_ENV } from './global-setup';

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
 *
 * ─── What this suite proves about ACCESS CONTROL (#669) ─────────────────────
 *
 * One sentence: every record assertion in this suite is about a record THE
 * CALLER OWNS, and it reaches that record through the OWD baseline alone.
 *
 * The account `global-setup.ts` signs up is a plain org member. Measured on
 * 17.0.0-rc.5 against a running server, it holds the positions
 * `[org_member, everyone]` and nothing else — no `viewAllRecords`, no
 * `sys_record_share` grant, no position the sharing rules or
 * `opportunity_approval` route to, no `system_admin` set. On the `private`
 * objects it touches (`crm_account`, `crm_opportunity`) the only door it has is
 * the one `sharingModel: 'private'` opens for a row's own owner. So when
 * `smoke.spec.ts` reads an account back and finds `owner_id` equal to this
 * session's user id, that equality is not decoration — it is the statement of
 * WHY the read returned 200 rather than an empty list.
 *
 * That distinction is the whole point of #669. A read that succeeds because the
 * caller was handed `viewAllRecords` proves the permission set; a read that
 * succeeds because the caller owns the row proves the OWD baseline and the
 * write path that stamped the owner. This suite proves the second. If a future
 * change grants this account org-wide read to make a spec easier, these
 * assertions quietly start proving something weaker — so grant it nothing, and
 * have the spec create what it needs instead.
 *
 * What the suite therefore does NOT prove, and must not be read as proving:
 * that sharing rules widen anything, that a position confers reach, that a
 * profile's `viewAllRecords` works, or that the seeded demo book is visible to
 * anyone in particular. Those live in the vitest suites that can assert them
 * without a server (`test/sharing-coverage.test.ts`,
 * `test/authorization-coverage.test.ts`, `test/parent-derived-reach.test.ts`)
 * and in `pnpm demo:staff`, which verifies the three layers connect as each
 * demo user.
 *
 * ─── Why the specs create their own records (#665 → #669) ───────────────────
 *
 * They used to read the SEEDED demo book, which this account could see only
 * while those rows were owned by NOBODY: seed writes run `{ isSystem: true }`
 * and skip the insert-time `owner_id` stamp, and an ownerless private row is
 * admitted to everyone. `demo_bootstrap` then claims every ownerless row for
 * the org's first user, and from that moment the suite read zero rows and
 * blamed the seed loader.
 *
 * Which user that sweep favours is an environmental accident. Measured on
 * 17.0.0-rc.5: `objectstack start` (what CI's `webServer` runs) seeds no dev
 * admin, so this suite's own account is the first user and the sweep claims the
 * seeds FOR it — that, and only that, is why CI was green. `objectstack dev`
 * seeds `admin@objectos.ai` first, and the sweep now runs on boot rather than
 * only on the wall-clock ten-minute boundary #665 measured: a fresh `pnpm dev`
 * database had all nine seeded accounts owned by the dev admin 25 seconds after
 * boot, so a local run was failing on its FIRST attempt, not merely after ten
 * minutes.
 *
 * Creating the records under test removes the question. A row this account
 * inserts carries its `owner_id` from the platform's own stamp, no sweep ever
 * selects it (`demo_bootstrap` looks for `owner_id: null`), and `demo:staff`
 * re-evaluating every sharing rule cannot take it away. The seeds are backdrop
 * now: the suite runs against a long-lived dev server, a staffed org, or a cold
 * CI database identically.
 *
 * ─── The one thing this account cannot do: clean up ─────────────────────────
 *
 * `DELETE /api/v1/data/crm_account/:id` answers 403 for it — measured:
 * `PERMISSION_DENIED — operation 'delete' on object 'crm_account' is not
 * permitted for positions [org_member, everyone]`, and the same for
 * `crm_opportunity`. The lifecycle specs used to run a best-effort delete loop
 * in `afterEach` that had therefore never deleted anything; the loops are gone
 * rather than left looking like housekeeping.
 *
 * So records accumulate in the local database across runs. That is why every
 * name below carries a per-record unique suffix — `crm_account.name` is unique
 * per organization (#625), and a fixed name would make the second run on the
 * same database fail on a duplicate rather than on anything real. `pnpm
 * demo:reset` remains how a developer gets a clean database; nothing in the
 * suite needs one.
 */

export const test = base.extend<{ api: APIRequestContext; account: CrmRecord }>({
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

  /**
   * An account owned by the caller, created fresh for the test that asks for it.
   *
   * `crm_opportunity.crm_account` is required, so an opportunity cannot be
   * created without one — the old spec omitted it and would have failed
   * validation with a 400 even after authenticating. This used to be the FIRST
   * SEEDED account, which is what tied the suite to who owns the demo book.
   *
   * Per test rather than per file: an account this test created is one no other
   * test can have moved, and the suite runs `workers: 1, fullyParallel: false`,
   * so the extra insert costs a request and buys unambiguous ownership.
   */
  account: async ({ api }, use) => {
    await use(await createAccount(api));
  },
});

export { expect } from '@playwright/test';

/** A record as the data API returns it. */
export type CrmRecord = Record<string, unknown>;

/** Response envelopes the REST API returns for single-record writes/reads. */
interface RecordEnvelope {
  object?: string;
  id?: string;
  record?: CrmRecord;
}

/**
 * Unwrap a single-record response.
 *
 * The API answers writes with `{ object, id, record }`. The old lifecycle spec
 * read `json.data ?? json`, which yields the envelope rather than the record —
 * so `rec.probability` was `undefined` and the assertions would have passed
 * only by never running.
 */
export function recordOf(body: unknown): CrmRecord {
  const env = body as RecordEnvelope | null;
  if (env && typeof env === 'object' && env.record && typeof env.record === 'object') {
    return env.record as CrmRecord;
  }
  return (env ?? {}) as CrmRecord;
}

/** Unwrap a list response (`{ object, records }`). */
export function recordsOf(body: unknown): CrmRecord[] {
  const records = (body as { records?: unknown } | null)?.records;
  return Array.isArray(records) ? (records as CrmRecord[]) : [];
}

/**
 * The id of the user this run is signed in as.
 *
 * The value every `owner_id` assertion compares against. Absent, an ownership
 * assertion would compare `undefined` to `undefined` on a record that has no
 * owner at all and pass — so this throws rather than returning a blank.
 */
export function sessionUserId(): string {
  const id = process.env[USER_ID_ENV];
  expect(
    id,
    `no session user id on process.env.${USER_ID_ENV} — e2e/global-setup.ts did not run`,
  ).toBeTruthy();
  return id as string;
}

/**
 * A name no other record, run or developer can already be holding.
 *
 * Records survive the run (see the header: this account cannot delete), so a
 * literal name collides with itself on the second run against the same
 * database. Time gives ordering a human can read in the table; the random tail
 * covers two runs starting inside the same millisecond.
 */
export function uniqueName(prefix: string): string {
  return `${prefix} ${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Create an account owned by the caller.
 *
 * Fails loudly rather than returning something falsy: a spec that reads a
 * record it could not create is the vacuous pass this suite exists to stop.
 */
export async function createAccount(api: APIRequestContext, prefix = 'E2E Account'): Promise<CrmRecord> {
  const name = uniqueName(prefix);
  const res = await api.post('/api/v1/data/crm_account', { data: { name } });
  expect(
    res.ok(),
    `could not create the account this spec asserts on: ${res.status()} ${await res.text()}`,
  ).toBeTruthy();

  const rec = recordOf(await res.json());
  expect(rec.id, 'the account create answered 2xx without a record id').toBeTruthy();
  expect(rec.name, 'the created account came back under a different name').toBe(name);
  return rec;
}
