// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import stack from '../objectstack.config';
import leadHooks from '../src/objects/lead.hook';
import { hookNamed, makeCtx, makeHarness } from './helpers/hook-harness';

/**
 * The converted-lead lock is ONE guard, and it is the hook (#575 B1).
 *
 * `crm_lead` used to carry two: a `cannot_edit_converted` script validation
 * over the four identity fields, and the `beforeUpdate` throw in
 * `lead.hook.ts`. A code comment described the pair as a deliberate division of
 * labour — the validation for a friendly, recoverable error on identity fields,
 * the hook for a hard stop on everything else.
 *
 * That division never existed at runtime. Patching `company` on a converted
 * lead returned the HOOK's message on 16.1.0, because a `beforeUpdate` throw
 * aborts the write before validations are evaluated; the validation could not
 * produce the friendlier error it promised, on any field, ever. It was the same
 * shape as the `revenue_positive` rule deleted in #571: two implementations of
 * one rule, one of them dead and free to drift.
 *
 * So the validation is gone and these tests pin what replaced it — which is
 * nothing, deliberately. The hook has to carry the whole contract now, and its
 * message has to be good enough to be the only one a user sees.
 */

type AnyRec = Record<string, any>;

const objects: AnyRec[] = (stack as any).objects ?? [];
const lead = objects.find((o) => o.name === 'crm_lead') as AnyRec | undefined;
const validations = (lead?.validations ?? []) as AnyRec[];

const guard = hookNamed(leadHooks, 'lead_automation');

/** A converted lead as the hook sees it, with one attempted edit on top. */
const editConverted = (input: AnyRec, previous: AnyRec = {}) =>
  guard.handler(
    makeCtx({
      event: 'beforeUpdate',
      input: { id: 'lead_1', ...input },
      previous: { id: 'lead_1', is_converted: true, status: 'converted', company: 'Acme', email: 'a@acme.example.com', first_name: 'Ada', last_name: 'Lovelace', ...previous },
      user: { id: 'usr_1' },
      api: makeHarness().api,
    }),
  );

describe('crm_lead declares no second converted-lead rule', () => {
  it('found the lead object at all', () => {
    // Otherwise every assertion below passes over an empty list.
    expect(lead, 'crm_lead not registered on the stack').toBeTruthy();
    expect(validations.length).toBeGreaterThan(2);
  });

  it('has no cannot_edit_converted validation', () => {
    expect(validations.map((v) => v.name)).not.toContain('cannot_edit_converted');
  });

  it('has no validation of any name that re-implements the lock', () => {
    // The name is not the point — a second implementation under a different
    // name is the same defect. Anything comparing `is_converted` against the
    // previous record is that rule wearing a hat.
    const celSource = (condition: unknown): string =>
      typeof condition === 'string' ? condition : String((condition as AnyRec | null)?.source ?? '');
    const offenders = validations
      .filter((v) => v.type === 'script')
      .filter((v) => {
        const src = celSource(v.condition);
        return src.includes('is_converted') && src.includes('previous.');
      })
      .map((v) => v.name as string);
    expect(
      offenders,
      `converted-lead edit rules re-added as validations: ${offenders.join(', ')}. ` +
        'The beforeUpdate throw in lead.hook.ts runs first, so a validation here can never fire.',
    ).toEqual([]);
  });
});

describe('the hook is the guard that actually speaks', () => {
  it.each(['company', 'email', 'first_name', 'last_name'])(
    'rejects an edit to %s — the fields the deleted validation covered',
    async (field) => {
      await expect(editConverted({ [field]: 'changed' })).rejects.toThrow(
        /Cannot edit converted lead/,
      );
    },
  );

  it('names the offending field, because no second error follows it', async () => {
    // The deleted validation's whole claim was a friendlier message. Nothing
    // gets a turn after this throw, so the diagnostic has to live here.
    await expect(editConverted({ company: 'Globex' })).rejects.toThrow(/attempted: company/);
  });

  it('names the LEAD as well as the field (#693)', async () => {
    // The lock fires on writes the caller never made (a cascade clearing a
    // conversion link), so "a converted lead" was not enough to find the
    // record that refused. The label is `display_title`'s own pair — person and
    // company — and drops whichever half the lead does not carry (#1243); a
    // lead carrying neither gets "a converted lead" rather than a record id no
    // lead surface in this app ever shows.
    await expect(editConverted({ company: 'Globex' })).rejects.toThrow(
      /Cannot edit converted lead Ada Lovelace - Acme/,
    );
    // The id is not merely absent from the middle of the sentence — it is
    // nowhere in it.
    await expect(editConverted({ company: 'Globex' })).rejects.toThrow(
      expect.objectContaining({ message: expect.not.stringContaining('lead_1') }),
    );
    await expect(
      guard.handler(
        makeCtx({
          event: 'beforeUpdate',
          input: { id: 'lead_2', rating: 5 },
          previous: { id: 'lead_2', is_converted: true, company: 'Initech', rating: 1 },
          user: { id: 'usr_1' },
          api: makeHarness().api,
        }),
      ),
    ).rejects.toThrow(/Cannot edit converted lead Initech \(attempted: rating\)\./);
  });

  /**
   * #693's second symptom at the unit level, and #720's ruling on it: the
   * engine clears a `set_null` lookup by UPDATING the row that holds it, so
   * `DELETE /crm_opportunity/<id>` reaches this guard as
   * `{ converted_opportunity: null }` on the lead. The lock used to refuse
   * that, which meant a converted lead made all three of its conversion
   * products permanently undeletable — an erasure request with no way to
   * carry it out.
   *
   * No marker distinguishes the cleanup (measured on rc.2 when #693 landed, and
   * again on rc.6 for #720 — the engine's own `__referentialFieldClear` is
   * stripped before a hook sees it), so the lock yields on the write SHAPE
   * instead: a write whose every non-system change is a declared link going
   * value→null. The end-to-end proof that a real cascade produces exactly that
   * shape, and the narrowness in both directions, live in
   * `test/freeze-guard-reference-cleanup.test.ts`.
   */
  describe('a cleared conversion link is the engine tidying up, not an edit', () => {
    it.each([
      ['converted_opportunity', 'opp_1'],
      ['converted_account', 'acc_1'],
      ['converted_contact', 'con_1'],
      ['duplicate_of_lead', 'lead_9'],
      ['duplicate_of_contact', 'con_9'],
    ])('%s', async (field, previousValue) => {
      await expect(
        editConverted({ [field]: null }, { [field]: previousValue }),
      ).resolves.toBeUndefined();
    });

    it('refuses the edit when the write is not only a link clear', async () => {
      // A hand edit that also touches a business field is an edit, and saying
      // so stays correct — the link branch must not swallow it.
      await expect(
        editConverted({ converted_opportunity: null, company: 'Globex' }, { converted_opportunity: 'opp_1' }),
      ).rejects.toThrow(/Cannot edit converted lead/);
    });

    it('is not reached when the link is merely re-stated', async () => {
      // `input[k] === previous[k]` is not a change at all, so nothing refuses.
      await expect(
        editConverted({ converted_opportunity: 'opp_1' }, { converted_opportunity: 'opp_1' }),
      ).resolves.toBeUndefined();
    });
  });

  it('still rejects fields the deleted validation never covered', async () => {
    await expect(editConverted({ rating: 99 })).rejects.toThrow(/attempted: rating/);
  });

  it('leaves narrative fields and system writes alone', async () => {
    await expect(editConverted({ description: 'Post-conversion note' })).resolves.toBeUndefined();
    // No `user` ⇒ system / flow / seed write: the lock is for user edits only.
    await expect(
      guard.handler(
        makeCtx({
          event: 'beforeUpdate',
          input: { id: 'lead_1', company: 'Globex' },
          previous: { id: 'lead_1', is_converted: true, company: 'Acme' },
          user: undefined,
          api: makeHarness().api,
        }),
      ),
    ).resolves.toBeUndefined();
  });

  it('does not lock an unconverted lead', async () => {
    await expect(
      guard.handler(
        makeCtx({
          event: 'beforeUpdate',
          input: { id: 'lead_1', company: 'Globex' },
          previous: { id: 'lead_1', is_converted: false, status: 'qualified', company: 'Acme' },
          user: { id: 'usr_1' },
          api: makeHarness().api,
        }),
      ),
    ).resolves.toBeUndefined();
  });
});
