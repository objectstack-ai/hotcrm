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
 * ### The measurement (17.0.0-rc.4): the derivation follows the parent's SHARING
 *
 * A rep who holds ONE account (acct_US, via `north_america_territory`), owns one
 * quote of their own (quote_own) and owns nothing else sees:
 *
 *   | object                     | OWD                  | rep sees              |
 *   | -------------------------- | -------------------- | --------------------- |
 *   | `crm_account`              | private              | acct_US only          |
 *   | `crm_quote`                | private + own        | quote_own only — NOT the territory account's quote (the #549 keyhole) |
 *   | `crm_contract`             | private + own        | nothing               |
 *   | `crm_contact`              | controlled_by_parent | contact_US only — the readable account's |
 *   | `crm_quote_line_item`      | controlled_by_parent | line_own only — the readable quote's |
 *
 * The last two rows are the point: a parent-derived child IS filtered to parents
 * the caller can read, and "can read" includes the paths a direct read of the
 * master would take — owner scope (quote_own, owned outright) AND
 * `sys_record_share` grants (acct_US, held only through the territory rule).
 * Folding the share path in is precisely what objectstack#5386 fixed; a
 * derivation that consulted RLS policies alone would show contact_US as
 * unreachable, because HotCRM authors no RLS policy on any master.
 *
 * The write side derives the same way: `crm_contact` under the territory-shared
 * account is editable (the share carries `edit`), while a child of a master the
 * rep cannot reach is refused with `PermissionDeniedError ... requires edit
 * access to its master record (master '<x>' not editable by this user (record
 * sharing))` — the parenthetical names the sharing path being consulted.
 *
 * ### History: what this file pinned before rc.4, and why it was inverted
 *
 * Through 17.0.0-rc.3 these same cases measured the OPPOSITE and were pinned
 * that way on purpose (#694): `computeControlledByParentFilter` resolved the
 * master id set with `computeRlsFilter(master)` — Layer 0 (tenant) AND Layer 1
 * (`rowLevelSecurity`) — under a SYSTEM context, while owner scope and
 * `sys_record_share` grants lived in `plugin-sharing.buildReadFilter`, which
 * returned `null` for anything whose effective sharing model was not `private`
 * (and `controlled_by_parent` mapped to `public`). With no RLS policy authored
 * on any master the derived set was EVERY row: the rep read BOTH accounts'
 * contacts and BOTH quotes' lines, and could edit children of masters they could
 * not see. That harness was written to go red the day the engine narrowed, which
 * it did on rc.4 — the assertions below are the flip, not a deletion.
 *
 * Consequence for #549: the premise its 2026-08-02 Option 2 decision was
 * rejected on has expired. Converting `crm_quote` / `crm_contract` to
 * `controlled_by_parent` no longer leaks them org-wide; it now means what the
 * decision assumed — "reachable by whoever can read the account". #549 is
 * flagged for re-evaluation on this measurement; the conversion itself is the
 * maintainer's call and is NOT made here.
 *
 * ### How to read a failure here
 *
 * These assertions pin measured behaviour. If a case starts failing because the
 * derivation widened again, that is a REGRESSION of objectstack#5386 and the
 * exposure #694 described is back — per-line pricing and contact PII readable by
 * every holder of object-level read. Report it upstream rather than relaxing the
 * assertion. Every narrowed case below carries a positive control (a row that
 * MUST still be visible), so none of them can pass by returning nothing.
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
    permission_set_id: salesRepSet?.id,
  });

  // ── population: two accounts the rep owns NEITHER of ──────────────────
  // `territory` is the declared column the territory rules filter on (#639),
  // and `account_protection` derives it — plus `billing_country` — from the
  // address on every insert. `account_protection` DOES run here (this is the
  // real engine with the real stack, not a stub), so both derived values are
  // deliberately left unstated: authoring them would let this fixture keep
  // granting the rep an account after the derivation itself broke, which is
  // precisely the class of silent pass #639 was about.
  id.acct_US = await insert('crm_account', {
    name: 'US Customer', type: 'customer', is_active: true, owner_id: id.owner,
    billing_address: { country: 'US' },
  });
  id.acct_JP = await insert('crm_account', {
    name: 'JP Customer', type: 'customer', is_active: true, owner_id: id.owner,
    billing_address: { country: 'JP' },
  });

  const quoteOn = (account: string, name: string) => ({
    name, crm_account: account, owner_id: id.owner, status: 'draft',
    quote_date: '2026-01-01', expiration_date: '2026-02-01',
  });
  id.quote_US = await insert('crm_quote', quoteOn(id.acct_US, 'US Quote'));
  id.quote_JP = await insert('crm_quote', quoteOn(id.acct_JP, 'JP Quote'));
  // The positive control for the narrowed line-item case: a quote the rep owns
  // outright, so `crm_quote`'s own-scope makes it readable AND editable to them.
  // Without a master the rep can reach, `repSees('crm_quote_line_item')` would
  // be `[]` whether the derivation narrowed correctly or the object were denied
  // outright — the assertion would pass for the wrong reason.
  id.quote_own = await insert('crm_quote', { ...quoteOn(id.acct_US, 'Own Quote'), owner_id: id.rep });

  const product = await insert('crm_product', {
    name: 'Widget', product_code: 'W-1', is_active: true, list_price: 10, family: 'cloud',
  });
  id.line_US = await insert('crm_quote_line_item', {
    crm_quote: id.quote_US, crm_product: product, quantity: 1, unit_price: 10,
  });
  id.line_JP = await insert('crm_quote_line_item', {
    crm_quote: id.quote_JP, crm_product: product, quantity: 1, unit_price: 10,
  });
  id.line_own = await insert('crm_quote_line_item', {
    crm_quote: id.quote_own, crm_product: product, quantity: 1, unit_price: 10,
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
    // ObjectStack 17.0.0-rc.6 enumerates the platform baseline set
    // `member_default` in `ctx.permissions` alongside the app-declared profile;
    // it is the set every member has always carried (see
    // src/sharing/demo-staffing.ts), so this is enumeration, not a new grant —
    // every reach assertion below is unchanged. The negative control is about
    // the ADMIN bypass, so it pins that directly instead of the exact list.
    expect(repCtx.permissions, 'the rep must carry its app profile').toContain('sales_rep');
    expect(repCtx.permissions, 'the rep must not carry admin_full_access').not.toContain(
      'admin_full_access',
    );
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
    // The rep owns quote_own and nothing else. quote_US hangs off the account
    // the territory rule shared to them, and still does not come back: a
    // sharing rule widens the object it NAMES, not the records hanging off it.
    // That is the #549 keyhole, unchanged by the rc.4 derivation fix — the fix
    // narrowed `controlled_by_parent`, and `crm_quote` is `private`.
    expect(
      await repSees('crm_quote'),
      'crm_quote is private + readScope own with no rule of its own',
    ).toEqual(['quote_own']);
    expect(
      await repSees('crm_contract'),
      'crm_contract is private + readScope own with no rule of its own',
    ).toEqual([]);
  });

  it('a controlled_by_parent child IS filtered to parents the caller can read', async () => {
    // `crm_contact` is master-detail under `crm_account`, and the rep can read
    // exactly one account — acct_US, reached ONLY through the territory rule's
    // `sys_record_share` row. Its contact comes back and the other account's
    // does not, so the derivation resolves master accessibility through the
    // share path, not through the master's RLS policies alone (there are none).
    // contact_US is the positive control: were the derivation to deny instead
    // of narrow, this would be `[]` and the assertion would catch it.
    expect(
      await repSees('crm_contact'),
      'the parent derivation stopped following the account — objectstack#5386 regressed',
    ).toEqual(['contact_US']);
  });

  it('the second level of the chain narrows the same way (quote_line_item → quote)', async () => {
    // The two-level chain #549 asks about is `quote_line_item → quote →
    // account`. Level one restricts on the quote's own reachability: the rep
    // reads quote_own and neither of the other two, so exactly its line comes
    // back. line_own is the positive control — without it this case would read
    // `[]` and pass even if line items were denied outright.
    expect(
      await repSees('crm_quote_line_item'),
      'line items no longer track the readable quote — objectstack#5386 regressed',
    ).toEqual(['line_own']);
  });
});

describe('#694: the parent-write gate derives from the master the same way', () => {
  /** Attempt a rep-context update; report the outcome as a stable label. */
  const repWrites = async (object: string, rowId: string, patch: AnyRec): Promise<string> => {
    try {
      await ql.update(object, { id: rowId, ...patch }, { context: repCtx });
      return 'allowed';
    } catch (error: unknown) {
      return `denied: ${(error as AnyRec)?.name}`;
    }
  };

  it('a child of a reachable master is writable — through the share path', async () => {
    // The positive control of the write side. acct_US reaches the rep ONLY as a
    // `sys_record_share` row with `access_level: 'edit'`; if the write gate
    // resolved the master through RLS policies alone (none authored), this
    // would be denied. It is allowed, which is objectstack#5386's write half.
    expect(
      await repWrites('crm_contact', id.contact_US, { title: 'Head of Ops' }),
      'the write gate stopped honouring the edit share on the master — objectstack#5386 regressed',
    ).toBe('allowed');
    expect(await repWrites('crm_quote_line_item', id.line_own, { quantity: 2 })).toBe('allowed');
  });

  it('a child of an unreachable master is refused', async () => {
    // Before rc.4 all three of these succeeded: the gate checked the master
    // against the same empty RLS filter, so `allowEdit` on the child was enough
    // to write children of masters the caller cannot even see (#694).
    expect(
      await repWrites('crm_contact', id.contact_JP, { title: 'Head of Ops' }),
      'a contact under an unreadable account became writable again — objectstack#5386 regressed',
    ).toBe('denied: PermissionDeniedError');
    expect(await repWrites('crm_quote_line_item', id.line_US, { quantity: 2 })).toBe(
      'denied: PermissionDeniedError',
    );
    expect(await repWrites('crm_quote_line_item', id.line_JP, { quantity: 2 })).toBe(
      'denied: PermissionDeniedError',
    );
  });
});
