// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import stack from './helpers/composed-stack';
import { hotcrmStack, signUpPerson, systemUpdate, type Person } from './helpers/verify-stack';

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
 *
 * Every edit below is real: the sales rep who owns a converted lead editing it
 * through the engine's write door (`hooks.run`) on the shipped app booted by
 * `@objectstack/verify`, the lead and the records it was converted into written
 * as the system — so what refuses is whatever the engine runs first, and what
 * is asserted is the refusal or the stored row.
 */

type AnyRec = Record<string, any>;

const objects: AnyRec[] = (stack as any).objects ?? [];
const lead = objects.find((o) => o.name === 'crm_lead') as AnyRec | undefined;
const validations = (lead?.validations ?? []) as AnyRec[];

let verify: VerifyStack;
let rep: Person;
let k = 0;
beforeAll(async () => {
  verify = await hotcrmStack();
  rep = await signUpPerson(verify, 'rep@converted-lead-guard.test', {
    name: 'Sales Rep', positions: ['sales_rep'], permissionSets: ['sales_rep'],
  });
}, 120_000);

/**
 * A converted lead of the rep's, linked to the account, contact and deal it
 * was converted into and to the lead and contact it duplicated — written as
 * the system, the way the conversion flow leaves it. `over` is its stored state.
 */
const convertedLead = async (over: AnyRec = {}): Promise<AnyRec> => {
  const n = ++k;
  const [account] = await verify.seed('crm_account', [{ name: `Acme ${n}`, owner_id: rep.id }]);
  const [contact, twin] = await verify.seed('crm_contact', [
    { first_name: 'Ada', last_name: 'Lovelace', email: `ada${n}@acme.example.com`, crm_account: account!.id, owner_id: rep.id },
    { first_name: 'Ada', last_name: 'Twin', email: `twin${n}@acme.example.com`, crm_account: account!.id, owner_id: rep.id },
  ]);
  const [deal] = await verify.seed('crm_opportunity', [{
    name: `Acme Deal ${n}`, amount: 10_000, stage: 'qualification', close_date: '2030-06-30', crm_account: account!.id, owner_id: rep.id,
  }]);
  const [original] = await verify.seed('crm_lead', [{
    first_name: 'Ada', last_name: 'Original', company: 'Acme', email: `original${n}@acme.example.com`, owner_id: rep.id,
  }]);
  const [lead] = await verify.seed('crm_lead', [{
    first_name: 'Ada', last_name: 'Lovelace', company: 'Acme', email: `a${n}@acme.example.com`, rating: 1, owner_id: rep.id,
    is_converted: true, status: 'converted', converted_date: '2026-01-01',
    converted_account: account!.id, converted_contact: contact!.id, converted_opportunity: deal!.id,
    duplicate_of_lead: original!.id, duplicate_of_contact: twin!.id,
    ...over,
  }]);
  return lead!;
};

/** The rep's edit of `lead` — resolves with the stored row, rejects with the refusal. */
const edit = async (lead: AnyRec, input: AnyRec): Promise<AnyRec> => {
  await verify.hooks.run('crm_lead', 'update', { id: lead.id, ...input }, { as: rep.token });
  return (await verify.rows('crm_lead', { id: lead.id }))[0]!;
};

/** A converted lead with one attempted edit on top. */
const editConverted = async (input: AnyRec, over: AnyRec = {}) => edit(await convertedLead(over), input);

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
  it.each([
    ['company', 'Globex'],
    ['email', 'changed@globex.example.com'],
    ['first_name', 'Changed'],
    ['last_name', 'Changed'],
  ])('rejects an edit to %s — the fields the deleted validation covered', async (field, value) => {
    await expect(editConverted({ [field]: value })).rejects.toThrow(/Cannot edit converted lead/);
  });

  it('names the offending field, because no second error follows it', async () => {
    // The deleted validation's whole claim was a friendlier message. Nothing
    // gets a turn after this throw, so the diagnostic has to live here.
    await expect(editConverted({ company: 'Globex' })).rejects.toThrow(/attempted: company/);
  });

  it('names the LEAD as well as the field (#693)', async () => {
    // The lock fires on writes the caller never made (a cascade clearing a
    // conversion link), so "a converted lead" was not enough to find the
    // record that refused. The label is `display_title`'s own pair — person and
    // company (#1243); a lead on this app always carries both, since first
    // name, last name and company are all required.
    const lead = await convertedLead();
    await expect(edit(lead, { company: 'Globex' })).rejects.toThrow(/Cannot edit converted lead Ada Lovelace - Acme/);
    // The id is not merely absent from the middle of the sentence — it is
    // nowhere in it.
    await expect(edit(lead, { company: 'Globex' })).rejects.toThrow(
      expect.objectContaining({ message: expect.not.stringContaining(lead.id) }),
    );
    await expect(editConverted({ rating: 5 }, { first_name: 'Grace', last_name: 'Hopper', company: 'Initech' }))
      .rejects.toThrow(/Cannot edit converted lead Grace Hopper - Initech \(attempted: rating\)\./);
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
   * value→null — here written as that shape directly. The end-to-end proof
   * that a real cascade produces exactly that shape, and the narrowness in both
   * directions, live in `test/freeze-guard-reference-cleanup.test.ts`.
   */
  describe('a cleared conversion link is the engine tidying up, not an edit', () => {
    it.each([
      'converted_opportunity', 'converted_account', 'converted_contact', 'duplicate_of_lead', 'duplicate_of_contact',
    ])('%s', async (field) => {
      const after = await editConverted({ [field]: null });
      expect(after[field] ?? null).toBeNull();
      expect(after.is_converted).toBe(true);
    });

    it('refuses the edit when the write is not only a link clear', async () => {
      // A hand edit that also touches a business field is an edit, and saying
      // so stays correct — the link branch must not swallow it.
      await expect(editConverted({ converted_opportunity: null, company: 'Globex' }))
        .rejects.toThrow(/Cannot edit converted lead/);
    });

    it('is not reached when the link is merely re-stated', async () => {
      // `input[k] === previous[k]` is not a change at all, so nothing refuses.
      const lead = await convertedLead();
      const after = await edit(lead, { converted_opportunity: lead.converted_opportunity });
      expect(after.converted_opportunity).toBe(lead.converted_opportunity);
    });
  });

  it('still rejects fields the deleted validation never covered', async () => {
    await expect(editConverted({ rating: 5 })).rejects.toThrow(/attempted: rating/);
  });

  it('leaves narrative fields and system writes alone', async () => {
    expect((await editConverted({ description: 'Post-conversion note' })).description).toBe('Post-conversion note');
    // A system / flow / seed write carries no user: the lock is for user edits only.
    const lead = await convertedLead();
    await systemUpdate(verify, 'crm_lead', { id: lead.id, company: 'Globex' });
    expect((await verify.rows('crm_lead', { id: lead.id }))[0]!.company).toBe('Globex');
  });

  it('does not lock an unconverted lead', async () => {
    const [lead] = await verify.seed('crm_lead', [{
      first_name: 'Ada', last_name: 'Open', company: 'Acme', email: `open${++k}@acme.example.com`, status: 'qualified', owner_id: rep.id,
    }]);
    expect((await edit(lead!, { company: 'Globex' })).company).toBe('Globex');
  });
});
