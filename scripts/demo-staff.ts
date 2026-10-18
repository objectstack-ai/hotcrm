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
// half-staffed org:
//
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
//      `crm_account` is deliberately NOT among them (see step 6), the deals go
//      over through a door that fires no automation, and a row a pending
//      approval locks is held where it is (see `handBookToRoster`);
//   4. RE-EVALUATE every active sharing rule. This step is not optional and is
//      the reason staffing alone was never enough: `plugin-sharing` materialises
//      grants from a record-write hook that returns early on `isSystem` writes,
//      and every seeded row is written with `isSystem: true`. So the seeded
//      accounts carry no grants no matter who holds a position, until a rule is
//      re-evaluated (boot backfill does it too — this just avoids the restart);
//   5. LET EACH OWNER SAVE THE DEALS HANDED TO THEM (#2129). Signed in as
//      themselves, each demo person saves every deal step 3 gave them. That
//      save is the first write the platform sees on the deal, so whatever it
//      sets off runs as the owner: on an open deal at or above the large-deal
//      line it opens `opportunity_approval`, with the REP as submitter and
//      the sales manager as approver (see `ownersSave`);
//   6. VERIFY, as each demo user, that the three layers actually connect —
//      plus an OWNERSHIP CENSUS over the routed objects, which is the only
//      evidence that speaks to step 3: the reps must still OWN NO ACCOUNT (a
//      share to an owner proves nothing under a `private` OWD, so owning them
//      would delete the territory demonstration), while every routed row must
//      sit on a demo persona (held rows aside) and none of them may hold the lot. Exits non-zero
//      if any of that fails.
//
// Flags: --url (default http://localhost:4001, the port `pnpm dev` binds),
//        --admin-email / --admin-password (default the platform's dev-admin
//        seed, which only exists when NODE_ENV=development).

import {
  DemoOrgStaffing,
  DemoPipelineOwnership,
  TERRITORY_OWNER,
  type DemoOwnershipRoute,
  type DemoStaffMember,
} from '../src/sales/sharing/demo-staffing.js';
import { TERRITORY, type Territory } from '../src/sales/objects/_territory.js';
import { OpportunityApprovalFlow } from '../src/sales/flows/opportunity-approval.flow.js';

type Json = Record<string, any>;

/**
 * The routed object whose SAVE can open an approval (#2129), read off
 * `opportunity_approval`'s own start node rather than spelled again here.
 *
 * That flow fires on ANY update of an open deal at or above the large-deal
 * line that is not yet in approval, and the request it opens names the WRITER
 * as its submitter. So for this one object, who makes the first write after
 * the seed decides who asked for the approval. Step 3 hands these rows over
 * through a door that fires nothing, and step 5 has their new owner save them.
 */
const APPROVAL_GATED_OBJECT = String(
  (OpportunityApprovalFlow.nodes.find((n) => n.type === 'start')?.config as { objectName?: unknown } | undefined)
    ?.objectName ?? '',
);

const DEFAULT_URL = 'http://localhost:4001';

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
   * Re-stamp `owner_id` on rows of `object` through the platform's import door,
   * with "run automations" OFF — the write that fires no record-change flow
   * and no metadata-bound hook (`runAutomations: false` is the import's own
   * opt-out; the engine carries it as `skipAutomations`, which implies
   * `skipTriggers`). Still a transfer, still gated on `allowTransfer` like the
   * PATCH above. Throws unless every row reports `updated`.
   */
  async importOwners(object: string, rows: Array<{ id: string; owner_id: string }>): Promise<void> {
    const json = await this.postOk(`/api/v1/data/${object}/import`, {
      format: 'json',
      writeMode: 'update',
      matchFields: ['id'],
      runAutomations: false,
      rows,
    });
    const bad = ((json.results ?? []) as Json[]).filter((r) => r?.ok !== true || r?.action !== 'updated');
    if (Number(json.updated ?? -1) !== rows.length || bad.length > 0) {
      throw new Error(
        `import of ${rows.length} ${object} owner(s) updated ${String(json.updated)}: ` +
        `${JSON.stringify(bad.slice(0, 5))}`,
      );
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
 * Re-materialise the grants of every active rule.
 *
 * `POST /sharing/rules/:id/evaluate` is diff-based: it grants what now matches,
 * revokes what no longer does, and is safe to run repeatedly.
 */
async function evaluateRules(api: Api) {
  const rules = await api.query('sys_sharing_rule', [['active', '=', true]], ['id', 'name']);
  const results: Array<{ name: string; matched: number; users: number; created: number; revoked: number }> = [];
  for (const rule of rules) {
    const out = await api.postOk(`/api/v1/sharing/rules/${rule.id}/evaluate`);
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
  /** rowId → the new owner, for rows handed over without automations: step 5 has that owner save each one. */
  toSave: Map<string, string>;
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
 * up with a SUBSET, which is the demonstration. `crm_account` is not routed at
 * all; see `DemoPipelineOwnership`.
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
 * ### The deals go over WITHOUT automations, so their owner submits (#2129)
 *
 * The seed prices exactly two open deals over the large-deal line on purpose
 * (`Acme Platform Upgrade`, `Wayne Enterprise License`, see
 * `src/sales/data/sales.seed.ts`). A seeded row opens no approval: the seed
 * loader writes with `skipTriggers`, so a fresh box has 0
 * `sys_approval_request` rows when this runs. `opportunity_approval` then
 * fires on the FIRST later update of such a deal, whatever it changes, and
 * the request it opens names the writer as submitter. Measured on a fresh
 * `pnpm dev` box at 18.0.0-next.3: when this step PATCHed `owner_id` as the
 * dev admin, that PATCH was the write, so both requests named the dev admin
 * as submitter.
 *
 * So rows of {@link APPROVAL_GATED_OBJECT} go over through `importOwners`,
 * with automations off: same transfer and same `allowTransfer` gate, but no
 * flow fires (measured: 0 requests after it). Their new owner saves them in
 * step 5 (`ownersSave`), and that save opens the request. The rep cannot take
 * the deal themselves instead: before the hand-off they cannot even read it
 * (`crm_opportunity` is `private`, no rule shares it with a rep, so GET and
 * PATCH both answer 404), and reps hold no `allowTransfer`. The other routed
 * objects keep the plain PATCH: no flow on them opens anything on such a write.
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

  const ownerFor = (territory: string | undefined): string => {
    const key = TERRITORY_OWNER[(territory ?? '') as Territory] ?? TERRITORY_OWNER[TERRITORY.OTHER];
    const userId = userIdByKey.get(key);
    if (!userId) {
      throw new Error(`ownership routing names demo staff key "${key}", who is not in DemoOrgStaffing`);
    }
    return userId;
  };

  // The records a pending approval holds, as `object:id` (see the note above).
  const pending = await api.query('sys_approval_request', [['status', '=', 'pending']], ['object_name', 'record_id']);
  const underApproval = new Set(pending.map((r) => `${String(r.object_name)}:${String(r.record_id)}`));

  const outcomes: OwnershipOutcome[] = [];
  for (const route of DemoPipelineOwnership) {
    const fields = ['id', 'owner_id', ...(route.accountField ? [route.accountField] : [])];
    const rows = await api.query(route.object, [], fields);
    const settled = new Map<string, string>();
    const held = new Map<string, string>();
    const toSave = new Map<string, string>();
    const gated = route.object === APPROVAL_GATED_OBJECT;
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
      const accountId = route.accountField ? row[route.accountField] : undefined;
      const wanted = ownerFor(accountId ? territoryOf.get(String(accountId)) : undefined);
      settled.set(id, wanted);
      if (gated) {
        toSave.set(id, wanted);
        continue;
      }
      await api.patchOk(route.object, id, { owner_id: wanted });
      written++;
    }
    if (toSave.size > 0) {
      await api.importOwners(route.object, [...toSave].map(([id, owner_id]) => ({ id, owner_id })));
      written += toSave.size;
    }
    outcomes.push({ route, settled, held, toSave, written, leftAlone });
  }
  return outcomes;
}

/** One deal step 5 saved, and the approval request on it afterwards (if its save opened one). */
type SaveOutcome = {
  object: string;
  rowId: string;
  ownerId: string;
  request?: { id: string; submitterId: string; pendingApprovers: string[]; step: string };
};

/**
 * Step 5 — each demo person, signed in as themselves, saves the deals step 3
 * handed them (#2129).
 *
 * The save echoes the person's own `owner_id` back, which is what a record
 * form's save sends and which the platform does not treat as a transfer (see
 * the `allowTransfer` note in `src/sales/profiles/index.ts`), so a rep needs
 * no grant beyond owning the row. It changes no business field: no deal is
 * re-priced or re-staged. Being the first write after the seed, it fires every
 * record-change flow on the deal as the OWNER. Which flows actually open
 * anything is decided by their own start conditions, not by this script: on
 * the two open deals over the large-deal line `opportunity_approval` opens
 * `manager_review`, submitted by the rep, waiting on the sales manager.
 * Nothing here approves or rejects a request.
 *
 * A refused save is reported, not thrown, like a persona `verify()` cannot
 * read: the census still runs. A run that dies between step 3 and this step
 * leaves the deal with its owner and no request; that owner's next save of
 * the deal, here or in the Console, opens it.
 */
async function ownersSave(
  base: URL,
  staff: StaffOutcome[],
  ownership: OwnershipOutcome[],
): Promise<{ saved: SaveOutcome[]; failures: string[] }> {
  const failures: string[] = [];
  const saved: SaveOutcome[] = [];
  for (const { member, userId } of staff) {
    const mine = ownership.flatMap((o) =>
      [...o.toSave].filter(([, owner]) => owner === userId).map(([rowId]) => ({ object: o.route.object, rowId })),
    );
    if (mine.length === 0) continue;
    const asOwner = new Api(base);
    await asOwner.signIn(member.email, member.password);
    for (const { object, rowId } of mine) {
      try {
        await asOwner.patchOk(object, rowId, { owner_id: userId });
        saved.push({ object, rowId, ownerId: userId });
      } catch (err) {
        failures.push(
          `${member.email} could not save the ${object} row ${rowId} they were handed ` +
          `(${err instanceof Error ? err.message : String(err)}), so nothing it would open runs as them.`,
        );
      }
    }
  }
  return { saved, failures };
}

/**
 * Read back the PENDING approval requests on {@link APPROVAL_GATED_OBJECT}, and
 * judge the one thing step 5 exists for: every request on a deal its owner
 * saved names that owner as its submitter. Re-read from the server, never
 * inferred from the saves (#2129). Every pending request is returned, this
 * run's and an earlier run's alike, so the closing banner reports what waits.
 */
async function readSubmissions(
  api: Api,
  saved: SaveOutcome[],
): Promise<{ pending: Json[]; failures: string[] }> {
  const failures: string[] = [];
  const pending = await api.query(
    'sys_approval_request',
    [['status', '=', 'pending'], ['object_name', '=', APPROVAL_GATED_OBJECT]],
    ['id', 'object_name', 'record_id', 'submitter_id', 'pending_approvers', 'current_step'],
  );
  for (const s of saved) {
    const r = pending.find((q) => String(q.object_name) === s.object && String(q.record_id) === s.rowId);
    if (!r) continue;
    s.request = {
      id: String(r.id),
      submitterId: String(r.submitter_id ?? ''),
      pendingApprovers: String(r.pending_approvers ?? '').split(',').map((x) => x.trim()).filter(Boolean),
      step: String(r.current_step ?? ''),
    };
    if (s.request.submitterId !== s.ownerId) {
      failures.push(
        `${s.object} ${s.rowId}: its approval request ${s.request.id} names ${s.request.submitterId || 'nobody'} ` +
        `as submitter, not the owner who saved it — the hand-off opened it, not the rep (#2129).`,
      );
    }
  }
  return { pending, failures };
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
      "opportunity_approval's start node names no objectName, so step 3 cannot tell which deals to hand over " +
      'without automations, and the dev admin would submit their approvals (#2129).',
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
      `   ${o.route.object.padEnd(18)} re-stamped ${String(o.written).padStart(3)}` +
      `${o.toSave.size ? ' (import, automations off)' : ''}, left ` +
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

  // Step 5, after the org is fully set up: the owners make the first write on
  // the deals they were handed, so what that write opens is theirs (#2129).
  console.log('\n── Owners saving the deals handed to them (#2129) ──');
  const saves = await ownersSave(base, outcomes, ownership);
  const submissions = await readSubmissions(api, saves.saved);
  const emailOf = (userId: string) =>
    outcomes.find((o) => o.userId === userId)?.member.email ?? (userId === String(admin.id) ? 'the dev admin' : userId);
  const submitted = saves.saved.filter((s) => s.request);
  console.log(
    `   ${saves.saved.length} saved, ${submitted.length} of those saves opened an approval request` +
    `${saves.failures.length ? `, ${saves.failures.length} refused` : ''}`,
  );
  for (const s of submitted) {
    console.log(
      `   ${s.object} ${s.rowId}  ${s.request!.step}  submitter=${emailOf(s.request!.submitterId)}  ` +
      `waiting on=[${s.request!.pendingApprovers.map(emailOf).join(', ')}]`,
    );
  }

  const shares = await api.query('sys_record_share', [['source', '=', 'rule']], ['id']);
  const accounts = await api.query('crm_account', [], ['name', 'territory', 'billing_country']);
  console.log(`\n── Verifying (sys_record_share: ${shares.length} rule-materialised grants) ──`);
  const failures = [...saves.failures, ...submissions.failures, ...(await verify(base, outcomes, accounts))];

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
  const waiting = submissions.pending;
  const listOf = (ids: string[]) => [...new Set(ids)].map(emailOf).join(' · ') || 'nobody';
  console.log(
    `\n🎉 demo org staffed. Sign in as any of: ` +
    `${DemoOrgStaffing.map((m) => m.email).join(' · ')}\n` +
    `   Passwords are declared in src/sales/sharing/demo-staffing.ts.\n` +
    (waiting.length
      ? `   ${waiting.length} ${APPROVAL_GATED_OBJECT} approval request(s) pending, submitted by ` +
        `${listOf(waiting.map((r) => String(r.submitter_id ?? '')))}, in the Approvals inbox of ` +
        `${listOf(waiting.flatMap((r) => String(r.pending_approvers ?? '').split(',').map((x) => x.trim()).filter(Boolean)))}.\n`
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
