// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { bootStack, type VerifyStack } from '@objectstack/verify';
import { signUpPerson, type Person } from './helpers/verify-stack';
import { defineStack, PLATFORM_CAPABILITY_PROVIDERS } from '@objectstack/spec';
import artifact from '../objectstack.config';
import stack from './helpers/composed-stack';

/**
 * A Sales Manager's WRITE reach on `crm_contract` — the declaration, and what it
 * resolves to on THIS edition (#880, re-taken for #549).
 *
 * ### What was broken (#880)
 *
 * `sales_manager` has held `allowEdit: true` on `crm_contract` since the app
 * shipped, and every contract that matters answered **403** anyway. The object
 * gate is only the first of two doors: `crm_contract` was `sharingModel:
 * 'private'` with an owner field, so `plugin-sharing`'s write gate then asked
 * whether the record's owner fell inside the caller's write DEPTH — `own` by
 * default — and the manager could edit only contracts they had created
 * themselves. That is precisely the wrong half: `quote_on_accepted`
 * (`src/revenue/objects/quote.hook.ts`) copies the accepted quote's `owner_id`
 * onto the contract it drafts, so the most common contract in the app hangs
 * under the **rep** who closed the deal.
 *
 * #880 answered with `writeScope: 'own_and_reports'`, an ADR-0057 HIERARCHY
 * scope that only the enterprise `hierarchy-scope-resolver` resolves — so on
 * the open edition (this suite) the manager was still refused, and this file
 * pinned that 403 as an edition boundary.
 *
 * ### What this file pins now (#549)
 *
 * Since #549 `crm_contract` is `controlled_by_parent` under `crm_account`
 * (ruling 2026-08-31). The second door is no longer "is the owner inside your
 * write depth" but "can you EDIT the account" — and `sales_manager` holds
 * `modifyAllRecords: true` on `crm_account`, so a manager edits every
 * contract, on every edition, and the #880 workflow works without a hierarchy
 * resolver. The `own_and_reports` scope is therefore INERT on this object
 * (`test/authorization-coverage.test.ts` refuses an authored scope on a
 * parent-derived object) and is no longer declared. `requires:
 * ['hierarchy-security']` stays declared — the 2026-08-31 #1378 refusal to
 * remove it stands, pinned by `test/hierarchy-read-depth.test.ts`.
 *
 * ### How to read a failure here
 *
 * - The DECLARATION cases going red means a hierarchy scope crept back onto
 *   the grant (it would be inert) or the object-level bits moved.
 * - The manager's edit going red means the parent-derived write gate stopped
 *   resolving the account through `modifyAllRecords`, or the OWD moved back to
 *   `private` — either way the #880 defect is back; check the OWD first.
 * - The controls going red means the derivation has been confused with the
 *   Modify All Data bypass on the CONTRACT, which the grant must not become.
 */

type AnyRec = Record<string, any>;

process.env.OS_REGISTRY_LOG ??= 'silent';


/** ADR-0057 hierarchy scopes — the values that need the enterprise resolver. */
const HIERARCHY_SCOPES = new Set(['unit', 'unit_and_below', 'own_and_reports']);

let verify: VerifyStack;
const id: Record<string, string> = {};
let mgr: Person;
let rep: Person;
let mgrCtx: AnyRec;
let repCtx: AnyRec;

/** A system write — the fixture's setup channel (the handle's `seed` door). */
const insert = async (object: string, doc: AnyRec): Promise<string> => {
  const [row] = await verify.seed(object, [doc]);
  return String(row?.id);
};

/** Attempt a write as `who`; report the refusal verbatim rather than a boolean. */
const attempt = async (object: string, doc: AnyRec, who: Person) => {
  try {
    await verify.hooks.run(object, 'update', doc, { as: who.token });
    return { ok: true as const };
  } catch (err: unknown) {
    const e = err as AnyRec;
    return {
      ok: false as const,
      message: String(e?.message ?? ''),
      code: e?.code,
      status: e?.status ?? e?.statusCode,
      details: e?.details,
      developerMessage: e?.developerMessage,
    };
  }
};

// ── the declaration ─────────────────────────────────────────────────────
// Static, and deliberately first: these run without a kernel, so a dropped
// declaration is reported as itself rather than as a downstream permission
// oddity.

describe('the declaration (#880 → #549)', () => {
  const salesManager = ((stack as AnyRec).permissions as AnyRec[])
    .find((p) => p.name === 'sales_manager');
  const contract = ((stack as AnyRec).objects as AnyRec[]).find((o) => o.name === 'crm_contract');

  it('crm_contract is controlled_by_parent under crm_account, authored as master-detail', () => {
    expect(contract?.sharingModel).toBe('controlled_by_parent');
    // Authored, not positional: `crm_contact` is a required lookup too, and a
    // master decided by declaration order is refused at author time
    // (`security-controlled-by-parent-ambiguous-relation`, objectstack#14747).
    expect(contract?.fields?.crm_account?.type).toBe('master_detail');
    expect(contract?.fields?.crm_account?.required).toBe(true);
  });

  it('sales_manager authors NO scope on crm_contract — it would be inert', () => {
    expect(salesManager?.objects?.crm_contract?.writeScope).toBeUndefined();
    expect(salesManager?.objects?.crm_contract?.readScope).toBeUndefined();
    expect(salesManager?.objects?.crm_contract?.allowEdit).toBe(true);
    // Not the super-user bypass — the bypass would also skip RLS, reach
    // ownerless rows and widen DELETE.
    expect(salesManager?.objects?.crm_contract?.modifyAllRecords).toBe(false);
    expect(salesManager?.objects?.crm_contract?.allowDelete).toBe(false);
    // The door the write now goes through.
    expect(salesManager?.objects?.crm_account?.modifyAllRecords).toBe(true);
  });

  it('the app authors no hierarchy scope anywhere, and still declares the capability', () => {
    // `own_and_reports` on crm_contract was the app's only hierarchy scope. The
    // sweep is kept so a second such grant added later is covered; the
    // `requires` line stays by the #1378 ruling (see hierarchy-read-depth).
    const authored: string[] = [];
    for (const ps of ((stack as AnyRec).permissions ?? []) as AnyRec[]) {
      for (const [objName, grant] of Object.entries((ps.objects ?? {}) as Record<string, AnyRec>)) {
        for (const key of ['readScope', 'writeScope'] as const) {
          if (HIERARCHY_SCOPES.has(grant?.[key])) authored.push(`${ps.name}.${objName}.${key}`);
        }
      }
    }
    expect(authored).toEqual([]);
    expect((stack as AnyRec).requires).toContain('hierarchy-security');
  });

  it('hierarchy-security is an ENTERPRISE capability in the platform vocabulary', () => {
    const provider = (PLATFORM_CAPABILITY_PROVIDERS as AnyRec)['hierarchy-security'];
    expect(provider?.edition).toBe('enterprise');
    expect(provider?.package).toBe('@objectstack/security-enterprise');
  });
});

describe('the spec gate accepts the pair and refuses the half (#880)', () => {
  // `defineStack` THROWS on a hierarchy scope with no capability declared. Both
  // directions are still asserted, on a probe stack: this is what the
  // `requires` line protects the day a hierarchy scope is authored again.
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
    expect(thrown?.message).toContain('fail closed to owner-only');
  });
});

// ── what it resolves to on THIS edition ─────────────────────────────────

beforeAll(async () => {
  // The platform's boot: `@objectstack/verify`'s `bootStack` over the shipped
  // artifact — objectql, auth (and its `tenancy` service), security with the
  // app's own default profile, sharing. On the in-memory datasource this file
  // has always measured on.
  //
  // NB: no `hierarchy-scope-resolver` is registered — that service ships in
  // `@objectstack/security-enterprise`, which this repo does not depend on.
  // The manager's edit below must succeed WITHOUT it.
  verify = await bootStack(artifact, { databaseDriver: 'memory' });

  // Fresh sign-ups are plain members (the stack's first user is its own
  // platform admin), given exactly the standing the fixture names.
  mgr = await signUpPerson(verify, 'mgr@contract-depth.test', {
    name: 'Sales Manager', positions: ['sales_manager'], permissionSets: ['sales_manager'],
  });
  rep = await signUpPerson(verify, 'rep@contract-depth.test', {
    name: 'Sales Rep', positions: ['sales_rep'], permissionSets: ['sales_rep'],
  });
  id.mgr = mgr.id;
  id.rep = rep.id;

  // The account is owned by the REP and shared to nobody: a JP prospect, so
  // neither territory rule nor `account_team_sharing` (active CUSTOMER
  // accounts → sales_manager) materialises a share. The manager reaches it
  // through `modifyAllRecords` on crm_account and nothing else.
  id.account = await insert('crm_account', {
    name: 'Depth Co', type: 'prospect', is_active: true, owner_id: id.rep,
    billing_address: { country: 'JP' },
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
  // THE record #880 is about: the shape `quote_on_accepted` drafts — owned by
  // the rep who closed the deal, not by the manager.
  id.repContract = await insert('crm_contract', contractOwnedBy(id.rep));
  id.mgrContract = await insert('crm_contract', contractOwnedBy(id.mgr));

  // A case: the manager holds `allowEdit: false` there.
  id.case = await insert('crm_case', {
    subject: 'Depth control', description: 'Negative control for #880.',
    crm_account: id.account, crm_contact: id.contact,
    owner_id: id.rep, status: 'new', priority: 'medium', origin: 'web',
  });

  mgrCtx = await verify.contextFor(mgr.token) as AnyRec;
  repCtx = await verify.contextFor(rep.token) as AnyRec;
}, 120_000);

afterAll(async () => {
  await verify?.stop();
});

describe('the harness enforces (negative controls)', () => {
  it('neither principal carries a platform-admin bypass', () => {
    expect(mgrCtx.permissions).toContain('sales_manager');
    expect(repCtx.permissions).toContain('sales_rep');
    for (const ctx of [mgrCtx, repCtx]) {
      expect(ctx.permissions).not.toContain('admin_full_access');
      // The resolver's admin verdict is the context's `posture`.
      expect(ctx.posture).toBe('MEMBER');
    }
  });

  it('the fixture contract really is owned by the rep, not the manager', async () => {
    const rows = await verify.rows('crm_contract', { id: id.repContract });
    expect(String(rows[0]?.owner_id)).toBe(id.rep);
    expect(String(rows[0]?.owner_id)).not.toBe(id.mgr);
  });

  it('no hierarchy-scope resolver is registered — this IS the open edition', () => {
    // The premise of the block below: the manager's edit must not depend on
    // the enterprise resolver.
    let resolver: unknown = null;
    try {
      resolver = verify.kernel.getService('hierarchy-scope-resolver');
    } catch {
      resolver = null;
    }
    expect(resolver ?? null).toBeNull();
  });

  it('the account is shared to nobody — the manager reaches it by modifyAllRecords alone', async () => {
    const shares = await verify.rows('sys_record_share', { object_name: 'crm_account', record_id: id.account });
    expect(shares).toEqual([]);
  });
});

describe('open edition: a Sales Manager edits a REP-owned contract through the account (#880 closed by #549)', () => {
  it('the manager changes the value of a contract standing in a rep’s name', async () => {
    // Before #549 this was refused (`own_and_reports` with no resolver fails
    // closed to owner-only). Now the parent-derived write gate asks whether
    // the manager can edit the ACCOUNT — `modifyAllRecords: true` — and the
    // owner of the contract row is irrelevant.
    const r = await attempt('crm_contract', { id: id.repContract, contract_value: 2500 }, mgr);
    expect(r, `the manager was refused on a rep-owned contract: ${JSON.stringify(r)}`)
      .toEqual({ ok: true });
    const rows = await verify.rows('crm_contract', { id: id.repContract });
    expect(Number(rows[0]?.contract_value)).toBe(2500);
  });

  it('and terminates it — the act contracts.mdx describes', async () => {
    const r = await attempt('crm_contract', { id: id.repContract, status: 'terminated' }, mgr);
    expect(r).toEqual({ ok: true });
  });

  it('and still edits their OWN contract (positive control)', async () => {
    const r = await attempt('crm_contract', { id: id.mgrContract, contract_value: 1500 }, mgr);
    expect(r).toEqual({ ok: true });
  });

  it('the rep still cannot edit the contract they own — the object gate, unchanged', async () => {
    // `allowEdit: false` on crm_contract for sales_rep. The rep can EDIT the
    // account (they own it), so this refusal is the object gate and nothing
    // else — the parent-derived write gate never gets a say.
    const r = await attempt('crm_contract', { id: id.repContract, contract_value: 9999 }, rep);
    expect(r.ok, 'a rep edited a contract').toBe(false);
    // The ENVELOPE is the contract (ADR-0112): code + status, then the
    // structured facts naming WHICH verb was refused on WHICH object.
    expect(r.code).toBe('PERMISSION_DENIED');
    expect(r.status).toBe(403);
    expect(r.details).toMatchObject({ operation: 'update', object: 'crm_contract' });
    expect(String(r.developerMessage)).toContain(
      "operation 'update' on object 'crm_contract' is not permitted",
    );
  });
});

describe('what the grant deliberately does NOT convey', () => {
  it('DELETE stays refused — the account door is not the Modify All Data bypass', async () => {
    // `allowDelete: false` is the object gate; deriving from the account widens
    // which ROWS the caller reaches, never which verbs they hold.
    let refused = false;
    try {
      await verify.hooks.run('crm_contract', 'delete', { id: id.mgrContract }, { as: mgr.token });
    } catch {
      refused = true;
    }
    expect(refused, 'a Sales Manager must not be able to delete a contract').toBe(true);
    const rows = await verify.rows('crm_contract', { id: id.mgrContract });
    expect(rows.length, 'the contract must still exist').toBe(1);
  });

  it('does not leak to another object — crm_case is still read-only for the manager', async () => {
    const r = await attempt('crm_case', { id: id.case, subject: 'Rewritten' }, mgr);
    expect(r.ok, `the manager edited a case: ${JSON.stringify(r)}`).toBe(false);
  });
});
