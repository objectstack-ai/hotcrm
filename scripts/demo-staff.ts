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
// (see the header of `src/sharing/demo-staffing.ts`).
//
// Four steps, all idempotent — rerun it any time, including against a
// half-staffed org:
//
//   1. create each person in `DemoOrgStaffing` via
//      POST /api/v1/auth/admin/create-user (better-auth: a REAL, loginable
//      account with a credential and a `sys_member` row — not a raw `sys_user`
//      insert, which ADR-0092's write guard refuses and which would produce an
//      un-loginable row anyway);
//   2. assign the positions they hold (`sys_user_position`);
//   3. HAND THE DEMO BOOK TO THEM (#1759). `demo_bootstrap` claims every
//      ownerless seeded row for the FIRST user — it has to; a seed cannot name
//      a user and that flow ships in the artifact — which leaves the whole
//      book on the dev admin. Invisible over an API key (it runs as the human,
//      so `viewAllRecords` applies) and fatal over OAuth, where the agent
//      ceiling admits only what the caller OWNS or holds a share on
//      (objectstack-ai/objectstack#16549). So a demo salesperson asking their
//      agent about the pipeline got 0 opportunities and 0 tasks. This step
//      re-stamps `owner_id` per the routes in `src/sharing/demo-staffing.ts`;
//      `crm_account` is deliberately NOT among them (see step 5);
//   4. RE-EVALUATE every active sharing rule. This step is not optional and is
//      the reason staffing alone was never enough: `plugin-sharing` materialises
//      grants from a record-write hook that returns early on `isSystem` writes,
//      and every seeded row is written with `isSystem: true`. So the seeded
//      accounts carry no grants no matter who holds a position, until a rule is
//      re-evaluated (boot backfill does it too — this just avoids the restart);
//   5. VERIFY, as each demo user, that the three layers actually connect —
//      plus an OWNERSHIP CENSUS over the routed objects, which is the only
//      evidence that speaks to step 3: the reps must still OWN NO ACCOUNT (a
//      share to an owner proves nothing under a `private` OWD, so owning them
//      would delete the territory demonstration), while every routed row must
//      sit on a demo persona and none of them may hold the lot. Exits non-zero
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
} from '../src/sharing/demo-staffing.js';
import { TERRITORY, type Territory } from '../src/objects/_territory.js';

type Json = Record<string, any>;

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

  /** Rows of `object` matching `filters` (the data API's own query verb). */
  async query(object: string, filters: unknown[][], fields?: string[]): Promise<Json[]> {
    const json = await this.postOk(`/api/v1/data/${object}/query`, {
      filters,
      ...(fields ? { fields } : {}),
      top: 500,
    });
    return (json.records ?? []) as Json[];
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

/** One routed object after the re-stamp, with the census this run aimed at. */
type OwnershipOutcome = {
  route: DemoOwnershipRoute;
  total: number;
  written: number;
  /** userId → how many rows this run intends them to own. */
  intended: Map<string, number>;
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
 * Idempotent and order-independent: it compares each row against the owner the
 * routes ask for and writes only the difference, so it is correct whether
 * `demo_bootstrap` has already claimed the rows for the dev admin or has not
 * run yet and left them ownerless.
 */
async function handBookToRoster(
  api: Api,
  userIdByKey: Map<string, string>,
): Promise<OwnershipOutcome[]> {
  // The account hook stores a declared `territory` (never a country string —
  // `src/objects/_territory.ts`), so this reads the same value the sharing
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

  const outcomes: OwnershipOutcome[] = [];
  for (const route of DemoPipelineOwnership) {
    const fields = ['id', 'owner_id', ...(route.accountField ? [route.accountField] : [])];
    const rows = await api.query(route.object, [], fields);
    const intended = new Map<string, number>();
    let written = 0;
    for (const row of rows) {
      const accountId = route.accountField ? row[route.accountField] : undefined;
      const wanted = ownerFor(accountId ? territoryOf.get(String(accountId)) : undefined);
      intended.set(wanted, (intended.get(wanted) ?? 0) + 1);
      if (String(row.owner_id ?? '') === wanted) continue;
      await api.patchOk(route.object, String(row.id), { owner_id: wanted });
      written++;
    }
    outcomes.push({ route, total: rows.length, written, intended });
  }
  return outcomes;
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
 * Anything that does not balance against the intent is reported as a broken
 * instrument, not as a pass.
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
  const width = 18;
  const ownedOverall = new Map<string, number>();
  let grandTotal = 0;

  console.log(
    `   ${'object'.padEnd(20)}${'total'.padStart(6)}` +
    `${roster.map((r) => r.email.split('@')[0].padStart(width)).join('')}` +
    `${'dev admin'.padStart(width)}${'nobody'.padStart(10)}`,
  );

  for (const { route, total, intended } of outcomes) {
    const rows = await api.query(route.object, [], ['id', 'owner_id']);
    const observed = new Map<string, number>();
    for (const row of rows) {
      const owner = String(row.owner_id ?? '');
      observed.set(owner, (observed.get(owner) ?? 0) + 1);
      ownedOverall.set(owner, (ownedOverall.get(owner) ?? 0) + 1);
    }
    grandTotal += rows.length;
    const admin = observed.get(adminId) ?? 0;
    const ownerless = observed.get('') ?? 0;

    console.log(
      `   ${route.object.padEnd(20)}${String(rows.length).padStart(6)}` +
      `${roster.map((r) => String(observed.get(r.userId) ?? 0).padStart(width)).join('')}` +
      `${String(admin).padStart(width)}${String(ownerless).padStart(10)}`,
    );

    // Guard the guard: an empty object balances trivially and proves nothing.
    if (rows.length === 0) {
      failures.push(`${route.object} has no rows at all — its clean-looking row above is vacuous, not clean`);
      continue;
    }
    if (rows.length !== total) {
      failures.push(
        `${route.object}: ${total} row(s) were routed but ${rows.length} are here now — the census ` +
        `is reading a moving target, so none of its numbers can be trusted.`,
      );
    }
    for (const [userId, want] of intended) {
      const got = observed.get(userId) ?? 0;
      if (got !== want) {
        failures.push(
          `${route.object}: ${nameOf(userId)} should own ${want} row(s) and owns ${got} — a PATCH ` +
          `reported success and changed nothing, or something re-claimed the row afterwards.`,
        );
      }
    }
    if (admin > 0) {
      failures.push(
        `${route.object}: the dev admin still owns ${admin} row(s), so a demo salesperson's agent ` +
        `session still cannot see them (#1759).`,
      );
    }
    if (ownerless > 0) {
      failures.push(
        `${route.object}: ${ownerless} row(s) are owned by NOBODY — under a private OWD such a row ` +
        `is editable by no one at all, admin included.`,
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
    const rows = await asUser.query('crm_account', [], ['id', 'name', 'territory', 'billing_country', 'owner_id']);
    const names = rows.map((r) => String(r.name)).sort();
    const territories = [...new Set(names.map(territoryOf))].sort();
    console.log(`   ${member.email} sees ${rows.length} account(s): ${names.join(', ') || '—'}`);
    console.log(`     territory/country: [${territories.join(', ')}]`);

    const owned = rows.filter((r) => String(r.owner_id ?? '') === userId).map((r) => String(r.name));
    if (owned.length > 0) {
      failures.push(
        `${member.email} OWNS ${owned.join(', ')} — a share to a record's owner demonstrates ` +
        `nothing, because the private OWD baseline already admits the owner. Ownership belongs ` +
        `to demo_bootstrap's first user; staffing must not move it.`,
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
  const ownership = await handBookToRoster(api, new Map(outcomes.map((o) => [o.member.key, o.userId])));
  for (const o of ownership) {
    console.log(
      `   ${o.route.object.padEnd(20)} re-stamped ${String(o.written).padStart(3)} of ` +
      `${String(o.total).padStart(3)} — ${o.route.why}`,
    );
  }

  console.log('\n── Re-evaluating sharing rules ──');
  for (const r of await evaluateRules(api)) {
    console.log(
      `   ${r.name.padEnd(30)} matched=${String(r.matched).padStart(3)}  ` +
      `holders=${r.users}  granted=${r.created}  revoked=${r.revoked}`,
    );
  }

  const shares = await api.query('sys_record_share', [['source', '=', 'rule']], ['id']);
  const accounts = await api.query('crm_account', [], ['name', 'territory', 'billing_country']);
  console.log(`\n── Verifying (sys_record_share: ${shares.length} rule-materialised grants) ──`);
  const failures = await verify(base, outcomes, accounts);

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
  // by that — the passwords are declared in `src/sharing/demo-staffing.ts`, one
  // file away — but a run's stdout ends up in terminals, CI logs and pasted
  // snippets, and "echo the credential you just used" is the one shape this
  // reference app should not be teaching. (CodeQL says the same thing:
  // js/clear-text-logging of sensitive information.)
  console.log(
    `\n🎉 demo org staffed. Sign in as any of: ` +
    `${DemoOrgStaffing.map((m) => m.email).join(' · ')}\n` +
    `   Passwords are declared in src/sharing/demo-staffing.ts.\n` +
    `   Submit an opportunity of $100K or more to see manager_review route to ` +
    `${DemoOrgStaffing.find((m) => m.positions.includes('sales_manager'))?.email}.\n`,
  );
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((err: unknown) => {
    console.error(`\n🔴 ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  });
