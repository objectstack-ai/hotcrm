// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import stack, { type AnyRec } from './helpers/composed-stack';
import { hotcrmStack, signUpPerson, runScheduledFlow, type Person } from './helpers/verify-stack';

/**
 * ═══ A forecast a person saves without choosing a Source is Manual entry ═════
 *
 * #2539. `crm_forecast.source` declared `scheduled` as its default option. The
 * engine applies an option's `default` on every insert that names no source,
 * and the New Forecast form pre-selects it, so a sales manager who typed a
 * current-quarter forecast and left Source alone saved a `scheduled` row.
 * The nightly `forecast_snapshot` sweep owns exactly the `scheduled` rows in
 * the current-quarter window (`OWNED_PERIOD_FILTER`, #1082), so at 03:00 it
 * overwrote the four typed amounts and restamped the snapshot date, and
 * nothing recorded that the typed numbers had existed.
 *
 * Measured on 18.5.0 before the fix, through the engine's write door: an
 * insert with no `source`, by a sales manager and by the system alike, stored
 * `scheduled`.
 *
 * The automated writers do not lean on the default: the sweep writes
 * `scheduled` at both of its write sites and every seed row names it
 * (`test/forecast-manual-override.test.ts` and `test/forecast-seeds.test.ts`
 * cover those). What this file pins is the row nobody labelled.
 *
 * Every case runs on the shipped app booted by `@objectstack/verify`, with the
 * real `forecast_derive_period` hook in the write path and the real sweep
 * started the way its schedule starts it. A CONTROL owner with no forecast row
 * proves each sweep really ran, so a stand-down is a decision and not a flow
 * that died on its first node.
 */

const pad = (n: number) => String(n).padStart(2, '0');
const isoUtc = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const nowUtc = new Date();
const qStart = new Date(Date.UTC(nowUtc.getUTCFullYear(), Math.floor(nowUtc.getUTCMonth() / 3) * 3, 1));
const inPeriod = isoUtc(qStart);

/** The manager's typed numbers; the live pipeline below sums to nothing like them. */
const TYPED = { pipeline_amount: 4_242_000, best_case_amount: 3_100_000, commit_amount: 2_000_000, closed_amount: 1_000_000 };

const objects: AnyRec[] = (stack as AnyRec).objects ?? [];
const sourceField = (): AnyRec => objects.find((o) => o.name === 'crm_forecast')!.fields.source;

describe('the declared default of crm_forecast.source', () => {
  it('is `manual`, and `scheduled` is no option\'s default', () => {
    const options: AnyRec[] = sourceField().options;
    expect(options.filter((o) => o.default === true).map((o) => o.value)).toEqual(['manual']);
  });
});

describe('on the booted app (#2539)', () => {
  let verify: VerifyStack;
  let k = 0;
  beforeAll(async () => {
    verify = await hotcrmStack();
  }, 120_000);

  /** A sales manager and a control owner, each with live pipeline this quarter. */
  const world = async () => {
    const n = ++k;
    const manager = await signUpPerson(verify, `manager.${n}@forecast-source-default.test`, {
      name: `Forecast Manager ${n}`, positions: ['crm_sales_manager'], permissionSets: ['sales_manager'],
    });
    const control = await signUpPerson(verify, `control.${n}@forecast-source-default.test`, { name: `Control Owner ${n}` });
    const [acct] = await verify.seed('crm_account', [{ name: `Source Default Co ${n}`, owner_id: manager.id }]);
    const opp = (owner: Person, stage: string, amount: number) => ({
      name: `Source Default ${stage} ${n}.${owner.id}`, owner_id: owner.id, stage, amount, close_date: inPeriod, crm_account: acct!.id,
    });
    await verify.seed('crm_opportunity', [opp(manager, 'negotiation', 30_000), opp(control, 'proposal', 55_000)]);
    return { manager, control };
  };

  const stored = async (id: string): Promise<AnyRec> => (await verify.rows('crm_forecast', { id }))[0]!;
  const currentQuarterRows = (owner: Person) => verify.rows('crm_forecast', { owner_id: owner.id, period_start: inPeriod });
  const sweep = () => runScheduledFlow(verify, 'forecast_snapshot');

  /** The New Forecast form's post: Source left as the form offered it, i.e. not sent. */
  const managerSaves = async (manager: Person, doc: AnyRec): Promise<AnyRec> =>
    stored((await verify.hooks.run('crm_forecast', 'insert', {
      owner_id: manager.id, period: 'quarter', ...TYPED, ...doc,
    }, { as: manager.token })).id);

  const expectControlSwept = async (control: Person) => {
    const rows = await currentQuarterRows(control);
    expect(rows, 'the sweep never reached the control owner — it did not really run').toHaveLength(1);
    expect(rows[0]!.source).toBe('scheduled');
  };

  it.each([
    // An old snapshot date, so a restamp to today is unmissable.
    ['with the quarter\'s first day typed', { period_start: inPeriod, snapshot_date: '2026-01-02' }],
    // The form no longer demands Period Start (`forecast.object.ts`); the hook
    // places a blank one on the quarter containing the snapshot date — today
    // when the form leaves that at its default, as here.
    ['with Period Start left blank', { period_start: null }],
  ])('a manager\'s current-quarter forecast saved %s is Manual entry, and the sweep leaves it alone', async (_label, doc) => {
    const { manager, control } = await world();
    const before = await managerSaves(manager, doc);
    expect(before.source, 'a row nobody labelled was stored as the sweep\'s own').toBe('manual');
    expect(before.period_start).toBe(inPeriod);

    await sweep();

    const rows = await currentQuarterRows(manager);
    expect(rows, 'the sweep opened a second row beside the manager\'s, or adopted it').toHaveLength(1);
    // The whole stored row, `updated_at` included: no amount overwritten, no
    // restamp, no source flip.
    expect(rows[0]).toEqual(before);
    await expectControlSwept(control);
  });

  it('a system insert that names no source is Manual entry too: the default is the engine\'s, not only the form\'s', async () => {
    const [written] = await verify.seed('crm_forecast', [{ period: 'month', period_start: '2026-08-01' }]);
    expect((await stored(written!.id)).source).toBe('manual');
  });

  it('a writer that names its source keeps it', async () => {
    const { manager } = await world();
    expect((await managerSaves(manager, { period_start: '2026-07-01', source: 'scheduled' })).source).toBe('scheduled');
    expect((await managerSaves(manager, { period_start: '2026-04-01', source: 'ai' })).source).toBe('ai');
  });
});
