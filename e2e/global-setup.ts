// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { request, type FullConfig } from '@playwright/test';
import { assertSeedPrecondition } from './seed-precondition';

/**
 * One sign-in for the whole run.
 *
 * The auth plugin rate-limits `/api/v1/auth/*`, so authenticating per spec file
 * (let alone per test) trips a 429 and every downstream assertion fails for the
 * wrong reason. Playwright spawns workers *after* global setup, so the token
 * placed on `process.env` here is inherited by all of them.
 *
 * The account is created on first run and reused afterwards. It lives in the
 * disposable local database (`.objectstack/data`, rebuilt by `pnpm demo:reset`)
 * and is not a deployment credential; override with E2E_ADMIN_EMAIL /
 * E2E_ADMIN_PASSWORD when pointing the suite at a shared environment.
 */

export const TOKEN_ENV = 'E2E_SESSION_TOKEN';

const EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'e2e-admin@hotcrm.test';
const PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'e2e-Local-Only-Pw-8842';
const AUTH_BASE = '/api/v1/auth';

function tokenOf(body: unknown): string | undefined {
  const token = (body as { token?: unknown } | null)?.token;
  return typeof token === 'string' && token.length > 0 ? token : undefined;
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
    let token = signUp.ok() ? tokenOf(await signUp.json()) : undefined;

    // The auth plugin rate-limits; a 429 here is transient, so back off rather
    // than failing the whole run.
    for (let attempt = 0; !token && attempt < 5; attempt++) {
      if (attempt > 0) await sleep(2_000 * attempt);
      const signIn = await ctx.post(`${AUTH_BASE}/sign-in/email`, {
        data: { email: EMAIL, password: PASSWORD },
        failOnStatusCode: false,
      });
      if (signIn.ok()) {
        token = tokenOf(await signIn.json());
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

    if (!token) throw new Error('auth succeeded but returned no session token');
    process.env[TOKEN_ENV] = token;

    // Authentication is not the same thing as access. This account is a plain
    // org `member`, and under `sharingModel: 'private'` it reads a seeded row
    // only while that row is owned by nobody — see `./seed-precondition.ts`.
    // Checking it here turns one environmental state into one instruction,
    // instead of eleven specs failing on "no seeded accounts returned" (#665).
    await assertSeedPrecondition(ctx, token, EMAIL);
  } finally {
    await ctx.dispose();
  }
}
