// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.
//
// Demo-org staffing (#640) — give the demo org people, so the position-based
// mechanisms this app ships stop resolving to an empty recipient set.
//
//   pnpm dev            # terminal 1 — leave it running
//   pnpm demo:staff     # terminal 2 — once, against that server
//
// It drives a LOCAL, RUNNING dev server through the platform's own admin
// surfaces. Nothing here ships in the artifact: `objectstack.config.ts` never
// imports this file or the table it reads, which is what makes "a real
// deployment installs none of these people" structural rather than hopeful
// (see the header of `src/sales/sharing/demo-staffing.ts`).
//
// Six steps, all idempotent — rerun it any time, including against a
// half-staffed org. They start once the seed has SETTLED (#2206): a fresh
// `pnpm dev` answers sign-in well before its seed finishes writing, and every
// step below reads what the seed left. See `awaitSeedSettled`.
//
//   0. GIVE THE DEV ADMIN THE APP'S ADMIN SET (#2061): the sets
//      `DemoAdminPermissionSets` names, as `sys_user_permission_set` rows on
//      the signed-in admin. Since 18.0.0 the platform's administrator sets
//      carry no export, so without an app set the dev admin cannot export a
//      list at all (the reasons and the reading are in
//      `src/sales/sharing/demo-staffing.ts`);
//   1. create each person in `DemoOrgStaffing` via
//      POST /api/v1/auth/admin/create-user (better-auth: a REAL, loginable
//      account with a credential and a `sys_member` row — not a raw `sys_user`
//      insert, which ADR-0092's write guard refuses and which would produce an
//      un-loginable row anyway);
//   2. assign the positions they hold (`sys_user_position`);
//   3. HAND THE DEMO BOOK TO THEM (#1759). The platform's seed-ownership claim
//      hands every ownerless seeded row to the FIRST administrator — nothing
//      else can; a seed cannot name a user and the artifact must not know these
//      people — which leaves the whole book on the dev admin. Invisible over an API key (it runs as the human,
//      so `viewAllRecords` applies) and fatal over OAuth, where the agent
//      ceiling admits only what the caller OWNS or holds a share on
//      (objectstack-ai/objectstack#16549). So a demo salesperson asking their
//      agent about the pipeline got 0 opportunities and 0 tasks. This step
//      re-stamps `owner_id` per the routes in `src/sales/sharing/demo-staffing.ts`;
//      `crm_account` is deliberately NOT among them (see step 5), every row goes
//      over through the same write with every control in force — so on a large
//      open deal it opens `opportunity_approval`, submitted by the dev admin —
//      and a row a pending approval locks is held where it is (see
//      `handBookToRoster`);
//   4. RE-EVALUATE every active sharing rule. This step is not optional and is
//      the reason staffing alone was never enough: `plugin-sharing` materialises
//      grants from a record-write hook that returns early on `isSystem` writes,
//      and every seeded row is written with `isSystem: true`. So the seeded
//      accounts carry no grants no matter who holds a position, until a rule is
//      re-evaluated (boot backfill does it too — this just avoids the restart).
//      The rules are listed through `GET /api/v1/sharing/rules`: since
//      18.0.0-next.4 a rule the app declares has no `sys_sharing_rule` row, and
//      its id is its name (objectstack#23952);
//   5. VERIFY, as each demo user, that the three layers actually connect —
//      plus an OWNERSHIP CENSUS over the routed objects, which is the only
//      evidence that speaks to step 3: the reps must still OWN NO ACCOUNT (a
//      share to an owner proves nothing under a `private` OWD, so owning them
//      would delete the territory demonstration), while every routed row must
//      sit on a demo persona (held rows aside) and none of them may hold the lot. It also
//      re-reads the dev admin's resolved sets, which must name every set step 0
//      granted. Exits non-zero if any of that fails.
//
// Flags: --url (default http://localhost:4001, the port `pnpm dev` binds),
//        --admin-email / --admin-password (default the platform's dev-admin
//        seed, which only exists when NODE_ENV=development),
//        --seed-wait SECONDS (default 180): how long to wait for the seed to
//        settle before routing what is there.

import {
  CASE_DESK,
  CASE_DESK_FIELDS,
  caseDeskOf,
  DemoAdminPermissionSets,
  DemoOrgStaffing,
  DemoPipelineOwnership,
  TERRITORY_OWNER,
  type DemoOwnershipRoute,
  type DemoStaffMember,
} from '../src/sales/sharing/demo-staffing.js';
import { TERRITORY, type Territory } from '../src/sales/objects/_territory.js';
import { OpportunityApprovalFlow } from '../src/sales/flows/opportunity-approval.flow.js';
import * as salesSeeds from '../src/sales/data/index.js';
import * as serviceSeeds from '../src/service/data/index.js';

type Json = Record<string, any>;

/**
 * The routed object whose SAVE can open an approval (#2129), read off
 * `opportunity_approval`'s own start node rather than spelled again here.
 *
 * That flow fires on ANY update of an open deal at or above the large-deal
 * line that is not yet in approval, and the request it opens names the WRITER
 * as its submitter. So for this one object, the first write after the seed
 * decides who asked for the approval, and that write is step 3's hand-over:
 * the requests it opens name the dev admin (see `handBookToRoster`). The
 * closing banner reads them back.
 */
const APPROVAL_GATED_OBJECT = String(
  (OpportunityApprovalFlow.nodes.find((n) => n.type === 'start')?.config as { objectName?: unknown } | undefined)
    ?.objectName ?? '',
);

const DEFAULT_URL = 'http://localhost:4001';
/** Seconds `awaitSeedSettled` waits by default. A fresh boot measured ~40 s of seeding after sign-in first answered. */
const DEFAULT_SEED_WAIT_SECONDS = 180;
/** How often `awaitSeedSettled` re-reads the routed objects. */
const SEED_POLL_MS = 2_000;

/** `--flag value` / `--flag=value`, else the env var, else the fallback. */
function arg(name: string, envName: string, fallback: string): string {
  const argv = process.argv.slice(2);
  const eq = argv.find((a) => a.startsWith(`--${name}=`));
  if (eq) return eq.slice(name.length + 3);
  const i = argv.indexOf(`--${name}`);
  if (i !== -1 && argv[i + 1]) return argv[i + 1];
  return process.env[envName]?.trim() || fallback;
}

/**
 * Refuse anything that is not this machine.
 *
 * The staffing itself is already gated by needing dev-admin credentials, but a
 * mistyped `--url` must fail with a sentence rather than start provisioning
 * accounts somewhere real. Synthetic users in a customer org is the one
 * outcome #640 rules out unconditionally.
 */
function assertLocal(url: string): URL {
  const parsed = new URL(url);
  const loopback = ['127.0.0.1', '[::1]', '::1', '0.0.0.0'];
  if (parsed.hostname !== 'localhost' && !loopback.includes(parsed.hostname)) {
    throw new Error(
      `refusing to staff a non-local server (${parsed.hostname}). These are demo accounts with ` +
      `well-known passwords; they belong on a developer's own dev server and nowhere else. ` +
      `A real deployment staffs its own people through Setup → Users.`,
    );
  }
  // Loopback LITERALS are rewritten to `localhost`, which is not cosmetic:
  // better-auth's default trusted-origin list is `http://localhost:*`, so
  // `--url http://127.0.0.1:4001` answers every auth call with
  // `403 INVALID_ORIGIN` (measured). Same machine, one spelling.
  if (loopback.includes(parsed.hostname)) parsed.hostname = 'localhost';
  return parsed;
}

class Api {
  private cookie = '';
  constructor(private readonly base: URL) {}

  private async call(method: string, path: string, body?: Json): Promise<{ status: number; json: Json }> {
    const res = await fetch(new URL(path, this.base), {
      method,
      headers: {
        'Content-Type': 'application/json',
        // better-auth rejects a cross-origin-looking request with
        // INVALID_ORIGIN; the server's own origin is always trusted.
        Origin: this.base.origin,
        ...(this.cookie ? { Cookie: this.cookie } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const setCookie = res.headers.getSetCookie?.() ?? [];
    if (setCookie.length) {
      this.cookie = setCookie.map((c) => c.split(';')[0]).join('; ');
    }
    const text = await res.text();
    let json: Json = {};
    try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
    return { status: res.status, json };
  }

  get(path: string) { return this.call('GET', path); }
  post(path: string, body: Json = {}) { return this.call('POST', path, body); }

  /** POST, throwing with the server's own message when it is not a 2xx. */
  async postOk(path: string, body: Json = {}): Promise<Json> {
    const { status, json } = await this.post(path, body);
    if (status < 200 || status >= 300) {
      const msg = json?.error?.message ?? json?.error ?? json?.message ?? JSON.stringify(json);
      throw new Error(`POST ${path} → ${status}: ${msg}`);
    }
    return json;
  }

  /** PATCH one record, throwing with the server's own message when it is not a 2xx. */
  async patchOk(object: string, id: string, body: Json): Promise<void> {
    const { status, json } = await this.call('PATCH', `/api/v1/data/${object}/${id}`, body);
    if (status < 200 || status >= 300) {
      const msg = json?.error?.message ?? json?.error ?? json?.message ?? JSON.stringify(json);
      // Planting a record under another user is a TRANSFER, gated on
      // `allowTransfer`; a refusal here means the signed-in account is not an
      // administrator, exactly as `scripts/backfill-owner-id.ts` reports it.
      throw new Error(`PATCH ${object}/${id} → ${status}: ${msg}`);
    }
  }

  /**
   * Rows of `object` matching `filters` (the data API's own query verb).
   *
   * An empty `filters` is sent as NO `filters` key: the query door validates
   * the body against `FindDataRequestSchema`, which refuses `filters: []`
   * (`query.filters` min_items) with 400 "Invalid query request" — the same
   * shape #1999 removed from the back-fill scripts (#2029).
   * `test/backfill-query-bodies.test.ts` runs this script against that schema.
   */
  async query(object: string, filters: unknown[][], fields?: string[]): Promise<Json[]> {
    const json = await this.postOk(`/api/v1/data/${object}/query`, {
      ...(filters.length ? { filters } : {}),
      ...(fields ? { fields } : {}),
      top: 500,
    });
    return (json.records ?? []) as Json[];
  }

  /**
   * Rows of `object`, or the server's REFUSAL — for a read that may legitimately
   * be denied. `query` throws, which aborts the whole run on the first persona
   * the org has not granted the object to; that is a finding to report, not a
   * crash to die on.
   */
  async tryQuery(object: string, fields: string[]): Promise<{ rows: Json[] } | { denied: string }> {
    // No `filters` key: every row, which is what an empty filter meant (see `query`).
    const { status, json } = await this.post(`/api/v1/data/${object}/query`, { fields, top: 500 });
    if (status >= 200 && status < 300) return { rows: (json.records ?? []) as Json[] };
    const msg = json?.error?.message ?? json?.error ?? json?.message ?? JSON.stringify(json);
    return { denied: `${status} ${String(json?.code ?? '')} ${msg}`.trim() };
  }

  /** Sign in and keep the session cookie for every later call. */
  async signIn(email: string, password: string): Promise<Json> {
    this.cookie = '';
    const { status, json } = await this.post('/api/v1/auth/sign-in/email', { email, password });
    if (status !== 200 || !json?.user?.id) {
      throw new Error(
        `sign-in failed for ${email} (${status}: ${json?.message ?? json?.code ?? 'unknown'}). ` +
        `The dev admin exists only on a development server started with \`pnpm dev\` ` +
        `(the platform hard-gates that seed on NODE_ENV=development).`,
      );
    }
    return json.user as Json;
  }
}

/**
 * The natural keys the app SEEDS into each routed object, read off the seed
 * datasets themselves, never counted by hand. They are taken from the seed
 * barrels of the two packages that own every routed object (`src/sales/data`,
 * `src/service/data`) rather than from `CrmSeedData`: that roster sits in
 * `objectstack.composition.ts`, which loads the whole app, and importing it
 * made this script ~5x slower to start. `test/demo-staffing.test.ts` pins that
 * every routed object is seeded from one of the two. Only datasets keyed by one
 * field take part; every routed object's is.
 */
function seededKeysByObject(): Map<string, { field: string; keys: Set<string> }> {
  const routed = new Set(DemoPipelineOwnership.map((r) => r.object));
  const out = new Map<string, { field: string; keys: Set<string> }>();
  for (const exported of Object.values({ ...salesSeeds, ...serviceSeeds })) {
    const dataset = exported as { object?: unknown; externalId?: unknown; records?: ReadonlyArray<Json> };
    if (typeof dataset.object !== 'string' || !routed.has(dataset.object)) continue;
    if (typeof dataset.externalId !== 'string') continue;
    const entry = out.get(dataset.object) ?? { field: dataset.externalId, keys: new Set<string>() };
    for (const record of dataset.records ?? []) entry.keys.add(String(record[dataset.externalId]));
    out.set(dataset.object, entry);
  }
  return out;
}

/**
 * Wait until the seed has settled, then let staffing start (#2206).
 *
 * ### Why the run cannot start the moment sign-in answers
 *
 * Measured on 18.0.0, fresh `pnpm dev`: sign-in answered ~30 s into the boot,
 * but the seed overran the platform's inline budget and kept writing in the
 * background ("Seeds: pending — 1 source still writing" on the banner) for
 * ~40 s more — `crm_task` landed at +26 s, `crm_event` at +31 s, `crm_case` at
 * +36 s, and the platform's seed-ownership claim stamped the dev admin on all
 * of it at +39 s. A run started inside that window routed what had landed and
 * nothing else: `crm_task` and `crm_event` "routed no rows at all" (exit 1),
 * and the cases, inserted after the staffing, were round-robined onto the
 * service agent by `case_auto_assign` instead of routed. That is why this wait
 * comes BEFORE step 0, not just before the hand-over.
 *
 * ### What "settled" means here
 *
 * The platform announces settlement only over the IPC channel of a process that
 * spawned `os dev`; a script in a second terminal has no such channel and no
 * HTTP door says it. So the run reads the app's OWN fact instead: every row
 * the app seeds into a routed object is present, and each has an owner.
 * The second half is the platform's claim having run, which happens only when
 * the seed source settles — so a row still ownerless means the claim is yet to
 * come and could re-stamp a row this run is about to hand over.
 *
 * ### Bounded, never fatal on its own
 *
 * On an old box a seeded row may have been deleted or renamed, and then the
 * keys never all turn up. So the wait is bounded by `--seed-wait`, and on
 * timeout it says what is missing and goes on to route what is there; the
 * ownership census at the end still judges the outcome.
 */
async function awaitSeedSettled(api: Api, waitSeconds: number): Promise<void> {
  const seeded = seededKeysByObject();
  const deadline = Date.now() + waitSeconds * 1000;
  const started = Date.now();
  let lastLine = '';
  for (;;) {
    const lines: string[] = [];
    for (const [object, { field, keys }] of seeded) {
      const rows = await api.query(object, [], ['id', field, 'owner_id']);
      const present = rows.filter((r) => keys.has(String(r[field])));
      const ownerless = present.filter((r) => String(r.owner_id ?? '') === '').length;
      const seen = new Set(present.map((r) => String(r[field]))).size;
      if (seen < keys.size || ownerless > 0) {
        lines.push(`${object} ${seen}/${keys.size} seeded rows present${ownerless ? `, ${ownerless} not yet claimed` : ''}`);
      }
    }
    if (lines.length === 0) {
      const waited = Math.round((Date.now() - started) / 1000);
      console.log(`🌱 seed settled${waited ? ` (waited ${waited}s)` : ''}\n`);
      return;
    }
    const line = lines.join(' · ');
    if (Date.now() >= deadline) {
      console.log(
        `⚠️  seed not settled after ${waitSeconds}s: ${line}. Routing what is there; the ownership ` +
        `census below judges the outcome. (A seeded row deleted or renamed on this box looks the same.)\n`,
      );
      return;
    }
    if (line !== lastLine) console.log(`⏳ waiting for the seed to settle: ${line}`);
    lastLine = line;
    await new Promise((resolve) => setTimeout(resolve, SEED_POLL_MS));
  }
}

type StaffOutcome = {
  member: DemoStaffMember;
  userId: string;
  created: boolean;
  positionsAdded: string[];
  positionsAlready: string[];
};

/**
 * Create the person if they are not there yet; either way return their id.
 *
 * Org membership is not passed: `create-user` binds the new account to the sole
 * organization itself (`sys_member`, role `member`), which is the whole reason
 * this goes through the auth surface rather than the data API.
 */
async function ensureUser(api: Api, member: DemoStaffMember) {
  const existing = await api.query('sys_user', [['email', '=', member.email]], ['id', 'email']);
  if (existing.length > 0) return { userId: String(existing[0].id), created: false };

  const res = await api.postOk('/api/v1/auth/admin/create-user', {
    email: member.email,
    password: member.password,
    name: member.name,
    // Without this the account is stamped must-change-password and every API
    // call answers 403 PASSWORD_EXPIRED — a demo login that cannot demo.
    mustChangePassword: false,
  });
  const userId = res?.data?.user?.id;
  if (typeof userId !== 'string' || !userId) {
    throw new Error(`create-user returned no id for ${member.email}: ${JSON.stringify(res)}`);
  }
  return { userId, created: true };
}

/** Grant every position the row declares, skipping ones already held. */
async function ensurePositions(api: Api, userId: string, member: DemoStaffMember, organizationId: string | null) {
  const held = await api.query('sys_user_position', [['user_id', '=', userId]], ['id', 'position']);
  const heldNames = new Set(held.map((r) => String(r.position)));
  const added: string[] = [];
  for (const position of member.positions) {
    if (heldNames.has(position)) continue;
    await api.postOk('/api/v1/data/sys_user_position', {
      user_id: userId,
      position,
      ...(organizationId ? { organization_id: organizationId } : {}),
    });
    added.push(position);
  }
  return { added, already: member.positions.filter((p) => heldNames.has(p)) };
}

/**
 * Step 0 (#2061): grant the dev admin every set `DemoAdminPermissionSets`
 * names, skipping ones it already holds.
 *
 * The row names the set and the user, nothing else: the server stamps the
 * writer's organization on it, as it does on the platform's own admin grants.
 */
async function ensureAdminPermissionSets(api: Api, adminId: string) {
  const held = await api.query('sys_user_permission_set', [['user_id', '=', adminId]], ['id', 'permission_set']);
  const heldNames = new Set(held.map((r) => String(r.permission_set)));
  const wanted = DemoAdminPermissionSets.map((g) => g.permissionSet);
  const added: string[] = [];
  for (const permissionSet of wanted) {
    if (heldNames.has(permissionSet)) continue;
    await api.postOk('/api/v1/data/sys_user_permission_set', { user_id: adminId, permission_set: permissionSet });
    added.push(permissionSet);
  }
  return { added, already: wanted.filter((p) => heldNames.has(p)) };
}

/**
 * The dev admin's sets as the server RESOLVES them, re-read rather than taken
 * from step 0's writes: a grant row that resolves to nothing (a misspelt name,
 * a set the activation ledger switched off) is stored fine and grants nothing.
 */
async function verifyAdminSets(api: Api): Promise<string[]> {
  const { status, json } = await api.get('/api/v1/auth/me/permissions');
  if (status !== 200) return [`GET /api/v1/auth/me/permissions → ${status} for the dev admin`];
  const resolved = new Set(((json.permissionSets ?? []) as unknown[]).map(String));
  console.log(`   the dev admin resolves [${[...resolved].join(', ')}]`);
  return DemoAdminPermissionSets.filter((g) => !resolved.has(g.permissionSet)).map(
    (g) => `the dev admin's ${g.permissionSet} grant does not resolve, so this stays off: ${g.demonstrates}`,
  );
}

/**
 * Re-materialise the grants of every active rule.
 *
 * The rules come from the sharing door, `GET /api/v1/sharing/rules`, which
 * lists the rules the app declares beside any the organization authored.
 * `sys_sharing_rule` holds only the latter: since 18.0.0-next.4 plugin-sharing
 * reads a declared rule from the registry and writes no row for it, and its id
 * is its name (objectstack#23952). `POST /sharing/rules/:idOrName/evaluate` is
 * diff-based: it grants what now matches, revokes what no longer does, and is
 * safe to run repeatedly.
 */
async function evaluateRules(api: Api) {
  const { status, json } = await api.get('/api/v1/sharing/rules?activeOnly=true');
  if (status !== 200 || !Array.isArray(json.data)) {
    throw new Error(`GET /api/v1/sharing/rules → ${status}: ${JSON.stringify(json).slice(0, 300)}`);
  }
  const rules = json.data as Json[];
  const results: Array<{ name: string; matched: number; users: number; created: number; revoked: number }> = [];
  for (const rule of rules) {
    const out = await api.postOk(`/api/v1/sharing/rules/${encodeURIComponent(String(rule.id ?? rule.name))}/evaluate`);
    results.push({
      name: String(rule.name),
      matched: Number(out.matchedRecords ?? 0),
      users: Number(out.expandedUsers ?? 0),
      created: Number(out.grantsCreated ?? 0),
      revoked: Number(out.grantsRevoked ?? 0),
    });
  }
  return results;
}

/** One routed object after the re-stamp. */
type OwnershipOutcome = {
  route: DemoOwnershipRoute;
  /** rowId → the owner this run settled on: the routed one, or the one it left alone. */
  settled: Map<string, string>;
  /** rowId → the owner it keeps: rows under a PENDING APPROVAL, which no edit may reach (see below). */
  held: Map<string, string>;
  written: number;
  leftAlone: number;
};

/**
 * Hand the seeded demo book to the roster — the fix for #1759.
 *
 * ⛔ Not a mass update and not a security change. Ownership is the ONE thing
 * that moves: no profile, permission set or sharing rule is touched, because
 * the agent ceiling that produced the zeros is the platform behaving
 * correctly. A row goes to whoever owns its account's TERRITORY, and a row
 * whose account cannot be resolved goes to the manager — so each identity ends
 * up with a SUBSET, which is the demonstration. A case goes to its service
 * desk instead (`CASE_DESK`, #2206). `crm_account` is not routed at all; see
 * `DemoPipelineOwnership`.
 *
 * ### What it claims, and what it deliberately does not
 *
 * Only rows sitting on the DEV ADMIN or on nobody. Those two states are the
 * seed book: the platform's seed-ownership claim stamps the first administrator
 * onto everything it finds ownerless once the seed settles, and anything it has
 * not reached yet is still null. A row some LIVE
 * WORKFLOW has already assigned is left exactly where it is — measured on a
 * staffed box, the SLA sweep escalates cases and the escalation hook hands the
 * resulting tasks to the service manager, and re-routing those by territory
 * would overwrite the app demonstrating itself.
 *
 * ### Every row goes over with its controls on, so the dev admin submits the large deals
 *
 * The seed prices exactly two open deals over the large-deal line on purpose
 * (`Acme Platform Upgrade`, `Wayne Enterprise License`, see
 * `src/sales/data/sales.seed.ts`). A seeded row opens no approval: the seed
 * loader writes with `skipTriggers`, so a fresh box has 0
 * `sys_approval_request` rows when this runs. `opportunity_approval` then
 * fires on the FIRST later update of such a deal, whatever it changes, and
 * the request it opens names the writer as submitter. This step's PATCH is
 * that write, so each of the two requests names the dev admin as submitter,
 * waits on the sales manager at `manager_review`, and locks the deal.
 *
 * Until 18.0.0-next.3 these deals went over through the import door with
 * `runAutomations: false`, and each new owner then saved their deal, so the
 * request named the rep (#2129). Since 18.0.0-next.4 the import door refuses
 * that opt-out to every caller but the system principal, administrators
 * included (objectstack#24348). A recall does not restore the old outcome
 * either. Measured on 18.0.0-next.5: after the dev admin recalls the request
 * the hand-over opened, the deal is unlocked, but its `approval_status` reads
 * `recalled`, and `opportunity_approval` enters only from `not_required`, so
 * the rep's next save opens nothing. The rep cannot take the deal themselves:
 * before the hand-off they cannot read it (`crm_opportunity` is `private`, no
 * rule shares it with a rep), and reps hold no `allowTransfer`.
 *
 * A row under a PENDING APPROVAL is left where it is, and reported as held
 * rather than routed (#2029). On a rerun before the request is decided, the
 * approval node's `lockRecord: true` makes the platform refuse every edit to
 * the record, the dev admin's ownership write included (409, "locked while an
 * approval is in progress"). Decide the approval and run the script again to
 * hand the row over.
 *
 * That also makes the run idempotent and order-independent: correct whether
 * that claim has already run or has not run yet, and a
 * second pass over a converged org writes nothing.
 */
async function handBookToRoster(
  api: Api,
  userIdByKey: Map<string, string>,
  adminId: string,
): Promise<OwnershipOutcome[]> {
  // The account hook stores a declared `territory` (never a country string —
  // `src/sales/objects/_territory.ts`), so this reads the same value the sharing
  // rules match on rather than re-deriving one.
  const accountRows = await api.query('crm_account', [], ['id', 'territory']);
  const territoryOf = new Map(accountRows.map((a) => [String(a.id), String(a.territory ?? '')]));

  /** The user id of a demo staff `key`, which every route ends on. */
  const staffKeyFor = (key: string): string => {
    const userId = userIdByKey.get(key);
    if (!userId) throw new Error(`ownership routing names demo staff key "${key}", who is not in DemoOrgStaffing`);
    return userId;
  };
  const ownerFor = (territory: string | undefined): string =>
    staffKeyFor(TERRITORY_OWNER[(territory ?? '') as Territory] ?? TERRITORY_OWNER[TERRITORY.OTHER]);

  // The records a pending approval holds, as `object:id` (see the note above).
  const pending = await api.query('sys_approval_request', [['status', '=', 'pending']], ['object_name', 'record_id']);
  const underApproval = new Set(pending.map((r) => `${String(r.object_name)}:${String(r.record_id)}`));

  const outcomes: OwnershipOutcome[] = [];
  for (const route of DemoPipelineOwnership) {
    const fields = [
      'id',
      'owner_id',
      ...(route.by === 'territory' ? (route.accountField ? [route.accountField] : []) : CASE_DESK_FIELDS),
    ];
    const rows = await api.query(route.object, [], fields);
    const settled = new Map<string, string>();
    const held = new Map<string, string>();
    let written = 0;
    let leftAlone = 0;
    for (const row of rows) {
      const id = String(row.id);
      const current = String(row.owner_id ?? '');
      if (current !== '' && current !== adminId) {
        settled.set(id, current);
        leftAlone++;
        continue;
      }
      if (underApproval.has(`${route.object}:${id}`)) {
        held.set(id, current);
        continue;
      }
      let wanted: string;
      if (route.by === 'territory') {
        const accountId = route.accountField ? row[route.accountField] : undefined;
        wanted = ownerFor(accountId ? territoryOf.get(String(accountId)) : undefined);
      } else {
        wanted = staffKeyFor(CASE_DESK[caseDeskOf(row)]);
      }
      settled.set(id, wanted);
      await api.patchOk(route.object, id, { owner_id: wanted });
      written++;
    }
    outcomes.push({ route, settled, held, written, leftAlone });
  }
  return outcomes;
}

/**
 * The PENDING approval requests on {@link APPROVAL_GATED_OBJECT}, re-read from
 * the server for the closing banner: this run's (step 3's hand-over opened
 * them) and an earlier run's alike. Nothing here approves or rejects one.
 */
async function readPendingApprovals(api: Api): Promise<Json[]> {
  return api.query(
    'sys_approval_request',
    [['status', '=', 'pending'], ['object_name', '=', APPROVAL_GATED_OBJECT]],
    ['id', 'object_name', 'record_id', 'submitter_id', 'pending_approvers', 'current_step'],
  );
}

/**
 * The ownership census — the evidence #1759 actually turns on.
 *
 * ⚠️ It counts rows each identity OWNS, and that is deliberate rather than
 * lazy. Signing in and listing would measure the HUMAN path, where
 * `viewAllRecords` applies and the sales manager reads all 23 opportunities
 * whether or not this script ever ran — the exact reading that hid the defect
 * for months. The agent ceiling admits what the caller owns or holds a share
 * on, so ownership is what moved and ownership is what is counted.
 *
 * Re-READ from the server rather than reported from the plan: a census printed
 * off the intent would stay green through a PATCH that silently did nothing.
 * It judges only the rows this run settled, by id. Rows that APPEAR while it
 * runs — the scheduled sweeps do create some — are reported on their own line
 * and never counted as a disagreement, because a census that failed on the app
 * doing its job would be a broken instrument, not a finding. Rows held by a
 * pending approval (`held`) are counted on their own column for the same
 * reason: the approval is the app doing its job.
 */
async function ownershipCensus(
  api: Api,
  outcomes: OwnershipOutcome[],
  roster: ReadonlyArray<{ userId: string; email: string }>,
  adminId: string,
): Promise<string[]> {
  const failures: string[] = [];
  const nameOf = (userId: string) =>
    roster.find((r) => r.userId === userId)?.email ?? (userId === adminId ? 'the dev admin' : userId);
  const w = 16;
  const ownedOverall = new Map<string, number>();
  let grandTotal = 0;

  console.log(
    `   ${'object'.padEnd(18)}${'routed'.padStart(7)}` +
    `${roster.map((r) => r.email.split('@')[0].padStart(w)).join('')}` +
    `${'dev admin'.padStart(w)}${'nobody'.padStart(8)}${'held'.padStart(6)}${'new'.padStart(6)}`,
  );

  for (const { route, settled, held } of outcomes) {
    const rows = await api.query(route.object, [], ['id', 'owner_id']);
    const ownerById = new Map(rows.map((r) => [String(r.id), String(r.owner_id ?? '')]));
    const observed = new Map<string, number>();
    const wrong: string[] = [];
    for (const [id, wanted] of settled) {
      const got = ownerById.get(id);
      if (got === undefined) {
        wrong.push(`${id} is gone from ${route.object}`);
        continue;
      }
      observed.set(got, (observed.get(got) ?? 0) + 1);
      ownedOverall.set(got, (ownedOverall.get(got) ?? 0) + 1);
      grandTotal++;
      if (got !== wanted) wrong.push(`${id}: expected ${nameOf(wanted)}, found ${nameOf(got)}`);
    }
    const admin = observed.get(adminId) ?? 0;
    const ownerless = observed.get('') ?? 0;

    console.log(
      `   ${route.object.padEnd(18)}${String(settled.size).padStart(7)}` +
      `${roster.map((r) => String(observed.get(r.userId) ?? 0).padStart(w)).join('')}` +
      `${String(admin).padStart(w)}${String(ownerless).padStart(8)}${String(held.size).padStart(6)}` +
      `${String(rows.filter((r) => !settled.has(String(r.id)) && !held.has(String(r.id))).length).padStart(6)}`,
    );

    // Guard the guard: an object with no routed rows balances trivially and
    // proves nothing, so its clean-looking line above is not a pass.
    if (settled.size === 0) {
      failures.push(`${route.object} routed no rows at all — its line above is vacuous, not clean`);
      continue;
    }
    if (wrong.length > 0) {
      failures.push(
        `${route.object}: ${wrong.length} row(s) did not land where they were sent — a PATCH ` +
        `reported success and changed nothing, or something re-claimed them. ${wrong.slice(0, 5).join('; ')}`,
      );
    }
    if (admin > 0) {
      failures.push(
        `${route.object}: the dev admin still owns ${admin} routed row(s), so a demo salesperson's ` +
        `agent session still cannot see them (#1759).`,
      );
    }
    if (ownerless > 0) {
      failures.push(
        `${route.object}: ${ownerless} routed row(s) are owned by NOBODY — under a private OWD such ` +
        `a row is editable by no one at all, admin included.`,
      );
    }
  }

  // The routed book must be SPLIT. Handing every row to one demo user would
  // replace "sees 0" with "sees all" and lose the demonstration that row-level
  // security is on at all.
  const holders = roster.filter((r) => (ownedOverall.get(r.userId) ?? 0) > 0);
  if (holders.length < 2) {
    failures.push(
      `the whole routed book sits on ${holders.length} identity — the identity-switch demo needs a ` +
      `SUBSET per person, not everything on one desk`,
    );
  }
  for (const holder of holders) {
    if ((ownedOverall.get(holder.userId) ?? 0) === grandTotal) {
      failures.push(`${holder.email} owns every routed row (${grandTotal}) — that is "sees all", not a subset`);
    }
  }
  return failures;
}

/**
 * The point of the whole exercise, asserted rather than assumed: each demo user
 * signs in and reads the accounts, and none of them may OWN what they were
 * granted (a share to the owner proves nothing — the OWD baseline already
 * admits them).
 */
async function verify(base: URL, outcomes: StaffOutcome[], adminAccounts: Json[]): Promise<string[]> {
  const failures: string[] = [];
  // Report the TERRITORY, which is what the rules actually match since #639,
  // with the country it was classified from beside it — a diagnostic that named
  // only the country would stay plausible while the classification was broken.
  const territoryOf = (name: string) => {
    const account = adminAccounts.find((a) => a.name === name);
    return `${String(account?.territory ?? '??')}/${String(account?.billing_country ?? '??')}`;
  };

  for (const { member, userId } of outcomes) {
    const asUser = new Api(base);
    await asUser.signIn(member.email, member.password);
    const read = await asUser.tryQuery('crm_account', ['id', 'name', 'territory', 'billing_country', 'owner_id']);
    if ('denied' in read) {
      // Reported, not thrown. A persona the org opens no CRM object to is a real
      // defect in the staffing — and dying here would take the ownership census
      // below down with it, which is the one reading that speaks to #1759.
      failures.push(
        `${member.email} cannot read crm_account AT ALL (${read.denied}). Their positions bind no ` +
        `permission set that grants the object, and the additive member baseline does not open it ` +
        `either — so this demo persona sees an empty app, whatever is shared with them.`,
      );
      continue;
    }
    const rows = read.rows;
    const names = rows.map((r) => String(r.name)).sort();
    const territories = [...new Set(names.map(territoryOf))].sort();
    console.log(`   ${member.email} sees ${rows.length} account(s): ${names.join(', ') || '—'}`);
    console.log(`     territory/country: [${territories.join(', ')}]`);

    const owned = rows.filter((r) => String(r.owner_id ?? '') === userId).map((r) => String(r.name));
    if (owned.length > 0) {
      failures.push(
        `${member.email} OWNS ${owned.join(', ')} — a share to a record's owner demonstrates ` +
        `nothing, because the private OWD baseline already admits the owner. Ownership belongs ` +
        `to the seed-ownership claim's first administrator; staffing must not move it.`,
      );
    }
    if (member.positions.includes('na_sales_team') || member.positions.includes('eu_sales_team')) {
      if (rows.length === 0) {
        failures.push(
          `${member.email} holds a territory position but reads no account at all — the rule ` +
          `matched nothing, or no grant was materialised for it.`,
        );
      }
      // Checked against the TERRITORY the rules match, read straight off the
      // rows. This used to hold its own copy of the country lists — an eighth
      // place the mapping was written down, in a script nobody re-reads when a
      // country is added (#639). There is no list here now: the recipient's
      // position names one territory value, and every row they can read must
      // carry it.
      const wanted = member.positions.includes('na_sales_team') ? 'na' : 'emea';
      const strays = rows
        .filter((r) => String(r.territory ?? '') !== wanted)
        .map((r) => `${String(r.name)}: ${String(r.territory ?? 'none')}`);
      if (strays.length > 0) {
        failures.push(
          `${member.email} reads accounts outside their ${wanted} territory (${strays.join(', ')}) ` +
          `— a match-all regression looks exactly like this.`,
        );
      }
    }
  }
  return failures;
}

async function main(): Promise<number> {
  const base = assertLocal(arg('url', 'OS_DEMO_URL', DEFAULT_URL));
  if (!APPROVAL_GATED_OBJECT) {
    throw new Error(
      "opportunity_approval's start node names no objectName, so the closing banner cannot tell which " +
      'approval requests the hand-over opened (#2129).',
    );
  }
  const adminEmail = arg('admin-email', 'OS_SEED_ADMIN_EMAIL', 'admin@objectos.ai');
  const adminPassword = arg('admin-password', 'OS_SEED_ADMIN_PASSWORD', 'admin123');

  console.log(`\n── Demo-org staffing · ${base.origin} ──\n`);
  const api = new Api(base);
  const admin = await api.signIn(adminEmail, adminPassword);
  console.log(`👤 signed in as ${admin.email}`);

  // The org every member belongs to — read off the admin's own membership so a
  // single-org demo box needs no configuration.
  const membership = await api.query('sys_member', [['user_id', '=', String(admin.id)]], ['organization_id']);
  const organizationId = membership[0]?.organization_id ? String(membership[0].organization_id) : null;
  console.log(`🏢 organization: ${organizationId ?? '(none — single-tenant boot)'}\n`);

  await awaitSeedSettled(api, Number(arg('seed-wait', 'OS_DEMO_SEED_WAIT', String(DEFAULT_SEED_WAIT_SECONDS))));

  const adminSets = await ensureAdminPermissionSets(api, String(admin.id));
  console.log(
    `${adminSets.added.length ? '➕' : '✓ '} ${'the dev admin'.padEnd(26)} ` +
    `${adminSets.added.length ? `+[${adminSets.added.join(', ')}]` : ''}` +
    `${adminSets.already.length ? ` (already: ${adminSets.already.join(', ')})` : ''}`,
  );

  const outcomes: StaffOutcome[] = [];
  for (const member of DemoOrgStaffing) {
    const { userId, created } = await ensureUser(api, member);
    const { added, already } = await ensurePositions(api, userId, member, organizationId);
    outcomes.push({ member, userId, created, positionsAdded: added, positionsAlready: already });
    console.log(
      `${created ? '➕' : '✓ '} ${member.email.padEnd(26)} ` +
      `${added.length ? `+[${added.join(', ')}]` : ''}${already.length ? ` (already: ${already.join(', ')})` : ''}`,
    );
  }

  // Ownership BEFORE rule evaluation, so the evaluator reconciles against the
  // final owner rather than one this run is about to move.
  console.log('\n── Handing the demo book to the roster (#1759) ──');
  const ownership = await handBookToRoster(
    api,
    new Map(outcomes.map((o) => [o.member.key, o.userId])),
    String(admin.id),
  );
  for (const o of ownership) {
    console.log(
      `   ${o.route.object.padEnd(18)} re-stamped ${String(o.written).padStart(3)}, left ` +
      `${String(o.leftAlone).padStart(3)} with a live owner` +
      `${o.held.size ? `, held ${o.held.size} under a pending approval` : ''} — ${o.route.why}`,
    );
  }
  const heldTotal = ownership.reduce((n, o) => n + o.held.size, 0);
  if (heldTotal > 0) {
    console.log(
      `   ↳ ${heldTotal} row(s) stay with their current owner: a pending approval locks each one ` +
      `against every edit, ownership included. Decide the approval, then run demo:staff again.`,
    );
  }

  console.log('\n── Re-evaluating sharing rules ──');
  for (const r of await evaluateRules(api)) {
    console.log(
      `   ${r.name.padEnd(30)} matched=${String(r.matched).padStart(3)}  ` +
      `holders=${r.users}  granted=${r.created}  revoked=${r.revoked}`,
    );
  }

  // What the hand-over opened (#2129): re-read, never inferred from the writes.
  console.log(`\n── Pending ${APPROVAL_GATED_OBJECT} approval requests ──`);
  const waiting = await readPendingApprovals(api);
  const emailOf = (userId: string) =>
    outcomes.find((o) => o.userId === userId)?.member.email ?? (userId === String(admin.id) ? 'the dev admin' : userId);
  const approversOf = (r: Json) => String(r.pending_approvers ?? '').split(',').map((x) => x.trim()).filter(Boolean);
  for (const r of waiting) {
    console.log(
      `   ${String(r.record_id)}  ${String(r.current_step ?? '')}  submitter=${emailOf(String(r.submitter_id ?? ''))}  ` +
      `waiting on=[${approversOf(r).map(emailOf).join(', ')}]`,
    );
  }
  if (waiting.length === 0) console.log('   none');

  const shares = await api.query('sys_record_share', [['source', '=', 'rule']], ['id']);
  const accounts = await api.query('crm_account', [], ['name', 'territory', 'billing_country']);
  console.log(`\n── Verifying (sys_record_share: ${shares.length} rule-materialised grants) ──`);
  const failures = await verify(base, outcomes, accounts);
  failures.push(...(await verifyAdminSets(api)));

  // The reading #1759 turns on: what each identity OWNS, which is what an agent
  // session can reach. Printed whether or not it passes — a census nobody can
  // read is not evidence.
  console.log('\n── Ownership census (rows each identity owns = the agent-visible floor) ──');
  failures.push(
    ...(await ownershipCensus(
      api,
      ownership,
      outcomes.map((o) => ({ userId: o.userId, email: o.member.email })),
      String(admin.id),
    )),
  );

  if (failures.length > 0) {
    console.log('\n🔴 staffing did not connect:');
    for (const f of failures) console.log(`   · ${f}`);
    return 1;
  }
  // The banner names the accounts but never their passwords. Nothing is hidden
  // by that — the passwords are declared in `src/sales/sharing/demo-staffing.ts`, one
  // file away — but a run's stdout ends up in terminals, CI logs and pasted
  // snippets, and "echo the credential you just used" is the one shape this
  // reference app should not be teaching. (CodeQL says the same thing:
  // js/clear-text-logging of sensitive information.)
  const manager = DemoOrgStaffing.find((m) => m.positions.includes('sales_manager'))?.email;
  const listOf = (ids: string[]) => [...new Set(ids)].map(emailOf).join(' · ') || 'nobody';
  console.log(
    `\n🎉 demo org staffed. Sign in as any of: ` +
    `${DemoOrgStaffing.map((m) => m.email).join(' · ')}\n` +
    `   Passwords are declared in src/sales/sharing/demo-staffing.ts.\n` +
    (waiting.length
      ? `   ${waiting.length} ${APPROVAL_GATED_OBJECT} approval request(s) pending, submitted by ` +
        `${listOf(waiting.map((r) => String(r.submitter_id ?? '')))}, in the Approvals inbox of ` +
        `${listOf(waiting.flatMap(approversOf))}.\n`
      : `   Save an open opportunity of $100K or more as its owner to see manager_review route to ${manager}.\n`),
  );
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((err: unknown) => {
    console.error(`\n🔴 ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  });
