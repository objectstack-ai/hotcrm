// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { describeAnchorForbiddenBits } from '@objectstack/spec/security';
import { bootStack, type VerifyStack } from '@objectstack/verify';
import { SecurityPlugin } from '@objectstack/plugin-security';
import artifact from '../objectstack.config';
import stack from './helpers/composed-stack';
import { bootOptions, hotcrmStack, signUpPerson } from './helpers/verify-stack';

/**
 * The package's default permission set (#2231, objectstack#25083 ruling Q1 B).
 *
 * `crm_user` is the one set HotCRM marks `isDefault: true`: at install the
 * platform records an audience-binding suggestion for it, and one acceptance
 * binds it to the `everyone` anchor (ADR-0090 D5). The canonical note is
 * `src/sales/profiles/crm-user.profile.ts`. What this file pins is the app's
 * own facts about that set: which set it is, that the platform's anchor gate
 * takes it, that it stays inside a rep's grants, and what accepting it does
 * for a member nobody assigned a profile to.
 */

type AnyRec = Record<string, any>;

const permissionSets: AnyRec[] = (stack as any).permissions ?? [];
const setByName = new Map(permissionSets.map((p) => [p.name as string, p]));
const DEFAULT_SET = 'crm_user';
const PACKAGE_ID = 'app.objectstack.hotcrm';

/** The objects the issue names: a member opens the Sales app and reads these. */
const SALES_BOOK = ['crm_account', 'crm_contact', 'crm_opportunity'] as const;

describe('the default permission set', () => {
  it('exactly one permission set is the default, and it is crm_user', () => {
    const defaults = permissionSets.filter((p) => p.isDefault === true).map((p) => p.name);
    expect(defaults).toEqual([DEFAULT_SET]);
  });

  it('the platform anchor gate accepts it for everyone (no View All, delete, transfer, export or system permission)', () => {
    // The platform's own predicate — the one the acceptance runs — not a
    // second reading of the high-privilege list.
    expect(describeAnchorForbiddenBits(setByName.get(DEFAULT_SET), 'everyone')).toBeNull();
  });

  it('every grant it makes is one sales_rep already makes, so a rep gains nothing from holding it too', () => {
    const rep = setByName.get('sales_rep')?.objects ?? {};
    const BITS = ['allowCreate', 'allowRead', 'allowEdit', 'allowDelete', 'allowTransfer', 'viewAllRecords', 'modifyAllRecords', 'allowExport'];
    const wider = Object.entries((setByName.get(DEFAULT_SET)?.objects ?? {}) as Record<string, AnyRec>).flatMap(([object, perm]) =>
      BITS.filter((bit) => perm[bit] === true && rep[object]?.[bit] !== true).map((bit) => `${object}.${bit}`),
    );
    expect(wider, 'crm_user grants what sales_rep does not').toEqual([]);
  });

  it('authors no field-level security, so it narrows no other persona', () => {
    // Field permissions merge most-permissive over the fields a held set
    // AUTHORS; a restriction here would bind every member — see the profile.
    expect(Object.keys(setByName.get(DEFAULT_SET)?.fields ?? {})).toEqual([]);
  });
});

/**
 * A managed environment: an invited member is created just in time holding
 * the platform baseline alone, and the package's default set reaches them only
 * through the accepted suggestion. The boot models that with the platform's
 * SecurityPlugin built bare — `objectstack serve` and the shared boot hand it
 * the app's `isDefault` set as an additive baseline (ADR-0056 D7, measured in
 * the next block), which would make the acceptance prove nothing.
 */
describe('accepting the install suggestion reaches a member nobody assigned (managed environment)', () => {
  let verify: VerifyStack;
  let admin: string;
  let member: { token: string; id: string };
  let suggestionId: string;

  beforeAll(async () => {
    verify = await bootStack(artifact, bootOptions({ security: new SecurityPlugin() }));
    admin = await verify.signIn();
    member = await signUpPerson(verify, 'member@default-set.test', { name: 'Invited Member' });
  }, 120_000);

  // A boot of its own, so it is stopped: one configuration holds one live
  // kernel, and the shared boot below is the same configuration.
  afterAll(() => verify?.stop());

  it('install records one pending suggestion for crm_user on the everyone anchor', async () => {
    const res = await verify.apiAs(admin, 'GET', `/security/suggested-bindings?packageId=${PACKAGE_ID}`);
    expect(res.status).toBe(200);
    const rows: AnyRec[] = ((await res.json()) as AnyRec).data.suggestions;
    expect(rows.map((r) => [r.permission_set_name, r.anchor, r.status])).toEqual([[DEFAULT_SET, 'everyone', 'pending']]);
    suggestionId = String(rows[0].id);
  });

  it('before acceptance the member reads none of the sales book', async () => {
    for (const object of SALES_BOOK) {
      expect((await verify.apiAs(member.token, 'GET', `/data/${object}`)).status, object).toBe(403);
    }
  });

  it('acceptance answers bindingCreated: true, not the high-privilege refusal', async () => {
    const res = await verify.apiAs(admin, 'POST', `/security/suggested-bindings/${suggestionId}/confirm`);
    expect(res.status).toBe(200);
    expect(((await res.json()) as AnyRec).data.bindingCreated).toBe(true);
  });

  it('after acceptance the same member reads accounts, contacts and opportunities, and works their own account', async () => {
    for (const object of SALES_BOOK) {
      expect((await verify.apiAs(member.token, 'GET', `/data/${object}`)).status, object).toBe(200);
    }
    const created = await verify.apiAs(member.token, 'POST', '/data/crm_account', { name: 'Default Set Probe Co' });
    expect(created.status).toBe(201);
    const id = ((await created.json()) as AnyRec).id;
    expect((await verify.apiAs(member.token, 'GET', `/data/crm_account/${id}`)).status).toBe(200);
    // Still no delete and no export: the set carries neither.
    expect((await verify.apiAs(member.token, 'DELETE', `/data/crm_account/${id}`)).status).toBe(403);
    expect((await verify.apiAs(member.token, 'GET', '/data/crm_account/export?format=csv')).status).toBe(403);
  });
});

/**
 * `objectstack serve` / `dev` — the self-hosted runtime and the shared boot.
 * The CLI hands the app's `isDefault` set to the SecurityPlugin as the human
 * baseline (`appSecurityPluginOptions`, ADR-0056 D7), so every member holds it
 * from the first request, and the suggestion is recorded as already observed
 * rather than pending. `profiles.mdx` says so; this pins it.
 */
describe('on a self-hosted runtime the default set is every member’s baseline from the start', () => {
  it('a fresh member holds crm_user without any acceptance, and the suggestion reads as confirmed', async () => {
    const verify = await hotcrmStack();
    const admin = await verify.signIn();
    const member = await signUpPerson(verify, 'member@default-set-serve.test', { name: 'Self-hosted Member' });
    const me = (await (await verify.apiAs(member.token, 'GET', '/auth/me/permissions')).json()) as AnyRec;
    expect(me.permissionSets).toContain(DEFAULT_SET);
    const rows: AnyRec[] = ((await (await verify.apiAs(admin, 'GET', `/security/suggested-bindings?packageId=${PACKAGE_ID}`)).json()) as AnyRec).data.suggestions;
    expect(rows.map((r) => [r.permission_set_name, r.status, r.deployment_decision])).toEqual([[DEFAULT_SET, 'confirmed', false]]);
  }, 120_000);
});
