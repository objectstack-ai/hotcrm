// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { hotcrmStack, signUpPerson, type Person } from './helpers/verify-stack';
import stack from './helpers/composed-stack';

/**
 * A Sales Manager edits every forecast and deletes none (#2277, ruling B).
 *
 * ### What changed
 *
 * The Sales Manager profile held `crm_forecast` with `modifyAllRecords: true`
 * beside `allowDelete: false`. Modify All is the bypass for edit, delete and
 * transfer, and the permission evaluator grants delete on it without reading
 * `allowDelete`, so a manager could always delete forecasts; the `false` was
 * never enforced, and `@objectstack/spec` after 18.1.0 refuses the pair at
 * build (objectstack-ai/objectstack#25707).
 *
 * Ruling B keeps the intent the profile's comment always stated — org-wide
 * read and edit, no delete — and moves the write half off Modify All:
 *
 *   - READ: `viewAllRecords: true`, unchanged;
 *   - EDIT on another person's row: the `forecast_manager_sharing` criteria
 *     share (`src/sales/sharing/forecast.sharing.ts`), `edit` to the
 *     `sales_manager` position on every row. An edit share opens update and
 *     never delete (ADR-0111 D3);
 *   - DELETE: `allowDelete: false`, now enforced.
 *
 * ### What this file measures, on the booted app, through the REST door
 *
 * As a signed-up member holding the `sales_manager` position and profile,
 * against forecasts owned by a REP: GET 200, list sees them, PATCH 200,
 * DELETE 403 with the row still there. Then the ablation: the share's grants
 * are revoked through the sharing service and the same PATCH is refused 403 —
 * so the share, and nothing else, is what opens the edit. Re-evaluating the
 * rule restores it. Ownership transfer, which the profile still grants on
 * this object (`allowTransfer`, rostered in `test/ownership-model.test.ts`),
 * is measured on the same door.
 */

type Rec = Record<string, any>;

const SYS = { isSystem: true } as Rec;
const RULE = 'forecast_manager_sharing';

let verify: VerifyStack;
let mgr: Person;
let rep: Person;
let rep2: Person;
const id: Record<string, string> = {};
let k = 0;

const rest = async (who: Person, method: string, path: string, body?: unknown) => {
  const res = await verify.apiAs(who.token, method, path, body);
  const text = await res.text();
  let parsed: Rec = {};
  try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }
  return { status: res.status, body: parsed };
};

const stored = async (rowId: string): Promise<Rec | undefined> => (await verify.rows('crm_forecast', { id: rowId }))[0];

/** A settled quarter's hand-entered forecast, so no nightly sweep owns the row. */
const forecastOf = async (owner: Person, over: Rec = {}): Promise<string> => {
  const year = 2020 + (++k);
  const [row] = await verify.seed('crm_forecast', [{
    owner_id: owner.id,
    period: 'quarter',
    period_start: `${year}-01-01`,
    period_end: `${year}-03-31`,
    period_label: `Q1 ${year}`,
    source: 'manual',
    quota: 100_000,
    commit_amount: 40_000,
    ...over,
  }]);
  return String(row!.id);
};

const rules = (): Rec => verify.kernel.getService('sharingRules') as Rec;

beforeAll(async () => {
  verify = await hotcrmStack();
  mgr = await signUpPerson(verify, 'mgr@forecast-edit-share.test', {
    name: 'Forecast Manager', positions: ['sales_manager'], permissionSets: ['sales_manager'],
  });
  rep = await signUpPerson(verify, 'rep@forecast-edit-share.test', {
    name: 'Forecast Rep', positions: ['sales_rep'], permissionSets: ['sales_rep'],
  });
  rep2 = await signUpPerson(verify, 'rep2@forecast-edit-share.test', {
    name: 'Forecast Rep Two', positions: ['sales_rep'], permissionSets: ['sales_rep'],
  });
  id.repForecast = await forecastOf(rep);
  id.repDeleteTarget = await forecastOf(rep);
  id.rep2Forecast = await forecastOf(rep2);
  id.transferTarget = await forecastOf(rep);
}, 180_000);

it('the share materialises on the write itself — no backfill needed', async () => {
  // MEASURED: a system write (this seed, and so the nightly snapshot flow's
  // insert) materialises rule grants as a user write does (plugin-sharing
  // #13533). So a forecast the sweep opens tonight is editable by a manager
  // tonight, not after the next boot's backfill.
  for (const rowId of [id.repForecast, id.rep2Forecast]) {
    const shares = await verify.rows('sys_record_share', { object_name: 'crm_forecast', record_id: rowId });
    expect(shares.length, `no share row on forecast ${rowId}`).toBeGreaterThan(0);
  }
});

describe('the declaration (#2277, ruling B)', () => {
  const salesManager = ((stack as Rec).permissions as Rec[]).find((p) => p.name === 'sales_manager');
  const grant = salesManager?.objects?.crm_forecast as Rec;
  const rule = ((stack as Rec).sharingRules as Rec[]).find((r) => r.name === RULE);
  const forecast = ((stack as Rec).objects as Rec[]).find((o) => o.name === 'crm_forecast');

  it('the profile reads org-wide, edits, never deletes, and is off Modify All', () => {
    expect(grant).toMatchObject({ allowRead: true, allowEdit: true, allowDelete: false, viewAllRecords: true });
    expect(grant?.modifyAllRecords, 'Modify All is back — it grants delete whatever allowDelete says').not.toBe(true);
  });

  it('the write half is an edit share on every forecast to the sales_manager position', () => {
    expect(rule).toMatchObject({
      object: 'crm_forecast', type: 'criteria', accessLevel: 'edit',
      sharedWith: { type: 'position', value: 'sales_manager' },
    });
    const source = String(rule?.condition?.source ?? rule?.condition ?? '');
    expect(source).toBe('record.id != ""');
  });

  it('the object stays private, so owners keep write and the share is what widens it', () => {
    expect(forecast?.sharingModel).toBe('private');
  });
});

describe('a Sales Manager on forecasts other people own', () => {
  it('the fixture rows really are owned by reps, not the manager', async () => {
    expect(String((await stored(id.repForecast))?.owner_id)).toBe(rep.id);
    expect(String((await stored(id.rep2Forecast))?.owner_id)).toBe(rep2.id);
  });

  it('reads every forecast, as before (GET 200, and the list serves them)', async () => {
    for (const rowId of [id.repForecast, id.rep2Forecast]) {
      const res = await rest(mgr, 'GET', `/data/crm_forecast/${rowId}`);
      expect(res.status, JSON.stringify(res.body)).toBe(200);
    }
    const list = await rest(mgr, 'POST', '/data/crm_forecast/query', {
      filters: [['owner_id', 'in', [rep.id, rep2.id]]], top: 500,
    });
    expect(list.status, JSON.stringify(list.body)).toBe(200);
    const served = new Set(((list.body.records ?? []) as Rec[]).map((r) => String(r.id)));
    for (const rowId of [id.repForecast, id.rep2Forecast]) expect(served.has(rowId)).toBe(true);
  });

  it('updates another person\'s forecast (PATCH 200)', async () => {
    const res = await rest(mgr, 'PATCH', `/data/crm_forecast/${id.repForecast}`, { commit_amount: 55_000 });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(Number((await stored(id.repForecast))?.commit_amount)).toBe(55_000);
  });

  it('does not delete one (DELETE 403, the row survives)', async () => {
    const res = await rest(mgr, 'DELETE', `/data/crm_forecast/${id.repDeleteTarget}`);
    expect(res.status, JSON.stringify(res.body)).toBe(403);
    expect(await stored(id.repDeleteTarget), 'the forecast was deleted').toBeDefined();
  });

  it('and still reassigns one — the transfer grant the profile kept (PATCH owner_id 200)', async () => {
    const res = await rest(mgr, 'PATCH', `/data/crm_forecast/${id.transferTarget}`, { owner_id: rep2.id });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(String((await stored(id.transferTarget))?.owner_id)).toBe(rep2.id);
  });

  it('a rep still cannot edit another rep\'s forecast (negative control)', async () => {
    const res = await rest(rep, 'PATCH', `/data/crm_forecast/${id.rep2Forecast}`, { commit_amount: 1 });
    expect(res.status).not.toBe(200);
  });
});

describe('ablation: without the share, the manager\'s update is refused', () => {
  it('revoking the rule\'s grants turns the update 403; re-evaluating it restores 200', async () => {
    const row = await rules().getRule(RULE, SYS) as Rec | null;
    expect(row?.id, `rule "${RULE}" is not served`).toBeTruthy();
    const revoked = await rules().revokeRuleGrants(String(row!.id));
    expect(revoked, 'the rule had materialised no grant to revoke').toBeGreaterThan(0);

    try {
      const refused = await rest(mgr, 'PATCH', `/data/crm_forecast/${id.rep2Forecast}`, { commit_amount: 66_000 });
      expect(refused.status, JSON.stringify(refused.body)).toBe(403);
      // Read is untouched: that is `viewAllRecords`, not the share.
      expect((await rest(mgr, 'GET', `/data/crm_forecast/${id.rep2Forecast}`)).status).toBe(200);
    } finally {
      await rules().evaluateRule(RULE, SYS);
    }

    const restored = await rest(mgr, 'PATCH', `/data/crm_forecast/${id.rep2Forecast}`, { commit_amount: 66_000 });
    expect(restored.status, JSON.stringify(restored.body)).toBe(200);
  });
});
