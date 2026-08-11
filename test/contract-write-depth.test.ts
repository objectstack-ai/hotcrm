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
 * A Sales Manager's WRITE DEPTH on `crm_contract` — measured against the real
 * enforcement stack (#880).
 *
 * ### What was broken
 *
 * `sales_manager` has held `allowEdit: true` on `crm_contract` since the app
 * shipped, and every contract that matters answered **403** anyway. The object
 * gate is only the first of two doors: `crm_contract` is `sharingModel:
 * 'private'` with an owner field, so `plugin-sharing`'s write gate then asks
 * whether the record's owner falls inside the caller's write DEPTH. With
 * `modifyAllRecords: false` and no `writeScope`, `getEffectiveScope('write')`
 * returns `'own'` — so the manager could edit only contracts they had created
 * themselves.
 *
 * That is precisely the wrong half. `quote_on_accepted`
 * (`src/objects/quote.hook.ts`) copies the accepted quote's `owner_id` onto the
 * contract it drafts, so the most common contract in the app hangs under the
 * **rep** who closed the deal. The rep cannot edit it either (`allowEdit:
 * false` — the object gate stops them), and nobody can hand it over
 * (`allowTransfer` is `system_admin`-only). Before this fix, changing such a
 * contract's dates, value or status — termination included — was a **System
 * Administrator**-only act, while `content/docs/revenue/contracts.mdx` told
 * readers it was a Sales Manager's job.
 *
 * ### Why the fix is `writeScope: 'org'` and not a hierarchy scope
 *
 * MEASURED on 17.0.0-rc.6, by booting this same stack once per candidate value
 * and attempting the edit. `getEffectiveScope`'s enum is `own |
 * own_and_reports | unit | unit_and_below | org`, and only the last one moves:
 *
 *   | `writeScope`                          | `objectstack validate` | manager edits a REP's contract |
 *   | ------------------------------------- | ---------------------- | ------------------------------ |
 *   | *(absent — the shipped state)*        | pass                   | **403**                        |
 *   | `own`                                 | pass                   | **403**                        |
 *   | `own_and_reports`                     | **REFUSED**            | —                              |
 *   | `unit`                                | **REFUSED**            | —                              |
 *   | `unit_and_below`                      | **REFUSED**            | —                              |
 *   | `own_and_reports` + `requires: ['hierarchy-security']` | pass (warns) | **403** — still nothing |
 *   | `org`                                 | pass                   | **allowed**                    |
 *
 * The three hierarchy scopes are an enterprise capability:
 * `SharingService.resolveOwnerScopeIds` resolves them through the
 * `hierarchy-scope-resolver` service, shipped only by
 * `@objectstack/security-enterprise`, and falls CLOSED to owner-only when it is
 * absent — which it is here, this being an open-edition app. `validate` rejects
 * them by name for that reason, and declaring the capability only turns the
 * rejection into a warning: the grant then validates and still conveys nothing.
 *
 * There is no narrower target to aim at either. HotCRM's positions are FLAT
 * (ADR-0090 D3, `src/sharing/positions.ts`) and the app models no manager chain
 * and no business units, so "this manager's reports" is not expressible data
 * here.
 *
 * ### How to read a failure here
 *
 * `manager edits the rep-owned contract` going red means the depth stopped
 * conveying — either the grant lost its `writeScope` or the platform changed
 * what `'org'` resolves to; the docs page immediately becomes a lie again, so
 * fix the mechanism rather than the assertion. The negative controls going
 * GREEN-to-RED in the other direction (something newly permitted) means depth
 * has been confused with the Modify All Data bypass, which is the one thing
 * this grant must not become.
 */

type AnyRec = Record<string, any>;

process.env.OS_REGISTRY_LOG ??= 'silent';

const SYS = { isSystem: true } as AnyRec;

let kernel: AnyRec;
let ql: AnyRec;
const id: Record<string, string> = {};
let mgrCtx: AnyRec;
let repCtx: AnyRec;

const insert = async (object: string, doc: AnyRec): Promise<string> => {
  const row = await ql.insert(object, doc, { context: SYS });
  return String(row?.id ?? row?.record?.id);
};

/** Attempt a write as `ctx`; report the refusal verbatim rather than a boolean. */
const attempt = async (object: string, doc: AnyRec, ctx: AnyRec) => {
  try {
    await ql.update(object, doc, { context: ctx });
    return { ok: true as const };
  } catch (err: unknown) {
    const e = err as AnyRec;
    return {
      ok: false as const,
      message: String(e?.message ?? ''),
      code: e?.code,
      status: e?.status ?? e?.statusCode,
    };
  }
};

beforeAll(async () => {
  kernel = new ObjectKernel({ logger: { level: 'silent' } } as never);
  await kernel.use(new DefaultDatasourcePlugin({ driver: 'memory', config: {} } as never));
  await kernel.use(
    new MetadataPlugin({ watch: false, artifactWatch: false, environmentId: 'proj_test' } as never),
  );
  await kernel.use(new ObjectQLPlugin({ environmentId: 'proj_test' } as never));
  await kernel.use(new AppPlugin(stack as never, undefined as never, { skipSeedData: true } as never));
  await kernel.use(
    new SecurityPlugin({
      fallbackPermissionSet: appDefaultPermissionSetName((stack as AnyRec).permissions),
    } as never),
  );
  await kernel.use(new SharingServicePlugin());
  await kernel.bootstrap();
  ql = kernel.getService('objectql');

  // The FIRST human user is auto-promoted to platform admin at boot and would
  // bypass every gate below — burn that promotion on a throwaway.
  await insert('sys_user', { name: 'Platform Admin', email: 'admin@contract-depth.test' });
  id.mgr = await insert('sys_user', { name: 'Sales Manager', email: 'mgr@contract-depth.test' });
  id.rep = await insert('sys_user', { name: 'Sales Rep', email: 'rep@contract-depth.test' });

  // `sys_user_position.position` holds the position NAME, not an id.
  await insert('sys_user_position', { user_id: id.mgr, position: 'sales_manager' });
  await insert('sys_user_position', { user_id: id.rep, position: 'sales_rep' });

  const sets = (await ql.find('sys_permission_set', { where: {} }, { context: SYS })) as AnyRec[];
  const bind = async (userId: string, setName: string) => {
    const set = sets.find((s) => s.name === setName);
    await insert('sys_user_permission_set', {
      user_id: userId,
      permission_set: set?.id,
      permission_set_id: set?.id,
    });
  };
  await bind(id.mgr, 'sales_manager');
  await bind(id.rep, 'sales_rep');

  id.account = await insert('crm_account', {
    name: 'Depth Co', type: 'customer', is_active: true, owner_id: id.rep,
    billing_address: { country: 'US' },
  });
  id.contact = await insert('crm_contact', {
    first_name: 'Dana', last_name: 'Depth', email: 'dana@contract-depth.test',
    crm_account: id.account, owner_id: id.rep,
  });

  const contractOwnedBy = (owner: string) => ({
    crm_account: id.account, crm_contact: id.contact, owner_id: owner, status: 'draft',
    contract_term_months: 12, start_date: '2026-01-01', end_date: '2026-12-31',
    contract_value: 1000,
  });
  // THE record this card is about: the shape `quote_on_accepted` drafts —
  // owned by the rep who closed the deal, not by the manager.
  id.repContract = await insert('crm_contract', contractOwnedBy(id.rep));
  // Positive control for the negative cases below: a contract the manager owns
  // outright was ALREADY editable before this change, so a suite that only
  // asserted refusals could pass by denying everything.
  id.mgrContract = await insert('crm_contract', contractOwnedBy(id.mgr));

  // A case: the manager holds `allowEdit: false` there. The write depth
  // authored on `crm_contract` must not leak to another object.
  id.case = await insert('crm_case', {
    subject: 'Depth control', description: 'Negative control for #880.',
    crm_account: id.account, crm_contact: id.contact,
    owner_id: id.rep, status: 'new', priority: 'medium', origin: 'web',
  });

  mgrCtx = await buildContextForUser(ql, id.mgr);
  repCtx = await buildContextForUser(ql, id.rep);
}, 120_000);

afterAll(async () => {
  await kernel?.shutdown?.();
});

describe('the harness enforces (negative controls)', () => {
  it('neither principal carries a platform-admin bypass', () => {
    expect(mgrCtx.permissions).toContain('sales_manager');
    expect(repCtx.permissions).toContain('sales_rep');
    for (const ctx of [mgrCtx, repCtx]) {
      expect(ctx.permissions).not.toContain('admin_full_access');
      expect(ctx.hasPlatformAdminGrant).toBe(false);
    }
  });

  it('the fixture contract really is owned by the rep, not the manager', async () => {
    const rows = (await ql.find(
      'crm_contract', { where: { id: id.repContract }, fields: ['id', 'owner_id'] }, { context: SYS },
    )) as AnyRec[];
    expect(String(rows[0]?.owner_id)).toBe(id.rep);
    expect(String(rows[0]?.owner_id)).not.toBe(id.mgr);
  });
});

describe('Sales Manager write depth on crm_contract (#880)', () => {
  it('edits a contract owned by a REP — the quote-drafted shape', async () => {
    const r = await attempt('crm_contract', { id: id.repContract, contract_value: 2500 }, mgrCtx);
    expect(r, `the manager was refused on the rep's contract: ${JSON.stringify(r)}`).toEqual({ ok: true });

    const rows = (await ql.find(
      'crm_contract', { where: { id: id.repContract }, fields: ['id', 'contract_value'] }, { context: SYS },
    )) as AnyRec[];
    expect(Number(rows[0]?.contract_value), 'the update must have actually landed').toBe(2500);
  });

  it('terminates a contract owned by a REP — the act contracts.mdx promises', async () => {
    // Status is the field the docs page names first; termination is the case
    // that had no holder at all below System Administrator.
    const r = await attempt('crm_contract', { id: id.repContract, status: 'terminated' }, mgrCtx);
    expect(r).toEqual({ ok: true });
  });

  it('still edits its own contract (positive control — this never regressed)', async () => {
    const r = await attempt('crm_contract', { id: id.mgrContract, contract_value: 1500 }, mgrCtx);
    expect(r).toEqual({ ok: true });
  });
});

describe('what the depth deliberately does NOT grant', () => {
  it('DELETE stays refused — depth is not the Modify All Data bypass', async () => {
    // `allowDelete: false` is the object gate; `writeScope` widens which owners
    // the caller reaches, never which verbs they hold. A grant that started
    // allowing this would mean depth had been confused with `modifyAllRecords`.
    let refused = false;
    try {
      await ql.delete('crm_contract', id.repContract, { context: mgrCtx });
    } catch {
      refused = true;
    }
    expect(refused, 'a Sales Manager must not be able to delete a contract').toBe(true);
    const rows = (await ql.find(
      'crm_contract', { where: { id: id.repContract }, fields: ['id'] }, { context: SYS },
    )) as AnyRec[];
    expect(rows.length, 'the contract must still exist').toBe(1);
  });

  it('does not leak to another object — crm_case is still read-only for the manager', async () => {
    const r = await attempt('crm_case', { id: id.case, subject: 'Rewritten' }, mgrCtx);
    expect(r.ok, `the manager edited a case: ${JSON.stringify(r)}`).toBe(false);
  });

  it('a Sales Rep still cannot edit the contract standing in their own name', async () => {
    // Unchanged by this card, and the reason the manager needed the reach:
    // the object gate refuses the rep before ownership is ever consulted.
    const r = await attempt('crm_contract', { id: id.repContract, contract_value: 9999 }, repCtx);
    expect(r.ok).toBe(false);
    // MEASURED refusal shape on 17.0.0-rc.6 — the object gate answers with
    // `PERMISSION_DENIED` from plugin-security, naming the positions it
    // resolved, which is a different producer from the record-level 403
    // (`FORBIDDEN` / 403) the depth gate raised before this fix. Pinned as
    // measured rather than as either of us would guess.
    expect(r.code).toBe('PERMISSION_DENIED');
    expect(r.message).toContain("operation 'update' on object 'crm_contract' is not permitted");
  });
});
