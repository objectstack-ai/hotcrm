// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ObjectKernel } from '@objectstack/core';
import { DefaultDatasourcePlugin, AppPlugin } from '@objectstack/runtime';
import { ObjectQLPlugin } from '@objectstack/objectql';
import { MetadataPlugin } from '@objectstack/metadata';
import {
  SecurityPlugin,
  appDefaultPermissionSetName,
  buildContextForUser,
} from '@objectstack/plugin-security';
import { SharingServicePlugin } from '@objectstack/plugin-sharing';
import stack from '../objectstack.config';

/**
 * What a `controlled_by_parent` child is ACTUALLY reachable by — measured
 * against the real enforcement stack (#549).
 *
 * ### Why this file exists
 *
 * #549 asks whether `crm_quote` / `crm_contract` should become
 * `controlled_by_parent` under `crm_account`, so that a rep who receives an
 * account through a territory rule also sees its quotes and contracts. Every
 * other test in this repo reads METADATA; none of them can answer what the
 * engine does with it. So this one boots the shipped stack — ObjectQL +
 * `plugin-security` + `plugin-sharing`, the same plugins `objectstack serve`
 * mounts — over the app's own `objectstack.config.ts`, materialises the
 * territory sharing rule, and asks the engine, as a real `sales_rep`, what it
 * returns.
 *
 * ### The measurement (17.0.0-rc.2), and why #549 Option 2 does not do what it
 * ### was expected to
 *
 * A rep who holds ONE account (acct_US, via `north_america_territory`) and owns
 * nothing else sees:
 *
 *   | object                     | OWD                  | rep sees              |
 *   | -------------------------- | -------------------- | --------------------- |
 *   | `crm_account`              | private              | acct_US only  ✔       |
 *   | `crm_quote`                | private + own        | nothing       ✔ (the #549 keyhole) |
 *   | `crm_contract`             | private + own        | nothing       ✔       |
 *   | `crm_contact`              | controlled_by_parent | BOTH accounts' contacts |
 *   | `crm_quote_line_item`      | controlled_by_parent | BOTH quotes' lines    |
 *
 * The last two rows are the finding: a parent-derived child is NOT filtered to
 * parents the caller can read. `plugin-security`'s
 * `computeControlledByParentFilter` resolves the master id set with
 * `computeRlsFilter(master)` — Layer 0 (tenant) AND Layer 1 (`rowLevelSecurity`
 * policies) — and then runs that query under a SYSTEM context. Ownership scope
 * and `sys_record_share` grants live in `plugin-sharing.buildReadFilter`, which
 * returns `null` for anything whose effective sharing model is not `private`
 * (and `controlled_by_parent` maps to `public`). The platform says so itself:
 * "master accessibility is the master's RLS filter (sharing-service grants on
 * the master are not folded in)". HotCRM authors no RLS policy on
 * `crm_account`, so the master set is EVERY account.
 *
 * Consequence for #549: converting `crm_quote` / `crm_contract` to
 * `controlled_by_parent` would not give territory recipients their accounts'
 * quotes — it would give every holder of object-level read EVERY quote and
 * EVERY contract in the org (measured: with the conversion applied, this same
 * rep saw quote_JP and contract_JP, on an account they cannot read; and because
 * `sales_rep` holds `allowEdit` on quotes, the parent-write gate — which checks
 * the master against the same empty filter — let them EDIT quote_JP too).
 *
 * ### How to read a failure here
 *
 * These assertions pin measured behaviour, not desired behaviour. If the
 * contact/line-item cases start failing because the engine narrowed them to
 * readable parents, that is GOOD NEWS: the derivation now means what #549's
 * Option 2 assumed, and the quote/contract decision can be re-taken on it.
 * Update this file and re-open #549 rather than deleting the guard.
 */

type AnyRec = Record<string, any>;

// The object registry announces every registered object on stdout at `info`.
// The kernel logger below is silenced the same way; both are noise here, and a
// hundred lines of it buries the one thing this file reports.
process.env.OS_REGISTRY_LOG ??= 'silent';

const SYS = { isSystem: true } as AnyRec;

let kernel: AnyRec;
let ql: AnyRec;
/** ids, by role in the fixture. */
const id: Record<string, string> = {};
/** The `sales_rep` execution context under test. */
let repCtx: AnyRec;

/** Insert as the system, returning the new row's id. */
const insert = async (object: string, doc: AnyRec): Promise<string> => {
  const row = await ql.insert(object, doc, { context: SYS });
  return String(row?.id ?? row?.record?.id);
};

/** Ids of `object` visible to the rep, as fixture labels. */
const repSees = async (object: string): Promise<string[]> => {
  const rows = await ql.find(object, { where: {} }, { context: repCtx });
  const byId = new Map(Object.entries(id).map(([label, value]) => [value, label]));
  return (Array.isArray(rows) ? rows : [])
    .map((r: AnyRec) => byId.get(String(r.id)) ?? String(r.id))
    .sort();
};

beforeAll(async () => {
  kernel = new ObjectKernel({ logger: { level: 'silent' } } as never);
  await kernel.use(new DefaultDatasourcePlugin({ driver: 'memory', config: {} } as never));
  await kernel.use(new MetadataPlugin({ watch: false, artifactWatch: false, environmentId: 'proj_test' } as never));
  await kernel.use(new ObjectQLPlugin({ environmentId: 'proj_test' } as never));
  // The app's own metadata is the subject: objects, profiles, positions and
  // sharing rules exactly as `objectstack.config.ts` declares them. Seed data
  // is skipped — the fixture below is the whole population.
  await kernel.use(new AppPlugin(stack as never, undefined as never, { skipSeedData: true } as never));
  await kernel.use(
    new SecurityPlugin({
      fallbackPermissionSet: appDefaultPermissionSetName((stack as AnyRec).permissions),
    } as never),
  );
  await kernel.use(new SharingServicePlugin());
  await kernel.bootstrap();
  ql = kernel.getService('objectql');

  // ── principals ────────────────────────────────────────────────────────
  // The FIRST human user is auto-promoted to platform admin at boot, and a
  // platform admin bypasses every filter this file measures. Burn that
  // promotion on a throwaway so the rep under test is an ordinary user.
  await insert('sys_user', { name: 'Platform Admin', email: 'admin@parent-reach.test' });
  id.rep = await insert('sys_user', { name: 'Territory Rep', email: 'rep@parent-reach.test' });
  id.owner = await insert('sys_user', { name: 'Another Owner', email: 'owner@parent-reach.test' });

  // `sys_user_position.position` holds the position NAME (that is what
  // `expandPositionUsers` filters on) — an id here expands to nobody.
  for (const position of ['sales_rep', 'na_sales_team']) {
    await insert('sys_user_position', { user_id: id.rep, position });
  }
  const sets = await ql.find('sys_permission_set', { where: {} }, { context: SYS });
  const salesRepSet = (sets as AnyRec[]).find((s) => s.name === 'sales_rep');
  await insert('sys_user_permission_set', {
    user_id: id.rep,
    permission_set: salesRepSet?.id,
    permission_set_id: salesRepSet?.id,
  });

  // ── population: two accounts the rep owns NEITHER of ──────────────────
  // `billing_country` is the flat column the territory rules filter on
  // (`account.hook.ts` projects it; the hook does not run for this direct
  // insert, so the fixture states it alongside the address).
  id.acct_US = await insert('crm_account', {
    name: 'US Customer', type: 'customer', is_active: true, owner_id: id.owner,
    billing_address: { country: 'US' }, billing_country: 'US',
  });
  id.acct_JP = await insert('crm_account', {
    name: 'JP Customer', type: 'customer', is_active: true, owner_id: id.owner,
    billing_address: { country: 'JP' }, billing_country: 'JP',
  });

  const quoteOn = (account: string, name: string) => ({
    name, crm_account: account, owner_id: id.owner, status: 'draft',
    quote_date: '2026-01-01', expiration_date: '2026-02-01',
  });
  id.quote_US = await insert('crm_quote', quoteOn(id.acct_US, 'US Quote'));
  id.quote_JP = await insert('crm_quote', quoteOn(id.acct_JP, 'JP Quote'));

  const product = await insert('crm_product', {
    name: 'Widget', product_code: 'W-1', is_active: true, list_price: 10, family: 'cloud',
  });
  id.line_US = await insert('crm_quote_line_item', {
    crm_quote: id.quote_US, crm_product: product, quantity: 1, unit_price: 10,
  });
  id.line_JP = await insert('crm_quote_line_item', {
    crm_quote: id.quote_JP, crm_product: product, quantity: 1, unit_price: 10,
  });

  id.contact_US = await insert('crm_contact', {
    first_name: 'Ann', last_name: 'Us', email: 'ann@us.test',
    crm_account: id.acct_US, owner_id: id.owner,
  });
  id.contact_JP = await insert('crm_contact', {
    first_name: 'Jun', last_name: 'Jp', email: 'jun@jp.test',
    crm_account: id.acct_JP, owner_id: id.owner,
  });

  const contractOn = (account: string, contact: string) => ({
    crm_account: account, crm_contact: contact, owner_id: id.owner, status: 'draft',
    contract_term_months: 12, start_date: '2026-01-01', end_date: '2026-12-31',
    contract_value: 1000,
  });
  id.contract_US = await insert('crm_contract', contractOn(id.acct_US, id.contact_US));
  id.contract_JP = await insert('crm_contract', contractOn(id.acct_JP, id.contact_JP));

  // Materialise the declared rules against the population just inserted (the
  // boot backfill ran on an empty database).
  const rules: AnyRec = kernel.getService('sharingRules');
  for (const rule of ['north_america_territory', 'europe_territory', 'account_team_sharing']) {
    await rules.evaluateRule(rule, SYS);
  }

  repCtx = await buildContextForUser(ql, id.rep);
}, 120_000);

afterAll(async () => {
  await kernel?.shutdown?.();
});

describe('the harness enforces (negative controls)', () => {
  it('the rep resolves to sales_rep only — no platform-admin bypass', () => {
    expect(repCtx.permissions, 'the rep must not carry admin_full_access').toEqual(['sales_rep']);
    expect(repCtx.hasPlatformAdminGrant).toBe(false);
    expect(repCtx.positions).toContain('na_sales_team');
  });

  it('a private account reaches the rep only through the territory rule', async () => {
    const shares = await ql.find(
      'sys_record_share',
      { where: { object_name: 'crm_account', recipient_id: id.rep } },
      { context: SYS },
    );
    expect(
      (shares as AnyRec[]).map((s) => `${s.record_id}:${s.access_level}:${s.source}`),
      'north_america_territory materialised no share row — the fixture is not exercising sharing',
    ).toEqual([`${id.acct_US}:edit:rule`]);

    // Owns neither account; sees exactly the shared one.
    expect(await repSees('crm_account')).toEqual(['acct_US']);
  });
});

describe('#549: what a territory-shared account carries into its related lists', () => {
  it('quotes and contracts stay own-only — the keyhole this issue reports', async () => {
    expect(
      await repSees('crm_quote'),
      'crm_quote is private + readScope own with no rule of its own',
    ).toEqual([]);
    expect(
      await repSees('crm_contract'),
      'crm_contract is private + readScope own with no rule of its own',
    ).toEqual([]);
  });

  it('a controlled_by_parent child is NOT filtered to parents the caller can read', async () => {
    // MEASURED, not desired. `crm_contact` is master-detail under
    // `crm_account`, and the rep can read exactly one account — yet both
    // accounts' contacts come back, because the derivation resolves the master
    // set through the master's RLS policies (none here) under a system context,
    // never through ownership or `sys_record_share`.
    expect(
      await repSees('crm_contact'),
      'the parent derivation narrowed to readable accounts — re-take the #549 Option 2 decision',
    ).toEqual(['contact_JP', 'contact_US']);
  });

  it('the second level of the chain does not narrow it either (quote_line_item → quote)', async () => {
    // The two-level chain #549 asks about is `quote_line_item → quote →
    // account`. Level one already fails to restrict: the rep can read NEITHER
    // quote (own-only, above) and still reads both quotes' lines. So the chain
    // does not DENY rows — the fear the decision was checked against — it does
    // not restrict at all.
    expect(
      await repSees('crm_quote_line_item'),
      'line items narrowed to readable quotes — re-take the #549 Option 2 decision',
    ).toEqual(['line_JP', 'line_US']);
  });
});
