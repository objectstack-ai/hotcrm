// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import { bootStack, type VerifyStack } from '@objectstack/verify';
import artifact from '../objectstack.config';
import { bootOptions, hotcrmStack, signUpPerson, type Person } from './helpers/verify-stack';

type Rec = Record<string, any>;

/**
 * `contact_integrity` dedupes WITHIN an organization, never across them.
 *
 * ## The defect this pins, as measured
 *
 * The hook used to look an address up with no organization scope, on the
 * belief — stated in its own comment — that the unique index on
 * `crm_contact.email` was platform-wide. It is not: the field-level
 * `unique: true` in `contact.object.ts` materializes as the tenant composite
 * `(organization_id, email)` (framework#3696), which is also what
 * `content/docs/sales/contacts.mdx` promises and what
 * `docs-contact-email-uniqueness.test.ts` pins.
 *
 * On the deployment shape where many organizations share one database, the
 * mismatch cost every tenant after the first its whole address book: the seed
 * replay for organization #2 met organization #1's contacts and was refused
 * row by row —
 *
 *     hook 'contact_integrity' threw: Error: Another contact (…) with email
 *     john.smith@acme.example.com already exists.
 *
 * — landing 0 of 9 contacts and, because `crm_contract` requires one, 0 of 4
 * contracts, plus half-populated quotes, quote line items, campaign members
 * and event attendees. Nothing leaked: the tenant wall held throughout and no
 * tenant could read another's rows. The data simply never arrived.
 *
 * ## What the assertions below are worth
 *
 * They are real writes on the shipped app booted by `@objectstack/verify`, so
 * what they measure is the stored row or the engine's refusal, and the
 * `(organization_id, email)` index stands behind the hook as it does in
 * production. Two boots:
 *
 *  - an ORG-BOUND one (`orgContext: true`): the platform's own default-org
 *    bootstrap binds the admin to an organization, so the admin's execution
 *    context carries it exactly as a real deployment's does, and the system's
 *    seed door writes rows stamped with another organization — the
 *    "organization #2's seed replay" shape;
 *  - the default, untenanted one — community edition, no organization
 *    anywhere.
 *
 * What neither can do is stand up the organization WALL: that needs the
 * enterprise organizations package. The single-database, many-organization
 * proof of isolation lives in the enterprise runtime's acceptance suite, which
 * boots this artifact behind the real wall.
 */

const ORG_A = 'org_alpha';
const ORG_B = 'org_beta';
const JOHN = 'john.smith@acme.example.com';

/** The org-bound boot, its admin and the organization the platform bound them to. */
let orgBound: VerifyStack;
let admin: string;
let adminOrg: string;
let accountA: Rec;
let accountB: Rec;
let k = 0;
beforeAll(async () => {
  orgBound = await bootStack(artifact, bootOptions({ orgContext: true }));
  admin = await orgBound.signIn();
  adminOrg = String((await orgBound.contextFor(admin)).tenantId ?? '');
  expect(adminOrg, 'the org-bound boot bound the admin to no organization').not.toBe('');
  [accountA, accountB] = (await orgBound.seed('crm_account', [{ name: 'Acme A' }, { name: 'Acme B' }])) as [Rec, Rec];
  // One contact of ORG_A, the row the first cases try to duplicate.
  await orgBound.seed('crm_contact', [{ first_name: 'John', last_name: 'Smith', email: JOHN, crm_account: accountA.id, organization_id: ORG_A }]);
}, 120_000);

/** A contact the admin opens on account B. */
const adminInserts = (email: string): Promise<Rec> =>
  orgBound.hooks.run('crm_contact', 'insert', {
    first_name: 'John', last_name: `Smith ${++k}`, email, crm_account: accountB.id,
  }, { as: admin });

/** The system's seed door writing a contact stamped with `organization_id` (or none). */
const seedContact = async (email: string, organization_id?: string): Promise<Rec> =>
  (await orgBound.seed('crm_contact', [{
    first_name: 'John', last_name: `Seeded ${++k}`, email, crm_account: accountB.id,
    ...(organization_id ? { organization_id } : {}),
  }]))[0]!;

/** The hook's own refusal — `contact_integrity`'s envelope, not the index's. */
const hookRefusal = { code: 'DUPLICATE_VALUE', status: 409, message: expect.stringMatching(/already exists/) };

describe('contact_integrity scopes its dedupe to the organization', () => {
  it('lets ANOTHER organization know the same person', async () => {
    // The admin's organization is not ORG_A, whose contact carries the address.
    const written = await adminInserts(JOHN);
    expect(written.organization_id).toBe(adminOrg);
  });

  it('still rejects the duplicate INSIDE one organization', async () => {
    // The negative control for the case above: same address, same handler —
    // only the organization of the existing row differs. Without this, "allows
    // it" could equally well mean the guard stopped working.
    await seedContact('ada.inside@acme.example.com', adminOrg);
    await expect(adminInserts('Ada.Inside@acme.example.com')).rejects.toMatchObject(hookRefusal);
  });

  it('scopes by the organization the platform resolved for the caller', async () => {
    // The caller's organization is the one the platform's session resolution
    // put on the execution context (`activeOrganizationId` → `tenantId`), and
    // the row the hook let through is stamped with exactly that one.
    const written = await adminInserts(`resolved.${++k}@acme.example.com`);
    expect(written.organization_id).toBe((await orgBound.contextFor(admin)).tenantId);
  });
});

describe('contact_integrity on a SYSTEM write (the seed replay)', () => {
  it("scopes by the row's own organization stamp when no session carries one", async () => {
    const written = await seedContact(JOHN, ORG_B);
    expect(written.organization_id).toBe(ORG_B);
  });

  it('and still refuses a genuine duplicate within that stamped organization', async () => {
    await expect(seedContact(JOHN, ORG_A)).rejects.toMatchObject(hookRefusal);
  });
});

describe('an untenanted (single-organization) install is unchanged', () => {
  let plain: VerifyStack;
  let rep: Person;
  let accounts: Rec[];
  beforeAll(async () => {
    plain = await hotcrmStack();
    rep = await signUpPerson(plain, 'rep@contact-email-tenant-scope.test', {
      name: 'Sales Rep', positions: ['sales_rep'], permissionSets: ['sales_rep'],
    });
    accounts = await plain.seed('crm_account', [{ name: 'Account A', owner_id: rep.id }, { name: 'Account B', owner_id: rep.id }]);
  }, 120_000);
  const contactOn = async (account: Rec, email: string): Promise<Rec> =>
    (await plain.seed('crm_contact', [{ first_name: 'Ada', last_name: `Lovelace ${++k}`, email, crm_account: account.id, owner_id: rep.id }]))[0]!;

  it('keeps rejecting a cross-account duplicate for a USER write', async () => {
    // No organization anywhere — community edition never populates one — and
    // an authenticated caller. The cross-account guard #648 documents must
    // still fire, or this fix would have traded one defect for another.
    await contactOn(accounts[0]!, 'ada@example.com');
    await expect(plain.hooks.run('crm_contact', 'insert', {
      first_name: 'Ada', last_name: 'Again', email: 'ada@example.com', crm_account: accounts[1]!.id,
    }, { as: rep.token })).rejects.toMatchObject(hookRefusal);
  });

  it('does not flag a contact as its own duplicate on update', async () => {
    const own = await contactOn(accounts[0]!, 'ada.own@example.com');
    await plain.hooks.run('crm_contact', 'update', { id: own.id, email: 'ada.own@example.com' }, { as: rep.token });
    const [after] = await plain.rows('crm_contact', { id: own.id });
    expect(after!.email).toBe('ada.own@example.com');
  });

  it('skips the friendly guard when the organization cannot be resolved at all', async () => {
    // Neither a user nor a stamp: a system write on an install with no
    // organization. An unscoped lookup here is precisely what starved the
    // second tenant, so the hook skips it — and the unique index is still the
    // enforcement: the duplicate is refused by the INDEX, not by the hook.
    await contactOn(accounts[0]!, 'grace@example.com');
    await expect(contactOn(accounts[1]!, 'Grace@Example.com')).rejects.toMatchObject({ code: 'DUPLICATE_RECORD', status: 409 });
    // The lowercasing still runs — the guard is skipped, not the whole hook.
    const unscoped = await contactOn(accounts[1]!, 'Grace.Hopper@Example.com');
    expect(unscoped.email).toBe('grace.hopper@example.com');
  });
});
