// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ObjectQL } from '@objectstack/objectql';
import { InMemoryDriver } from '@objectstack/driver-memory';
import { AutomationEngine, installBuiltinNodes } from '@objectstack/service-automation';
import type * as Automation from '@objectstack/spec/automation';
import { P } from '@objectstack/spec';
import { silentLogger } from './helpers/flow-harness';

type AnyRec = Record<string, any>;
type Flow = Automation.Flow;

/**
 * WHAT `readonly: true` ACTUALLY STRIPS ON THE PINNED 17.3.0 (#1429, #1460,
 * #1676).
 *
 * `case.object.ts` carried a blanket claim — "the platform drops writes to
 * readonly fields" — that had grown load-bearing: it was the stated reason for
 * a `STAMPED_NOT_TYPED` guard exemption in `test/metadata-references.test.ts`
 * and for a counter-pin in `test/case-create-form-narrowing.test.ts`. A claim
 * that gates a guard deserves a measurement, so this file takes one.
 *
 * ⭐ FOLLOW-THROUGH (#1434): that measurement is what retired the exemption.
 * Knowing the strip follows `runAs` rather than "flows" let the escalation
 * stamp move into a dedicated `runAs: 'system'` sub-flow, so
 * `crm_case.is_escalated` / `escalated_date` could finally be declared
 * `readonly: true` — and the exemption, plus both counter-pins, are gone. The
 * ruling's own premise (a callee's `runAs` governs its writes rather than
 * inheriting the caller's) is measured in the "system subflow called from a
 * user parent" section below.
 *
 * ## The variable that decides it
 *
 * The strip is one branch in the engine's update path
 * (`@objectstack/objectql/dist/core.js`):
 *
 *     if (!opCtx.context?.isSystem) {
 *       hookContext.input.data = stripReadonlyFields(updateSchema, preRo, suppliedValues, ...)
 *     }
 *
 * So the variable is NOT "which writer" in any direct sense — it is the
 * `isSystem` flag on the execution context each writer ends up handing the
 * engine, plus the `suppliedValues` discipline (only a key the CALLER supplied,
 * still holding the caller's own value, is eligible). Every writer kind below is
 * therefore measured against ALL THREE caller contexts rather than the one it
 * happens to use in production, so the reading names the variable instead of
 * confounding it with the writer.
 *
 * A flow reaches that flag through `resolveRunDataContext`
 * (`@objectstack/service-automation/dist/index.js`), which returns
 * `{ isSystem: true, ... }` when and only when the flow declares
 * `runAs: 'system'`, and `{ isSystem: false, userId }` otherwise (throwing
 * `UnscopedRunDataAccessError` when a non-system run has no user). So `runAs`
 * — an AUTHORED property of each flow file — is what decides a flow write,
 * and "a flow write" is not one answer but two.
 *
 * ## Why a real engine and a purpose-built probe object
 *
 * `test/helpers/flow-harness.ts` runs flows over a stand-in data engine with no
 * readonly semantics at all, so it cannot see this. Here the AutomationEngine's
 * `data` service IS a real `ObjectQL` — its flat `update(object, data, options)`
 * surface is exactly what the `update_record` executor calls — over a real
 * `InMemoryDriver`. The probe object is purpose-built so the measurement never
 * depends on, or perturbs, the shipped `crm_case` declaration.
 *
 * First measured on `@objectstack/* 17.1.0`. RE-MEASURED 2026-09-03 against
 * `@objectstack/* 17.2.0` (#1460), and RE-MEASURED AGAIN against the PINNED
 * `@objectstack/* 17.3.0` in `package.json` (#1676, after the PR #1577 bump)
 * — every case below reports the same verdict it did at both earlier takings,
 * and the two engine internals quoted above still read as quoted on the
 * current pin: the strip is still guarded by
 * `if (!opCtx.context?.isSystem)` in `@objectstack/objectql/dist/core.js`,
 * and `resolveRunDataContext` in
 * `@objectstack/service-automation/dist/index.js` still returns
 * `isSystem: true` for `runAs: 'system'` and only for it.
 *
 * ⚠️ The parenthetical this replaces ("dependabot PRs #1388-#1393 propose
 * 17.2.0; this is not that") was false in a second way by the time it was
 * swept: 17.2.0 stopped being a proposal when PR #1442 landed it.
 */

const PROBE = 'probe_readonly';

/** The probe schema: one locked column, one open column as the control. */
const probeObject = {
  name: PROBE,
  label: 'Readonly Probe',
  fields: {
    name: { type: 'text', label: 'Name' },
    // The subject: statically `readonly`, exactly like a field the card asks
    // about would be if it were declared.
    locked_flag: { type: 'boolean', label: 'Locked Flag', readonly: true },
    // The control: identical in every way except the flag. A run in which the
    // control ALSO fails to land is a broken harness, not a strip — and the
    // control is what tells the two apart.
    open_flag: { type: 'boolean', label: 'Open Flag' },
    // A SECOND locked column, written by the PARENT flow after a subflow
    // returns. Identical to `locked_flag` in every way; it exists so one run
    // can report both halves of the callee-runAs question at once — see the
    // subflow section below.
    locked_after: { type: 'boolean', label: 'Locked After', readonly: true },
  },
} as AnyRec;

/**
 * A SECOND probe object for the ORDERING question (#1434), carrying a
 * validation shaped exactly like `crm_case`'s `escalation_reason_required`:
 * the locked column may not be true while the reason column is blank.
 *
 * It is a separate object so the ordering measurement cannot perturb — or be
 * perturbed by — the strip measurements on `probe_readonly` above.
 */
const ORDERED = 'probe_ordered';

const orderedObject = {
  name: ORDERED,
  label: 'Ordering Probe',
  fields: {
    name: { type: 'text', label: 'Name' },
    // The stamp: readonly, so only an elevated writer can set it.
    locked_flag: { type: 'boolean', label: 'Locked Flag', readonly: true },
    // The user's input, and the validation's subject. NOT readonly — the whole
    // point is that a user-context write must be able to land it.
    reason: { type: 'text', label: 'Reason' },
  },
  validations: [
    {
      name: 'reason_required',
      type: 'script',
      severity: 'error',
      message: 'Reason required when the locked flag is true',
      // Same predicate shape as `crm_case.escalation_reason_required`.
      condition: P`has(record.locked_flag) && record.locked_flag == true && (!has(record.reason) || isBlank(record.reason))`,
    },
  ],
} as AnyRec;

/** The three caller contexts the card asks to vary, by name. */
const CONTEXTS: Array<[label: string, ctx: AnyRec]> = [
  ['{ userId, isSystem }', { userId: 'user_1', isSystem: true }],
  ['{ isSystem }', { isSystem: true }],
  ['{ userId } (no isSystem)', { userId: 'user_1' }],
];

let ql: any;

/** The write both flow shapes perform, identical in every respect. */
const writeNode = {
  id: 'write', type: 'update_record', label: 'Write Probe',
  config: {
    objectName: PROBE,
    filter: { id: '{rowId}' },
    fields: { locked_flag: true, open_flag: true },
  },
};

/**
 * A schedule-shaped flow whose only node writes both probe columns.
 * `runAs` is the variable; everything else is held constant.
 */
const writerFlow = (name: string, runAs: 'system' | 'user'): Flow =>
  ({
    name, label: name, type: 'schedule', status: 'active', runAs,
    variables: [{ name: 'rowId', type: 'text', isInput: true, isOutput: false }],
    nodes: [
      { id: 'start', type: 'start', label: 'Start', config: {} },
      writeNode,
      { id: 'end', type: 'end', label: 'End' },
    ],
    edges: [
      { id: 'e1', source: 'start', target: 'write', type: 'default' },
      { id: 'e2', source: 'write', target: 'end', type: 'default' },
    ],
  }) as AnyRec as Flow;

/** The same write behind a screen node — the `escalate_case` shape exactly. */
const screenFlow = (name: string, runAs: 'system' | 'user'): Flow =>
  ({
    name, label: name, type: 'screen', status: 'active', runAs,
    variables: [
      { name: 'rowId', type: 'text', isInput: true, isOutput: false },
      { name: 'confirm', type: 'text', isInput: true, isOutput: false },
    ],
    nodes: [
      { id: 'start', type: 'start', label: 'Start', config: { objectName: PROBE } },
      {
        id: 'ask', type: 'screen', label: 'Confirm',
        config: { fields: [{ name: 'confirm', label: 'Confirm', type: 'text', required: false }] },
      },
      writeNode,
      { id: 'end', type: 'end', label: 'End' },
    ],
    edges: [
      { id: 'e1', source: 'start', target: 'ask', type: 'default' },
      { id: 'e2', source: 'ask', target: 'write', type: 'default' },
      { id: 'e3', source: 'write', target: 'end', type: 'default' },
    ],
  }) as AnyRec as Flow;

/** Boot an AutomationEngine whose `data` service is the REAL ObjectQL. */
function automation(flows: Record<string, Flow>) {
  // `any`, matching `test/helpers/flow-harness.ts`: `installBuiltinNodes` wants a
  // full `PluginContext` and this stands in for the two members the node
  // executors actually reach for.
  const ctx: any = {
    logger: silentLogger,
    getService: (n: string) => (n === 'data' || n === 'objectql' ? ql : undefined),
  };
  const engine = new AutomationEngine(silentLogger);
  installBuiltinNodes(engine, ctx);
  for (const [n, f] of Object.entries(flows)) engine.registerFlow(n, f);
  return engine;
}

/** Insert a fresh probe row with both flags false, under a system context. */
async function seedRow(): Promise<string> {
  const row = await ql.insert(
    PROBE,
    { name: 'probe', locked_flag: false, open_flag: false, locked_after: false },
    { context: { isSystem: true, userId: 'seed' } },
  );
  return String(row.id);
}

const readBack = async (id: string): Promise<AnyRec> =>
  await ql.findOne(PROBE, { where: { id }, context: { isSystem: true, userId: 'seed' } });

beforeAll(async () => {
  ql = await ObjectQL.create({
    datasources: { default: new InMemoryDriver({ persistence: false }) },
    objects: { [PROBE]: probeObject, [ORDERED]: orderedObject } as never,
    hooks: [
      {
        // The hook writer: a `beforeUpdate` that STAMPS the locked column onto
        // `ctx.input.data`, i.e. a value the engine did not receive from the
        // caller. Keyed off a sentinel so it only fires for the hook cases.
        event: 'beforeUpdate',
        object: PROBE,
        handler: (hookCtx: AnyRec) => {
          const data = hookCtx?.input?.data;
          if (!data || data.name !== 'stamp-me') return;
          data.locked_flag = true;
          data.open_flag = true;
        },
      },
    ],
  });
});

afterAll(async () => {
  await ql?.close();
});

// ───────────────────────────────────────── writer 1: plain caller PATCH ──

describe('writer: a plain caller PATCH (the flag\'s whole point)', () => {
  it.each(CONTEXTS)('under %s', async (_label, context) => {
    const id = await seedRow();
    await ql.update(
      PROBE,
      { locked_flag: true, open_flag: true },
      { where: { id }, context },
    );
    const after = await readBack(id);
    // The control must always land — otherwise this run measured nothing.
    expect(after.open_flag, 'the CONTROL column did not land — harness fault, not a strip').toBe(true);
    // The subject follows `isSystem`, and nothing else.
    expect(after.locked_flag).toBe(context.isSystem === true);
  });
});

// ────────────────────────────────── writer 2: a beforeUpdate hook stamp ──

describe('writer: a beforeUpdate hook stamping ctx.input.data', () => {
  it.each(CONTEXTS)('under %s', async (_label, context) => {
    const id = await seedRow();
    // The caller supplies ONLY `name`. `locked_flag` is put on the payload by
    // the hook, so it is not in `suppliedValues` — the discipline #9107 quotes.
    await ql.update(PROBE, { name: 'stamp-me' }, { where: { id }, context });
    const after = await readBack(id);
    expect(after.open_flag, 'the CONTROL column did not land — harness fault, not a strip').toBe(true);
    expect(after.locked_flag).toBe(true);
  });
});

// ──────────────────────────────── writer 3: a flow `update_record` node ──

describe('writer: a flow update_record node', () => {
  it('runAs: system — survives', async () => {
    const id = await seedRow();
    const engine = automation({ probe_sys: writerFlow('probe_sys', 'system') });
    await engine.execute('probe_sys', { params: { rowId: id }, userId: 'user_1', event: 'manual' } as never);
    const after = await readBack(id);
    expect(after.open_flag, 'the CONTROL column did not land — harness fault, not a strip').toBe(true);
    expect(after.locked_flag).toBe(true);
  });

  it('runAs: user (the default) — stripped', async () => {
    const id = await seedRow();
    const engine = automation({ probe_usr: writerFlow('probe_usr', 'user') });
    await engine.execute('probe_usr', { params: { rowId: id }, userId: 'user_1', event: 'manual' } as never);
    const after = await readBack(id);
    expect(after.open_flag, 'the CONTROL column did not land — harness fault, not a strip').toBe(true);
    expect(after.locked_flag).toBe(false);
  });
});

// ─────────────────────────── writer 4: an action / screen flow's write ──

describe('writer: a screen flow (the escalate_case shape)', () => {
  it('runAs: system — survives', async () => {
    const id = await seedRow();
    const engine = automation({ probe_screen_sys: screenFlow('probe_screen_sys', 'system') });
    const started: AnyRec = await engine.execute('probe_screen_sys', {
      params: { rowId: id }, userId: 'user_1', event: 'manual',
    } as never);
    const runId = started?.runId ?? started?.run?.id;
    if (runId) await engine.resume(runId, { variables: { confirm: true } } as never);
    const after = await readBack(id);
    expect(after.open_flag, 'the CONTROL column did not land — harness fault, not a strip').toBe(true);
    expect(after.locked_flag).toBe(true);
  });

  it('runAs: user (the default) — stripped', async () => {
    const id = await seedRow();
    const engine = automation({ probe_screen_usr: screenFlow('probe_screen_usr', 'user') });
    const started: AnyRec = await engine.execute('probe_screen_usr', {
      params: { rowId: id }, userId: 'user_1', event: 'manual',
    } as never);
    const runId = started?.runId ?? started?.run?.id;
    if (runId) await engine.resume(runId, { variables: { confirm: true } } as never);
    const after = await readBack(id);
    expect(after.open_flag, 'the CONTROL column did not land — harness fault, not a strip').toBe(true);
    expect(after.locked_flag).toBe(false);
  });
});

// ────────────────────────────────────────── the INSERT path, separately ──

describe('the strip is an UPDATE-path rule — insert is deliberately exempt', () => {
  it('a plain user-context INSERT seeds the readonly column', async () => {
    // `@objectstack/objectql/dist/core.js`: "INSERT remains deliberately exempt
    // from the AUTHOR-declared readonly/readonlyWhen strips (a create may
    // legitimately seed read-only columns…)". So "the platform drops writes to
    // readonly fields" is not even true of every write VERB — seed data and
    // any create path are unaffected.
    const row = await ql.insert(
      PROBE,
      { name: 'seeded', locked_flag: true, open_flag: true },
      { context: { userId: 'user_1' } },
    );
    const after = await readBack(String(row.id));
    expect(after.open_flag).toBe(true);
    expect(after.locked_flag, 'insert must not strip a readonly column').toBe(true);
  });
});

// ───────────────── what the measurement means for the SHIPPED case flows ──

describe('how the shipped escalate path splits privilege (#1434)', () => {
  /**
   * ⭐ REPLACES the reverse pin that stood here.
   *
   * The old pin asserted `escalate_case.runAs === 'user'` in order to keep a
   * `STAMPED_NOT_TYPED` exemption's justification honest — "this is the writer
   * that makes `is_escalated` undeclarable". #1434 removed the cause: the
   * exemption and that pin are both deleted, and `escalate_case` keeps
   * `runAs: 'user'` for the OPPOSITE reason — a person clicks it, so it must
   * carry their identity. What needs pinning now is the SPLIT, in both
   * directions: the elevated flow must stay minimal, and the screen flow must
   * stay unelevated.
   */
  it('escalate_case stays runAs:"user" — the acting agent keeps their identity', async () => {
    const { EscalateCaseFlow } = await import('../src/flows/case-actions.flow');
    expect(
      (EscalateCaseFlow as AnyRec).runAs ?? 'user',
      'escalate_case is invoked by a person from the UI and must run as that person. ' +
        'If this is now "system", option A has been reintroduced — #1434 costed it and ' +
        'the maintainer did NOT adopt it. Split the elevated write into a subflow instead.',
    ).toBe('user');
  });

  it('escalate_case writes only user-writable columns — the stamps are not in it', async () => {
    const { EscalateCaseFlow } = await import('../src/flows/case-actions.flow');
    const nodes = (EscalateCaseFlow as AnyRec).nodes as AnyRec[];
    const escalate = nodes.find((n) => n.id === 'escalate');
    const written = Object.keys(escalate?.config?.fields ?? {});
    // The reason is the agent's screen input; priority and status are ordinary
    // editable columns. `status` in particular must stay HERE — it is the
    // trigger both escalation hooks key off, so moving it would re-attribute
    // the ownership hand-off to the system.
    expect(written.sort()).toEqual(['escalation_reason', 'priority', 'status']);
  });

  it('the stamping subflow is system, minimal, and writes exactly the two readonly stamps', async () => {
    const { CaseEscalationStampFlow } = await import('../src/flows/case-escalation-stamp.flow');
    const flow = CaseEscalationStampFlow as AnyRec;
    expect(flow.runAs, 'this flow exists to be the ONE elevated step').toBe('system');
    const writes = (flow.nodes as AnyRec[]).filter((n) => n.type === 'update_record');
    expect(writes, 'one elevated write, not a general-purpose system flow').toHaveLength(1);
    expect(
      Object.keys(writes[0].config.fields).sort(),
      'every column here is written with the ELEVATED context. Anything a user can ' +
        'legitimately type belongs in escalate_case instead — adding escalation_reason ' +
        'here would strip what the agent typed (the #1434 harm, inverted).',
    ).toEqual(['escalated_date', 'is_escalated']);
  });

  it('escalate_case reaches it through a subflow node, AFTER the reason is written', async () => {
    const { EscalateCaseFlow } = await import('../src/flows/case-actions.flow');
    const { CaseEscalationStampFlow } = await import('../src/flows/case-escalation-stamp.flow');
    const nodes = (EscalateCaseFlow as AnyRec).nodes as AnyRec[];
    const sub = nodes.find((n) => n.type === 'subflow');
    expect(sub, 'the elevated write must be reached by a subflow node').toBeTruthy();
    // Registered name, not a stale string — `flowName` is resolved at run time.
    expect(sub!.config.flowName).toBe((CaseEscalationStampFlow as AnyRec).name);

    // ⚠️ ORDERING, and it is a real hazard rather than style. `crm_case`'s
    // `escalation_reason_required` validation rejects any write whose merged
    // record has `is_escalated == true` with a blank `escalation_reason`. So
    // the reason must be stored BEFORE the flag flips: `escalate` first, the
    // subflow second. This walks the edges rather than trusting array order.
    const edges = (EscalateCaseFlow as AnyRec).edges as AnyRec[];
    const order: string[] = [];
    let cursor = 'start';
    for (let i = 0; i < nodes.length + 1; i++) {
      const next = edges.find((e) => e.source === cursor);
      if (!next) break;
      order.push(next.target);
      cursor = next.target;
    }
    expect(
      order.indexOf('escalate'),
      'the reason-writing node must be reachable before the stamp',
    ).toBeGreaterThanOrEqual(0);
    expect(
      order.indexOf(sub!.id),
      'the stamping subflow must run AFTER the node that writes escalation_reason — ' +
        'stamping is_escalated first fires escalation_reason_required against a record ' +
        'that carries no reason yet, and the stamp is rejected.',
    ).toBeGreaterThan(order.indexOf('escalate'));
  });

  it('the stamped fields are declared readonly, and the user-typed one is not', async () => {
    const { Case } = await import('../src/objects/case.object');
    const fields = (Case as AnyRec).fields;
    for (const name of ['is_escalated', 'escalated_date']) {
      expect(fields[name].readonly, `${name} is stamped by a system flow and nobody types it`).toBe(true);
    }
    expect(
      fields.escalation_reason.readonly,
      'escalation_reason is the AGENT\'S SCREEN INPUT. Declaring it readonly makes the ' +
        'platform silently strip what they just typed — the #1434 harm inverted onto ' +
        'user input — and escalation_reason_required then rejects the escalation.',
    ).not.toBe(true);
  });

  it('close_case is a historical precedent and says so in the file', async () => {
    // The in-repo proof that `runAs: 'system'` on a whole flow predates the
    // rule — kept as a pin because #1434 item 3 requires the file to SAY it is
    // not a policy, so nobody cites it to elevate the next screen flow.
    const { CloseCaseFlow } = await import('../src/flows/case-actions.flow');
    const { Case } = await import('../src/objects/case.object');
    expect((CloseCaseFlow as AnyRec).runAs).toBe('system');
    expect((Case as AnyRec).fields.is_closed.readonly).toBe(true);
  });
});

// ───────── writer 5: a system SUBFLOW called from a user parent (#1434) ──

/**
 * THE RULING'S PREMISE, MEASURED (#1434, decision batch #21 ②).
 *
 * The approved direction (option D) rests on one named, falsifiable claim:
 *
 *   > 被调 flow 的自身 `runAs` 支配其写入(而非继承调用方上下文)
 *   > — a callee flow's own `runAs` governs its writes, rather than
 *   > inheriting the caller's context.
 *
 * It is worth measuring rather than reading, because the `subflow` executor
 * (`@objectstack/service-automation/dist/index.js`, `src/builtin/subflow-node.ts`)
 * builds the child's context by SPREADING THE PARENT'S:
 *
 *     const childContext = { ...context ?? {}, $subflowDepth: depth + 1, params, … };
 *     const child = await engine.execute(flowName, childContext);
 *
 * so the parent's `runAs: 'user'` is genuinely handed to the child. What
 * decides the question is that `resolveRunContext` re-asserts the callee's own
 * declaration AFTER that spread:
 *
 *     const runContext = { ...context ?? {}, runAs: flow.runAs ?? 'user', … };
 *
 * i.e. last-write-wins in the callee's favour — "a COPY, never mutating the
 * caller's context, so the elevation is scoped to this run and the caller's
 * identity is restored when the run returns (ADR-0049 / #1888)".
 *
 * ## What each assertion below rules out
 *
 * Three flows share ONE parent shape and ONE child shape; the only variable is
 * the child's declared `runAs`. That is what makes the reading a measurement of
 * `runAs` rather than of indirection:
 *
 *  - `open_flag` (the CONTROL column) must land in every run — otherwise the
 *    run measured nothing and a "stripped" reading is a harness fault. This
 *    lane has a recorded case of a flow harness that handed hooks no `ctx.api`,
 *    so every writer returned early and a green pin sat over a body that never
 *    ran. Here the control is what makes that failure mode visible.
 *  - a **`runAs: 'user'` child** must be STRIPPED. Without this case, a
 *    surviving system-child write would be equally well explained by "going
 *    through a subflow launders the write" — which would make the ruling's
 *    elevation boundary decorative.
 *  - `locked_after` — written by the PARENT's own `update_record` AFTER the
 *    subflow returns — must be STRIPPED in the same run in which the child's
 *    `locked_flag` survived. This is the half the card actually cares about:
 *    it shows the elevation was scoped to the child run and the parent kept
 *    the acting user's context, rather than the whole run being elevated
 *    (option A, explicitly not adopted).
 */

/** The callee: `autolaunched`, single `update_record`, `runAs` is the variable. */
const stampingChild = (name: string, runAs: 'system' | 'user'): Flow =>
  ({
    name, label: name, type: 'autolaunched', status: 'active', runAs,
    variables: [{ name: 'rowId', type: 'text', isInput: true, isOutput: false }],
    nodes: [
      { id: 'start', type: 'start', label: 'Start', config: {} },
      writeNode,
      { id: 'end', type: 'end', label: 'End' },
    ],
    edges: [
      { id: 'e1', source: 'start', target: 'write', type: 'default' },
      { id: 'e2', source: 'write', target: 'end', type: 'default' },
    ],
  }) as AnyRec as Flow;

/**
 * The caller: the `escalate_case` shape exactly — a `runAs: 'user'` screen
 * flow that calls the child through a `subflow` node and then makes its OWN
 * write, so one run reports both contexts.
 */
const callerFlow = (name: string, childName: string): Flow =>
  ({
    name, label: name, type: 'screen', status: 'active', runAs: 'user',
    variables: [
      { name: 'rowId', type: 'text', isInput: true, isOutput: false },
      { name: 'confirm', type: 'text', isInput: true, isOutput: false },
    ],
    nodes: [
      { id: 'start', type: 'start', label: 'Start', config: { objectName: PROBE } },
      {
        id: 'ask', type: 'screen', label: 'Confirm',
        config: { fields: [{ name: 'confirm', label: 'Confirm', type: 'text', required: false }] },
      },
      {
        id: 'stamp', type: 'subflow', label: 'Stamp',
        config: { flowName: childName, input: { rowId: '{rowId}' } },
      },
      {
        // The parent's OWN write, after the child returned. Same object, same
        // verb, a `readonly` column — the only difference from the child's
        // write is whose run makes it.
        id: 'parent_write', type: 'update_record', label: 'Parent Write',
        config: {
          objectName: PROBE,
          filter: { id: '{rowId}' },
          fields: { locked_after: true },
        },
      },
      { id: 'end', type: 'end', label: 'End' },
    ],
    edges: [
      { id: 'e1', source: 'start', target: 'ask', type: 'default' },
      { id: 'e2', source: 'ask', target: 'stamp', type: 'default' },
      { id: 'e3', source: 'stamp', target: 'parent_write', type: 'default' },
      { id: 'e4', source: 'parent_write', target: 'end', type: 'default' },
    ],
  }) as AnyRec as Flow;

/** Run a caller/callee pair to completion over a fresh probe row. */
async function runPair(childRunAs: 'system' | 'user', tag: string): Promise<AnyRec> {
  const id = await seedRow();
  const childName = `probe_child_${tag}`;
  const parentName = `probe_parent_${tag}`;
  const engine = automation({
    [childName]: stampingChild(childName, childRunAs),
    [parentName]: callerFlow(parentName, childName),
  });
  const started: AnyRec = await engine.execute(parentName, {
    params: { rowId: id }, userId: 'user_1', event: 'manual',
  } as never);
  const runId = started?.runId ?? started?.run?.id;
  if (runId) await engine.resume(runId, { variables: { confirm: true } } as never);
  return await readBack(id);
}

describe("writer: a system subflow called from a user parent (#1434's premise)", () => {
  it("callee runAs:'system' — the child's write SURVIVES the strip", async () => {
    const after = await runPair('system', 'sys');
    expect(after.open_flag, 'the CONTROL column did not land — harness fault, not a strip').toBe(true);
    expect(
      after.locked_flag,
      "THE RULING'S PREMISE (#1434 batch #21 ②): a runAs:'system' callee invoked " +
        "through a subflow node from a runAs:'user' parent must have its write to a " +
        'readonly field survive. If this is false, option D has no platform under it — ' +
        'STOP and return the card to the decision box; do NOT elevate the parent instead.',
    ).toBe(true);
  });

  it("callee runAs:'user' — the child's write is STRIPPED (so runAs is the variable, not the subflow hop)", async () => {
    const after = await runPair('user', 'usr');
    expect(after.open_flag, 'the CONTROL column did not land — harness fault, not a strip').toBe(true);
    expect(
      after.locked_flag,
      'a subflow hop must NOT by itself launder a write past the readonly strip — if ' +
        "this survives, the elevation boundary is decorative and the callee's runAs is " +
        'not what decides.',
    ).toBe(false);
  });

  it("the parent KEEPS the acting user's context after the subflow returns", async () => {
    const after = await runPair('system', 'scope');
    expect(after.open_flag, 'the CONTROL column did not land — harness fault, not a strip').toBe(true);
    // Same run as the first case: the child's write landed …
    expect(after.locked_flag, 'the elevated child write should have landed').toBe(true);
    // … and the parent's own later write to an identical readonly column did NOT.
    expect(
      after.locked_after,
      "the elevation must be SCOPED to the child run: the parent's own write to a " +
        'readonly column after the subflow returned must still be stripped. If this ' +
        'survives, calling a system subflow elevated the WHOLE parent run — which is ' +
        'option A wearing option D\'s clothes, and the property this card exists to protect.',
    ).toBe(false);
  });
});

// ─────────── the ORDERING the split forces, measured both ways (#1434) ──

/**
 * WHICH ORDER, AND WHY — measured rather than assumed.
 *
 * Splitting one `update_record` into "user writes the reason" + "system stamps
 * the flag" creates an ordering question the single node did not have, because
 * `crm_case.escalation_reason_required` rejects any write whose MERGED record
 * has `is_escalated == true` and a blank `escalation_reason`:
 *
 *     has(record.is_escalated) && record.is_escalated == true
 *       && (!has(record.escalation_reason) || isBlank(record.escalation_reason))
 *
 * When the two writes were one node they were also one validation pass, and
 * the reason arrived in the same payload as the flag. Split, they are two
 * passes — so if the stamp goes first it is validated against a record that
 * does not carry a reason yet.
 *
 * Both orders are run below over `probe_ordered`, whose validation is the same
 * predicate shape. The reading decides the shipped edge order in
 * `case-actions.flow.ts`, and the reversed case is what makes it a measurement
 * rather than a preference: it must actually FAIL.
 */

/** The elevated callee: stamps the locked column on the ordering probe. */
const orderedStamp = (name: string): Flow =>
  ({
    name, label: name, type: 'autolaunched', status: 'active', runAs: 'system',
    variables: [{ name: 'rowId', type: 'text', isInput: true, isOutput: false }],
    nodes: [
      { id: 'start', type: 'start', label: 'Start', config: {} },
      {
        id: 'write', type: 'update_record', label: 'Stamp',
        config: { objectName: ORDERED, filter: { id: '{rowId}' }, fields: { locked_flag: true } },
      },
      { id: 'end', type: 'end', label: 'End' },
    ],
    edges: [
      { id: 'e1', source: 'start', target: 'write', type: 'default' },
      { id: 'e2', source: 'write', target: 'end', type: 'default' },
    ],
  }) as AnyRec as Flow;

/**
 * The `escalate_case` shape with the two steps in a declared order.
 * `reasonFirst: true` is the shipped order; `false` is the counterfactual.
 */
const orderedCaller = (name: string, childName: string, reasonFirst: boolean): Flow => {
  const reasonNode = {
    id: 'write_reason', type: 'update_record', label: 'Write Reason',
    config: { objectName: ORDERED, filter: { id: '{rowId}' }, fields: { reason: '{reason}' } },
  };
  const stampNode = {
    id: 'stamp', type: 'subflow', label: 'Stamp',
    config: { flowName: childName, input: { rowId: '{rowId}' } },
  };
  const [first, second] = reasonFirst ? [reasonNode, stampNode] : [stampNode, reasonNode];
  return {
    name, label: name, type: 'screen', status: 'active', runAs: 'user',
    variables: [
      { name: 'rowId', type: 'text', isInput: true, isOutput: false },
      { name: 'reason', type: 'text', isInput: true, isOutput: false },
    ],
    nodes: [
      { id: 'start', type: 'start', label: 'Start', config: { objectName: ORDERED } },
      first,
      second,
      { id: 'end', type: 'end', label: 'End' },
    ],
    edges: [
      { id: 'e1', source: 'start', target: first.id, type: 'default' },
      { id: 'e2', source: first.id, target: second.id, type: 'default' },
      { id: 'e3', source: second.id, target: 'end', type: 'default' },
    ],
  } as AnyRec as Flow;
};

async function runOrdered(reasonFirst: boolean, tag: string): Promise<AnyRec> {
  // Seed the stamp column explicitly false. The INSERT path is exempt from the
  // readonly strip (measured above), so this is allowed — and it means "the
  // stamp did not land" reads back as a STORED false rather than as an absent
  // column, which is a weaker and more easily-faked reading.
  const row = await ql.insert(
    ORDERED,
    { name: 'probe', reason: null, locked_flag: false },
    { context: { isSystem: true, userId: 'seed' } },
  );
  const id = String(row.id);
  const childName = `probe_ord_child_${tag}`;
  const parentName = `probe_ord_parent_${tag}`;
  const engine = automation({
    [childName]: orderedStamp(childName),
    [parentName]: orderedCaller(parentName, childName, reasonFirst),
  });
  await engine.execute(parentName, {
    params: { rowId: id, reason: 'customer escalated on the phone' },
    userId: 'user_1', event: 'manual',
  } as never);
  return await ql.findOne(ORDERED, { where: { id }, context: { isSystem: true, userId: 'seed' } });
}

describe('ordering: the reason must be stored BEFORE the flag flips (#1434)', () => {
  it('reason FIRST, stamp SECOND (the shipped order) — both land', async () => {
    const after = await runOrdered(true, 'ok');
    expect(
      after.reason,
      "the user-context write of the agent's own input must land — it is not readonly",
    ).toBe('customer escalated on the phone');
    expect(
      after.locked_flag,
      'with the reason already stored, the elevated stamp passes the validation and lands',
    ).toBe(true);
  });

  it('stamp FIRST (the counterfactual) — the validation REJECTS the stamp', async () => {
    const after = await runOrdered(false, 'bad');
    // This is the case that makes the order a measurement. The stamp is
    // validated against a record with no reason yet, so it is refused — and
    // because the subflow node reports its child's failure, the parent run
    // dies there and never reaches the reason write either.
    expect(
      after.locked_flag,
      'stamping before the reason is stored must be REJECTED by reason_required. If this ' +
        'lands, the ordering constraint has gone away and the shipped edge order in ' +
        'case-actions.flow.ts can be simplified — re-read this measurement first.',
    ).toBe(false);
    expect(
      after.reason,
      'the run aborts at the failed stamp, so the reason never lands either — the ' +
        'agent loses the whole escalation. This is what the shipped order avoids.',
    ).toBeFalsy();
  });
});
