// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ObjectKernel } from '@objectstack/core';
import { DefaultDatasourcePlugin, AppPlugin } from '@objectstack/runtime';
import { ObjectQLPlugin } from '@objectstack/objectql';
import { MetadataPlugin } from '@objectstack/metadata';
import stack from '../objectstack.config';

/**
 * A guard's refusal must name the record that is refusing — never the record
 * the caller "must have" addressed (#693).
 *
 * ### What went wrong
 *
 * Found in the 17.0 GA acceptance sweep, tearing down a converted-lead chain:
 *
 *     DELETE /api/v1/data/crm_account/<id>
 *     → 400 "Cannot delete contact: still referenced by 1 open opportunity(ies),
 *            0 active quote(s), 0 active contract(s)"
 *
 *     DELETE /api/v1/data/crm_opportunity/<id>
 *     → 400 "Cannot edit a converted lead (attempted: converted_opportunity).
 *            Make changes on the converted record…"
 *
 * Both refusals are CORRECT — and both describe a different object, and in the
 * second case a different operation, than the caller performed. The reader is
 * sent to the wrong record, and the second one advises editing the very record
 * the caller asked to delete.
 *
 * ### Why the hooks cannot simply say "delete"
 *
 * Each guard has TWO invocation contexts and no way to tell them apart:
 *
 * - `contact_integrity`'s `beforeDelete` runs on a direct contact delete AND as
 *   a cascade child of an account delete (`crm_contact.crm_account` is a
 *   master-detail with `deleteBehavior: 'cascade'`).
 * - The `beforeUpdate` locks (`lead_automation`, `opportunity_lifecycle`,
 *   `quote_workflow`) run on a hand edit AND on the engine's referential clear:
 *   `cascadeDeleteRelations` implements `set_null` by UPDATING the row that
 *   holds the lookup, so deleting the referenced record arrives at the guard as
 *   `{ <field>: null }`.
 *
 * Measured on 17.0.0-rc.2 (pinned by the first test below), the hook context in
 * the cascade case carries no marker at all: the same keys, and a `session`
 * that is the caller's own. So the fix is not to detect the cascade — it is to
 * phrase every refusal from the BLOCKING RELATIONSHIP, which is true in both
 * contexts. The messages name the refusing record, the references that block,
 * and what to do.
 *
 * ⚠️ Superseded in part by #720. The three `beforeUpdate` locks no longer refuse
 * the referential clear at all — they yield to it on the write SHAPE, so those
 * deletes now succeed and their refusal messages have been deleted rather than
 * re-worded. That half moved to `test/freeze-guard-reference-cleanup.test.ts`.
 * The `beforeDelete` half below is untouched and still refuses.
 *
 * ### Why this file boots a real kernel
 *
 * `test/hooks-runtime*.test.ts` call the handlers directly, which proves the
 * wording but not that a cascade produces it. Only the engine's own referential
 * pass can show that `DELETE crm_account` ends in the contact guard — and it is
 * the engine that decides which guard gets there first. Everything below is the
 * message a real `DELETE` returns.
 */

type AnyRec = Record<string, any>;

// The object registry announces every registered object on stdout at `info`;
// the kernel logger is silenced the same way. Both are noise here.
process.env.OS_REGISTRY_LOG ??= 'silent';

const SYS = { isSystem: true } as AnyRec;

let kernel: AnyRec;
let ql: AnyRec;
/** The context a REST `DELETE` runs under: a real user id. */
let userCtx: AnyRec;

const insert = (object: string, doc: AnyRec): Promise<AnyRec> =>
  ql.insert(object, doc, { context: SYS });

/** Delete as the user and return the refusal message (or `null` if it went through). */
const deleteAndCatch = async (object: string, id: string): Promise<string | null> => {
  try {
    await ql.delete(object, { where: { id }, context: userCtx });
    return null;
  } catch (e) {
    return (e as Error).message;
  }
};

const rowsOf = (object: string, id: string): Promise<AnyRec[]> =>
  ql.find(object, { where: { id } }, { context: SYS });

/** A unique suffix per fixture — `crm_contact.email` is globally unique. */
let seq = 0;
const uniq = (): string => `${++seq}`;

beforeAll(async () => {
  kernel = new ObjectKernel({ logger: { level: 'silent' } } as never);
  await kernel.use(new DefaultDatasourcePlugin({ driver: 'memory', config: {} } as never));
  await kernel.use(new MetadataPlugin({ watch: false, artifactWatch: false, environmentId: 'proj_693' } as never));
  await kernel.use(new ObjectQLPlugin({ environmentId: 'proj_693' } as never));
  // The app's own metadata is the subject — objects and hooks exactly as
  // `objectstack.config.ts` declares them. Seed data is skipped; each test
  // builds the population it needs.
  await kernel.use(new AppPlugin(stack as never, undefined as never, { skipSeedData: true } as never));
  await kernel.bootstrap();
  ql = kernel.getService('objectql');

  const user = await insert('sys_user', { name: 'Acceptance Rep', email: 'rep@cascade-guards.test' });
  // `isSystem` keeps the fixture out of the sharing model (not what this file
  // measures); `userId` is what matters — every guard here is deliberately a
  // USER-write guard and stands down without it.
  userCtx = { userId: user.id, isSystem: true } as AnyRec;
}, 180_000);

afterAll(async () => {
  await kernel?.shutdown?.();
});

/** An account with one contact on it. */
const accountWithContact = async (label: string) => {
  const n = uniq();
  const account = await insert('crm_account', {
    name: `${label} ${n}`, type: 'customer', industry: 'technology',
  });
  const contact = await insert('crm_contact', {
    first_name: 'Ada', last_name: 'Lovelace',
    crm_account: account.id, email: `ada.${n}@cascade-guards.test`,
  });
  return { account, contact };
};

// ────────────────────────────── the premise: no cascade marker in the ctx ──

describe('a guard cannot tell a cascade from a direct write', () => {
  /**
   * The measurement the whole fix rests on. If a future platform version starts
   * marking referential writes, this test fails — and the messages below can be
   * re-taken as "…so this ACCOUNT cannot be deleted", which is strictly better.
   * Treat a failure here as news, not as a regression to paper over.
   */
  it('carries no cascade flag on a cascaded beforeDelete or referential update', async () => {
    const seen: AnyRec[] = [];
    ql.registerHook('beforeDelete', async (ctx: AnyRec) => {
      if (ctx.object !== 'crm_contact') return;
      seen.push({ where: 'contact.beforeDelete', keys: Object.keys(ctx), session: ctx.session ?? {} });
    }, { object: 'crm_contact', priority: 1 });

    const { account } = await accountWithContact('Marker Probe');
    // Nothing blocks this one — the cascade runs to completion.
    expect(await deleteAndCatch('crm_account', account.id)).toBeNull();

    expect(seen, 'the cascade never reached the contact guard').toHaveLength(1);
    const [probe] = seen;
    const marker = /cascade|referential|__/i;
    expect(probe.keys.filter((k: string) => marker.test(k))).toEqual([]);
    expect(Object.keys(probe.session).filter((k: string) => marker.test(k))).toEqual([]);
    // Positively: the session is the CALLER's, which is exactly why it cannot
    // be used to tell the two invocations apart.
    expect(probe.session.userId).toBe(userCtx.userId);
  });
});

// ─────────────────────────────────────────── symptom 1: the account delete ──

describe('deleting an account whose contact is still referenced', () => {
  const build = async () => {
    const { account, contact } = await accountWithContact('Acme Corp');
    // The blocking opportunity sits on ANOTHER account, so the platform's own
    // restrict on the required `crm_opportunity.crm_account` does not fire
    // first — the contact guard is what answers, which is the reported case.
    const elsewhere = await insert('crm_account', {
      name: `Elsewhere ${uniq()}`, type: 'customer', industry: 'technology',
    });
    await insert('crm_opportunity', {
      name: 'Acme Renewal', crm_account: elsewhere.id, primary_contact: contact.id,
      stage: 'negotiation', amount: 1000, close_date: '2026-12-01',
    });
    return { account, contact };
  };

  it('names the contact that blocks, and says the account delete is blocked with it', async () => {
    const { account, contact } = await build();
    const message = await deleteAndCatch('crm_account', account.id);

    expect(message, 'the account delete must still be refused').toBeTruthy();
    // Named, not keyed (#1243): the sentence carries `full_name`, which is what
    // every contact surface in the app shows. The id is what the guard queried
    // BY, and it stays out of the prose.
    expect(message).toContain('Contact Ada Lovelace is still referenced by');
    expect(message).not.toContain(contact.id);
    expect(message).toContain('1 open opportunity(ies)');
    expect(message).toContain('neither can its account');
    // The reported symptom: a caller who addressed an ACCOUNT was told they
    // could not delete a CONTACT.
    expect(message).not.toContain('Cannot delete contact');
  });

  it('refuses, and leaves the whole chain in place (semantics unchanged)', async () => {
    const { account, contact } = await build();
    await deleteAndCatch('crm_account', account.id);
    expect(await rowsOf('crm_account', account.id)).toHaveLength(1);
    expect(await rowsOf('crm_contact', contact.id)).toHaveLength(1);
  });

  it('says the same thing when the contact is addressed directly', async () => {
    // The point of the phrasing: it does not depend on which record the caller
    // named, so both invocations get one accurate sentence.
    const { contact } = await build();
    const message = await deleteAndCatch('crm_contact', contact.id);
    expect(message).toContain('Contact Ada Lovelace is still referenced by');
    expect(message).not.toContain(contact.id);
    expect(message).toContain('1 open opportunity(ies)');
  });

  it('still deletes an account whose contact nothing references', async () => {
    const { account, contact } = await accountWithContact('Quiet Corp');
    expect(await deleteAndCatch('crm_account', account.id)).toBeNull();
    expect(await rowsOf('crm_account', account.id)).toHaveLength(0);
    expect(await rowsOf('crm_contact', contact.id)).toHaveLength(0);
  });
});

// ────────────────────────────────────── symptom 2: the opportunity delete ──

/**
 * #693's second symptom — a `DELETE /crm_opportunity/<id>` answered by the
 * converted-lead lock — no longer produces a refusal at all, and neither do the
 * two sibling freeze guards on the same construction.
 *
 * #720 ruled (maintainer, 2026-08-11) that a frozen record must not make the
 * records it points at undeletable: all three guards now YIELD to the engine's
 * reference-cleanup write shape, so the cascade completes and there is no
 * sentence left to phrase. The message this file used to pin here —
 * "…its link(s) X cannot be cleared — which also blocks deleting the record(s)
 * they point at" — is gone from the three hooks, and with it the whole reason a
 * caller ever saw it.
 *
 * Those cases now live, as successful deletes plus the narrowness that keeps
 * ordinary edits refused, in `test/freeze-guard-reference-cleanup.test.ts`.
 * What stays HERE is #693's other half, which #720 did not touch: refusals that
 * are still correct (`contact_integrity`, `account_protection`) and must still
 * name the record that is refusing.
 */

// ───────────────────── the account guard's own sentence, measured (#721) ──

/**
 * `account_protection`'s open-opportunity refusal, taken from a real `DELETE`.
 *
 * Not a cascade case — nothing cascades INTO `crm_account`, so this guard only
 * ever answers a caller who addressed the account, and "Cannot delete customer
 * account" was already accurate (#721 says so explicitly). What was wrong was
 * agreement: the count switched the noun (`opportunit{y,ies}`) and left the
 * verb and the closing pronoun plural, so one open deal produced
 *
 *     Cannot delete customer account: 1 open opportunity still reference it.
 *     Close or reassign them first.
 *
 * It lives in this file because this is where the app boots a real kernel: the
 * unit pins in `hooks-runtime-sales.test.ts` call the handler directly, which
 * proves the string the handler builds, not the string a user is shown. Both
 * branches are measured here end-to-end, because only one of them was broken
 * and the fix must not trade one wrong sentence for the other.
 */
describe('deleting a customer account with open opportunities', () => {
  /** A customer account carrying `openDeals` open opportunities. */
  const accountWithOpenDeals = async (openDeals: number) => {
    const n = uniq();
    const account = await insert('crm_account', {
      name: `Busy Corp ${n}`, type: 'customer', industry: 'technology',
    });
    for (let i = 0; i < openDeals; i++) {
      await insert('crm_opportunity', {
        name: `Busy Deal ${n}-${i}`, crm_account: account.id,
        stage: 'negotiation', amount: 1000, close_date: '2026-12-01',
      });
    }
    return account;
  };

  it('agrees with a single blocker: "1 open opportunity still references it … reassign it"', async () => {
    const account = await accountWithOpenDeals(1);
    const message = await deleteAndCatch('crm_account', account.id);

    expect(message, 'the delete must still be refused').toBeTruthy();
    expect(message).toContain(
      'Cannot delete customer account: 1 open opportunity still references it. Close or reassign it first.',
    );
    // The reported symptom, both halves of it.
    expect(message).not.toContain('opportunity still reference it');
    expect(message).not.toContain('reassign them');
  });

  it('agrees with several blockers: "2 open opportunities still reference it … reassign them"', async () => {
    const account = await accountWithOpenDeals(2);
    const message = await deleteAndCatch('crm_account', account.id);

    expect(message, 'the delete must still be refused').toBeTruthy();
    expect(message).toContain(
      'Cannot delete customer account: 2 open opportunities still reference it. Close or reassign them first.',
    );
    expect(message).not.toContain('opportunities still references');
    expect(message).not.toContain('reassign it first');
  });

  it('refuses, and leaves the account in place (semantics unchanged)', async () => {
    const account = await accountWithOpenDeals(1);
    await deleteAndCatch('crm_account', account.id);
    expect(await rowsOf('crm_account', account.id)).toHaveLength(1);
  });
});
