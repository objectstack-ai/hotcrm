// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import contactHooks from '../src/objects/contact.hook';
import { makeHarness, makeCtx, hookNamed, type Rec } from './helpers/hook-harness';

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
 * They run the REAL handler against the in-memory `ctx.api` harness, so they
 * measure behaviour rather than the presence of a `where` key. What they
 * cannot do is prove the enforcement end to end — a hook harness has no
 * database and therefore no `(organization_id, email)` index. The
 * single-database, many-organization proof lives in the enterprise runtime's
 * acceptance suite, which boots this artifact behind the real wall.
 */

const hook = hookNamed(contactHooks, 'contact_integrity');
const ORG_A = 'org_alpha';
const ORG_B = 'org_beta';

/** One contact of ORG_A, the row every case below tries to duplicate. */
const existing = (): Rec[] => [
  { id: 'c1', email: 'john.smith@acme.example.com', organization_id: ORG_A, crm_account: 'accA' },
];

describe('contact_integrity scopes its dedupe to the organization', () => {
  it('lets ANOTHER organization know the same person', async () => {
    const h = makeHarness({ crm_contact: existing() });
    await expect(
      hook.handler(makeCtx({
        event: 'beforeInsert',
        input: { email: 'john.smith@acme.example.com', crm_account: 'accB' },
        user: { id: 'user_b', organizationId: ORG_B },
        api: h.api,
      })),
    ).resolves.toBeUndefined();
  });

  it('still rejects the duplicate INSIDE one organization', async () => {
    // The negative control for the case above: same store, same address, same
    // handler — only the caller's organization differs. Without this, "allows
    // it" could equally well mean the guard stopped working.
    const h = makeHarness({ crm_contact: existing() });
    await expect(
      hook.handler(makeCtx({
        event: 'beforeInsert',
        input: { email: 'John.Smith@acme.example.com', crm_account: 'accB' },
        user: { id: 'user_a', organizationId: ORG_A },
        api: h.api,
      })),
    ).rejects.toThrow(/already exists/);
  });

  it('reads the organization off the session when the user shortcut carries none', async () => {
    const h = makeHarness({ crm_contact: existing() });
    await expect(
      hook.handler(makeCtx({
        event: 'beforeInsert',
        input: { email: 'john.smith@acme.example.com' },
        user: { id: 'user_b' },
        session: { userId: 'user_b', organizationId: ORG_B },
        api: h.api,
      })),
    ).resolves.toBeUndefined();
  });
});

describe('contact_integrity on a SYSTEM write (the seed replay)', () => {
  it("scopes by the row's own organization stamp when no session carries one", async () => {
    const h = makeHarness({ crm_contact: existing() });
    await expect(
      hook.handler(makeCtx({
        event: 'beforeInsert',
        input: { email: 'john.smith@acme.example.com', organization_id: ORG_B },
        api: h.api,
      })),
    ).resolves.toBeUndefined();
  });

  it('and still refuses a genuine duplicate within that stamped organization', async () => {
    const h = makeHarness({ crm_contact: existing() });
    await expect(
      hook.handler(makeCtx({
        event: 'beforeInsert',
        input: { email: 'john.smith@acme.example.com', organization_id: ORG_A },
        api: h.api,
      })),
    ).rejects.toThrow(/already exists/);
  });

  it('skips the friendly guard when the organization cannot be resolved at all', async () => {
    // Neither a user nor a stamp: an unscoped lookup here is precisely what
    // starved the second tenant, and the `(organization_id, email)` index is
    // still the enforcement. Skipping is deliberate, so it is asserted.
    const h = makeHarness({ crm_contact: existing() });
    const input: Rec = { email: 'John.Smith@acme.example.com' };
    await expect(
      hook.handler(makeCtx({ event: 'beforeInsert', input, api: h.api })),
    ).resolves.toBeUndefined();
    // The lowercasing still runs — the guard is skipped, not the whole hook.
    expect(input.email).toBe('john.smith@acme.example.com');
  });
});

describe('an untenanted (single-organization) install is unchanged', () => {
  it('keeps rejecting a cross-account duplicate for a USER write', async () => {
    // No organization anywhere — community edition never populates one — and
    // an authenticated caller. The cross-account guard #648 documents must
    // still fire, or this fix would have traded one defect for another.
    const h = makeHarness({
      crm_contact: [{ id: 'c1', email: 'ada@example.com', crm_account: 'accA' }],
    });
    await expect(
      hook.handler(makeCtx({
        event: 'beforeInsert',
        input: { email: 'ada@example.com', crm_account: 'accB' },
        user: { id: 'user_1' },
        api: h.api,
      })),
    ).rejects.toThrow(/already exists/);
  });

  it('does not flag a contact as its own duplicate on update', async () => {
    const h = makeHarness({
      crm_contact: [{ id: 'c1', email: 'ada@example.com', organization_id: ORG_A }],
    });
    await expect(
      hook.handler(makeCtx({
        event: 'beforeUpdate',
        input: { email: 'ada@example.com' },
        previous: { id: 'c1', email: 'ada@example.com', organization_id: ORG_A },
        user: { id: 'user_a', organizationId: ORG_A },
        api: h.api,
      })),
    ).resolves.toBeUndefined();
  });
});
