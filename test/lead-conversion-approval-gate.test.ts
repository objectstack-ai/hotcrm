// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { ExpressionEngine } from '@objectstack/formula';
import stack from '../objectstack.config';
import leadHooks from '../src/sales/objects/lead.hook';
import { ConvertLeadAction } from '../src/sales/actions/lead.actions';
import { LeadConversionFlow } from '../src/sales/flows/lead-conversion.flow';
import { LeadConversionApprovalFlow } from '../src/sales/flows/lead-conversion-approval.flow';
import { hookNamed, makeCtx, makeHarness } from './helpers/hook-harness';
import { makeFlowHarness, type Rec } from './helpers/flow-harness';

/**
 * The conversion approval gate, and the thing that actually has to hold about
 * it: **it is OFF in the box** (REQ-0005).
 *
 * The gate is authored across four surfaces that must all agree —
 * `crm_lead.conversion_approval_status`'s default, `convert_lead`'s `visible`
 * predicate, the `decision_approval` branch inside `lead_conversion`, and the
 * `beforeUpdate` refusal in `lead.hook.ts`. Three of the four are CEL evaluated
 * somewhere this repo's other suites do not look, and the fourth is a hook
 * body. ⇒ One file, because a gate that is off on three surfaces and on for the
 * fourth is worse than a gate that is simply on: it hides the Convert button
 * from an install that never asked for an approval, with nothing to click to
 * find out why.
 *
 * ⚠️ The shipped-default assertions are not decoration. `defaultValue:
 * 'not_required'` IS the switch — flip that one value and every new lead is born
 * pending — so a silent change to it would arm an approval gate for every
 * existing install, and no other test in this repo would notice.
 */

type AnyRec = Record<string, any>;

const objects: AnyRec[] = (stack as any).objects ?? [];
const lead = objects.find((o) => o.name === 'crm_lead') as AnyRec | undefined;

/** Evaluate a flow condition exactly as the engine does (cf. flow-record-change). */
function conditionHolds(condition: unknown, vars: Record<string, unknown>): boolean {
  const h = makeFlowHarness({}, {});
  const engine = h.engine as unknown as {
    evaluateCondition(c: unknown, v: Map<string, unknown>): boolean;
  };
  const expr = typeof condition === 'string' ? { dialect: 'cel', source: condition } : condition;
  return engine.evaluateCondition(expr, new Map(Object.entries(vars)));
}

const startCondition = (LeadConversionApprovalFlow.nodes as Rec[])
  .find((n) => n.id === 'start')?.config?.condition;

const edgeCondition = (id: string) =>
  (LeadConversionFlow.edges as Rec[]).find((e) => e.id === id)?.condition;

const guard = hookNamed(leadHooks, 'lead_automation');

/** One write against a lead the hook sees as `previous`. */
const write = (input: AnyRec, previous: AnyRec) =>
  guard.handler(
    makeCtx({
      event: 'beforeUpdate',
      input: { id: 'lead_1', ...input },
      previous: {
        id: 'lead_1', first_name: 'Ada', last_name: 'Lovelace', company: 'Acme',
        is_converted: false, status: 'qualified', ...previous,
      },
      user: { id: 'usr_1' },
      api: makeHarness().api,
    }),
  );

/** The verdict column in every shape a real record can present it in. */
const OFF_SHAPES: [string, AnyRec][] = [
  ['the shipped default', { conversion_approval_status: 'not_required' }],
  ['a signed-off lead', { conversion_approval_status: 'approved' }],
  ['a lead older than the column', {}],
  ['an explicit null', { conversion_approval_status: null }],
];
const REFUSING_SHAPES: [string, AnyRec][] = [
  ['awaiting a decision', { conversion_approval_status: 'pending' }],
  ['refused by an approver', { conversion_approval_status: 'rejected' }],
];

describe('the gate ships OFF — the field default is the switch', () => {
  it('found the lead object and its verdict column', () => {
    expect(lead, 'crm_lead missing from the stack').toBeTruthy();
    expect(lead?.fields?.conversion_approval_status, 'the verdict column is gone').toBeTruthy();
  });

  it('defaults to not_required, at FIELD level and not only on the option', () => {
    const f = lead!.fields.conversion_approval_status as AnyRec;
    // Field-level, because an option-level `default: true` only preselects in a
    // UI form after first paint — a quick-create dialog or an API insert would
    // land a null, and a null enters no branch of this gate. Same lesson
    // `status` and `crm_opportunity.approval_status` record.
    expect(f.defaultValue).toBe('not_required');
    expect(f.readonly, 'a user-writable verdict is not a verdict').toBe(true);
  });

  it('is a transition gate, not an invariant: no validation re-states it', () => {
    // AGENTS.md metadata semantics rule 7. A `validations[]` copy would be
    // evaluated against `{...previous, ...data}`, where "already converted" and
    // "converting now" are the same state — so it would brick every later write
    // to every lead converted before the gate existed.
    const rules = (lead?.validations ?? []) as AnyRec[];
    const restating = rules.filter((r) =>
      JSON.stringify(r).includes('conversion_approval_status'));
    expect(restating.map((r) => r.name)).toEqual([]);
  });
});

describe('lead_conversion_approval — start condition', () => {
  it('declares one at all', () => {
    const source = typeof startCondition === 'string'
      ? startCondition
      : (startCondition as { source?: unknown } | undefined)?.source;
    expect(typeof source === 'string' && source.length > 0).toBe(true);
  });

  it.each(OFF_SHAPES)('opens NO approval request for %s', (_label, shape) => {
    expect(conditionHolds(startCondition, { record: { id: 'l1', ...shape } })).toBe(false);
  });

  it('enters once an install arms the gate and a lead is born pending', () => {
    expect(conditionHolds(startCondition, {
      record: { id: 'l1', conversion_approval_status: 'pending' },
    })).toBe(true);
  });
});

describe('lead_conversion — the decision_approval branch', () => {
  // The three duplicate edges are pinned the same way in
  // `lead-duplicate-visibility.test.ts`, and for the measured reason recorded
  // there: a decision node declaring no `config.conditions` takes EVERY
  // out-edge whose condition holds, IN PARALLEL. Two overlapping guards here
  // would show the refusal screen and convert the lead in one run.
  const SHAPES: [string, Record<string, unknown>][] = [
    ...OFF_SHAPES.map(([l, s]) => [l, { leadRecord: { id: 'l1', ...s } }] as [string, Record<string, unknown>]),
    ...REFUSING_SHAPES.map(([l, s]) => [l, { leadRecord: { id: 'l1', ...s } }] as [string, Record<string, unknown>]),
    ['a lead the fetch never bound', {}],
  ];

  it.each(SHAPES)('takes exactly one out-edge for %s', (_label, vars) => {
    const taken = ['e28', 'e29'].filter((id) => conditionHolds(edgeCondition(id), vars));
    expect(taken).toHaveLength(1);
  });

  it.each(REFUSING_SHAPES)('routes %s to the refusal screen, ahead of every writer', (_l, shape) => {
    const vars = { leadRecord: { id: 'l1', ...shape } };
    expect(conditionHolds(edgeCondition('e28'), vars)).toBe(true);
    // The refusal rejoins nothing: the flow's first create sits behind
    // `screen_1`, which this path never reaches.
    const e28 = (LeadConversionFlow.edges as Rec[]).find((e) => e.id === 'e28');
    expect(e28?.target).toBe('refuse_unapproved');
    expect((LeadConversionFlow.edges as Rec[])
      .filter((e) => e.source === 'refuse_unapproved')
      .map((e) => e.target)).toEqual(['end']);
  });

  it.each(OFF_SHAPES)('lets %s straight through to the duplicate verdict', (_l, shape) => {
    expect(conditionHolds(edgeCondition('e29'), { leadRecord: { id: 'l1', ...shape } })).toBe(true);
  });
});

describe('convert_lead — the button', () => {
  const predicate = (ConvertLeadAction.visible as AnyRec)?.source ?? ConvertLeadAction.visible;
  const open = (shape: AnyRec) => ({
    id: 'l1', is_converted: false, status: 'qualified', ...shape,
  });
  const visible = (record: AnyRec) =>
    ExpressionEngine.evaluate({ dialect: 'cel', source: String(predicate) }, { record });

  it.each(OFF_SHAPES)('is offered on an open lead — %s', (_l, shape) => {
    expect(visible(open(shape))).toMatchObject({ ok: true, value: true });
  });

  it.each(REFUSING_SHAPES)('is withheld from a lead %s', (_l, shape) => {
    expect(visible(open(shape))).toMatchObject({ ok: true, value: false });
  });
});

describe('the write path — the half a REST caller cannot route around', () => {
  it.each(REFUSING_SHAPES)('refuses a lead %s crossing into converted', async (_l, shape) => {
    const err = await write({ is_converted: true, status: 'converted' }, shape)
      .then(() => null, (e: AnyRec) => e);
    expect(err, 'the gate let an unapproved conversion through').toBeTruthy();
    // ADR-0112 envelope: the CODE and the STATUS are the contract, not the
    // prose. A bare `toThrow()` would pass on an unenveloped Error.
    expect(err.code).toBe('RECORD_LOCKED');
    expect(err.status).toBe(409);
    // The sentence names the lead the way every lead surface titles one.
    expect(String(err.message)).toContain('Ada Lovelace - Acme');
  });

  it('refuses a bare is_converted flip with no status change (the API shape)', async () => {
    const err = await write({ is_converted: true }, { conversion_approval_status: 'pending' })
      .then(() => null, (e: AnyRec) => e);
    expect(err?.code).toBe('RECORD_LOCKED');
  });

  it.each(OFF_SHAPES)('lets the conversion through for %s', async (_l, shape) => {
    await expect(write({ is_converted: true, status: 'converted' }, shape))
      .resolves.toBeUndefined();
  });

  it('never fires twice: an already-converted lead is out of its reach', async () => {
    // REQ-0005 acceptance 4. `description` is on the converted-lock allow-list,
    // so anything thrown here would be THIS gate — and nothing is, because the
    // record is not CROSSING into converted on this write.
    await expect(
      write(
        { description: 'note added after conversion' },
        { is_converted: true, status: 'converted', conversion_approval_status: 'pending' },
      ),
    ).resolves.toBeUndefined();
  });
});
