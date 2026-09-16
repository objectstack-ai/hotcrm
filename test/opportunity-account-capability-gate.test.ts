// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import opportunityHooks from '../src/sales/objects/opportunity.hook';
import { makeHarness, makeCtx, makeDeniedApi, hookNamed, type Rec } from './helpers/hook-harness';

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
 * The editability leg drives the WHOLE registered `beforeUpdate` chain for
 * `crm_opportunity`, not just the gate — asserting that the gate is absent
 * from that chain would be a statement about this file's own filter, whereas
 * running the chain is a statement about the write. The hook that would have
 * refused is in the same module and is deliberately given every chance to fire.
 *
 * Bodies here are the authored handlers. That they still work once LOWERED to
 * metadata-only (no module scope, QuickJS) is swept for every registered hook
 * by `test/action-sandbox.test.ts`; this file does not restate that.
 */

const GATE = 'opportunity_account_capability';
const gate = hookNamed(opportunityHooks, GATE);

const RESTRICTED = 'acc_settlement';
const OPEN = 'acc_full';
const LEGACY = 'acc_predates_the_column';

/** The accounts every leg below reads, as the engine would hold them. */
function accounts(): Record<string, Rec[]> {
  return {
    crm_account: [
      {
        id: RESTRICTED,
        name: 'Tender Agency Ltd',
        account_number: 'ACC-000042',
        commercial_capability: 'settlement_only',
      },
      { id: OPEN, name: 'Acme Corp', account_number: 'ACC-000001', commercial_capability: 'full' },
      // No `commercial_capability` key at all — an account written before the
      // field existed. It must open deals exactly as it always did.
      { id: LEGACY, name: 'Old Co', account_number: 'ACC-000007' },
    ],
  };
}

/**
 * Every hook this module registers for `beforeUpdate`, in the order the engine
 * would run them (ascending priority).
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

/** Run one hook's beforeInsert and return what it threw, or `null`. */
async function insertRefusal(input: Rec, api = makeHarness(accounts()).api): Promise<Error | null> {
  try {
    await gate.handler(makeCtx({ event: 'beforeInsert', input, user: { id: 'user_1' }, api }));
    return null;
  } catch (err) {
    return err as Error;
  }
}

describe('the capability gate refuses a NEW link (REQ-0003 acceptance 2, first half)', () => {
  it('refuses an opportunity opened against a Settlement Only account', async () => {
    const refusal = await insertRefusal({
      name: 'Framework deal',
      amount: 25_000,
      stage: 'prospecting',
      crm_account: RESTRICTED,
    });
    expect(refusal, 'a new opportunity on a restricted account was allowed through').toBeTruthy();
    // The envelope a REST consumer branches on — `code` and `status` together,
    // per `src/sales/objects/_refusal.ts`. A bare `toThrow()` would pass on a
    // handler that threw a plain Error with no envelope at all.
    expect((refusal as Rec).code).toBe('VALIDATION_FAILED');
    expect((refusal as Rec).status).toBe(400);
  });

  it("names the account the way the UI names it, and never by its id (#1243)", async () => {
    const refusal = await insertRefusal({ name: 'Deal', crm_account: RESTRICTED });
    const message = String(refusal?.message);
    // `crm_account.nameField` is the `display_title` formula over
    // `account_number` and `name`, so that is the spelling every screen shows.
    expect(message).toContain('ACC-000042 - Tender Agency Ltd');
    expect(message).not.toContain(RESTRICTED);
    // The rule's own message, carrying the remedy — not a bare "invalid".
    expect(message).toContain('Settlement Only');
    expect((refusal as Rec).userMessage).toBe(refusal?.message);
  });
});

describe('the gate never bricks history (REQ-0003 acceptance 2, second half)', () => {
  it('is declared beforeInsert-only — the transition gate IS the event list', () => {
    // AGENTS.md metadata semantics rule 7: the construct carries the intent,
    // not a comment claiming it. An `beforeUpdate` here would re-evaluate every
    // historical opportunity on every edit.
    expect(gate.events).toEqual(['beforeInsert']);
  });

  it('lets an EXISTING opportunity on a restricted account be updated', async () => {
    const harness = makeHarness(accounts());
    // The opportunity was created while the account was still sellable, and the
    // account has since been reclassified — the exact case acceptance 2 names.
    const existing: Rec = {
      id: 'opp_1',
      name: 'Signed last year',
      amount: 25_000,
      stage: 'proposal',
      crm_account: RESTRICTED,
      stage_entry_date: '2026-01-01',
    };
    harness.rows('crm_opportunity').push({ ...existing });

    const input: Rec = { id: 'opp_1', amount: 30_000 };
    for (const hook of updateChain()) {
      await hook.handler(
        makeCtx({
          event: 'beforeUpdate',
          input,
          previous: existing,
          user: { id: 'user_1' },
          api: harness.api,
        }),
      );
    }
    // The edit landed and was processed normally: the derived recompute ran on
    // the new amount rather than the write being refused.
    expect(input.expected_revenue).toBe(18_000); // 30k × 60% (proposal)
  });

  it('re-pointing an existing opportunity is OUT of the gate, and that is stated', async () => {
    // The ruled construct is `beforeInsert`, so an UPDATE that moves an
    // existing opportunity onto a restricted account is NOT refused. Recorded
    // as a pin rather than left to be discovered: acceptance 2 scopes the
    // refusal to "linked to a NEW opportunity", and widening it is a separate
    // decision, not a tidy-up.
    //
    // ⚠️ Driven through the registered `beforeUpdate` chain, NOT by calling
    // the gate's handler with a `beforeUpdate` ctx. The handler body does not
    // branch on `ctx.event` — it does not need to, because the ENGINE selects
    // hooks by their `events` — so calling it directly with an update would
    // refuse, and a test written that way would be describing a dispatch the
    // engine never performs. What is asserted here is the write.
    const harness = makeHarness(accounts());
    const previous: Rec = { id: 'opp_2', name: 'Moved deal', stage: 'proposal', crm_account: OPEN };
    harness.rows('crm_opportunity').push({ ...previous });
    const input: Rec = { id: 'opp_2', crm_account: RESTRICTED };
    for (const hook of updateChain()) {
      await hook.handler(
        makeCtx({ event: 'beforeUpdate', input, previous, user: { id: 'user_1' }, api: harness.api }),
      );
    }
    expect(input.crm_account).toBe(RESTRICTED);
  });
});

describe('the gate fails OPEN on everything except the one written-down verdict', () => {
  it('allows an opportunity on a Full account', async () => {
    expect(await insertRefusal({ name: 'Deal', crm_account: OPEN })).toBeNull();
  });

  it('allows an opportunity on an account that predates the column', async () => {
    expect(await insertRefusal({ name: 'Deal', crm_account: LEGACY })).toBeNull();
  });

  it('allows the write when the account cannot be found at all', async () => {
    expect(await insertRefusal({ name: 'Deal', crm_account: 'acc_missing' })).toBeNull();
  });

  it('allows the write when `ctx.api` is absent', async () => {
    // ⛔ Not `insertRefusal(…, undefined)`: a default parameter fires on an
    // explicit `undefined`, so that spelling hands the gate the real harness
    // and asserts the opposite of what it reads like. The ctx is built here.
    await expect(
      gate.handler(
        makeCtx({ event: 'beforeInsert', input: { name: 'Deal', crm_account: RESTRICTED } }),
      ),
    ).resolves.toBeUndefined();
  });

  it('does NOT swallow a denied read — that is the one non-open case', async () => {
    // Stated as a pin because it is the boundary of the paragraph above, and
    // it points the other way from the enhance-a-write hooks this harness's
    // `makeDeniedApi` exists for. A read that throws is not evidence that the
    // account is sellable, so the failure surfaces instead of the gate going
    // silently absent. The refusal that comes out is the read's, not the
    // gate's — it carries no envelope of ours.
    const thrown = await insertRefusal({ name: 'Deal', crm_account: RESTRICTED }, makeDeniedApi());
    expect(thrown).toBeTruthy();
    expect((thrown as Rec).code).toBeUndefined();
  });

  it('refuses a SYSTEM write too — a gate only users trip is not a gate', async () => {
    const harness = makeHarness(accounts());
    await expect(
      gate.handler(
        makeCtx({
          event: 'beforeInsert',
          input: { name: 'Imported deal', crm_account: RESTRICTED },
          user: undefined, // this repo's system / seed / backfill signal
          api: harness.api,
        }),
      ),
    ).rejects.toThrow(/Settlement Only/);
  });
});
