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
import { defineStack, PLATFORM_CAPABILITY_PROVIDERS } from '@objectstack/spec';
import stack from '../objectstack.config';

/**
 * A Sales Manager's WRITE DEPTH on `crm_contract` — the declaration, and what it
 * resolves to on THIS edition (#880).
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
 * false`), and nobody can hand it over (`allowTransfer` is
 * `system_admin`-only).
 *
 * ### What this file pins, and why it does NOT assert the manager can edit
 *
 * Maintainer ruling, 2026-08-11, verbatim: 「本项目是元数据app，在企业版运行就具备
 * 企业版相关的能力，不重复开发。」 The app declares the depth it MEANS —
 * `writeScope: 'own_and_reports'`, an ADR-0057 HIERARCHY scope — and the edition
 * supplies the capability:
 *
 *   - **enterprise**: `@objectstack/security-enterprise` registers the
 *     `hierarchy-scope-resolver` service, the scope resolves through the manager
 *     chain, and a Sales Manager reaches their reports' contracts. That is the
 *     workflow #880 is about, and it is NOT exercisable here — the resolver is
 *     not installed in this repo, by design.
 *   - **open** (what this test suite runs on): no resolver, so
 *     `SharingService.resolveOwnerScopeIds` fails CLOSED to owner-only and the
 *     manager still gets 403 on a rep's contract.
 *
 * So the 403 asserted below is an **edition boundary, not the #880 defect
 * returning**. It is asserted rather than merely tolerated so that the day this
 * repo gains the enterprise resolver, this file goes red and says so instead of
 * silently changing meaning. An earlier revision of this PR made the manager's
 * edit succeed by substituting `writeScope: 'org'`; the ruling rejected that as
 * 重复开发 — approximating an enterprise capability in app metadata — so a test
 * asserting that success would now be pinning the wrong thing.
 *
 * ### How to read a failure here
 *
 * - The DECLARATION cases going red means the grant or its capability
 *   declaration was dropped, and `defineStack` would refuse the app outright.
 *   They are coupled on purpose: `writeScope: 'own_and_reports'` is illegal
 *   without `requires: ['hierarchy-security']`.
 * - The open-edition 403 going red usually means the resolver arrived (good —
 *   update this file for the enterprise reality), but could also mean the depth
 *   silently widened, which is the thing to check first.
 * - The controls going red means depth has been confused with the Modify All
 *   Data bypass, which is the one thing this grant must not become.
 */

type AnyRec = Record<string, any>;

process.env.OS_REGISTRY_LOG ??= 'silent';

const SYS = { isSystem: true } as AnyRec;

/** ADR-0057 hierarchy scopes — the values that need the enterprise resolver. */
const HIERARCHY_SCOPES = new Set(['unit', 'unit_and_below', 'own_and_reports']);

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

// ── the declaration ─────────────────────────────────────────────────────
// Static, and deliberately first: these run without a kernel, so a dropped
// declaration is reported as itself rather than as a downstream permission
// oddity.

describe('the declaration (#880)', () => {
  const salesManager = ((stack as AnyRec).permissions as AnyRec[])
    .find((p) => p.name === 'sales_manager');

  it('sales_manager declares own_and_reports write depth on crm_contract', () => {
    expect(salesManager?.objects?.crm_contract?.writeScope).toBe('own_and_reports');
    // Depth, not the super-user bypass — the two are different grants and the
    // bypass would also skip RLS, reach ownerless rows and widen DELETE.
    expect(salesManager?.objects?.crm_contract?.modifyAllRecords).toBe(false);
    expect(salesManager?.objects?.crm_contract?.allowDelete).toBe(false);
  });

  it('every hierarchy scope the app authors is backed by the capability', () => {
    // The coupling rule, checked over the WHOLE permission surface rather than
    // this one grant: `defineStack` refuses any hierarchy scope unless
    // `requires` carries the token, so authoring one anywhere without it makes
    // the app unloadable. Written as a sweep so a second such grant added later
    // is covered without editing this test.
    const authored: string[] = [];
    for (const ps of ((stack as AnyRec).permissions ?? []) as AnyRec[]) {
      for (const [objName, grant] of Object.entries((ps.objects ?? {}) as Record<string, AnyRec>)) {
        for (const key of ['readScope', 'writeScope'] as const) {
          if (HIERARCHY_SCOPES.has(grant?.[key])) authored.push(`${ps.name}.${objName}.${key}`);
        }
      }
    }
    expect(authored, 'the #880 grant must be among the authored hierarchy scopes')
      .toContain('sales_manager.crm_contract.writeScope');
    expect((stack as AnyRec).requires).toContain('hierarchy-security');
  });

  it('hierarchy-security is an ENTERPRISE capability in the platform vocabulary', () => {
    // The edition boundary, read off the platform's own registry rather than
    // asserted from this app's beliefs. If ObjectStack ever moves the resolver
    // into the open edition, this is the case that notices.
    const provider = (PLATFORM_CAPABILITY_PROVIDERS as AnyRec)['hierarchy-security'];
    expect(provider?.edition).toBe('enterprise');
    expect(provider?.package).toBe('@objectstack/security-enterprise');
  });
});

describe('the spec gate accepts the pair and refuses the half (#880)', () => {
  // `defineStack` THROWS on a hierarchy scope with no capability declared. Both
  // directions are asserted here, so the `requires` line cannot be deleted as
  // "unused" without a red test naming exactly why it exists.
  const minimal = (requires: string[]) => ({
    manifest: {
      id: 'app.objectstack.hierarchy-gate-probe',
      namespace: 'probe',
      version: '1.0.0',
      type: 'app' as const,
      name: 'Hierarchy Gate Probe',
      engines: { protocol: '^17.0.0-rc.6' },
    },
    requires,
    objects: [],
    permissions: [
      {
        name: 'probe_manager',
        label: 'Probe Manager',
        objects: {
          crm_contract: {
            allowCreate: true, allowRead: true, allowEdit: true, allowDelete: false,
            viewAllRecords: true, modifyAllRecords: false,
            writeScope: 'own_and_reports' as const,
          },
        },
      },
    ],
  });

  it('accepts own_and_reports when hierarchy-security is declared', () => {
    expect(() => defineStack(minimal(['hierarchy-security']) as never)).not.toThrow();
  });

  it('refuses own_and_reports when it is not — naming the enterprise package', () => {
    let thrown: Error | undefined;
    try {
      defineStack(minimal([]) as never);
    } catch (err) {
      thrown = err as Error;
    }
    expect(thrown, 'the gate must refuse an undeclared hierarchy scope').toBeDefined();
    expect(thrown?.message).toContain('hierarchy-scope capability validation failed');
    expect(thrown?.message).toContain("writeScope='own_and_reports'");
    expect(thrown?.message).toContain('@objectstack/security-enterprise');
    // The half of the diagnostic that states the edition behaviour this file
    // then measures for real, one describe block down.
    expect(thrown?.message).toContain('fail closed to owner-only');
  });
});

// ── what it resolves to on THIS edition ─────────────────────────────────

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
  // NB: no `hierarchy-scope-resolver` is registered — that service ships in
  // `@objectstack/security-enterprise`, which this repo does not depend on.
  // That absence is the whole subject of the block below.
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
  // Positive control: a contract the manager owns outright. Owner-only depth
  // still covers this, so a suite that had merely broken permissions everywhere
  // could not pass this case.
  id.mgrContract = await insert('crm_contract', contractOwnedBy(id.mgr));

  // A case: the manager holds `allowEdit: false` there.
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

  it('no hierarchy-scope resolver is registered — this IS the open edition', () => {
    // The premise of every assertion below. Stated explicitly so a failure here
    // reads as "the edition changed" rather than surfacing as a puzzling
    // permission result three cases later.
    let resolver: unknown = null;
    try {
      resolver = kernel.getService('hierarchy-scope-resolver');
    } catch {
      resolver = null;
    }
    expect(resolver ?? null).toBeNull();
  });
});

describe('open edition: the hierarchy scope fails closed to owner-only (#880)', () => {
  it('a Sales Manager still cannot edit a REP-owned contract here', async () => {
    // ⚠️ EDITION BOUNDARY, NOT THE #880 DEFECT RETURNING. The declaration says
    // `own_and_reports`; resolving it needs the enterprise
    // `hierarchy-scope-resolver`, absent here, so `resolveOwnerScopeIds`
    // returns the caller alone and the owner-match misses. On the enterprise
    // edition this same metadata lets the manager through.
    const r = await attempt('crm_contract', { id: id.repContract, contract_value: 2500 }, mgrCtx);
    expect(r.ok, 'without the enterprise resolver this must still be refused').toBe(false);
    // MEASURED refusal shape on 17.0.0-rc.6 — the record-level write gate
    // answers with a bare `Error` carrying `code`/`status`, NOT an ADR-0112
    // envelope. Pinned as measured rather than as expected.
    expect(r.code).toBe('FORBIDDEN');
    expect(r.status).toBe(403);
    expect(r.message).toContain('insufficient privileges to update crm_contract');

    const rows = (await ql.find(
      'crm_contract', { where: { id: id.repContract }, fields: ['id', 'contract_value'] }, { context: SYS },
    )) as AnyRec[];
    expect(Number(rows[0]?.contract_value), 'the refused update must not have landed').toBe(1000);
  });

  it('the same is true of terminating it — the act contracts.mdx describes', async () => {
    const r = await attempt('crm_contract', { id: id.repContract, status: 'terminated' }, mgrCtx);
    expect(r.ok).toBe(false);
    expect(r.code).toBe('FORBIDDEN');
  });

  it('but the manager still edits their OWN contract (positive control)', async () => {
    // Owner-only depth covers this, which is what makes the two cases above a
    // statement about DEPTH rather than about permissions being broken.
    const r = await attempt('crm_contract', { id: id.mgrContract, contract_value: 1500 }, mgrCtx);
    expect(r, `the manager was refused on their own contract: ${JSON.stringify(r)}`)
      .toEqual({ ok: true });
  });
});

describe('what the grant deliberately does NOT convey, on any edition', () => {
  it('DELETE stays refused — depth is not the Modify All Data bypass', async () => {
    // `allowDelete: false` is the object gate; `writeScope` widens which owners
    // the caller reaches, never which verbs they hold.
    let refused = false;
    try {
      await ql.delete('crm_contract', id.mgrContract, { context: mgrCtx });
    } catch {
      refused = true;
    }
    expect(refused, 'a Sales Manager must not be able to delete a contract').toBe(true);
    const rows = (await ql.find(
      'crm_contract', { where: { id: id.mgrContract }, fields: ['id'] }, { context: SYS },
    )) as AnyRec[];
    expect(rows.length, 'the contract must still exist').toBe(1);
  });

  it('does not leak to another object — crm_case is still read-only for the manager', async () => {
    const r = await attempt('crm_case', { id: id.case, subject: 'Rewritten' }, mgrCtx);
    expect(r.ok, `the manager edited a case: ${JSON.stringify(r)}`).toBe(false);
  });

  it('a Sales Rep still cannot edit the contract standing in their own name', async () => {
    // Unchanged by this card, and the reason the manager needed the reach at
    // all: the OBJECT gate refuses the rep before ownership is ever consulted,
    // which is a different producer and a different shape from the depth
    // refusal above — `PermissionDeniedError` / `PERMISSION_DENIED`, with a
    // `statusCode` rather than a `status`.
    const r = await attempt('crm_contract', { id: id.repContract, contract_value: 9999 }, repCtx);
    expect(r.ok).toBe(false);
    expect(r.code).toBe('PERMISSION_DENIED');
    expect(r.message).toContain("operation 'update' on object 'crm_contract' is not permitted");
  });
});
