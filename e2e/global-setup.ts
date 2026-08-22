// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { request, type FullConfig } from '@playwright/test';

/**
 * One sign-in for the whole run.
 *
 * The auth plugin rate-limits `/api/v1/auth/*`, so authenticating per spec file
 * (let alone per test) trips a 429 and every downstream assertion fails for the
 * wrong reason. Playwright spawns workers *after* global setup, so the session
 * placed on `process.env` here is inherited by all of them.
 *
 * The account is created on first run and reused afterwards. It lives in the
 * disposable local database (`.objectstack/data`, rebuilt by `pnpm demo:reset`)
 * and is not a deployment credential; override with E2E_ADMIN_EMAIL /
 * E2E_ADMIN_PASSWORD when pointing the suite at a shared environment.
 *
 * ─── Why there is no seed-visibility precondition here any more (#669) ──────
 *
 * Until #669 this file ended with a guard that refused to start a run whose
 * SEEDED rows this account could not read (#665): the specs asserted on the
 * demo book, and a plain org member reads a `private` row only while it owns
 * that row or nobody does. The suite now creates every record it asserts on —
 * see `./fixtures.ts` — so which user owns the seeds no longer decides whether
 * the run is meaningful, and a guard on it would be a check on a dependency
 * that no longer exists. `e2e/seed-precondition.ts` went with it.
 *
 * What this setup still owes the specs is the session itself: a token AND the
 * id of the user it belongs to, because "the caller owns this row" is now an
 * assertion the suite makes rather than an assumption it inherits.
 */

export const TOKEN_ENV = 'E2E_SESSION_TOKEN';
/** The signed-in user's id — the value every `owner_id` assertion compares to. */
export const USER_ID_ENV = 'E2E_SESSION_USER_ID';

const EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'e2e-admin@hotcrm.test';
const PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'e2e-Local-Only-Pw-8842';
const AUTH_BASE = '/api/v1/auth';

interface Session {
  token: string;
  userId: string;
}

/**
 * The two halves of a session, taken together on purpose.
 *
 * `sign-up/email` and `sign-in/email` both answer `{ token, user: { id, … } }`.
 * A body carrying only the token would authenticate fine and then make every
 * ownership assertion compare against `undefined`, which is the vacuous-pass
 * shape this suite keeps finding in its own history — so a half-session is
 * treated as no session and the sign-in loop below retries.
 */
function sessionOf(body: unknown): Session | undefined {
  const parsed = body as { token?: unknown; user?: { id?: unknown } } | null;
  const token = parsed?.token;
  const userId = parsed?.user?.id;
  if (typeof token !== 'string' || token.length === 0) return undefined;
  if (typeof userId !== 'string' || userId.length === 0) return undefined;
  return { token, userId };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Wait until the server is not just listening, but idle enough to serve.
 *
 * Playwright's `webServer.url` probe goes green the moment `/api/v1/health`
 * answers, which on a cold database is *before* the demo seed has finished
 * loading. Seeding inserts opportunities, which fire `opportunity_approval`,
 * which saturates the event loop for tens of seconds — long enough that the
 * very first auth POST timed out. Health returning promptly on consecutive
 * polls is a good proxy for "the seed storm has passed".
 */
async function waitForQuiet(ctx: Awaited<ReturnType<typeof request.newContext>>): Promise<void> {
  const deadline = Date.now() + 180_000;
  let consecutiveFast = 0;
  while (Date.now() < deadline) {
    const started = Date.now();
    const res = await ctx.get('/api/v1/health', { failOnStatusCode: false, timeout: 30_000 })
      .catch(() => undefined);
    const elapsed = Date.now() - started;
    consecutiveFast = res?.ok() && elapsed < 1_000 ? consecutiveFast + 1 : 0;
    if (consecutiveFast >= 3) return;
    await sleep(1_000);
  }
  throw new Error('server never went quiet — the demo seed may be stuck (see webServer output)');
}

export default async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL =
    config.projects[0]?.use?.baseURL ?? process.env.HOTCRM_BASE_URL ?? 'http://localhost:4001';
  // Generous per-request timeout: this runs while the server may still be
  // finishing its first-boot work.
  const ctx = await request.newContext({ baseURL, timeout: 120_000 });

  try {
    await waitForQuiet(ctx);

    // Sign-up first; on every run after the first it legitimately rejects
    // because the account already exists, and we fall through to sign-in.
    const signUp = await ctx.post(`${AUTH_BASE}/sign-up/email`, {
      data: { email: EMAIL, password: PASSWORD, name: 'E2E Admin' },
      failOnStatusCode: false,
    });
    let session = signUp.ok() ? sessionOf(await signUp.json()) : undefined;

    // The auth plugin rate-limits; a 429 here is transient, so back off rather
    // than failing the whole run.
    for (let attempt = 0; !session && attempt < 5; attempt++) {
      if (attempt > 0) await sleep(2_000 * attempt);
      const signIn = await ctx.post(`${AUTH_BASE}/sign-in/email`, {
        data: { email: EMAIL, password: PASSWORD },
        failOnStatusCode: false,
      });
      if (signIn.ok()) {
        session = sessionOf(await signIn.json());
        continue;
      }
      if (signIn.status() !== 429 || attempt === 4) {
        throw new Error(
          `e2e sign-in failed (${signIn.status()}): ${await signIn.text()}\n` +
            'The suite authenticates for real — it no longer accepts 401 as a pass. ' +
            'If this is a shared environment, set E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD.',
        );
      }
    }

    if (!session) {
      throw new Error(
        'auth succeeded but returned no usable session — the response carried no `token`, ' +
          'or no `user.id` for the specs to assert record ownership against.',
      );
    }
    process.env[TOKEN_ENV] = session.token;
    process.env[USER_ID_ENV] = session.userId;
  } finally {
    await ctx.dispose();
  }
}
