// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { Account } from '../src/objects/account.object';
import { AccountViews } from '../src/views/account.view';
import { ContractRenewalFlow } from '../src/flows/contract-renewal.flow';
import { accounts } from '../src/data/sales.seed';
import { localePacks, type AnyRec } from './helpers/metadata-fixtures';

/**
 * Renewal is a CONTRACT-level process, and it has exactly one home (#1181).
 *
 * `crm_account` used to declare a second one beside it: `renewal_owner` (a
 * `sys_user` lookup labelled "Renewal Owner (CSM)") and `next_renewal_date`.
 * Both were declared and inert — no hook wrote the date, no flow read the
 * owner, no dataset exposed either — while an account view sorted on the date
 * and a form section invited an admin to fill both in. That is the worst shape
 * a metadata app can ship: it did not look absent, it looked WIRED. An admin
 * naming a CSM there was told a renewal would reach that person, and the daily
 * sweep notified the contract owner instead, every time.
 *
 * The maintainer ruling of 2026-08-17 —「逐个 enforce-or-remove（推荐）」— left
 * exactly two endings available, and this file pins the one that was taken:
 *
 *  1. Both fields are deleted, and stay deleted, everywhere they were read.
 *  2. The renewal model that DOES run is still the contract one, still
 *     notifying the contract owner — so "put renewal back on the account"
 *     cannot land here quietly as a one-line edit to the flow.
 *
 * Half 2 is the half that is easy to skip and expensive to lose. A removal
 * proves only that the wrong answer is gone; without a pin on the surviving
 * answer, the next person to want an account-level renewal owner re-creates
 * the same two-truths defect from the other direction — this time by editing
 * the recipient in the flow, where no field-absence assertion is watching.
 */

const RETIRED = ['renewal_owner', 'next_renewal_date'] as const;

// ────────────────────────────── 1. the second renewal model is gone ──

describe('the account-level renewal model is retired (#1181)', () => {
  it.each(RETIRED)('%s is not a field on crm_account any more', (name) => {
    expect(Object.keys(Account.fields as AnyRec)).not.toContain(name);
  });

  /**
   * The retirement is only real if every READER went with it. A left-behind
   * column renders empty, a left-behind filter matches nothing, and a
   * left-behind locale row reads as coverage for a field that is not there —
   * the quiet half of a half-done removal, and none of it fails the build.
   *
   * The seed is in this sweep on purpose: seeded values are what made the dead
   * field look alive in every demo, which is a large part of why it survived
   * as long as it did.
   */
  it.each(RETIRED)('%s is referenced by no object, view, locale pack or seed', (name) => {
    const surfaces: Array<[string, unknown]> = [
      ['object', Account],
      ['views', AccountViews],
      ['locale packs', localePacks],
      ['seed', accounts],
    ];
    const offenders = surfaces
      .filter(([, value]) => JSON.stringify(value ?? null).includes(name))
      .map(([label]) => label);
    expect(offenders, `${name} still read by: ${offenders.join(', ')}`).toEqual([]);
  });

  /**
   * The view built ON the removed date could not outlive it: both its
   * `is_not_null` filter and its sort key were `next_renewal_date`, so what
   * remained would have been a view listing every customer in date order with
   * no date. It is gone with its switcher tab — asserted together, because a
   * tab pointing at a deleted view and a view unreachable from any tab are two
   * different broken states and this removal must produce neither.
   */
  it('drops the renewals_due view and its switcher tab together', () => {
    expect(Object.keys(AccountViews.listViews ?? {})).not.toContain('renewals_due');
    const tabViews = (AccountViews.list?.tabs ?? []).map((t: AnyRec) => t.view);
    expect(tabViews).not.toContain('renewals_due');
    // and nothing else was orphaned on the way out
    const declared = new Set(Object.keys(AccountViews.listViews ?? {}));
    for (const view of tabViews) {
      if (view === AccountViews.list?.name) continue;
      expect(declared, `tab points at missing view "${view}"`).toContain(view);
    }
  });
});

// ─────────────────────── 2. the renewal model that runs is unchanged ──

describe('renewal stays a contract-level process (#1181)', () => {
  const nodesOf = (flow: AnyRec): AnyRec[] =>
    (flow.nodes ?? []).flatMap((n: AnyRec) => [n, ...(n.config?.body?.nodes ?? [])]);

  it('sweeps crm_contract on end_date, not any account field', () => {
    const query = nodesOf(ContractRenewalFlow).find((n) => n.id === 'query_contracts');
    expect(query?.config?.objectName).toBe('crm_contract');
    expect(JSON.stringify(query?.config?.filter)).toContain('end_date');
  });

  /**
   * The recipient is THE claim this card was about. `renewal_owner` promised a
   * CSM would hear about the renewal; the flow notified the contract owner.
   * Removing the field settled which of the two is true — this pins it, so the
   * promise cannot be re-made without touching a test that explains why.
   */
  it('notifies the contract owner, and names no account renewal owner', () => {
    const notify = nodesOf(ContractRenewalFlow).find((n) => n.type === 'notify');
    expect(notify?.config?.recipients).toEqual(['{currentContract.owner_id}']);

    const task = nodesOf(ContractRenewalFlow).find((n) => n.id === 'create_renewal_task');
    expect(task?.config?.fields?.owner_id).toBe('{currentContract.owner_id}');

    const whole = JSON.stringify(ContractRenewalFlow);
    for (const name of RETIRED) expect(whole).not.toContain(name);
  });
});
