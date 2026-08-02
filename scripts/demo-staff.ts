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
//   3. RE-EVALUATE every active sharing rule. This step is not optional and is
//      the reason staffing alone was never enough: `plugin-sharing` materialises
//      grants from a record-write hook that returns early on `isSystem` writes,
//      and every seeded row is written with `isSystem: true`. So the seeded
//      accounts carry no grants no matter who holds a position, until a rule is
//      re-evaluated (boot backfill does it too — this just avoids the restart);
//   4. VERIFY, as each demo user, that the three layers actually connect, and
//      exit non-zero if they do not.
//
// Flags: --url (default http://localhost:4001, the port `pnpm dev` binds),
//        --admin-email / --admin-password (default the platform's dev-admin
//        seed, which only exists when NODE_ENV=development).

import { DemoOrgStaffing, type DemoStaffMember } from '../src/sharing/demo-staffing.js';

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

/**
 * The point of the whole exercise, asserted rather than assumed: each demo user
 * signs in and reads the accounts, and none of them may OWN what they were
 * granted (a share to the owner proves nothing — the OWD baseline already
 * admits them).
 */
async function verify(base: URL, outcomes: StaffOutcome[], adminAccounts: Json[]): Promise<string[]> {
  const failures: string[] = [];
  const countryOf = (name: string) =>
    String(adminAccounts.find((a) => a.name === name)?.billing_country ?? '??');

  for (const { member, userId } of outcomes) {
    const asUser = new Api(base);
    await asUser.signIn(member.email, member.password);
    const rows = await asUser.query('crm_account', [], ['id', 'name', 'billing_country', 'owner_id']);
    const names = rows.map((r) => String(r.name)).sort();
    const countries = [...new Set(names.map(countryOf))].sort();
    console.log(`   ${member.email} sees ${rows.length} account(s): ${names.join(', ') || '—'}`);
    console.log(`     countries: [${countries.join(', ')}]`);

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
      const wanted = member.positions.includes('na_sales_team')
        ? ['US', 'CA', 'MX']
        : ['UK', 'DE', 'FR', 'IT', 'ES'];
      const strays = countries.filter((c) => !wanted.includes(c));
      if (strays.length > 0) {
        failures.push(
          `${member.email} reads accounts outside their territory (${strays.join(', ')}) — a ` +
          `match-all regression looks exactly like this.`,
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

  console.log('\n── Re-evaluating sharing rules ──');
  for (const r of await evaluateRules(api)) {
    console.log(
      `   ${r.name.padEnd(30)} matched=${String(r.matched).padStart(3)}  ` +
      `holders=${r.users}  granted=${r.created}  revoked=${r.revoked}`,
    );
  }

  const shares = await api.query('sys_record_share', [['source', '=', 'rule']], ['id']);
  const accounts = await api.query('crm_account', [], ['name', 'billing_country']);
  console.log(`\n── Verifying (sys_record_share: ${shares.length} rule-materialised grants) ──`);
  const failures = await verify(base, outcomes, accounts);

  if (failures.length > 0) {
    console.log('\n🔴 staffing did not connect:');
    for (const f of failures) console.log(`   · ${f}`);
    return 1;
  }
  console.log(
    `\n🎉 demo org staffed. Sign in as any of: ` +
    `${DemoOrgStaffing.map((m) => `${m.email} / ${m.password}`).join(' · ')}\n` +
    `   Submit an opportunity over $100K to see manager_review route to ` +
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
