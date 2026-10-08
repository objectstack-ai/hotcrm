// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import opportunityHooks from '../src/sales/objects/opportunity.hook';
import { hotcrmStack, signUpPerson, systemUpdate, type Person } from './helpers/verify-stack';

type Rec = Record<string, any>;

/**
 * The capability gate — REQ-0003 acceptance 2, both halves of it.
 *
 * > "An account whose category is the restricted one **cannot** be linked to a
 * > new opportunity — the write is refused with the rule's own message — while
 * > opportunities that already point at it keep working and keep being
 * > editable."
 *
 * ⚠️ That sentence is TWO assertions, and a suite proving only the first one
 * would certify the most dangerous possible implementation. The construct
 * REQ-0003 originally named — a `validations[]` entry — refuses the new link
 * exactly as asked AND bricks every historical opportunity, because a
 * validation is evaluated against `{...previous, ...data}` on every write,
 * where "already linked" and "linking now" are the same state. A test that
 * only inserted would have gone green on it. So the editability leg below is
 * not a courtesy case: it is the half that discriminates between the shipped
 * construct and the one the maintainer ruled out (2026-09-16).
 *
 * Every leg is a real write on the shipped app booted by `@objectstack/verify`:
 * a sales rep opening or editing a deal through the engine's write door
 * (`hooks.run`), so the editability leg runs the WHOLE registered
 * `beforeUpdate` chain for `crm_opportunity` — the gate is given every chance
 * to fire, on a payload that re-sends the restricted link the way a detail
 * form does — and what is asserted is the stored row or the engine's refusal.
 * The accounts are written as the system, and an account is reclassified by a
 * system write, as Setup does.
 *
 * That the bodies still LOWER to metadata-only (no module scope, QuickJS) is
 * refused for every registered hook by `os lint --strict` (`pnpm lint`,
 * `hook-body/not-lowerable`); this file does not restate that.
 */

const GATE = 'opportunity_account_capability';
const gate = (opportunityHooks as Rec[]).find((h) => h.name === GATE) as Rec;

let verify: VerifyStack;
/** Owns every account below and opens the deals. */
let rep: Person;
/** A rep who cannot read `rep`'s accounts at all. */
let outsider: Person;
/** The accounts every leg below reads, as the engine holds them. */
let RESTRICTED: Rec;
let OPEN: Rec;
let k = 0;
beforeAll(async () => {
  verify = await hotcrmStack();
  rep = await signUpPerson(verify, 'rep@opportunity-account-capability-gate.test', {
    name: 'Sales Rep', positions: ['sales_rep'], permissionSets: ['sales_rep'],
  });
  outsider = await signUpPerson(verify, 'outsider@opportunity-account-capability-gate.test', {
    name: 'Other Rep', positions: ['sales_rep'], permissionSets: ['sales_rep'],
  });
  [RESTRICTED, OPEN] = (await verify.seed('crm_account', [
    { name: 'Tender Agency Ltd', account_number: 'ACC-000042', commercial_capability: 'settlement_only', owner_id: rep.id },
    { name: 'Acme Corp', commercial_capability: 'full', owner_id: rep.id },
  ])) as [Rec, Rec];
}, 120_000);

/** A new deal on `accountId`. */
const deal = (accountId: string, over: Rec = {}): Rec => ({
  name: `Framework deal ${++k}`, amount: 25_000, stage: 'prospecting', close_date: '2030-06-30', crm_account: accountId, ...over,
});

/** A deal of the rep's on `accountId`, written as the system (it predates whatever happens next). */
const existingDeal = async (accountId: string, over: Rec = {}): Promise<Rec> =>
  (await verify.seed('crm_opportunity', [deal(accountId, { stage: 'proposal', owner_id: rep.id, ...over })]))[0]!;

/** `who` opening a deal on `accountId` — the refusal, or `null` when the engine stored it. */
async function insertRefusal(accountId: string, who: Person = rep): Promise<Rec | null> {
  try {
    await verify.hooks.run('crm_opportunity', 'insert', deal(accountId), { as: who.token });
    return null;
  } catch (err) {
    return err as Rec;
  }
}

/**
 * Every hook this module registers for `beforeUpdate`, in the order the engine
 * runs them (ascending priority).
 *
 * Vacuity guard included: an empty chain makes every "the write was not
 * refused" assertion trivially true, which is precisely the state a mis-spelled
 * event name produces.
 */
function updateChain(): Rec[] {
  const chain = (opportunityHooks as Rec[])
    .filter((h) => (h.events as string[]).includes('beforeUpdate'))
    .sort((a, b) => (a.priority as number) - (b.priority as number));
  expect(chain.length, 'no beforeUpdate hook is registered on crm_opportunity').toBeGreaterThan(0);
  return chain;
}

describe('the capability gate refuses a NEW link (REQ-0003 acceptance 2, first half)', () => {
  it('refuses an opportunity opened against a Settlement Only account', async () => {
    const refusal = await insertRefusal(RESTRICTED.id);
    expect(refusal, 'a new opportunity on a restricted account was allowed through').toBeTruthy();
    // The envelope a REST consumer branches on — `code` and `status` together,
    // per `src/sales/objects/_refusal.ts`. A bare `toThrow()` would pass on a
    // handler that threw a plain Error with no envelope at all.
    expect(refusal!.code).toBe('VALIDATION_FAILED');
    expect(refusal!.status).toBe(400);
  });

  it("names the account the way the UI names it, and never by its id (#1243)", async () => {
    const refusal = await insertRefusal(RESTRICTED.id);
    const message = String(refusal?.message);
    // `crm_account.nameField` is the `display_title` formula over
    // `account_number` and `name`, so that is the spelling every screen shows.
    expect(message).toContain('ACC-000042 - Tender Agency Ltd');
    expect(message).toContain(String(RESTRICTED.display_title));
    expect(message).not.toContain(RESTRICTED.id);
    // The rule's own message, carrying the remedy — not a bare "invalid".
    expect(message).toContain('Settlement Only');
    expect(refusal!.userMessage).toBe(refusal?.message);
  });
});

describe('the gate never bricks history (REQ-0003 acceptance 2, second half)', () => {
  it('is declared beforeInsert-only — the transition gate IS the event list', () => {
    // AGENTS.md metadata semantics rule 7: the construct carries the intent,
    // not a comment claiming it. An `beforeUpdate` here would re-evaluate every
    // historical opportunity on every edit.
    expect(gate.events).toEqual(['beforeInsert']);
    expect(updateChain().map((h) => h.name)).not.toContain(GATE);
  });

  it('lets an EXISTING opportunity on a restricted account be updated', async () => {
    // The opportunity was created while the account was still sellable, and the
    // account has since been reclassified — the exact case acceptance 2 names.
    const [account] = await verify.seed('crm_account', [{ name: `Reclassified Co ${++k}`, commercial_capability: 'full', owner_id: rep.id }]);
    const existing = await existingDeal(account!.id);
    await systemUpdate(verify, 'crm_account', { id: account!.id, commercial_capability: 'settlement_only' });

    // ⚠️ The payload RE-SENDS the unchanged `crm_account`, and that is the
    // load-bearing half of this fixture. A detail form posts every field it
    // rendered, so the ordinary edit a user makes on a record that happens to
    // sit on a restricted account carries the restricted link in its own body.
    // A sparse `{ amount }` payload would let a gate widened to `beforeUpdate`
    // through untouched — it never sees the account — so a suite that only
    // tested the sparse shape would be green against the very construct the
    // 2026-09-16 ruling rejected. Measured: with `events` widened to
    // `['beforeInsert', 'beforeUpdate']`, this case is the one that reddens.
    await verify.hooks.run('crm_opportunity', 'update', {
      id: existing.id, amount: 30_000, crm_account: account!.id, stage: 'proposal',
    }, { as: rep.token });
    // The edit landed and was processed normally: the derived recompute ran on
    // the new amount rather than the write being refused.
    const [after] = await verify.rows('crm_opportunity', { id: existing.id });
    expect(after!.amount).toBe(30_000);
    expect(after!.expected_revenue).toBe(18_000); // 30k × 60% (proposal)
  });

  it('re-pointing an existing opportunity is OUT of the gate, and that is stated', async () => {
    // The ruled construct is `beforeInsert`, so an UPDATE that moves an
    // existing opportunity onto a restricted account is NOT refused. Recorded
    // as a pin rather than left to be discovered: acceptance 2 scopes the
    // refusal to "linked to a NEW opportunity", and widening it is a separate
    // decision, not a tidy-up. What is asserted is the write, through the
    // engine's own dispatch of the registered `beforeUpdate` chain.
    const moved = await existingDeal(OPEN.id);
    await verify.hooks.run('crm_opportunity', 'update', { id: moved.id, crm_account: RESTRICTED.id }, { as: rep.token });
    const [after] = await verify.rows('crm_opportunity', { id: moved.id });
    expect(after!.crm_account).toBe(RESTRICTED.id);
  });
});

describe('the gate fails OPEN on everything except the one written-down verdict', () => {
  it('allows an opportunity on a Full account', async () => {
    expect(await insertRefusal(OPEN.id)).toBeNull();
  });

  it('allows an opportunity on an account that carries no verdict at all', async () => {
    // An account written before the column existed carries nothing; on this
    // install every write applies the shipped `full` default, so the empty
    // verdict is put there by the system, as a migration would leave it.
    const [account] = await verify.seed('crm_account', [{ name: `Old Co ${++k}`, owner_id: rep.id }]);
    await systemUpdate(verify, 'crm_account', { id: account!.id, commercial_capability: null });
    const [stored] = await verify.rows('crm_account', { id: account!.id });
    expect(stored!.commercial_capability ?? null, 'the verdict did not clear').toBeNull();
    expect(await insertRefusal(account!.id)).toBeNull();
  });

  it('lets a missing account through to the engine, which refuses the dangling link itself', async () => {
    // The gate reads nothing and stands down; what refuses is the engine's own
    // reference check — a different refusal, naming the id, not the verdict.
    const refusal = await insertRefusal('acc_missing');
    expect(refusal, 'a deal on an account that does not exist was stored').toBeTruthy();
    expect(refusal!.code).toBe('VALIDATION_FAILED');
    expect(String(refusal!.message)).toContain('acc_missing');
    expect(String(refusal!.message)).not.toContain('Settlement Only');
  });

  it('reaches the account through the engine on every write door — the no-api fallback has none', async () => {
    // The `!ctx.api` stand-down is unreachable on the shipped app: the engine
    // hands every `beforeInsert` a read door, so a person's write and the
    // system's both arrive at the verdict.
    expect(String((await insertRefusal(RESTRICTED.id))?.message)).toContain('Settlement Only');
    await expect(verify.seed('crm_opportunity', [deal(RESTRICTED.id, { owner_id: rep.id })])).rejects.toMatchObject({
      code: 'VALIDATION_FAILED', status: 400,
    });
  });

  /**
   * ⚠️ MEASURED DEFECT — reported as a finding on this card, pinned here so the
   * fix is noticed.
   *
   * The intent stated beside the gate: a read the caller is DENIED must not be
   * swallowed — "a denied or broken read is not evidence that the account is
   * sellable", and swallowing it "would make the gate silently absent exactly
   * when the platform cannot answer". The stand-in this suite used to run on
   * modelled a denied read as one that THROWS. On the real engine a caller
   * who cannot see the account is not refused the read: record-level access
   * FILTERS it, the read comes back empty, the gate takes that for "account
   * cannot be found" and stands down — and the engine's reference check
   * accepts the link. Measured on 17.7.0: a rep who cannot read a Settlement
   * Only account opens a NEW opportunity on it.
   */
  it('⚠️ a caller who cannot read the account opens a deal on a Settlement Only one (measured defect)', async () => {
    expect(await verify.rows('crm_account', { id: RESTRICTED.id }, { as: outsider.token }), 'the outsider can read the account').toEqual([]);
    const refusal = await insertRefusal(RESTRICTED.id, outsider);
    expect(refusal, 'the unreadable restricted account now refuses the deal — the defect is fixed: rewrite this case to pin the refusal').toBeNull();
  });

  it('refuses a SYSTEM write too — a gate only users trip is not a gate', async () => {
    await expect(verify.seed('crm_opportunity', [deal(RESTRICTED.id, { name: 'Imported deal', owner_id: rep.id })]))
      .rejects.toThrow(/Settlement Only/);
  });
});
