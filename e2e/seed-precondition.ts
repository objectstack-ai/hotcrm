// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * The precondition the e2e suite has always depended on, now stated out loud.
 *
 * Eleven of the sixteen specs read seeded CRM rows, and whether those rows are
 * *visible* to the user the suite runs as is an environmental property nothing
 * declared (#665):
 *
 *   - `global-setup.ts` signs **up** `e2e-admin@hotcrm.test`. That account is a
 *     plain org `member`. It owns nothing and holds no sharing grant.
 *   - `crm_account`, `crm_lead`, `crm_opportunity`, `crm_case`, `crm_task`,
 *     `crm_quote` and `crm_contract` are `sharingModel: 'private'`. The OWD
 *     baseline admits a row's owner and a share can only widen from there.
 *   - Seeded rows land **ownerless** (`{ isSystem: true }` writes skip the
 *     security plugin's `owner_id` injection — see `src/data/index.ts`), and an
 *     ownerless private row is admitted to everyone. That is the state a fresh
 *     database starts in and the one every spec was written against.
 *   - `demo_bootstrap`, on its ten-minute schedule, claims every ownerless row for
 *     the first user. `pnpm demo:staff` has the same effect. From that moment
 *     the e2e user reads **zero** private rows.
 *
 * CI never reaches that state, and not by luck — measured on both paths:
 *
 *   - CI's `webServer` runs `objectstack start`, which seeds no dev admin. The
 *     account this suite signs up is therefore the org's FIRST user (`sys_user`
 *     holds exactly one row), so when the sweep runs it claims the seeds FOR
 *     the suite: every seeded account comes out carrying this account's id as
 *     `owner_id`, and the specs read them before and after the sweep alike.
 *   - `pnpm dev` seeds `admin@objectos.ai`. The first user is then that admin,
 *     the sweep claims the seeds away from this suite at the next wall-clock
 *     ten-minute boundary, and every seeded-row assertion fails from then on.
 *
 * So the failure is real, local-only, and permanent once it starts — and it
 * reported itself as a missing seed. The seed is fine; the rows are somebody
 * else's.
 *
 * This module makes that state a single, actionable failure in global setup
 * instead of eleven misleading ones spread across the run. It does **not**
 * change what the suite proves: no sharing grant, no permission set, no switch
 * to the seeded dev admin. Making the specs independent of seed ownership
 * altogether is deliberately a separate change.
 */

/**
 * The two probes, and why one is not enough.
 *
 * A single "are there accounts?" read cannot tell *seeds claimed* from *seeds
 * never loaded* — both answer zero — and those two states have opposite
 * remedies. A second read against an object whose visibility does not depend on
 * ownership separates them for one extra request:
 *
 *   - `crm_account` is `private` AND is swept by `demo_bootstrap`, so it goes
 *     to zero the moment the seeds are claimed.
 *   - `crm_product` is `public_read` AND is in no sweep (`demo_bootstrap`'s
 *     `CLAIMED_OBJECTS` covers leads, accounts, contacts, opportunities, cases,
 *     tasks, quotes and contracts — not products), so it stays visible to every
 *     authenticated member no matter who owns what.
 *
 * Both are seeded by `CrmSeedData`, so "products but no accounts" can only mean
 * the accounts are hidden, and "neither" can only mean nothing seeded at all.
 */
export const CLAIMABLE_PROBE_OBJECT = 'crm_account';
export const OWNERSHIP_BLIND_PROBE_OBJECT = 'crm_product';

/** What the two probes together say about the database under the suite. */
export type SeedVisibility =
  /** The suite can read seeded private rows — the state every spec assumes. */
  | 'visible'
  /** Seeds loaded, but the private ones are owned by somebody else. */
  | 'claimed'
  /** Nothing seeded at all — a different problem with a different remedy. */
  | 'absent';

/** Rows each probe returned for the e2e user. */
export interface SeedProbeCounts {
  claimable: number;
  ownershipBlind: number;
}

/** Read the two counts as one of the three states above. */
export function classifySeedVisibility(counts: SeedProbeCounts): SeedVisibility {
  if (counts.claimable > 0) return 'visible';
  return counts.ownershipBlind > 0 ? 'claimed' : 'absent';
}

/**
 * The message the developer actually needs, for whichever state we are in.
 *
 * Both branches name the cause before the remedy: a message that only says what
 * to type teaches nothing about why, and this failure recurs every ten minutes
 * on a long-lived dev server.
 */
export function seedPreconditionMessage(state: 'claimed' | 'absent', email: string): string {
  const shared = [
    '',
    'Remedy — run the suite the way CI does: a cold database served by `objectstack start`.',
    '',
    '    pnpm demo:reset          # rm -rf .objectstack/data && rebuild',
    '    pnpm start               # terminal 1 — NOT `pnpm dev`, see below',
    '    pnpm test:e2e            # terminal 2',
    '',
    'Why `start` and not `dev`: `objectstack dev` seeds the platform dev admin',
    '(`admin@objectos.ai`), so the org\'s FIRST user is that admin and `demo_bootstrap` claims',
    'the seeds for it, away from this suite. `objectstack start` seeds no admin, so this',
    'suite\'s own account is the first user and the sweep claims the seeds FOR it — measured:',
    'on a cold `start` database `sys_user` holds exactly one row (this account) and every',
    'seeded account carries its id as `owner_id`. That is why CI has always been green.',
    '',
    'To stay on `pnpm dev`, reset and run before the next sweep. The schedule is on wall-clock',
    'ten-minute boundaries, so that window is anywhere from seconds to ten minutes — measured:',
    'a dev server booted at :49 had every seeded account owned by the dev admin by :50. That',
    'race is what objectstack-ai/hotcrm#665 records; this guard reports it instead of letting',
    '11 specs fail on a message about a seed that loaded perfectly well.',
  ].join('\n');

  if (state === 'claimed') {
    return [
      `e2e precondition failed: the demo seed is loaded but INVISIBLE to ${email}.`,
      '',
      `\`${CLAIMABLE_PROBE_OBJECT}\` returned 0 rows while \`${OWNERSHIP_BLIND_PROBE_OBJECT}\` returned rows — so the seed`,
      'is there, and the private records are simply owned by another user. The `demo_bootstrap`',
      'scheduled flow (or `pnpm demo:staff`) claims every ownerless seeded record for the first',
      'user; under `sharingModel: \'private\'` this suite\'s account — a plain org member that owns',
      'nothing and holds no sharing grant — then reads zero of them.',
      shared,
    ].join('\n');
  }

  return [
    'e2e precondition failed: this server has no demo seed data.',
    '',
    `Neither \`${CLAIMABLE_PROBE_OBJECT}\` nor \`${OWNERSHIP_BLIND_PROBE_OBJECT}\` returned a single row for ${email}, and`,
    `\`${OWNERSHIP_BLIND_PROBE_OBJECT}\` is \`public_read\` and owned by nobody — no ownership or sharing state can`,
    'hide it. So the seed did not load, rather than having been claimed by another user.',
    'Check the server boot log for seed errors before rerunning.',
    shared,
  ].join('\n');
}

/**
 * What a seeded-row assertion should say when it fails *despite* the guard.
 *
 * The guard runs once, in global setup. `demo_bootstrap` fires every ten
 * minutes, so it can claim the seeds part-way through a run that started with
 * them readable — which leaves `smoke.spec.ts` and `seededAccountId()` reachable
 * on exactly the state the guard exists to explain. They say so themselves
 * rather than repeating "the demo seed did not load", which is the one
 * explanation this failure has never had.
 */
export const SEEDS_UNREADABLE_MID_RUN =
  'global setup verified these rows were readable, so they were not missing when the run ' +
  'started: `demo_bootstrap` most likely claimed the seeds mid-run and this account, a ' +
  'plain org member, can no longer see them (#665). Run `pnpm demo:reset` and rerun.';

/**
 * The slice of Playwright's `APIRequestContext` this module uses.
 *
 * Declared structurally rather than imported so the guard can be exercised by
 * the unit suite against a stub — the branch that must never fire on CI is
 * worth a test that does not need a browser, a server or a database.
 */
export interface SeedProbeContext {
  get(
    url: string,
    options?: { headers?: Record<string, string>; failOnStatusCode?: boolean },
  ): Promise<{
    ok(): boolean;
    status(): number;
    text(): Promise<string>;
    json(): Promise<unknown>;
  }>;
}

export interface SeedPreconditionOptions {
  /**
   * How long to keep re-probing before declaring the seeds unreadable.
   *
   * Not a nicety: `waitForQuiet` infers "the seed storm has passed" from health
   * latency, which is a proxy, not a fact. A cold CI database that is still
   * inserting when global setup reaches this point would answer zero rows and
   * be classified `absent` — a green run turned red by the guard meant to
   * protect it. Waiting converts that race into a pause. The guard can then
   * only fire in states where the suite was already going to fail: this returns
   * the instant the rows appear.
   */
  timeoutMs?: number;
  pollMs?: number;
  /** Injected so the timeout path is testable without real waiting. */
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Rows in a list response (`{ object, records }`), or `null` if not one. */
function countRecords(body: unknown): number | null {
  const records = (body as { records?: unknown } | null)?.records;
  return Array.isArray(records) ? records.length : null;
}

/** One authenticated `?limit=1` read; throws when the API itself is unhappy. */
async function probe(ctx: SeedProbeContext, objectName: string, token: string): Promise<number> {
  const res = await ctx.get(`/api/v1/data/${objectName}?limit=1`, {
    headers: { Authorization: `Bearer ${token}` },
    failOnStatusCode: false,
  });
  if (!res.ok()) {
    throw new Error(
      `e2e precondition probe failed: GET /api/v1/data/${objectName} → ${res.status()}: ${await res.text()}\n` +
        'The suite authenticated, so this is not a credentials problem — the object is ' +
        'unreadable for this user, or the server is unhealthy. Neither is a seed-data state.',
    );
  }
  const count = countRecords(await res.json());
  if (count === null) {
    throw new Error(
      `e2e precondition probe failed: GET /api/v1/data/${objectName} answered 200 without a ` +
        '`records` array. The list envelope changed shape; e2e/fixtures.ts reads the same key.',
    );
  }
  return count;
}

/**
 * Fail global setup loudly when the seeded rows this suite reads are not
 * readable by the account it signed in as.
 *
 * Returns silently in the only state the specs are written for.
 */
export async function assertSeedPrecondition(
  ctx: SeedProbeContext,
  token: string,
  email: string,
  options: SeedPreconditionOptions = {},
): Promise<void> {
  const { timeoutMs = 30_000, pollMs = 2_000, sleep = defaultSleep } = options;
  const deadline = Date.now() + timeoutMs;

  let counts: SeedProbeCounts;
  for (;;) {
    const claimable = await probe(ctx, CLAIMABLE_PROBE_OBJECT, token);
    if (claimable > 0) return;
    counts = { claimable, ownershipBlind: await probe(ctx, OWNERSHIP_BLIND_PROBE_OBJECT, token) };
    if (Date.now() >= deadline) break;
    await sleep(pollMs);
  }

  const state = classifySeedVisibility(counts);
  if (state === 'visible') return;
  throw new Error(seedPreconditionMessage(state, email));
}
