// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ObjectKernel } from '@objectstack/core';
import { DefaultDatasourcePlugin, AppPlugin } from '@objectstack/runtime';
import { ObjectQLPlugin } from '@objectstack/objectql';
import { MetadataPlugin } from '@objectstack/metadata';
import stack from '../objectstack.config';
import opportunityHooks from '../src/objects/opportunity.hook';
import { makeCtx, hookNamed, type Rec } from './helpers/hook-harness';
import { objects, pages, views, profiles, type AnyRec } from './helpers/metadata-fixtures';

/**
 * ═══ A field the save ALWAYS overwrites may not be offered as an input ═══
 *
 * #1035: a rep dragged **Probability** to 40 % on the new-opportunity form and
 * created the deal. The record landed at `probability: 10` — prospecting's
 * value — with `expected_revenue = amount × 10 %`, and nothing on the screen
 * said the number had been replaced. The form collected an input the save
 * discarded.
 *
 * ### What was measured before choosing a fix (17.0.0-rc.4)
 *
 * `opportunity_lifecycle` sets `input.probability = STAGE_PROBABILITY[stage]`
 * unguarded, and `stage` falls back to `previous.stage`, so EVERY write path
 * re-derives it:
 *
 *   | write                                    | supplied | stored |
 *   | ---------------------------------------- | -------- | ------ |
 *   | insert, stage=prospecting                | 40       | 10     |
 *   | update, probability only (no stage move) | 40       | 10     |
 *   | update, stage → needs_analysis           | 40       | 40     |
 *   | update, unrelated field (name)           | —        | 10     |
 *   | insert with no `ctx.user` (seed/system)  | 40       | 10     |
 *
 * End to end through a real engine, a plain-user insert of `probability: 40`
 * on a 100 000 prospecting deal stored `10` and `expected_revenue: 10 000` —
 * the issue's own evidence, reproduced off the browser.
 *
 * So the hook is NOT a backfill that defers to an explicit value: it is the
 * single writer, exactly as its own comment ("single source of truth = stage")
 * and the object's ("`probability` … derived imperatively in
 * `opportunity.hook.ts`") always claimed. That settles which of #1035's two
 * candidate fixes applies — the field is stage-driven by design, so the
 * surfaces stop offering it, and the sync itself is left alone.
 *
 * ### What the fix is, and what pins it
 *
 * `crm_opportunity.probability` is `readonly: true` with no `defaultValue`
 * (the literal `10` was a second copy of `STAGE_PROBABILITY.prospecting`, and
 * on the create form it displayed a percentage that was wrong for any stage
 * but the first). The sales-rep profile no longer grants `editable` on it.
 *
 * The `readonly` declaration is server-enforced ASYMMETRICALLY on this
 * version, which is worth stating because the two halves are proven by
 * different assertions below:
 *
 *   - UPDATE — the engine drops a caller-supplied `probability` from the
 *     payload and reports `{ fields: ['probability'], reason: 'readonly' }`
 *     through `onFieldsDropped`. That report exists only because the field is
 *     declared read-only: it is the assertion that goes RED if the declaration
 *     is reverted.
 *   - INSERT — measured, the strip does not fire (a caller-supplied
 *     `stage_entry_date`, also `readonly`, is admitted and kept), despite the
 *     spec's `readonly` description claiming both paths. On the create path it
 *     is therefore the hook, not the engine, that makes the stored value the
 *     stage's. Filed separately; nothing here depends on it changing.
 *
 * Reverse verification, direction predicted before it was run: deleting
 * `readonly: true` from the field leaves the STORED values identical on every
 * row above — the hook already produced them — so the engine read-backs stay
 * green. What goes red is the declaration block and the `onFieldsDropped`
 * report. That is the honest shape of this fix: it does not change what is
 * stored, it stops a surface asking for something it cannot keep.
 */

type Ctx = Record<string, any>;
process.env.OS_REGISTRY_LOG ??= 'silent';

const hook = hookNamed(opportunityHooks, 'opportunity_lifecycle');

const opportunity = objects.find((o) => o.name === 'crm_opportunity') as AnyRec;
const probabilityField = opportunity?.fields?.probability as AnyRec;

/**
 * Every object node in a metadata tree.
 *
 * Deliberately NOT `walk()` from `metadata-fixtures`: that one yields only
 * nodes carrying a `type` string, and a form/column entry
 * (`{ field: 'probability', readonly: … }`) has no `type` — the sweep below
 * would have matched nothing and passed by asserting nothing.
 */
function* everyNode(node: unknown): Generator<AnyRec> {
  if (Array.isArray(node)) {
    for (const item of node) yield* everyNode(item);
    return;
  }
  if (!node || typeof node !== 'object') return;
  const rec = node as AnyRec;
  yield rec;
  for (const value of Object.values(rec)) yield* everyNode(value);
}

// ───────────────────────────────── the sync: unconditional on every path ──

describe('stage-sync owns probability on every write path', () => {
  it('insert: an explicit 40 is replaced by the stage value', async () => {
    const input: Rec = { name: 'Deal', amount: 100_000, stage: 'prospecting', probability: 40 };
    await hook.handler(makeCtx({ event: 'beforeInsert', input, user: { id: 'user_1' } }));
    expect(input.probability).toBe(10);
    expect(input.expected_revenue).toBe(10_000);
  });

  it('update: an explicit 40 with no stage move is replaced from previous.stage', async () => {
    const input: Rec = { probability: 40 };
    const previous: Rec = { id: 'opp_1', stage: 'prospecting', amount: 100_000, probability: 10 };
    await hook.handler(makeCtx({ event: 'beforeUpdate', input, previous, user: { id: 'user_1' } }));
    expect(input.probability).toBe(10);
    expect(input.expected_revenue).toBe(10_000);
  });

  it('update: a stage move sets the new stage value, not the supplied one', async () => {
    const input: Rec = { stage: 'needs_analysis', probability: 90 };
    const previous: Rec = { id: 'opp_1', stage: 'prospecting', amount: 100_000, probability: 10 };
    await hook.handler(makeCtx({ event: 'beforeUpdate', input, previous, user: { id: 'user_1' } }));
    expect(input.probability).toBe(40);
    expect(input.expected_revenue).toBe(40_000);
  });

  it('update: an unrelated edit still re-derives it', async () => {
    // The write the caller never made. `stage` resolves off `previous`, so a
    // rename re-stamps probability too — which is why "only overwrite when the
    // user did not supply one" could not have been narrowed to stage changes.
    const input: Rec = { name: 'renamed' };
    const previous: Rec = { id: 'opp_1', stage: 'prospecting', amount: 100_000, probability: 40 };
    await hook.handler(makeCtx({ event: 'beforeUpdate', input, previous, user: { id: 'user_1' } }));
    expect(input.probability).toBe(10);
  });

  it('a system / seed write is not exempt either', async () => {
    const input: Rec = { name: 'Deal', amount: 100_000, stage: 'prospecting', probability: 40 };
    await hook.handler(makeCtx({ event: 'beforeInsert', input, user: undefined }));
    expect(input.probability).toBe(10);
  });
});

// ───────────────────────────────── the declaration: no surface asks for it ──

describe('probability is declared derived, so nothing offers it as an input', () => {
  it('the field is read-only on the object', () => {
    expect(probabilityField, 'crm_opportunity.probability is gone').toBeTruthy();
    expect(
      probabilityField.readonly,
      'probability is written by opportunity_lifecycle on every save (#1035) — a writable ' +
        'declaration puts an input on the form over a value the save replaces',
    ).toBe(true);
  });

  it('carries no defaultValue — the hook is the only writer', () => {
    // A literal here is a second copy of STAGE_PROBABILITY.prospecting that a
    // stage re-tuning leaves behind, and on the create form it rendered "10 %"
    // for a rep who had already picked Proposal.
    expect(probabilityField.defaultValue).toBeUndefined();
  });

  it('says in its own description where the value comes from', () => {
    // `description` is what the renderer shows as field help, and
    // `i18n-references` requires a `help` entry in all four locales for it.
    expect(String(probabilityField.description ?? '')).toMatch(/stage/i);
  });

  it('no view or page re-enables it with a surface-level override', () => {
    // Sweep by CONSUMPTION radius, not by edited file: a form section, a page
    // block or a related-list column may each carry its own `readonly` flag,
    // and one `readonly: false` would put the widget back on exactly one
    // screen — the hardest kind of regression to see in review.
    const surfaces: AnyRec[] = [...views, ...pages];
    const entries: AnyRec[] = [];
    for (const surface of surfaces) {
      for (const node of everyNode(surface)) {
        if (node?.field === 'probability') entries.push(node);
      }
    }
    // Guard the guard: the sweep must actually be finding the entries it
    // judges, or this passes by matching nothing.
    expect(entries.length, 'no probability entry found — the sweep stopped matching').toBeGreaterThan(0);
    const reopened = entries.filter((e) => e.readonly === false || e.editable === true);
    expect(reopened, `surface(s) re-enable editing on a derived field: ${JSON.stringify(reopened)}`).toEqual([]);
  });

  it('the sales-rep profile grants read but not edit on it', () => {
    const rep = profiles.find((p) => p.name === 'sales_rep') as AnyRec;
    expect(rep, 'sales_rep profile is gone').toBeTruthy();
    const grant = rep.fields?.['crm_opportunity.probability'];
    expect(grant, 'the field-level grant disappeared').toBeTruthy();
    expect(grant.readable).toBe(true);
    // Both axes must say the same thing: a permission to edit a column no
    // writer can reach is a declaration a surface could still read as "offer
    // this rep an input" (same shape as crm_account.health_score).
    expect(grant.editable).toBe(false);
  });
});

// ───────────────────────────────────────────── the engine: end to end ──

describe('a real engine stores the stage value, never the caller value', () => {
  let kernel: Ctx;
  let ql: Ctx;
  let userId: string;
  const SYS = { isSystem: true } as Ctx;

  beforeAll(async () => {
    kernel = new ObjectKernel({ logger: { level: 'silent' } } as never);
    await kernel.use(new DefaultDatasourcePlugin({ driver: 'memory', config: {} } as never));
    await kernel.use(new MetadataPlugin({ watch: false, artifactWatch: false, environmentId: 'proj_1035' } as never));
    await kernel.use(new ObjectQLPlugin({ environmentId: 'proj_1035' } as never));
    await kernel.use(new AppPlugin(stack as never, undefined as never, { skipSeedData: true } as never));
    await kernel.bootstrap();
    ql = kernel.getService('objectql');
    const user = await ql.insert('sys_user', { name: 'Rep', email: 'rep@probability-1035.test' }, { context: SYS });
    userId = user.id;
  }, 180_000);

  afterAll(async () => {
    await kernel?.shutdown?.();
  });

  const rowOf = async (id: string): Promise<Ctx> => {
    const [row] = await ql.find('crm_opportunity', { where: { id } }, { context: SYS });
    return row;
  };

  it('reproduces #1035 end to end and pins the outcome', async () => {
    const account = await ql.insert(
      'crm_account',
      { name: 'Probability Co', type: 'prospect', industry: 'technology' },
      { context: SYS },
    );

    // The create the rep made: 40 % typed on the form, prospecting selected.
    const opp = await ql.insert(
      'crm_opportunity',
      {
        name: 'Probability Deal',
        crm_account: account.id,
        amount: 100_000,
        stage: 'prospecting',
        probability: 40,
        close_date: '2026-12-31',
        owner_id: userId,
      },
      { context: { userId } },
    );
    const created = await rowOf(opp.id);
    expect(created.probability).toBe(10);
    expect(created.expected_revenue).toBe(10_000);

    // The update path: here the DECLARATION does the work. The engine drops
    // the key before the write and says so — this report is what disappears
    // if `readonly: true` is taken off the field.
    const dropped: Ctx[] = [];
    await ql.update(
      'crm_opportunity',
      { id: opp.id, probability: 40 },
      { where: { id: opp.id }, context: { userId }, onFieldsDropped: (d: Ctx) => dropped.push(d) },
    );
    expect(dropped).toEqual([
      { object: 'crm_opportunity', fields: ['probability'], reason: 'readonly' },
    ]);
    expect((await rowOf(opp.id)).probability).toBe(10);

    // And the one move that DOES change it — the stage, which is the whole
    // point of the field being derived.
    await ql.update(
      'crm_opportunity',
      { id: opp.id, stage: 'needs_analysis' },
      { where: { id: opp.id }, context: { userId } },
    );
    const advanced = await rowOf(opp.id);
    expect(advanced.probability).toBe(40);
    expect(advanced.expected_revenue).toBe(40_000);
  }, 120_000);

  it('a created deal is never left without a probability (no defaultValue to fall back on)', async () => {
    // Removing `defaultValue: 10` is only safe because the hook fills the
    // column on every insert for every declared stage. `avg_probability` in
    // `opportunity_metrics` averages this column, and a null row would skew it
    // silently.
    const account = await ql.insert(
      'crm_account',
      { name: 'Probability Co 2', type: 'prospect', industry: 'technology' },
      { context: SYS },
    );
    for (const [stage, expected] of [
      ['prospecting', 10],
      ['qualification', 25],
      ['needs_analysis', 40],
      ['proposal', 60],
      ['negotiation', 80],
    ] as [string, number][]) {
      const opp = await ql.insert(
        'crm_opportunity',
        {
          name: `Deal ${stage}`,
          crm_account: account.id,
          amount: 1_000,
          stage,
          close_date: '2026-12-31',
          owner_id: userId,
        },
        { context: { userId } },
      );
      const row = await rowOf(opp.id);
      expect(row.probability, `${stage} landed without a probability`).toBe(expected);
      expect(row.expected_revenue).toBe((1_000 * expected) / 100);
    }
  }, 120_000);
});
