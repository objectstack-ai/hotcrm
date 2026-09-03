// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ObjectQL } from '@objectstack/objectql';
import { InMemoryDriver } from '@objectstack/driver-memory';
import { AutomationEngine, installBuiltinNodes } from '@objectstack/service-automation';
import type * as Automation from '@objectstack/spec/automation';
import { silentLogger } from './helpers/flow-harness';

type AnyRec = Record<string, any>;
type Flow = Automation.Flow;

/**
 * WHAT `readonly: true` ACTUALLY STRIPS ON THE PINNED 17.2.0 (#1429, #1460).
 *
 * `case.object.ts` carried a blanket claim — "the platform drops writes to
 * readonly fields" — that had grown load-bearing: it was the stated reason for
 * a `STAMPED_NOT_TYPED` guard exemption in `test/metadata-references.test.ts`
 * and for a counter-pin in `test/case-create-form-narrowing.test.ts`. A claim
 * that gates a guard deserves a measurement, so this file takes one.
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
 * the PINNED `@objectstack/* 17.2.0` in `package.json` (#1460) — every case
 * below reports the same verdict it did then, and the two engine internals
 * quoted above still read as quoted: the strip is still guarded by
 * `if (!opCtx.context?.isSystem)` in `@objectstack/objectql/dist/core.js`,
 * and `resolveRunDataContext` still returns `isSystem: true` for
 * `runAs: 'system'` and only for it.
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
  },
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
    { name: 'probe', locked_flag: false, open_flag: false },
    { context: { isSystem: true, userId: 'seed' } },
  );
  return String(row.id);
}

const readBack = async (id: string): Promise<AnyRec> =>
  await ql.findOne(PROBE, { where: { id }, context: { isSystem: true, userId: 'seed' } });

beforeAll(async () => {
  ql = await ObjectQL.create({
    datasources: { default: new InMemoryDriver({ persistence: false }) },
    objects: { [PROBE]: probeObject } as never,
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

describe('which shipped writer decides crm_case.is_escalated', () => {
  /**
   * The measurement above says a flow write survives `readonly: true` if and
   * only if the flow's EFFECTIVE `runAs` is `'system'` — and the engine
   * defaults it (`runAs: flow.runAs ?? 'user'`,
   * `@objectstack/service-automation/dist/index.js`). So the answer for a
   * given field is decided by the LEAST privileged of its writers, and for
   * `is_escalated` the three writers do not agree.
   *
   * This is the assertion that keeps the exemption's reason honest: if
   * `escalate_case` ever gains `runAs: 'system'`, this fails, and whoever
   * makes that change is sent to re-read the exemption rather than leaving a
   * now-false justification standing.
   */
  it('escalate_case runs as the USER — so its write WOULD be stripped', async () => {
    const { EscalateCaseFlow } = await import('../src/flows/case-actions.flow');
    expect(
      (EscalateCaseFlow as AnyRec).runAs ?? 'user',
      'escalate_case is the writer that makes is_escalated undeclarable: it runs ' +
        'runAs:"user", so a readonly is_escalated would silently drop its write. ' +
        'If this is now "system", re-check the STAMPED_NOT_TYPED exemption.',
    ).toBe('user');
  });

  it('close_case already relies on the system writer for a readonly field', async () => {
    // The in-repo proof that `runAs: 'system'` is the sanctioned way to write a
    // readonly lifecycle column: `close_case` writes `is_closed`, which IS
    // declared `readonly: true` on `crm_case`.
    const { CloseCaseFlow } = await import('../src/flows/case-actions.flow');
    const { Case } = await import('../src/objects/case.object');
    expect((CloseCaseFlow as AnyRec).runAs).toBe('system');
    expect((Case as AnyRec).fields.is_closed.readonly).toBe(true);
  });
});
